-- Migration: Fix order_tracking table to support all 13 statuses
-- This migration ensures the table exists and has the correct structure

-- First, drop and recreate the constraint to support all 13 statuses
ALTER TABLE IF EXISTS order_tracking
DROP CONSTRAINT IF EXISTS order_tracking_order_status_check;

-- Add the updated constraint with all 13 statuses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_tracking') THEN
    ALTER TABLE order_tracking
    ADD CONSTRAINT order_tracking_order_status_check
    CHECK (order_status IN (
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
      'processing'             -- Legacy status
    ));
  END IF;
END $$;

-- Create the table if it doesn't exist (with all 13 statuses)
CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE UNIQUE,
    order_status TEXT NOT NULL DEFAULT 'deposit_paid' CHECK (order_status IN (
      'deposit_paid',
      'vehicle_locked',
      'inspection_sent',
      'full_payment_received',
      'vehicle_purchased',
      'export_customs',
      'in_transit',
      'at_port',
      'shipping',
      'documents_ready',
      'customs',
      'ready_pickup',
      'delivered',
      'processing'
    )),
    tracking_steps JSONB DEFAULT '[]'::jsonb,
    shipping_eta DATE,
    vessel_name TEXT,
    container_number TEXT,
    bill_of_lading TEXT,
    customs_reference TEXT,
    delivery_address TEXT,
    delivery_contact TEXT,
    admin_notes TEXT,
    uploaded_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add uploaded_documents column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'uploaded_documents'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN uploaded_documents JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_order_tracking_quote ON order_tracking(quote_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_status ON order_tracking(order_status);
CREATE INDEX IF NOT EXISTS idx_order_tracking_eta ON order_tracking(shipping_eta);

-- Enable RLS
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Authenticated users access order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "admin_select_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "admin_update_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "admin_insert_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_select_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_update_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_insert_order_tracking" ON order_tracking;

-- Admin policies
CREATE POLICY "admin_select_all_order_tracking" ON order_tracking
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_update_all_order_tracking" ON order_tracking
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_insert_order_tracking" ON order_tracking
  FOR INSERT WITH CHECK (public.is_admin());

-- Collaborator policies
CREATE POLICY "collaborator_select_all_order_tracking" ON order_tracking
  FOR SELECT USING (public.is_collaborator());

CREATE POLICY "collaborator_update_all_order_tracking" ON order_tracking
  FOR UPDATE USING (public.is_collaborator());

CREATE POLICY "collaborator_insert_order_tracking" ON order_tracking
  FOR INSERT WITH CHECK (public.is_collaborator());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_order_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_tracking_updated_at ON order_tracking;
CREATE TRIGGER order_tracking_updated_at
    BEFORE UPDATE ON order_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_order_tracking_updated_at();

-- Grant permissions
GRANT ALL ON order_tracking TO authenticated;
GRANT ALL ON order_tracking TO service_role;
