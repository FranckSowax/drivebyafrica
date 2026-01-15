-- Create orders table for storing customer orders after deposit payment
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Vehicle info (copied from quote for historical record)
  vehicle_id TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_price_usd INTEGER NOT NULL,
  vehicle_source TEXT NOT NULL CHECK (vehicle_source IN ('korea', 'china', 'dubai')),

  -- Destination info
  destination_id TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,

  -- Shipping info
  shipping_type TEXT NOT NULL CHECK (shipping_type IN ('container', 'groupage')),
  shipping_cost_xaf INTEGER NOT NULL,
  insurance_cost_xaf INTEGER NOT NULL,
  inspection_fee_xaf INTEGER NOT NULL,
  total_cost_xaf INTEGER NOT NULL,

  -- Deposit info
  deposit_amount_usd INTEGER NOT NULL DEFAULT 1000,
  deposit_amount_xaf INTEGER NOT NULL DEFAULT 600000,
  deposit_paid_at TIMESTAMPTZ,
  deposit_payment_method TEXT CHECK (deposit_payment_method IN ('stripe', 'mobile_money', 'cash')),
  deposit_payment_reference TEXT,

  -- Balance info
  balance_amount_xaf INTEGER NOT NULL,
  balance_paid_at TIMESTAMPTZ,
  balance_payment_method TEXT CHECK (balance_payment_method IN ('stripe', 'mobile_money', 'cash', 'bank_transfer')),
  balance_payment_reference TEXT,

  -- Order status
  status TEXT NOT NULL DEFAULT 'pending_deposit' CHECK (status IN (
    'pending_deposit',    -- Waiting for deposit payment
    'deposit_paid',       -- Deposit received, inspection in progress
    'inspection_sent',    -- Inspection report sent to customer
    'pending_balance',    -- Waiting for balance payment
    'balance_paid',       -- Balance received, shipping in progress
    'shipped',            -- Vehicle shipped
    'in_transit',         -- Vehicle in transit
    'arrived',            -- Vehicle arrived at destination port
    'customs_clearance',  -- Going through customs
    'delivered',          -- Delivered to customer
    'cancelled',          -- Order cancelled
    'refunded'            -- Order refunded
  )),

  -- Tracking info
  shipping_eta DATE,
  tracking_number TEXT,
  tracking_url TEXT,

  -- Customer info at time of order
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  customer_country TEXT NOT NULL,

  -- Notes
  admin_notes TEXT,
  customer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_vehicle_id ON orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update orders (payments are processed server-side)
CREATE POLICY "Service role can manage orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Add whatsapp column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
  END IF;
END $$;
