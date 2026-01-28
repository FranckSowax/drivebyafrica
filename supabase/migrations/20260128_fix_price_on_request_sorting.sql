-- Fix: Vehicles with "price on request" (NULL price) should appear last when sorting by price ascending
-- The issue was that COALESCE(start_price_usd, 0) converted NULL to 0, putting them first

-- Step 1: Update the function to keep NULL when start_price_usd is NULL (this is fast)
CREATE OR REPLACE FUNCTION calculate_effective_price()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_price_usd is NULL (price on request), keep effective_price_usd as NULL
  -- This way NULLS LAST will put them at the end when sorting ascending
  IF NEW.start_price_usd IS NULL THEN
    NEW.effective_price_usd := NULL;
  ELSE
    NEW.effective_price_usd := NEW.start_price_usd +
      CASE WHEN NEW.source = 'china' THEN 980 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Backfill in batches to avoid timeout
-- Batch 1: Update NULL prices (set effective_price to NULL)
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE vehicles
    SET effective_price_usd = NULL
    WHERE id IN (
      SELECT id FROM vehicles
      WHERE start_price_usd IS NULL
        AND effective_price_usd IS NOT NULL
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    -- Small pause to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Batch 2: Update vehicles with actual prices
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE vehicles
    SET effective_price_usd = start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END
    WHERE id IN (
      SELECT id FROM vehicles
      WHERE start_price_usd IS NOT NULL
        AND (effective_price_usd IS NULL OR effective_price_usd != start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END)
      LIMIT batch_size
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    -- Small pause to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
