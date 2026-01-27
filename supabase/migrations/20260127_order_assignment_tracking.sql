-- Migration: Add collaborator tracking fields for order management
-- This adds badge colors for collaborators and last_modified tracking for orders

-- Add badge_color to profiles for collaborator identification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT NULL;

-- Add last_modified_by tracking to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_orders_last_modified_by ON orders(last_modified_by) WHERE last_modified_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collaborator_activity_order_recent ON collaborator_activity_log(order_id, created_at DESC) WHERE order_id IS NOT NULL;

-- Comment explaining the color system
COMMENT ON COLUMN profiles.badge_color IS 'Hex color code for collaborator badge display. Pre-defined palette: #3B82F6 (blue), #8B5CF6 (purple), #EC4899 (pink), #F59E0B (amber), #10B981 (emerald), #06B6D4 (cyan), #F43F5E (rose), #6366F1 (indigo), #84CC16 (lime), #14B8A6 (teal)';
COMMENT ON COLUMN orders.last_modified_by IS 'UUID of the collaborator/admin who last modified this order';
COMMENT ON COLUMN orders.last_modified_at IS 'Timestamp of the last modification';
