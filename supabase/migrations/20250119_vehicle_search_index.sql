-- Add trigram extension and indexes for fast ILIKE searches on vehicles
-- This fixes the statement timeout issue when searching through 80k+ vehicles

-- Enable the pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes using trigrams for fast ILIKE searches
-- These indexes support pattern matching with wildcards (e.g., '%toyota%')
-- Note: Not using CONCURRENTLY as it cannot run inside a transaction block
CREATE INDEX IF NOT EXISTS idx_vehicles_make_trgm
ON vehicles USING GIN (make gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_model_trgm
ON vehicles USING GIN (model gin_trgm_ops);

-- Add indexes for sorting columns to speed up ORDER BY queries
-- These are critical for paginated queries on 80k+ vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at_desc
ON vehicles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_start_price_usd_asc
ON vehicles (start_price_usd ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_vehicles_start_price_usd_desc
ON vehicles (start_price_usd DESC NULLS LAST);

-- Add comment for documentation
COMMENT ON INDEX idx_vehicles_make_trgm IS 'Trigram index for fast ILIKE searches on vehicle make';
COMMENT ON INDEX idx_vehicles_model_trgm IS 'Trigram index for fast ILIKE searches on vehicle model';
COMMENT ON INDEX idx_vehicles_created_at_desc IS 'Index for sorting by newest first';
COMMENT ON INDEX idx_vehicles_start_price_usd_asc IS 'Index for sorting by price ascending';
COMMENT ON INDEX idx_vehicles_start_price_usd_desc IS 'Index for sorting by price descending';
