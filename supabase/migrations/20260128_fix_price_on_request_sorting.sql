-- Fix: Vehicles with "price on request" (NULL price) should appear last when sorting by price ascending
-- The issue was that COALESCE(start_price_usd, 0) converted NULL to 0, putting them first

-- Update the function to keep NULL when start_price_usd is NULL
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

-- Backfill: Update existing vehicles with NULL start_price_usd to have NULL effective_price_usd
UPDATE vehicles
SET effective_price_usd = NULL
WHERE start_price_usd IS NULL AND effective_price_usd IS NOT NULL;

-- Backfill: Recalculate effective_price for vehicles with actual prices (in case they were wrong)
UPDATE vehicles
SET effective_price_usd = start_price_usd + CASE WHEN source = 'china' THEN 980 ELSE 0 END
WHERE start_price_usd IS NOT NULL;
