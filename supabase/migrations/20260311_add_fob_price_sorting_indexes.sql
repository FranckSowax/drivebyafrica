-- Add composite indexes for fob_price_usd sorting (price_asc / price_desc)
-- The existing idx_vehicles_fob_price_usd is a single-column partial index,
-- but the query needs: ORDER BY fob_price_usd [ASC|DESC] NULLS LAST, id DESC
-- These composite indexes let PostgreSQL do an index-only scan + LIMIT
-- instead of a sequential scan on 190k+ rows.

CREATE INDEX IF NOT EXISTS idx_vehicles_fob_price_asc_id
  ON vehicles (fob_price_usd ASC NULLS LAST, id DESC)
  WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_fob_price_desc_id
  ON vehicles (fob_price_usd DESC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Also add mileage DESC index (existing only covers ASC)
CREATE INDEX IF NOT EXISTS idx_vehicles_mileage_desc_id
  ON vehicles (mileage DESC NULLS LAST, id DESC);
