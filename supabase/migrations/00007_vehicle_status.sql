-- Add status, is_visible and admin_notes columns to vehicles table
-- This allows admins to mark vehicles as reserved when a deposit is received

-- Add status column for vehicle reservation/sale tracking
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- Add is_visible column for admin visibility control
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add admin_notes column for internal notes
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Create index on is_visible for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_is_visible ON vehicles(is_visible);

-- Add comment for documentation
COMMENT ON COLUMN vehicles.status IS 'Vehicle status: available, reserved, sold, pending';
COMMENT ON COLUMN vehicles.is_visible IS 'Whether the vehicle is visible on the public site';
COMMENT ON COLUMN vehicles.admin_notes IS 'Internal admin notes about the vehicle';
