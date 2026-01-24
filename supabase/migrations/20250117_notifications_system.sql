-- =====================================================
-- NOTIFICATIONS SYSTEM - Migration Script
-- =====================================================
-- This migration enhances the notifications table to support
-- both user and admin notifications with proper categorization
-- =====================================================

-- =====================================================
-- STEP 1: Add role column to profiles table
-- =====================================================
DO $$
BEGIN
  -- Add role column to profiles if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- Add check constraint for role values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- Create index for role column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- STEP 2: Add new columns to notifications table
-- =====================================================
-- Add new columns to notifications table if they don't exist
DO $$
BEGIN
  -- Add category column (user, admin, system)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'user';
  END IF;

  -- Add priority column (low, normal, high, urgent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;

  -- Add action_url column for clickable notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;

  -- Add action_label column for button text
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_label') THEN
    ALTER TABLE notifications ADD COLUMN action_label TEXT;
  END IF;

  -- Add icon column for notification icon
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'icon') THEN
    ALTER TABLE notifications ADD COLUMN icon TEXT;
  END IF;

  -- Add expires_at column for auto-expiring notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Add dismissed column for soft delete
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'dismissed') THEN
    ALTER TABLE notifications ADD COLUMN dismissed BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add related_entity_type (order, quote, vehicle, reassignment, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_entity_type') THEN
    ALTER TABLE notifications ADD COLUMN related_entity_type TEXT;
  END IF;

  -- Add related_entity_id for linking to specific records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_entity_id') THEN
    ALTER TABLE notifications ADD COLUMN related_entity_id UUID;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  -- Category constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_category_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_category_check
      CHECK (category IN ('user', 'admin', 'system'));
  END IF;

  -- Priority constraint
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_priority_check') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- Create admin_notifications table for admin-specific notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  action_label TEXT,
  icon TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  read_by UUID[] DEFAULT '{}',
  dismissed_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);

-- Enable RLS on admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all admin notifications
DROP POLICY IF EXISTS "Admins can view admin notifications" ON admin_notifications;
CREATE POLICY "Admins can view admin notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins can update admin notifications (mark as read)
DROP POLICY IF EXISTS "Admins can update admin notifications" ON admin_notifications;
CREATE POLICY "Admins can update admin notifications" ON admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Function to create user notification
CREATE OR REPLACE FUNCTION create_user_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, action_url, action_label,
    icon, priority, category, related_entity_type, related_entity_id, data
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_action_url, p_action_label,
    p_icon, p_priority, 'user', p_related_entity_type, p_related_entity_id, p_data
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notification
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (
    type, title, message, action_url, action_label,
    icon, priority, related_entity_type, related_entity_id, data
  ) VALUES (
    p_type, p_title, p_message, p_action_url, p_action_label,
    p_icon, p_priority, p_related_entity_type, p_related_entity_id, p_data
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark admin notification as read
CREATE OR REPLACE FUNCTION mark_admin_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_notifications
  SET read_by = array_append(read_by, auth.uid())
  WHERE id = p_notification_id
  AND NOT (auth.uid() = ANY(read_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET dismissed = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify on new order
CREATE OR REPLACE FUNCTION notify_on_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify user
  PERFORM create_user_notification(
    NEW.user_id,
    'order_created',
    'Commande créée',
    'Votre commande #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' a été créée avec succès.',
    '/dashboard/orders/' || NEW.id,
    'Voir la commande',
    'package',
    'normal',
    'order',
    NEW.id
  );

  -- Notify admins
  PERFORM create_admin_notification(
    'new_order',
    'Nouvelle commande',
    'Une nouvelle commande a été passée.',
    '/admin/orders',
    'Gérer les commandes',
    'shopping-cart',
    'high',
    'order',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify on quote status change
CREATE OR REPLACE FUNCTION notify_on_quote_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify user based on new status
    IF NEW.status = 'accepted' THEN
      PERFORM create_user_notification(
        NEW.user_id,
        'quote_accepted',
        'Devis accepté',
        'Votre devis #' || NEW.quote_number || ' a été accepté.',
        '/dashboard/quotes',
        'Voir le devis',
        'check-circle',
        'high',
        'quote',
        NEW.id
      );
    ELSIF NEW.status = 'expired' THEN
      PERFORM create_user_notification(
        NEW.user_id,
        'quote_expired',
        'Devis expiré',
        'Votre devis #' || NEW.quote_number || ' a expiré.',
        '/dashboard/quotes',
        'Voir les devis',
        'clock',
        'normal',
        'quote',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify on reassignment
CREATE OR REPLACE FUNCTION notify_on_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Notify admins about new reassignment request
    PERFORM create_admin_notification(
      'new_reassignment',
      'Nouvelle réassignation',
      'Un véhicule n''est plus disponible. Une réassignation est requise.',
      '/admin/quotes/reassignments',
      'Gérer',
      'refresh-cw',
      'urgent',
      'reassignment',
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify user when alternatives are proposed
    IF NEW.status = 'pending_selection' THEN
      PERFORM create_user_notification(
        NEW.user_id,
        'alternatives_available',
        'Alternatives disponibles',
        'Des véhicules similaires ont été trouvés pour remplacer votre véhicule original.',
        '/reassignment/' || NEW.id,
        'Voir les alternatives',
        'car',
        'high',
        'reassignment',
        NEW.id
      );
    ELSIF NEW.status = 'completed' THEN
      PERFORM create_user_notification(
        NEW.user_id,
        'reassignment_completed',
        'Réassignation terminée',
        'Votre véhicule de remplacement a été confirmé.',
        '/dashboard/quotes',
        'Voir le nouveau devis',
        'check-circle',
        'high',
        'reassignment',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS trigger_notify_on_new_order ON orders;
CREATE TRIGGER trigger_notify_on_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_order();

DROP TRIGGER IF EXISTS trigger_notify_on_quote_update ON quotes;
CREATE TRIGGER trigger_notify_on_quote_update
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_quote_update();

DROP TRIGGER IF EXISTS trigger_notify_on_reassignment ON quote_reassignments;
CREATE TRIGGER trigger_notify_on_reassignment
  AFTER INSERT OR UPDATE ON quote_reassignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_reassignment();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_admin_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_notification TO authenticated;

-- =====================================================
-- PREVENT DUPLICATE ORDERS FOR THE SAME VEHICLE
-- =====================================================
-- Only one active order per vehicle (not cancelled/completed)

-- First, clean up existing duplicates by keeping only the most recent order
-- and cancelling older ones for the same vehicle
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  -- Find all vehicles with duplicate active orders
  FOR dup_record IN
    SELECT vehicle_id, array_agg(id ORDER BY created_at DESC) as order_ids
    FROM orders
    WHERE status NOT IN ('cancelled', 'completed', 'delivered')
    GROUP BY vehicle_id
    HAVING COUNT(*) > 1
  LOOP
    -- Cancel all but the most recent order (first in array)
    UPDATE orders
    SET status = 'cancelled',
        admin_notes = COALESCE(admin_notes, '') || ' [Auto-annulé: doublon détecté]'
    WHERE id = ANY(dup_record.order_ids[2:])
    AND status NOT IN ('cancelled', 'completed', 'delivered');
  END LOOP;
END $$;

-- Now create unique partial index to prevent future duplicate orders
DROP INDEX IF EXISTS idx_orders_unique_active_vehicle;
CREATE UNIQUE INDEX idx_orders_unique_active_vehicle
  ON orders(vehicle_id)
  WHERE status NOT IN ('cancelled', 'completed', 'delivered');

-- Function to check for existing active orders before inserting
CREATE OR REPLACE FUNCTION check_duplicate_vehicle_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if an active order already exists for this vehicle
  IF EXISTS (
    SELECT 1 FROM orders
    WHERE vehicle_id = NEW.vehicle_id
    AND status NOT IN ('cancelled', 'completed', 'delivered')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Une commande existe déjà pour ce véhicule. Vous ne pouvez pas passer plusieurs commandes pour le même véhicule.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run check before insert
DROP TRIGGER IF EXISTS trigger_check_duplicate_vehicle_order ON orders;
CREATE TRIGGER trigger_check_duplicate_vehicle_order
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_vehicle_order();
