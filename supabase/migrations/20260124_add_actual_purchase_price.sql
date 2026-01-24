-- Add actual_purchase_price_usd column to orders table
-- This field is for admin/collaborator use only - stores the real purchase price of the vehicle
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS actual_purchase_price_usd DECIMAL(10, 2);

-- Add actual_purchase_price_usd column to batch_orders table
ALTER TABLE batch_orders
ADD COLUMN IF NOT EXISTS actual_purchase_price_usd DECIMAL(10, 2);

-- Add comments
COMMENT ON COLUMN orders.actual_purchase_price_usd IS 'Real purchase price paid by collaborator (admin/collaborator only, not visible to customer)';
COMMENT ON COLUMN batch_orders.actual_purchase_price_usd IS 'Real purchase price paid by collaborator per unit (admin/collaborator only, not visible to customer)';
