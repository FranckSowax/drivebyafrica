-- Add new columns to existing orders table for invoice/payment tracking
-- This migration adds columns needed for the deposit payment flow and invoice generation

-- Add order_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number TEXT;
  END IF;
END $$;

-- Add invoice_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN invoice_number TEXT;
  END IF;
END $$;

-- Add quote_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'quote_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN quote_id UUID;
  END IF;
END $$;

-- Add vehicle_make column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vehicle_make'
  ) THEN
    ALTER TABLE orders ADD COLUMN vehicle_make TEXT;
  END IF;
END $$;

-- Add vehicle_model column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vehicle_model'
  ) THEN
    ALTER TABLE orders ADD COLUMN vehicle_model TEXT;
  END IF;
END $$;

-- Add vehicle_year column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vehicle_year'
  ) THEN
    ALTER TABLE orders ADD COLUMN vehicle_year INTEGER;
  END IF;
END $$;

-- Add vehicle_source column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vehicle_source'
  ) THEN
    ALTER TABLE orders ADD COLUMN vehicle_source TEXT;
  END IF;
END $$;

-- Add destination_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'destination_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN destination_id TEXT;
  END IF;
END $$;

-- Add destination_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'destination_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN destination_name TEXT;
  END IF;
END $$;

-- Add shipping_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_type TEXT;
  END IF;
END $$;

-- Add shipping_cost_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_cost_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_cost_xaf INTEGER;
  END IF;
END $$;

-- Add insurance_cost_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'insurance_cost_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN insurance_cost_xaf INTEGER;
  END IF;
END $$;

-- Add inspection_fee_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inspection_fee_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN inspection_fee_xaf INTEGER;
  END IF;
END $$;

-- Add total_cost_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_cost_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN total_cost_xaf INTEGER;
  END IF;
END $$;

-- Add deposit_amount_usd column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_amount_usd'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_amount_usd INTEGER DEFAULT 1000;
  END IF;
END $$;

-- Add deposit_amount_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_amount_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_amount_xaf INTEGER DEFAULT 600000;
  END IF;
END $$;

-- Add deposit_paid_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deposit_payment_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_payment_method TEXT;
  END IF;
END $$;

-- Add deposit_payment_reference column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'deposit_payment_reference'
  ) THEN
    ALTER TABLE orders ADD COLUMN deposit_payment_reference TEXT;
  END IF;
END $$;

-- Add balance_amount_xaf column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'balance_amount_xaf'
  ) THEN
    ALTER TABLE orders ADD COLUMN balance_amount_xaf INTEGER;
  END IF;
END $$;

-- Add balance_paid_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'balance_paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN balance_paid_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add balance_payment_method column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'balance_payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN balance_payment_method TEXT;
  END IF;
END $$;

-- Add balance_payment_reference column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'balance_payment_reference'
  ) THEN
    ALTER TABLE orders ADD COLUMN balance_payment_reference TEXT;
  END IF;
END $$;

-- Add shipping_eta column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_eta'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_eta DATE;
  END IF;
END $$;

-- Add tracking_url column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tracking_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_url TEXT;
  END IF;
END $$;

-- Add customer_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_name TEXT;
  END IF;
END $$;

-- Add customer_email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email TEXT;
  END IF;
END $$;

-- Add customer_whatsapp column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_whatsapp'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_whatsapp TEXT;
  END IF;
END $$;

-- Add customer_country column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_country'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_country TEXT;
  END IF;
END $$;

-- Add admin_notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- Add customer_notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_notes TEXT;
  END IF;
END $$;

-- Create indexes for new columns (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON orders(quote_id) WHERE quote_id IS NOT NULL;

-- Note: profiles table already has whatsapp_number column, no need to add it

-- Generate order_number and invoice_number for existing orders that don't have them
DO $$
DECLARE
  r RECORD;
  counter INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM orders WHERE order_number IS NULL ORDER BY created_at LOOP
    UPDATE orders SET
      order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0'),
      invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
    counter := counter + 1;
  END LOOP;
END $$;
