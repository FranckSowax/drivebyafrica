-- Optimize vehicle listing queries for admin panel
-- Target: /api/admin/vehicles with 190k+ rows

-- Drop old indexes if they exist (from previous optimizations)
DROP INDEX IF EXISTS idx_vehicles_visible_price_asc;
DROP INDEX IF EXISTS idx_vehicles_visible_price_desc;
DROP INDEX IF EXISTS idx_vehicles_all_price_asc;

-- 1. Composite index for default sort (created_at DESC) with visibility filter
-- This covers: WHERE is_visible = true ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_vehicles_visible_created_desc
ON vehicles(is_visible, created_at DESC, id DESC)
WHERE is_visible = true;

-- 2. Composite index for all vehicles default sort (no filter)
-- This covers: ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_vehicles_created_desc
ON vehicles(created_at DESC, id DESC);

-- 3. Composite index for source + status filtering with created_at sort
-- This covers: WHERE source = 'X' AND status = 'Y' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_status_created
ON vehicles(source, status, created_at DESC, id DESC);

-- 4. Index for search queries on make/model
-- This covers: WHERE make ILIKE '%search%' OR model ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_trgm
ON vehicles USING gin(make gin_trgm_ops, model gin_trgm_ops);

-- Enable pg_trgm extension if not already enabled (for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5. Covering index for count queries with common filters
-- This covers: SELECT COUNT(*) WHERE is_visible = true
CREATE INDEX IF NOT EXISTS idx_vehicles_visible_count
ON vehicles(is_visible)
WHERE is_visible = true;

-- 6. Index for source_id lookups (used in sync operations)
CREATE INDEX IF NOT EXISTS idx_vehicles_source_id
ON vehicles(source, source_id);

-- Analyze table to update statistics
ANALYZE vehicles;
