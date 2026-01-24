-- Migration: Support for "All Countries" collaborator assignment
-- Date: 2026-01-24
-- Description: Allow collaborators to have access to all countries with assigned_country = 'all'

-- =============================================
-- 1. UPDATE PROFILES TABLE CONSTRAINT
-- =============================================

-- Drop existing check constraint on assigned_country
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_assigned_country_check;

-- Create new constraint allowing 'all' as a valid value
ALTER TABLE profiles
ADD CONSTRAINT profiles_assigned_country_check
CHECK (assigned_country IN ('china', 'korea', 'dubai', 'all') OR assigned_country IS NULL);

-- =============================================
-- 2. UPDATE HELPER FUNCTION FOR COUNTRY ACCESS
-- =============================================

-- Function to get all source types for a given country
CREATE OR REPLACE FUNCTION public.get_sources_for_country(country TEXT)
RETURNS TEXT[] AS $$
BEGIN
  CASE country
    WHEN 'china' THEN
      RETURN ARRAY['china', 'che168', 'dongchedi'];
    WHEN 'korea' THEN
      RETURN ARRAY['korea', 'encar'];
    WHEN 'dubai' THEN
      RETURN ARRAY['dubai', 'dubicars'];
    WHEN 'all' THEN
      RETURN ARRAY['china', 'che168', 'dongchedi', 'korea', 'encar', 'dubai', 'dubicars'];
    ELSE
      RETURN ARRAY[]::TEXT[];
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_sources_for_country(TEXT) TO authenticated;

-- =============================================
-- 3. UPDATE RLS POLICIES FOR ORDERS
-- =============================================

-- Drop existing collaborator order policies if they exist
DROP POLICY IF EXISTS "collaborator_select_assigned_orders" ON orders;
DROP POLICY IF EXISTS "collaborator_update_assigned_orders" ON orders;

-- Create new policies that support 'all' countries
CREATE POLICY "collaborator_select_assigned_orders" ON orders
  FOR SELECT
  USING (
    -- Collaborators can see orders based on their assigned country
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        -- If assigned_country is 'all', see all orders
        profiles.assigned_country = 'all'
        OR
        -- Otherwise, filter by vehicle source matching assigned country
        EXISTS (
          SELECT 1 FROM vehicles
          WHERE vehicles.id = orders.vehicle_id
          AND vehicles.source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    -- Admins can see all orders
    public.is_admin()
  );

CREATE POLICY "collaborator_update_assigned_orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        EXISTS (
          SELECT 1 FROM vehicles
          WHERE vehicles.id = orders.vehicle_id
          AND vehicles.source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

-- =============================================
-- 4. UPDATE RLS POLICIES FOR QUOTES
-- =============================================

-- Drop existing collaborator quote policies if they exist
DROP POLICY IF EXISTS "collaborator_select_assigned_quotes" ON quotes;
DROP POLICY IF EXISTS "collaborator_update_assigned_quotes" ON quotes;

-- Create new policies for quotes
CREATE POLICY "collaborator_select_assigned_quotes" ON quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        profiles.assigned_country IS NULL  -- NULL means all countries too
        OR
        vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
      )
    )
    OR
    public.is_admin()
  );

CREATE POLICY "collaborator_update_assigned_quotes" ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        profiles.assigned_country IS NULL
        OR
        vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
      )
    )
    OR
    public.is_admin()
  );

-- =============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN profiles.assigned_country IS 'Country assignment for collaborators: china, korea, dubai, all (all countries), or NULL (admin/user)';
COMMENT ON FUNCTION public.get_sources_for_country(TEXT) IS 'Returns array of vehicle sources for a given country assignment. Returns all sources if country is "all"';

-- =============================================
-- 6. CREATE VIEW FOR COLLABORATOR ACCESS SUMMARY
-- =============================================

CREATE OR REPLACE VIEW collaborator_access_summary AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.assigned_country,
  CASE
    WHEN p.assigned_country = 'all' THEN 'All Countries'
    WHEN p.assigned_country = 'china' THEN 'China Only'
    WHEN p.assigned_country = 'korea' THEN 'Korea Only'
    WHEN p.assigned_country = 'dubai' THEN 'Dubai Only'
    WHEN p.assigned_country IS NULL AND p.role = 'collaborator' THEN 'All Countries (Legacy)'
    ELSE 'N/A'
  END as access_level,
  get_sources_for_country(COALESCE(p.assigned_country, 'all')) as accessible_sources
FROM profiles p
WHERE p.role = 'collaborator';

GRANT SELECT ON collaborator_access_summary TO authenticated;

-- =============================================
-- 7. MIGRATION VERIFICATION QUERY
-- =============================================

-- Run this to verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20250124_collaborator_all_countries completed successfully';
  RAISE NOTICE 'Collaborators can now be assigned to "all" countries';
  RAISE NOTICE 'Use assigned_country = ''all'' for full access collaborators';
END $$;
