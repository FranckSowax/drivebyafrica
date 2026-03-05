-- Add shipping_type column to vehicle_batches
ALTER TABLE vehicle_batches
ADD COLUMN IF NOT EXISTS shipping_type TEXT DEFAULT '20hq';

COMMENT ON COLUMN vehicle_batches.shipping_type IS 'Shipping method: 20hq (20 pieds, 2 vehicles), 40hq (40 pieds, 4 vehicles)';
