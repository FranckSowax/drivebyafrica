-- Add RORO and Flat Rack pricing columns to shipping_routes
ALTER TABLE shipping_routes
  ADD COLUMN IF NOT EXISTS korea_roro_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS china_roro_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dubai_roro_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS korea_flat_rack_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS china_flat_rack_usd INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dubai_flat_rack_usd INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN shipping_routes.korea_roro_usd IS 'RORO (Roll-on/Roll-off) cost in USD from Korea - per vehicle';
COMMENT ON COLUMN shipping_routes.china_roro_usd IS 'RORO (Roll-on/Roll-off) cost in USD from China - per vehicle';
COMMENT ON COLUMN shipping_routes.dubai_roro_usd IS 'RORO (Roll-on/Roll-off) cost in USD from Dubai - per vehicle';
COMMENT ON COLUMN shipping_routes.korea_flat_rack_usd IS 'Flat Rack cost in USD from Korea - per vehicle';
COMMENT ON COLUMN shipping_routes.china_flat_rack_usd IS 'Flat Rack cost in USD from China - per vehicle';
COMMENT ON COLUMN shipping_routes.dubai_flat_rack_usd IS 'Flat Rack cost in USD from Dubai - per vehicle';

-- Also update vehicle_batches shipping_type to support new options
COMMENT ON COLUMN vehicle_batches.shipping_type IS 'Shipping method: 20hq (20 pieds, 2 vehicles), 40hq (40 pieds, 4 vehicles), roro (Roll-on/Roll-off, per vehicle), flat_rack (Flat Rack, per vehicle)';
