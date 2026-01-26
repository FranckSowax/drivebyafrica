-- BACKFILL: Run this AFTER the main migration
-- Updates existing rows in batches to avoid timeout
-- Run multiple times if needed until "Rows updated: 0"

-- Batch update 50,000 rows at a time
UPDATE vehicles
SET effective_price_usd = COALESCE(start_price_usd, 0) +
  CASE WHEN source = 'china' THEN 980 ELSE 0 END
WHERE effective_price_usd IS NULL
  AND id IN (
    SELECT id FROM vehicles
    WHERE effective_price_usd IS NULL
    LIMIT 50000
  );

-- Check progress: should decrease each run
SELECT
  COUNT(*) FILTER (WHERE effective_price_usd IS NULL) as remaining,
  COUNT(*) FILTER (WHERE effective_price_usd IS NOT NULL) as completed,
  COUNT(*) as total
FROM vehicles;
