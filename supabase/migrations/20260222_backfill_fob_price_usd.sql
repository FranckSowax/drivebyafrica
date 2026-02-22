-- ============================================================
-- BACKFILL fob_price_usd in batches of 50,000 rows
-- Run AFTER 20260222_add_fob_price_usd.sql
--
-- Run this script multiple times until it reports 0 rows updated.
-- Each execution processes up to 50,000 rows where fob_price_usd IS NULL.
-- ============================================================

UPDATE vehicles
SET fob_price_usd = COALESCE(start_price_usd, current_price_usd, buy_now_price_usd, 0)
  + CASE WHEN source = 'china' THEN 980 ELSE 0 END
WHERE id IN (
  SELECT id FROM vehicles
  WHERE fob_price_usd IS NULL
  LIMIT 50000
);
