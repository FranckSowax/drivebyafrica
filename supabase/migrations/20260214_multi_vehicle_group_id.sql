-- Multi-vehicle grouped quotes and orders
-- Allows 2-3 vehicles to be grouped in a single 40ft container shipment

-- Add group_id to quotes table (NULL = single vehicle, UUID = grouped)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS group_vehicle_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS container_type TEXT NOT NULL DEFAULT '20ft';

-- Add group_id to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS group_vehicle_count INTEGER NOT NULL DEFAULT 1;

-- Partial indexes for fast group lookups (only index non-null group_ids)
CREATE INDEX IF NOT EXISTS idx_quotes_group_id ON quotes(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON orders(group_id) WHERE group_id IS NOT NULL;
