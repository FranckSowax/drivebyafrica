-- Performance optimization for quotes table at scale
-- Supports thousands of quotes per day

-- ============================================
-- 1. COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Index for status + date filtering (admin stats, dashboard)
CREATE INDEX IF NOT EXISTS idx_quotes_status_created_at
ON quotes(status, created_at DESC);

-- Index for user + status filtering (user dashboard)
CREATE INDEX IF NOT EXISTS idx_quotes_user_status
ON quotes(user_id, status);

-- Index for user + date filtering (user history)
CREATE INDEX IF NOT EXISTS idx_quotes_user_created_at
ON quotes(user_id, created_at DESC);

-- Index for vehicle lookups (reassignments, duplicates)
CREATE INDEX IF NOT EXISTS idx_quotes_vehicle_source_status
ON quotes(vehicle_source, status);

-- Partial index for pending quotes (most common filter)
CREATE INDEX IF NOT EXISTS idx_quotes_pending
ON quotes(created_at DESC) WHERE status = 'pending';

-- Partial index for accepted quotes (deposit tracking)
CREATE INDEX IF NOT EXISTS idx_quotes_accepted
ON quotes(created_at DESC) WHERE status = 'accepted';

-- ============================================
-- 2. DATABASE FUNCTION FOR STATS AGGREGATION
-- ============================================

-- Function to get quote stats efficiently using database aggregation
CREATE OR REPLACE FUNCTION get_quote_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_of_day TIMESTAMPTZ := date_trunc('day', NOW());
  start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
  start_of_year TIMESTAMPTZ := date_trunc('year', NOW());
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'validated', COUNT(*) FILTER (WHERE status = 'validated'),
    'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'depositsToday', COALESCE(COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= start_of_day), 0) * 1000,
    'depositsThisMonth', COALESCE(COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= start_of_month), 0) * 1000,
    'depositsThisYear', COALESCE(COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= start_of_year), 0) * 1000,
    'totalDeposits', COALESCE(COUNT(*) FILTER (WHERE status = 'accepted'), 0) * 1000
  ) INTO result
  FROM quotes;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users (admin will use service role)
GRANT EXECUTE ON FUNCTION get_quote_stats() TO authenticated;

-- ============================================
-- 3. FUNCTION FOR USER QUOTE STATS
-- ============================================

-- Function to get user-specific quote stats
CREATE OR REPLACE FUNCTION get_user_quote_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired')
  ) INTO result
  FROM quotes
  WHERE user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_quote_stats(UUID) TO authenticated;

-- ============================================
-- 4. MATERIALIZED VIEW FOR DAILY STATS (OPTIONAL - for analytics)
-- ============================================

-- Materialized view for daily quote aggregates (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS quotes_daily_stats AS
SELECT
  date_trunc('day', created_at)::DATE AS day,
  vehicle_source,
  destination_country,
  status,
  COUNT(*) AS quote_count,
  SUM(total_cost_xaf) AS total_value_xaf,
  AVG(total_cost_xaf) AS avg_value_xaf
FROM quotes
GROUP BY 1, 2, 3, 4
ORDER BY day DESC;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS idx_quotes_daily_stats_day
ON quotes_daily_stats(day DESC);

-- Function to refresh the materialized view (call via cron)
CREATE OR REPLACE FUNCTION refresh_quotes_daily_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY quotes_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. ADD EMAIL TO PROFILES FOR QUICK LOOKUP
-- ============================================

-- Add email column to profiles if not exists (cache from auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;

    -- Create index for email lookups
    CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
  END IF;
END $$;

-- Function to sync email from auth.users to profiles (trigger on profile creation)
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get email from auth.users
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-populate email on profile insert
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON profiles;
CREATE TRIGGER sync_profile_email_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- Backfill existing profiles with emails
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ============================================
-- 6. OPTIMIZE VEHICLES LOOKUP FOR REASSIGNMENTS
-- ============================================

-- Composite index for vehicle similarity search
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_price
ON vehicles(make, model, current_price_usd);

-- Partial index for available vehicles only
CREATE INDEX IF NOT EXISTS idx_vehicles_available_source
ON vehicles(source, current_price_usd)
WHERE status = 'available';
