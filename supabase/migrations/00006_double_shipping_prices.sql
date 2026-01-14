-- Double shipping prices in the shipping_routes table
-- This migration multiplies all shipping costs by 2

UPDATE shipping_routes
SET
  korea_cost_usd = korea_cost_usd * 2,
  china_cost_usd = china_cost_usd * 2,
  dubai_cost_usd = dubai_cost_usd * 2,
  updated_at = NOW()
WHERE
  -- Only double prices that are below the expected doubled values
  -- This prevents doubling already-doubled prices if run multiple times
  korea_cost_usd < 3000;

-- Also update any that might have been partially updated
-- by checking against known original values and setting to correct doubled values
UPDATE shipping_routes SET korea_cost_usd = 4600, china_cost_usd = 5200, dubai_cost_usd = 4200, updated_at = NOW() WHERE destination_id = 'dakar';
UPDATE shipping_routes SET korea_cost_usd = 4200, china_cost_usd = 4800, dubai_cost_usd = 3800, updated_at = NOW() WHERE destination_id = 'abidjan';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'tema';
UPDATE shipping_routes SET korea_cost_usd = 4400, china_cost_usd = 5000, dubai_cost_usd = 4000, updated_at = NOW() WHERE destination_id = 'lagos';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'lome';
UPDATE shipping_routes SET korea_cost_usd = 4100, china_cost_usd = 4700, dubai_cost_usd = 3700, updated_at = NOW() WHERE destination_id = 'cotonou';
UPDATE shipping_routes SET korea_cost_usd = 4800, china_cost_usd = 5400, dubai_cost_usd = 4400, updated_at = NOW() WHERE destination_id = 'conakry';
UPDATE shipping_routes SET korea_cost_usd = 5000, china_cost_usd = 5600, dubai_cost_usd = 4600, updated_at = NOW() WHERE destination_id = 'freetown';
UPDATE shipping_routes SET korea_cost_usd = 4900, china_cost_usd = 5500, dubai_cost_usd = 4500, updated_at = NOW() WHERE destination_id = 'monrovia';
UPDATE shipping_routes SET korea_cost_usd = 4700, china_cost_usd = 5300, dubai_cost_usd = 4300, updated_at = NOW() WHERE destination_id = 'banjul';
UPDATE shipping_routes SET korea_cost_usd = 4800, china_cost_usd = 5400, dubai_cost_usd = 4400, updated_at = NOW() WHERE destination_id = 'bissau';
UPDATE shipping_routes SET korea_cost_usd = 5000, china_cost_usd = 5600, dubai_cost_usd = 4600, updated_at = NOW() WHERE destination_id = 'nouakchott';
UPDATE shipping_routes SET korea_cost_usd = 5200, china_cost_usd = 5800, dubai_cost_usd = 4800, updated_at = NOW() WHERE destination_id = 'praia';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'port-harcourt';
UPDATE shipping_routes SET korea_cost_usd = 3400, china_cost_usd = 4000, dubai_cost_usd = 3000, updated_at = NOW() WHERE destination_id = 'douala';
UPDATE shipping_routes SET korea_cost_usd = 3600, china_cost_usd = 4200, dubai_cost_usd = 3200, updated_at = NOW() WHERE destination_id = 'libreville';
UPDATE shipping_routes SET korea_cost_usd = 3700, china_cost_usd = 4300, dubai_cost_usd = 3300, updated_at = NOW() WHERE destination_id = 'port-gentil';
UPDATE shipping_routes SET korea_cost_usd = 3800, china_cost_usd = 4400, dubai_cost_usd = 3400, updated_at = NOW() WHERE destination_id = 'pointe-noire';
UPDATE shipping_routes SET korea_cost_usd = 3500, china_cost_usd = 4100, dubai_cost_usd = 3100, updated_at = NOW() WHERE destination_id = 'kribi';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'matadi';
UPDATE shipping_routes SET korea_cost_usd = 4200, china_cost_usd = 4800, dubai_cost_usd = 3800, updated_at = NOW() WHERE destination_id = 'luanda';
UPDATE shipping_routes SET korea_cost_usd = 4100, china_cost_usd = 4700, dubai_cost_usd = 3700, updated_at = NOW() WHERE destination_id = 'lobito';
UPDATE shipping_routes SET korea_cost_usd = 3800, china_cost_usd = 4400, dubai_cost_usd = 3400, updated_at = NOW() WHERE destination_id = 'malabo';
UPDATE shipping_routes SET korea_cost_usd = 4400, china_cost_usd = 5000, dubai_cost_usd = 4000, updated_at = NOW() WHERE destination_id = 'sao-tome';
UPDATE shipping_routes SET korea_cost_usd = 3200, china_cost_usd = 3800, dubai_cost_usd = 2800, updated_at = NOW() WHERE destination_id = 'mombasa';
UPDATE shipping_routes SET korea_cost_usd = 3300, china_cost_usd = 3900, dubai_cost_usd = 2900, updated_at = NOW() WHERE destination_id = 'dar-es-salaam';
UPDATE shipping_routes SET korea_cost_usd = 3400, china_cost_usd = 4000, dubai_cost_usd = 3000, updated_at = NOW() WHERE destination_id = 'zanzibar';
UPDATE shipping_routes SET korea_cost_usd = 3500, china_cost_usd = 4100, dubai_cost_usd = 3100, updated_at = NOW() WHERE destination_id = 'maputo';
UPDATE shipping_routes SET korea_cost_usd = 3600, china_cost_usd = 4200, dubai_cost_usd = 3200, updated_at = NOW() WHERE destination_id = 'beira';
UPDATE shipping_routes SET korea_cost_usd = 3000, china_cost_usd = 3600, dubai_cost_usd = 2400, updated_at = NOW() WHERE destination_id = 'djibouti';
UPDATE shipping_routes SET korea_cost_usd = 3100, china_cost_usd = 3700, dubai_cost_usd = 2500, updated_at = NOW() WHERE destination_id = 'port-sudan';
UPDATE shipping_routes SET korea_cost_usd = 3200, china_cost_usd = 3800, dubai_cost_usd = 2600, updated_at = NOW() WHERE destination_id = 'massawa';
UPDATE shipping_routes SET korea_cost_usd = 3300, china_cost_usd = 3900, dubai_cost_usd = 2700, updated_at = NOW() WHERE destination_id = 'mogadiscio';
UPDATE shipping_routes SET korea_cost_usd = 3800, china_cost_usd = 4400, dubai_cost_usd = 3400, updated_at = NOW() WHERE destination_id = 'port-louis';
UPDATE shipping_routes SET korea_cost_usd = 3700, china_cost_usd = 4300, dubai_cost_usd = 3300, updated_at = NOW() WHERE destination_id = 'toamasina';
UPDATE shipping_routes SET korea_cost_usd = 3900, china_cost_usd = 4500, dubai_cost_usd = 3500, updated_at = NOW() WHERE destination_id = 'moroni';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'victoria';
UPDATE shipping_routes SET korea_cost_usd = 3600, china_cost_usd = 4200, dubai_cost_usd = 3200, updated_at = NOW() WHERE destination_id = 'durban';
UPDATE shipping_routes SET korea_cost_usd = 3800, china_cost_usd = 4400, dubai_cost_usd = 3400, updated_at = NOW() WHERE destination_id = 'cape-town';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'walvis-bay';
UPDATE shipping_routes SET korea_cost_usd = 4200, china_cost_usd = 4800, dubai_cost_usd = 3800, updated_at = NOW() WHERE destination_id = 'gaborone';
UPDATE shipping_routes SET korea_cost_usd = 4100, china_cost_usd = 4700, dubai_cost_usd = 3700, updated_at = NOW() WHERE destination_id = 'harare';
UPDATE shipping_routes SET korea_cost_usd = 4200, china_cost_usd = 4800, dubai_cost_usd = 3800, updated_at = NOW() WHERE destination_id = 'lusaka';
UPDATE shipping_routes SET korea_cost_usd = 4300, china_cost_usd = 4900, dubai_cost_usd = 3900, updated_at = NOW() WHERE destination_id = 'lilongwe';
UPDATE shipping_routes SET korea_cost_usd = 3900, china_cost_usd = 4500, dubai_cost_usd = 3500, updated_at = NOW() WHERE destination_id = 'mbabane';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'maseru';
UPDATE shipping_routes SET korea_cost_usd = 3400, china_cost_usd = 4000, dubai_cost_usd = 2600, updated_at = NOW() WHERE destination_id = 'alexandrie';
UPDATE shipping_routes SET korea_cost_usd = 3300, china_cost_usd = 3900, dubai_cost_usd = 2500, updated_at = NOW() WHERE destination_id = 'port-said';
UPDATE shipping_routes SET korea_cost_usd = 3800, china_cost_usd = 4400, dubai_cost_usd = 3000, updated_at = NOW() WHERE destination_id = 'tripoli';
UPDATE shipping_routes SET korea_cost_usd = 4000, china_cost_usd = 4600, dubai_cost_usd = 3200, updated_at = NOW() WHERE destination_id = 'tunis';
UPDATE shipping_routes SET korea_cost_usd = 4200, china_cost_usd = 4800, dubai_cost_usd = 3400, updated_at = NOW() WHERE destination_id = 'alger';
UPDATE shipping_routes SET korea_cost_usd = 4400, china_cost_usd = 5000, dubai_cost_usd = 3600, updated_at = NOW() WHERE destination_id = 'casablanca';
UPDATE shipping_routes SET korea_cost_usd = 4500, china_cost_usd = 5100, dubai_cost_usd = 3700, updated_at = NOW() WHERE destination_id = 'tanger';
