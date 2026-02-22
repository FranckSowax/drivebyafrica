-- Add FOB price column that includes export tax for fair price comparison
-- Chinese vehicles have a $980 export tax not included in start_price_usd
-- This column allows correct sorting by actual comparable price

-- ============================================================
-- RUN THIS FILE FIRST (schema only — instant, no timeout risk)
-- ============================================================

-- Step 1: Add the column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fob_price_usd NUMERIC;

-- Step 2: Trigger to auto-calculate fob_price_usd on INSERT/UPDATE
-- (create BEFORE backfill so any concurrent inserts are handled)
CREATE OR REPLACE FUNCTION update_fob_price_usd()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fob_price_usd := COALESCE(NEW.start_price_usd, NEW.current_price_usd, NEW.buy_now_price_usd, 0)
    + CASE WHEN NEW.source = 'china' THEN 980 ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_fob_price_usd ON vehicles;
CREATE TRIGGER trg_update_fob_price_usd
  BEFORE INSERT OR UPDATE OF start_price_usd, current_price_usd, buy_now_price_usd, source
  ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_fob_price_usd();

-- Step 3: Create index for fast sorting (CONCURRENTLY to avoid locking)
-- NOTE: If running inside a transaction (e.g. Supabase SQL editor),
-- remove CONCURRENTLY and use the plain CREATE INDEX version below.
CREATE INDEX IF NOT EXISTS idx_vehicles_fob_price_usd
  ON vehicles(fob_price_usd)
  WHERE is_visible = true;
