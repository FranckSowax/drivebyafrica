-- Add 40-foot container price columns to shipping_routes and shipping_partner_quote_routes
-- The existing korea_cost_usd, china_cost_usd, dubai_cost_usd are for 20ft containers
-- New columns for 40ft container prices

-- 1. Add 40ft columns to admin shipping_routes
ALTER TABLE shipping_routes
  ADD COLUMN IF NOT EXISTS korea_cost_40ft_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS china_cost_40ft_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dubai_cost_40ft_usd INTEGER NOT NULL DEFAULT 0;

-- 2. Add 40ft columns to partner quote routes
ALTER TABLE shipping_partner_quote_routes
  ADD COLUMN IF NOT EXISTS korea_cost_40ft_usd INTEGER,
  ADD COLUMN IF NOT EXISTS china_cost_40ft_usd INTEGER,
  ADD COLUMN IF NOT EXISTS dubai_cost_40ft_usd INTEGER;

COMMENT ON COLUMN shipping_routes.korea_cost_usd IS 'Shipping cost in USD for a 20ft container from Korea';
COMMENT ON COLUMN shipping_routes.korea_cost_40ft_usd IS 'Shipping cost in USD for a 40ft container from Korea';
COMMENT ON COLUMN shipping_routes.china_cost_usd IS 'Shipping cost in USD for a 20ft container from China';
COMMENT ON COLUMN shipping_routes.china_cost_40ft_usd IS 'Shipping cost in USD for a 40ft container from China';
COMMENT ON COLUMN shipping_routes.dubai_cost_usd IS 'Shipping cost in USD for a 20ft container from Dubai';
COMMENT ON COLUMN shipping_routes.dubai_cost_40ft_usd IS 'Shipping cost in USD for a 40ft container from Dubai';
