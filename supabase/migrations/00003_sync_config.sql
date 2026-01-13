-- Migration: Add sync_config table and status column to vehicles
-- Description: Track synchronization state and add vehicle status for new purchase flow

-- ============================================
-- 1. SYNC CONFIGURATION TABLE
-- ============================================

-- Table to store sync configuration and state
CREATE TABLE IF NOT EXISTS sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL UNIQUE, -- 'encar', 'china', 'dubai'
  last_change_id BIGINT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed'
  last_sync_error TEXT,
  vehicles_added INTEGER DEFAULT 0,
  vehicles_updated INTEGER DEFAULT 0,
  vehicles_removed INTEGER DEFAULT 0,
  total_vehicles INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}', -- Additional configuration (api keys, settings, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by source
CREATE INDEX IF NOT EXISTS idx_sync_config_source ON sync_config(source);

-- Insert default config for Encar
INSERT INTO sync_config (source, config)
VALUES ('encar', '{"allowed_makes": ["Hyundai", "Kia", "Toyota", "Honda", "Nissan", "Mazda", "Mitsubishi", "Suzuki", "Lexus", "Mercedes-Benz", "Land Rover", "Ford", "Jeep"], "max_pages_per_make": 10}')
ON CONFLICT (source) DO NOTHING;

-- ============================================
-- 2. SYNC LOGS TABLE
-- ============================================

-- Table to store sync history/logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  sync_type VARCHAR(20) NOT NULL, -- 'full', 'changes', 'manual'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'success', 'failed'
  vehicles_added INTEGER DEFAULT 0,
  vehicles_updated INTEGER DEFAULT 0,
  vehicles_removed INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by source and date
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- ============================================
-- 3. ADD STATUS COLUMN TO VEHICLES
-- ============================================

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN status VARCHAR(20) DEFAULT 'available';
  END IF;
END $$;

-- Add index for status column
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Add is_visible column for admin to hide vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN is_visible BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add index for visibility
CREATE INDEX IF NOT EXISTS idx_vehicles_is_visible ON vehicles(is_visible);

-- Add admin_notes column for internal notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- ============================================
-- 4. UPDATE FUNCTION FOR TIMESTAMPS
-- ============================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sync_config
DROP TRIGGER IF EXISTS update_sync_config_updated_at ON sync_config;
CREATE TRIGGER update_sync_config_updated_at
  BEFORE UPDATE ON sync_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. HELPER FUNCTIONS FOR SYNC
-- ============================================

-- Function to get last change_id for a source
CREATE OR REPLACE FUNCTION get_last_change_id(p_source VARCHAR)
RETURNS BIGINT AS $$
DECLARE
  v_change_id BIGINT;
BEGIN
  SELECT last_change_id INTO v_change_id
  FROM sync_config
  WHERE source = p_source;

  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
  p_source VARCHAR,
  p_change_id BIGINT DEFAULT NULL,
  p_status VARCHAR DEFAULT 'success',
  p_error TEXT DEFAULT NULL,
  p_added INTEGER DEFAULT 0,
  p_updated INTEGER DEFAULT 0,
  p_removed INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_config
  SET
    last_change_id = COALESCE(p_change_id, last_change_id),
    last_sync_at = NOW(),
    last_sync_status = p_status,
    last_sync_error = p_error,
    vehicles_added = p_added,
    vehicles_updated = p_updated,
    vehicles_removed = p_removed,
    total_vehicles = (SELECT COUNT(*) FROM vehicles WHERE source = p_source)
  WHERE source = p_source;

  -- Insert if not exists
  IF NOT FOUND THEN
    INSERT INTO sync_config (source, last_change_id, last_sync_at, last_sync_status, last_sync_error, vehicles_added, vehicles_updated, vehicles_removed)
    VALUES (p_source, p_change_id, NOW(), p_status, p_error, p_added, p_updated, p_removed);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicle statistics
CREATE OR REPLACE FUNCTION get_vehicle_stats()
RETURNS TABLE (
  total_vehicles BIGINT,
  available_vehicles BIGINT,
  reserved_vehicles BIGINT,
  sold_vehicles BIGINT,
  hidden_vehicles BIGINT,
  korea_vehicles BIGINT,
  china_vehicles BIGINT,
  dubai_vehicles BIGINT,
  avg_price NUMERIC,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_vehicles,
    COUNT(*) FILTER (WHERE v.status = 'available' OR v.status IS NULL)::BIGINT as available_vehicles,
    COUNT(*) FILTER (WHERE v.status = 'reserved')::BIGINT as reserved_vehicles,
    COUNT(*) FILTER (WHERE v.status = 'sold' OR v.auction_status = 'sold')::BIGINT as sold_vehicles,
    COUNT(*) FILTER (WHERE v.is_visible = false)::BIGINT as hidden_vehicles,
    COUNT(*) FILTER (WHERE v.source = 'korea')::BIGINT as korea_vehicles,
    COUNT(*) FILTER (WHERE v.source = 'china')::BIGINT as china_vehicles,
    COUNT(*) FILTER (WHERE v.source = 'dubai')::BIGINT as dubai_vehicles,
    ROUND(AVG(v.start_price_usd)::NUMERIC, 2) as avg_price,
    MAX(sc.last_sync_at) as last_sync_at
  FROM vehicles v
  LEFT JOIN sync_config sc ON sc.source = v.source;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Enable RLS on new tables
ALTER TABLE sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users with admin role can access sync tables
-- For now, allow all authenticated users (adjust based on your auth setup)
CREATE POLICY "Allow authenticated users to read sync_config"
  ON sync_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to sync_config"
  ON sync_config FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow authenticated users to read sync_logs"
  ON sync_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role full access to sync_logs"
  ON sync_logs FOR ALL
  TO service_role
  USING (true);
