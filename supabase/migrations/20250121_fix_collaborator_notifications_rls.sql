-- =====================================================
-- FIX COLLABORATOR NOTIFICATIONS RLS
-- =====================================================
-- This migration ensures RLS policies are properly set up
-- for the collaborator_notifications table

-- 1. Make sure RLS is enabled
ALTER TABLE collaborator_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Collaborators can view notifications" ON collaborator_notifications;
DROP POLICY IF EXISTS "Collaborators can update notifications" ON collaborator_notifications;
DROP POLICY IF EXISTS "Admins can manage collaborator notifications" ON collaborator_notifications;

-- 3. Create policy: Collaborators can SELECT notifications
CREATE POLICY "Collaborators can view notifications" ON collaborator_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
    )
  );

-- 4. Create policy: Collaborators can UPDATE (mark as read/dismissed)
CREATE POLICY "Collaborators can update notifications" ON collaborator_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
    )
  );

-- 5. Create policy: Admins can do everything
CREATE POLICY "Admins can manage collaborator notifications" ON collaborator_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- 6. Grant permissions to authenticated users
GRANT SELECT, UPDATE ON collaborator_notifications TO authenticated;

-- 7. Verification query (run this to check if policies are active)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'collaborator_notifications';
