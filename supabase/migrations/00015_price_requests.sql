-- Add quote_type column to differentiate between standard quotes and price requests
-- Price requests are for Dubai vehicles without a listed price

-- Add quote_type column with default 'quote' for existing records
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_type TEXT NOT NULL DEFAULT 'quote'
  CHECK (quote_type IN ('quote', 'price_request'));

-- Add admin_price_usd for when admin provides a price for price requests
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_price_usd INTEGER;

-- Add admin_notes for admin to add notes about the price
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add notification_sent flag to track if user was notified
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Update status constraint to include 'price_received' status
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('pending', 'validated', 'accepted', 'rejected', 'expired', 'cancelled', 'reassigned', 'price_received'));

-- Make vehicle_price_usd nullable for price requests
ALTER TABLE quotes ALTER COLUMN vehicle_price_usd DROP NOT NULL;

-- Make shipping/insurance columns nullable for price requests (will be calculated later)
ALTER TABLE quotes ALTER COLUMN shipping_cost_xaf DROP NOT NULL;
ALTER TABLE quotes ALTER COLUMN insurance_cost_xaf DROP NOT NULL;
ALTER TABLE quotes ALTER COLUMN inspection_fee_xaf DROP NOT NULL;
ALTER TABLE quotes ALTER COLUMN total_cost_xaf DROP NOT NULL;

-- Create index for quote_type
CREATE INDEX IF NOT EXISTS idx_quotes_quote_type ON quotes(quote_type);

-- Create index for notification_sent (to find quotes needing notification)
CREATE INDEX IF NOT EXISTS idx_quotes_notification_sent ON quotes(notification_sent) WHERE notification_sent = FALSE;
