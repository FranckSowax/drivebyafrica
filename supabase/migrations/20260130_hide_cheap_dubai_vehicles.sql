-- Hide Dubai vehicles under $1000 USD (junk/incomplete listings)
-- These slip through when the CI sync script has no price filter.
-- The sync script now filters them, but existing rows need cleanup.

UPDATE vehicles
SET is_visible = false
WHERE source = 'dubai'
  AND (start_price_usd IS NULL OR start_price_usd < 1000)
  AND is_visible = true;

-- Hide Chinese vehicles whose first image is from a blocked CDN
-- (p1/p3/p6-dcd-sign.byteimg.com return 403 from outside China)
UPDATE vehicles
SET is_visible = false
WHERE source = 'china'
  AND is_visible = true
  AND (
    images::text LIKE '%p1-dcd-sign.byteimg.com%'
    OR images::text LIKE '%p3-dcd-sign.byteimg.com%'
    OR images::text LIKE '%p6-dcd-sign.byteimg.com%'
  )
  AND images::text NOT LIKE '%autoimg.cn%'
  AND images::text NOT LIKE '%p9-dcd%';
