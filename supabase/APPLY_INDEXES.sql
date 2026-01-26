-- =============================================
-- APPLY THIS SCRIPT IN SUPABASE SQL EDITOR
-- =============================================
-- This script creates indexes to fix the 500 timeout errors
-- Go to: https://supabase.com/dashboard -> Your Project -> SQL Editor
-- Paste this entire script and click "Run"

-- Step 1: Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Increase statement timeout for this session (to create indexes)
SET statement_timeout = '300s';

-- Step 3: Create essential indexes
-- Note: Not using CONCURRENTLY because Supabase SQL Editor runs in a transaction

-- Index for default sorting (id DESC)
CREATE INDEX IF NOT EXISTS idx_vehicles_id_desc
ON vehicles(id DESC);

-- Index for price sorting (used in search results)
CREATE INDEX IF NOT EXISTS idx_vehicles_price_asc_nulls_last
ON vehicles(start_price_usd ASC NULLS LAST, id DESC);

-- Index for make/model search (trigram for ILIKE patterns)
CREATE INDEX IF NOT EXISTS idx_vehicles_make_trgm
ON vehicles USING gin(make gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_model_trgm
ON vehicles USING gin(model gin_trgm_ops);

-- CRITICAL: Index for is_visible filter (always applied now)
CREATE INDEX IF NOT EXISTS idx_vehicles_visible
ON vehicles(is_visible, id DESC)
WHERE is_visible = true;

-- Index for visible vehicles sorted by price
CREATE INDEX IF NOT EXISTS idx_vehicles_visible_price
ON vehicles(is_visible, start_price_usd ASC NULLS LAST, id DESC)
WHERE is_visible = true;

-- Step 4: Analyze tables to update statistics
ANALYZE vehicles;

-- Step 5: Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vehicles'
ORDER BY indexname;
