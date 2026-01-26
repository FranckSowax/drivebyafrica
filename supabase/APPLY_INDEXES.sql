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

-- Index for default sorting (id DESC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_id_desc
ON vehicles(id DESC);

-- Index for price sorting (used in search results)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_price_asc_nulls_last
ON vehicles(start_price_usd ASC NULLS LAST, id DESC);

-- Index for make/model search (trigram for ILIKE patterns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_make_trgm
ON vehicles USING gin(make gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_model_trgm
ON vehicles USING gin(model gin_trgm_ops);

-- Composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_listing
ON vehicles(id DESC)
INCLUDE (source, source_id, source_url, make, model, grade, year, mileage,
         start_price_usd, current_price_usd, buy_now_price_usd, fuel_type,
         transmission, drive_type, body_type, color, engine_cc, images,
         status, auction_status, auction_platform, auction_date, is_visible,
         created_at, updated_at);

-- Step 4: Analyze tables to update statistics
ANALYZE vehicles;

-- Step 5: Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vehicles'
ORDER BY indexname;
