-- Fix notifications type constraint to include all notification types used in the system
-- The original constraint only allowed: 'bid_update', 'auction_start', 'order_update', 'new_match', 'system'
-- But the notification functions use additional types like 'quote_accepted', 'order_created', etc.

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new constraint with all valid types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Original types
    'bid_update',
    'auction_start',
    'order_update',
    'new_match',
    'system',
    -- Quote-related types
    'quote_accepted',
    'quote_expired',
    'quote_rejected',
    'quote_priced',
    -- Order-related types
    'new_order',
    'order_created',
    'order_shipped',
    'order_delivered',
    'documents_uploaded',
    -- Reassignment types
    'reassignment_request',
    'reassignment_complete',
    -- General types
    'info',
    'warning',
    'success',
    'error'
  ));
