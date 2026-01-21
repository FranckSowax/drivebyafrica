-- Add indexes for vehicle sorting to prevent statement timeout on 140k+ rows
-- The default ORDER BY year DESC, id DESC was causing timeouts
--
-- IMPORTANT: Run these in Supabase SQL Editor ONE BY ONE if using CONCURRENTLY
-- Or run this file as-is (without CONCURRENTLY) to create all at once

-- Composite index for the most common sort: year DESC, id DESC
-- This covers the default listing page sort
CREATE INDEX IF NOT EXISTS idx_vehicles_year_id_desc
ON vehicles (year DESC NULLS LAST, id DESC);

-- Index for price sorting (both directions)
CREATE INDEX IF NOT EXISTS idx_vehicles_price_id_desc
ON vehicles (start_price_usd DESC NULLS FIRST, id DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_price_id_asc
ON vehicles (start_price_usd ASC NULLS LAST, id DESC);

-- Index for mileage sorting
CREATE INDEX IF NOT EXISTS idx_vehicles_mileage_id_asc
ON vehicles (mileage ASC NULLS LAST, id DESC);

-- Index for id DESC (already exists as primary key, but explicit for sorting)
-- The primary key already covers this, no need to create
