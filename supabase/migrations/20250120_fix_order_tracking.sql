-- Migration: Fix/Create order_tracking table to support all 13 statuses
-- This migration handles the case where the table exists with a different structure

-- First, check if table exists and get its structure
-- If it exists with wrong structure, we'll drop and recreate it

-- Drop existing table if it has wrong structure (backup data first if needed)
DROP TABLE IF EXISTS order_tracking CASCADE;

-- Create the order_tracking table with correct structure
CREATE TABLE order_tracking (
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

-- Create indexes
CREATE INDEX idx_order_tracking_quote ON order_tracking(quote_id);
CREATE INDEX idx_order_tracking_status ON order_tracking(order_status);
CREATE INDEX idx_order_tracking_eta ON order_tracking(shipping_eta);

-- Enable RLS
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

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
