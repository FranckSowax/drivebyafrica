-- Composite indexes for source filter + sorting
-- Without these, queries like "source=china ORDER BY created_at DESC"
-- cause a sequential scan on 190k+ rows → statement timeout.

-- Source + newest (created_at DESC) — default sort
CREATE INDEX IF NOT EXISTS idx_vehicles_source_created_id
  ON vehicles (source, created_at DESC, id DESC)
  WHERE is_visible = true;

-- Source + price ASC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_fob_asc_id
  ON vehicles (source, fob_price_usd ASC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Source + price DESC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_fob_desc_id
  ON vehicles (source, fob_price_usd DESC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Source + year DESC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_year_desc_id
  ON vehicles (source, year DESC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Source + year ASC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_year_asc_id
  ON vehicles (source, year ASC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Source + mileage ASC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_mileage_asc_id
  ON vehicles (source, mileage ASC NULLS LAST, id DESC)
  WHERE is_visible = true;

-- Source + mileage DESC
CREATE INDEX IF NOT EXISTS idx_vehicles_source_mileage_desc_id
  ON vehicles (source, mileage DESC NULLS LAST, id DESC)
  WHERE is_visible = true;
