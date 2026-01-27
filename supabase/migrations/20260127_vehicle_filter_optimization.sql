-- Optimize vehicle filter queries
-- Add composite index for filter dropdown queries (source + is_visible + make)

-- Index for brand/model filter queries by source
CREATE INDEX IF NOT EXISTS idx_vehicles_source_visible_make
ON vehicles(source, is_visible, make)
WHERE is_visible = true AND make IS NOT NULL;

-- Function to get distinct makes efficiently
CREATE OR REPLACE FUNCTION get_distinct_makes(p_source TEXT DEFAULT NULL)
RETURNS TABLE(make TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT v.make
  FROM vehicles v
  WHERE v.is_visible = true
    AND v.make IS NOT NULL
    AND (p_source IS NULL OR v.source = p_source)
  ORDER BY v.make;
$$;

-- Grant access to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_distinct_makes(TEXT) TO anon, authenticated;

-- Function to get distinct models for a make
CREATE OR REPLACE FUNCTION get_distinct_models(p_make TEXT, p_source TEXT DEFAULT NULL)
RETURNS TABLE(model TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT v.model
  FROM vehicles v
  WHERE v.is_visible = true
    AND v.model IS NOT NULL
    AND v.make = p_make
    AND (p_source IS NULL OR v.source = p_source)
  ORDER BY v.model;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_distinct_models(TEXT, TEXT) TO anon, authenticated;

-- Function to get all filter options in one call (more efficient)
CREATE OR REPLACE FUNCTION get_vehicle_filter_options()
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT jsonb_build_object(
    'makes', (SELECT jsonb_agg(DISTINCT make ORDER BY make) FROM vehicles WHERE is_visible = true AND make IS NOT NULL),
    'transmissions', (SELECT jsonb_agg(DISTINCT transmission ORDER BY transmission) FROM vehicles WHERE is_visible = true AND transmission IS NOT NULL),
    'fuel_types', (SELECT jsonb_agg(DISTINCT fuel_type ORDER BY fuel_type) FROM vehicles WHERE is_visible = true AND fuel_type IS NOT NULL),
    'drive_types', (SELECT jsonb_agg(DISTINCT drive_type ORDER BY drive_type) FROM vehicles WHERE is_visible = true AND drive_type IS NOT NULL),
    'body_types', (SELECT jsonb_agg(DISTINCT body_type ORDER BY body_type) FROM vehicles WHERE is_visible = true AND body_type IS NOT NULL),
    'colors', (SELECT jsonb_agg(DISTINCT color ORDER BY color) FROM vehicles WHERE is_visible = true AND color IS NOT NULL),
    'min_year', (SELECT MIN(year) FROM vehicles WHERE is_visible = true AND year IS NOT NULL),
    'max_year', (SELECT MAX(year) FROM vehicles WHERE is_visible = true AND year IS NOT NULL)
  );
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_vehicle_filter_options() TO anon, authenticated;
