-- Add computed column for effective price (includes export tax for China)
-- This enables proper sorting by total price across all sources

-- Add the computed column
-- Uses STORED so it's calculated once on insert/update, not on every query
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS effective_price_usd NUMERIC
  GENERATED ALWAYS AS (
    COALESCE(start_price_usd, 0) + CASE WHEN source = 'china' THEN 980 ELSE 0 END
  ) STORED;

-- Create indexes for sorting by effective price (both directions)
-- These replace the need for client-side sorting
CREATE INDEX IF NOT EXISTS idx_vehicles_effective_price_asc
ON vehicles (effective_price_usd ASC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_effective_price_desc
ON vehicles (effective_price_usd DESC NULLS FIRST, id DESC);

-- Composite index for visible vehicles sorted by effective price
-- Covers: WHERE is_visible = true ORDER BY effective_price_usd
CREATE INDEX IF NOT EXISTS idx_vehicles_visible_effective_price_asc
ON vehicles (is_visible, effective_price_usd ASC NULLS LAST, id DESC)
WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_visible_effective_price_desc
ON vehicles (is_visible, effective_price_usd DESC NULLS FIRST, id DESC)
WHERE is_visible = true;

-- Update statistics
ANALYZE vehicles;
