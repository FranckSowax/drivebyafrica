-- Migration: Vehicle Batches System for Collaborators
-- Date: 2026-01-24
-- Description: Add support for collaborators to add individual vehicles and vehicle batches

-- =============================================
-- 1. UPDATE VEHICLES TABLE
-- =============================================

-- Add collaborator fields to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS added_by_collaborator_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_collaborator_listing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS collaborator_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by_admin_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS collaborator_notes TEXT;

-- Create index for collaborator queries
CREATE INDEX IF NOT EXISTS idx_vehicles_collaborator ON vehicles(added_by_collaborator_id) WHERE is_collaborator_listing = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicles_pending_approval ON vehicles(collaborator_approved) WHERE is_collaborator_listing = TRUE;

-- =============================================
-- 2. CREATE VEHICLE_BATCHES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS vehicle_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Collaborator info
  added_by_collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Vehicle details (similar to vehicles table)
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Source info
  source TEXT NOT NULL DEFAULT 'collaborator',
  source_country TEXT NOT NULL, -- 'china', 'korea', 'dubai'

  -- Pricing
  price_per_unit_usd DECIMAL(10, 2) NOT NULL,

  -- Batch specific
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  minimum_order_quantity INTEGER NOT NULL CHECK (minimum_order_quantity > 0),

  -- Images
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,

  -- Vehicle specs
  mileage INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  drive_type TEXT,
  engine_size TEXT,
  body_type TEXT,
  color TEXT,
  condition TEXT DEFAULT 'used',

  -- Features (JSON array)
  features JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'sold_out'
  approved_by_admin_id UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Visibility
  is_visible BOOLEAN DEFAULT FALSE,

  -- Notes
  collaborator_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quantities CHECK (available_quantity <= total_quantity),
  CONSTRAINT valid_min_quantity CHECK (minimum_order_quantity <= total_quantity)
);

-- Create indexes
CREATE INDEX idx_batches_collaborator ON vehicle_batches(added_by_collaborator_id);
CREATE INDEX idx_batches_status ON vehicle_batches(status);
CREATE INDEX idx_batches_visible ON vehicle_batches(is_visible) WHERE is_visible = TRUE;
CREATE INDEX idx_batches_source_country ON vehicle_batches(source_country);
CREATE INDEX idx_batches_available ON vehicle_batches(available_quantity) WHERE available_quantity > 0;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vehicle_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicle_batches_updated_at
  BEFORE UPDATE ON vehicle_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_batches_updated_at();

-- =============================================
-- 3. CREATE BATCH_ORDERS TABLE (for tracking batch sales)
-- =============================================

CREATE TABLE IF NOT EXISTS batch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  batch_id UUID NOT NULL REFERENCES vehicle_batches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Order details
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  price_per_unit_usd DECIMAL(10, 2) NOT NULL,
  total_price_usd DECIMAL(10, 2) NOT NULL,

  -- Shipping
  destination_country TEXT NOT NULL,
  destination_port TEXT,
  shipping_cost_estimate_usd DECIMAL(10, 2),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'paid', 'shipping', 'delivered', 'cancelled'

  -- Payment
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_amount_usd DECIMAL(10, 2),
  full_payment_received BOOLEAN DEFAULT FALSE,

  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_batch_orders_batch ON batch_orders(batch_id);
CREATE INDEX idx_batch_orders_user ON batch_orders(user_id);
CREATE INDEX idx_batch_orders_status ON batch_orders(status);

-- Create updated_at trigger
CREATE TRIGGER trigger_batch_orders_updated_at
  BEFORE UPDATE ON batch_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_batches_updated_at();

-- =============================================
-- 4. RLS POLICIES FOR VEHICLES (Collaborator additions)
-- =============================================

-- Collaborators can insert vehicles
CREATE POLICY "collaborator_insert_vehicles" ON vehicles
  FOR INSERT
  WITH CHECK (
    is_collaborator_listing = TRUE
    AND
    added_by_collaborator_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Collaborators can view their own pending vehicles
CREATE POLICY "collaborator_select_own_vehicles" ON vehicles
  FOR SELECT
  USING (
    is_collaborator_listing = TRUE
    AND
    added_by_collaborator_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Collaborators can update their own pending vehicles
CREATE POLICY "collaborator_update_own_vehicles" ON vehicles
  FOR UPDATE
  USING (
    is_collaborator_listing = TRUE
    AND
    added_by_collaborator_id = auth.uid()
    AND
    collaborator_approved = FALSE
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Admins can approve collaborator vehicles
CREATE POLICY "admin_manage_collaborator_vehicles" ON vehicles
  FOR ALL
  USING (
    is_collaborator_listing = TRUE
    AND
    public.is_admin()
  );

-- =============================================
-- 5. RLS POLICIES FOR VEHICLE_BATCHES
-- =============================================

-- Enable RLS
ALTER TABLE vehicle_batches ENABLE ROW LEVEL SECURITY;

-- Collaborators can insert batches
CREATE POLICY "collaborator_insert_batches" ON vehicle_batches
  FOR INSERT
  WITH CHECK (
    added_by_collaborator_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Collaborators can view their own batches
CREATE POLICY "collaborator_select_own_batches" ON vehicle_batches
  FOR SELECT
  USING (
    added_by_collaborator_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Collaborators can update their own pending batches
CREATE POLICY "collaborator_update_own_batches" ON vehicle_batches
  FOR UPDATE
  USING (
    added_by_collaborator_id = auth.uid()
    AND
    status = 'pending'
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- Admins can manage all batches
CREATE POLICY "admin_manage_all_batches" ON vehicle_batches
  FOR ALL
  USING (public.is_admin());

-- Public can view approved and visible batches
CREATE POLICY "public_view_approved_batches" ON vehicle_batches
  FOR SELECT
  USING (
    status = 'approved'
    AND
    is_visible = TRUE
    AND
    available_quantity > 0
  );

-- =============================================
-- 6. RLS POLICIES FOR BATCH_ORDERS
-- =============================================

-- Enable RLS
ALTER TABLE batch_orders ENABLE ROW LEVEL SECURITY;

-- Users can create their own batch orders
CREATE POLICY "users_insert_own_batch_orders" ON batch_orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can view their own batch orders
CREATE POLICY "users_select_own_batch_orders" ON batch_orders
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all batch orders
CREATE POLICY "admin_manage_batch_orders" ON batch_orders
  FOR ALL
  USING (public.is_admin());

-- Collaborators can view batch orders for their batches
CREATE POLICY "collaborator_view_batch_orders" ON batch_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_batches vb
      WHERE vb.id = batch_orders.batch_id
      AND vb.added_by_collaborator_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'collaborator'
    )
  );

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to update batch available quantity after order
CREATE OR REPLACE FUNCTION update_batch_quantity_after_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease available quantity when order is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE vehicle_batches
    SET available_quantity = available_quantity - NEW.quantity_ordered
    WHERE id = NEW.batch_id;

    -- Mark as sold_out if no more available
    UPDATE vehicle_batches
    SET status = 'sold_out', is_visible = FALSE
    WHERE id = NEW.batch_id
    AND available_quantity <= 0;
  END IF;

  -- Increase available quantity if order is cancelled
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE vehicle_batches
    SET available_quantity = available_quantity + NEW.quantity_ordered,
        status = CASE WHEN status = 'sold_out' THEN 'approved' ELSE status END
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_quantity
  AFTER INSERT OR UPDATE OF status ON batch_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_quantity_after_order();

-- =============================================
-- 8. VIEWS FOR EASY QUERYING
-- =============================================

-- View for collaborator batch statistics
CREATE OR REPLACE VIEW collaborator_batch_stats AS
SELECT
  vb.added_by_collaborator_id,
  p.full_name AS collaborator_name,
  COUNT(*) AS total_batches,
  SUM(CASE WHEN vb.status = 'pending' THEN 1 ELSE 0 END) AS pending_batches,
  SUM(CASE WHEN vb.status = 'approved' THEN 1 ELSE 0 END) AS approved_batches,
  SUM(CASE WHEN vb.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_batches,
  SUM(vb.total_quantity) AS total_vehicles,
  SUM(vb.available_quantity) AS available_vehicles,
  SUM(vb.total_quantity - vb.available_quantity) AS sold_vehicles
FROM vehicle_batches vb
JOIN profiles p ON p.id = vb.added_by_collaborator_id
GROUP BY vb.added_by_collaborator_id, p.full_name;

GRANT SELECT ON collaborator_batch_stats TO authenticated;

-- =============================================
-- 9. COMMENTS
-- =============================================

COMMENT ON TABLE vehicle_batches IS 'Vehicle batches added by collaborators for bulk sales';
COMMENT ON COLUMN vehicle_batches.minimum_order_quantity IS 'Minimum number of vehicles required to purchase from this batch';
COMMENT ON COLUMN vehicle_batches.available_quantity IS 'Current available quantity (decreases with orders)';
COMMENT ON TABLE batch_orders IS 'Orders placed for vehicle batches';

-- =============================================
-- 10. VERIFICATION QUERY
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20250124_vehicle_batches completed successfully';
  RAISE NOTICE 'Tables created: vehicle_batches, batch_orders';
  RAISE NOTICE 'Collaborators can now add individual vehicles and vehicle batches';
  RAISE NOTICE 'Admins can approve/reject batches and manage orders';
END $$;
