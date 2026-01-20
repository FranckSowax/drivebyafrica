-- Migration: Fix order_tracking table to support all 13 statuses
-- This migration ensures the table exists and has the correct structure

-- Add missing columns first (before any constraints)
DO $$
BEGIN
  -- Add order_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'order_status'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN order_status TEXT NOT NULL DEFAULT 'deposit_paid';
  END IF;

  -- Add tracking_steps column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'tracking_steps'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN tracking_steps JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add shipping_eta column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'shipping_eta'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN shipping_eta DATE;
  END IF;

  -- Add vessel_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'vessel_name'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN vessel_name TEXT;
  END IF;

  -- Add container_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'container_number'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN container_number TEXT;
  END IF;

  -- Add bill_of_lading column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'bill_of_lading'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN bill_of_lading TEXT;
  END IF;

  -- Add customs_reference column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'customs_reference'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN customs_reference TEXT;
  END IF;

  -- Add delivery_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN delivery_address TEXT;
  END IF;

  -- Add delivery_contact column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'delivery_contact'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN delivery_contact TEXT;
  END IF;

  -- Add admin_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN admin_notes TEXT;
  END IF;

  -- Add uploaded_documents column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'uploaded_documents'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN uploaded_documents JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_tracking' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_tracking ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Now drop and recreate the constraint for order_status
ALTER TABLE order_tracking
DROP CONSTRAINT IF EXISTS order_tracking_order_status_check;

ALTER TABLE order_tracking
ADD CONSTRAINT order_tracking_order_status_check
CHECK (order_status IN (
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
));

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
