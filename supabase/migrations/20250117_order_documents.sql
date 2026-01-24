-- =====================================================
-- ORDER DOCUMENTS - Migration Script
-- =====================================================
-- Adds document upload functionality to orders
-- =====================================================

-- Add documentation_fee_usd column to orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'documentation_fee_usd') THEN
    ALTER TABLE orders ADD COLUMN documentation_fee_usd NUMERIC(12,2) DEFAULT 150;
  END IF;
END $$;

-- Add uploaded_documents column (array of document objects with name, url, type, uploaded_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'uploaded_documents') THEN
    ALTER TABLE orders ADD COLUMN uploaded_documents JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add documents_sent_at timestamp for when documents were sent to customer
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'documents_sent_at') THEN
    ALTER TABLE orders ADD COLUMN documents_sent_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_documents_sent ON orders(documents_sent_at) WHERE documents_sent_at IS NOT NULL;

-- Function to notify user when documents are uploaded
CREATE OR REPLACE FUNCTION notify_documents_uploaded()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when documents are newly sent (documents_sent_at changes from NULL to a value)
  IF OLD.documents_sent_at IS NULL AND NEW.documents_sent_at IS NOT NULL THEN
    -- Create user notification
    PERFORM create_user_notification(
      NEW.user_id,
      'documents_ready',
      'Documents disponibles',
      'Les documents de votre commande #' || COALESCE(NEW.order_number, SUBSTRING(NEW.id::TEXT, 1, 8)) || ' sont disponibles.',
      '/dashboard/orders/' || NEW.id,
      'Voir les documents',
      'file-text',
      'high',
      'order',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document notification
DROP TRIGGER IF EXISTS trigger_notify_documents_uploaded ON orders;
CREATE TRIGGER trigger_notify_documents_uploaded
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.documents_sent_at IS DISTINCT FROM NEW.documents_sent_at)
  EXECUTE FUNCTION notify_documents_uploaded();
