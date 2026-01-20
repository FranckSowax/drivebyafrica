-- Migration: Fix orders table status check constraint to support all 13 statuses

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the updated constraint with all 13 statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN (
  'deposit_paid',          -- 1. Acompte payé
  'vehicle_locked',        -- 2. Véhicule bloqué
  'inspection_sent',       -- 3. Inspection envoyée
  'full_payment_received', -- 4. Totalité du paiement reçu
  'vehicle_purchased',     -- 5. Véhicule acheté
  'export_customs',        -- 6. Douane export
  'in_transit',            -- 7. En transit
  'at_port',               -- 8. Au port
  'shipping',              -- 9. En mer
  'documents_ready',       -- 10. Remise documentation
  'customs',               -- 11. En douane
  'ready_pickup',          -- 12. Prêt pour retrait
  'delivered',             -- 13. Livré
  'processing',            -- Legacy status
  'pending',               -- Legacy status
  'confirmed',             -- Legacy status
  'cancelled'              -- Cancelled orders
));
