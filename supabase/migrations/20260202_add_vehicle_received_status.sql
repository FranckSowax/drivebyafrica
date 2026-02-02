-- Migration: Add vehicle_received status and shipping partner assignment
-- This adds the ability to assign a shipping partner when receiving a vehicle

-- 1. Add assigned_shipping_partner_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_shipping_partner_id UUID REFERENCES shipping_partners(id);

-- Index for joins
CREATE INDEX IF NOT EXISTS idx_orders_shipping_partner ON orders(assigned_shipping_partner_id);

-- 2. Update orders.status CHECK constraint to include vehicle_received
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'deposit_paid',          -- 1. Acompte payé
  'vehicle_locked',        -- 2. Véhicule bloqué
  'inspection_sent',       -- 3. Inspection envoyée
  'full_payment_received', -- 4. Totalité du paiement reçu
  'vehicle_purchased',     -- 5. Véhicule acheté
  'vehicle_received',      -- 6. Réception véhicule (NEW)
  'export_customs',        -- 7. Douane export
  'in_transit',            -- 8. En transit
  'at_port',               -- 9. Au port
  'shipping',              -- 10. En mer
  'documents_ready',       -- 11. Remise documentation
  'customs',               -- 12. En douane
  'ready_pickup',          -- 13. Prêt pour retrait
  'delivered',             -- 14. Livré
  'processing',            -- Legacy status
  'pending',               -- Legacy status
  'confirmed',             -- Legacy status
  'cancelled',             -- Cancelled orders
  'pending_reassignment'   -- Vehicle reassignment
));

-- 3. Update order_tracking.order_status CHECK constraint to include vehicle_received
ALTER TABLE order_tracking DROP CONSTRAINT IF EXISTS order_tracking_order_status_check;
ALTER TABLE order_tracking ADD CONSTRAINT order_tracking_order_status_check
CHECK (order_status IN (
  'deposit_paid',
  'vehicle_locked',
  'inspection_sent',
  'full_payment_received',
  'vehicle_purchased',
  'vehicle_received',
  'export_customs',
  'in_transit',
  'at_port',
  'shipping',
  'documents_ready',
  'customs',
  'ready_pickup',
  'delivered',
  'processing',
  'pending_reassignment'
));
