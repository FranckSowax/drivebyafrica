-- Fix: Vehicles with "price on request" (NULL price) should appear last when sorting by price ascending
--
-- INSTRUCTIONS: Run these queries one by one in Supabase SQL Editor
-- If a query times out, run it again - it will continue where it left off
-- =========================================================================

-- STEP 1: Update the trigger function (run once, this is fast)
CREATE OR REPLACE FUNCTION calculate_effective_price()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_price_usd IS NULL THEN
    NEW.effective_price_usd := NULL;
  ELSE
    NEW.effective_price_usd := NEW.start_price_usd +
      CASE WHEN NEW.source = 'china' THEN 980 ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- STEP 2A: Set effective_price to NULL for "price on request" vehicles
-- Run this multiple times until it returns "0 rows affected"
-- =========================================================================
UPDATE vehicles
SET effective_price_usd = NULL
WHERE id IN (
  SELECT id FROM vehicles
  WHERE start_price_usd IS NULL
    AND effective_price_usd IS NOT NULL
  LIMIT 10000
);

-- =========================================================================
-- STEP 2B: Recalculate effective_price for vehicles WITH prices
-- Run this multiple times until it returns "0 rows affected"
-- =========================================================================
UPDATE vehicles
SET effective_price_usd = start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END
WHERE id IN (
  SELECT id FROM vehicles
  WHERE start_price_usd IS NOT NULL
    AND (effective_price_usd IS NULL
         OR effective_price_usd != start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END)
  LIMIT 10000
);

-- =========================================================================
-- STEP 3: Verify the fix (optional)
-- =========================================================================

-- Check how many "price on request" vehicles have incorrect effective_price
SELECT COUNT(*) as incorrect_null_prices
FROM vehicles
WHERE start_price_usd IS NULL AND effective_price_usd IS NOT NULL;

-- Check how many priced vehicles have incorrect effective_price
SELECT COUNT(*) as incorrect_priced
FROM vehicles
WHERE start_price_usd IS NOT NULL
  AND effective_price_usd != start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END;

-- Both should return 0 when done
