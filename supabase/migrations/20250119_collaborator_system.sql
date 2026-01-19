-- =====================================================
-- COLLABORATOR SYSTEM MIGRATION
-- =====================================================
-- Adds collaborator role and related tables for order management
-- by logistics partners (agents in China/Korea/Dubai)

-- =====================================================
-- 1. ADD COLLABORATOR ROLE TO PROFILES
-- =====================================================

-- Update the role constraint to include 'collaborator'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'super_admin', 'collaborator'));

-- Create index for collaborator role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_collaborator ON profiles(role) WHERE role = 'collaborator';

-- =====================================================
-- 2. COLLABORATOR NOTIFICATIONS TABLE
-- =====================================================
-- Shared notifications for all collaborators (like admin_notifications)

CREATE TABLE IF NOT EXISTS collaborator_notifications (
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
  -- Multi-user read/dismiss tracking (array of user IDs)
  read_by UUID[] DEFAULT '{}',
  dismissed_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for collaborator_notifications
CREATE INDEX IF NOT EXISTS idx_collaborator_notifications_created_at
  ON collaborator_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborator_notifications_type
  ON collaborator_notifications(type);
CREATE INDEX IF NOT EXISTS idx_collaborator_notifications_priority
  ON collaborator_notifications(priority) WHERE priority IN ('high', 'urgent');

-- =====================================================
-- 3. COLLABORATOR ACTIVITY LOG
-- =====================================================
-- Tracks all collaborator actions for audit purposes

CREATE TABLE IF NOT EXISTS collaborator_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'status_update', 'document_upload', 'login', 'logout'
  order_id UUID,
  quote_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_collaborator_activity_collaborator
  ON collaborator_activity_log(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_activity_created
  ON collaborator_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborator_activity_order
  ON collaborator_activity_log(order_id) WHERE order_id IS NOT NULL;

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on collaborator_notifications
ALTER TABLE collaborator_notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on collaborator_activity_log
ALTER TABLE collaborator_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Collaborators can view collaborator notifications
CREATE POLICY "Collaborators can view notifications" ON collaborator_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
    )
  );

-- Policy: Collaborators can update (mark as read/dismissed)
CREATE POLICY "Collaborators can update notifications" ON collaborator_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
    )
  );

-- Policy: Admins can manage collaborator notifications
CREATE POLICY "Admins can manage collaborator notifications" ON collaborator_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Collaborators can view their own activity
CREATE POLICY "Collaborators can view own activity" ON collaborator_activity_log
  FOR SELECT USING (
    collaborator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: System can insert activity logs (via service role)
CREATE POLICY "System can insert activity logs" ON collaborator_activity_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. TRIGGER: NOTIFY COLLABORATORS ON NEW ORDER
-- =====================================================
-- When a quote status changes to 'accepted' (deposit paid),
-- create a notification for collaborators

CREATE OR REPLACE FUNCTION notify_collaborators_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO collaborator_notifications (
      type,
      title,
      message,
      priority,
      action_url,
      icon,
      related_entity_type,
      related_entity_id,
      data
    ) VALUES (
      'new_order',
      'New Order Received / 新订单',
      format('Order %s - %s %s %s',
        COALESCE(NEW.quote_number, 'N/A'),
        COALESCE(NEW.vehicle_make, ''),
        COALESCE(NEW.vehicle_model, ''),
        COALESCE(NEW.vehicle_year::text, '')
      ),
      'high',
      format('/collaborator/orders?order=%s', NEW.id),
      'ShoppingCart',
      'order',
      NEW.id,
      jsonb_build_object(
        'quote_id', NEW.id,
        'quote_number', NEW.quote_number,
        'vehicle_make', NEW.vehicle_make,
        'vehicle_model', NEW.vehicle_model,
        'vehicle_year', NEW.vehicle_year,
        'destination_country', NEW.destination_country
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_collaborators_new_order ON quotes;
CREATE TRIGGER trigger_notify_collaborators_new_order
  AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_collaborators_new_order();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for authenticated users
GRANT SELECT, UPDATE ON collaborator_notifications TO authenticated;
GRANT SELECT ON collaborator_activity_log TO authenticated;
GRANT INSERT ON collaborator_activity_log TO authenticated;

-- =====================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE collaborator_notifications IS 'Shared notifications for collaborators (logistics partners)';
COMMENT ON TABLE collaborator_activity_log IS 'Audit log of all collaborator actions';
COMMENT ON COLUMN collaborator_notifications.read_by IS 'Array of collaborator IDs who have read this notification';
COMMENT ON COLUMN collaborator_notifications.dismissed_by IS 'Array of collaborator IDs who have dismissed this notification';
COMMENT ON COLUMN collaborator_activity_log.action_type IS 'Type of action: status_update, document_upload, login, logout';
