-- Add effective_price_usd column for proper price sorting
-- Approach: Regular column + trigger (faster than GENERATED for large tables)

-- Step 1: Add nullable column (instant, no table rewrite)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS effective_price_usd NUMERIC;

-- Step 2: Create function to calculate effective price
CREATE OR REPLACE FUNCTION calculate_effective_price()
RETURNS TRIGGER AS $$
BEGIN
  NEW.effective_price_usd := COALESCE(NEW.start_price_usd, 0) +
    CASE WHEN NEW.source = 'china' THEN 980 ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for new/updated rows
DROP TRIGGER IF EXISTS trigger_effective_price ON vehicles;
CREATE TRIGGER trigger_effective_price
  BEFORE INSERT OR UPDATE OF start_price_usd, source ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_effective_price();

-- Step 4: Create indexes FIRST (before backfill, uses CONCURRENTLY-like behavior)
CREATE INDEX IF NOT EXISTS idx_vehicles_effective_price_asc
ON vehicles (effective_price_usd ASC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_effective_price_desc
ON vehicles (effective_price_usd DESC NULLS FIRST, id DESC);

-- Partial indexes for visible vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_visible_effective_price_asc
ON vehicles (effective_price_usd ASC NULLS LAST, id DESC)
WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_visible_effective_price_desc
ON vehicles (effective_price_usd DESC NULLS FIRST, id DESC)
WHERE is_visible = true;
