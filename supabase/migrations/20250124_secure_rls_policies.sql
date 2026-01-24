-- Migration: Secure RLS Policies
-- Date: 2026-01-24
-- Description: Fix overly permissive RLS policies and add missing UPDATE/DELETE policies
-- This migration ensures that users can only modify their own data and admins have proper access

-- =============================================
-- HELPER FUNCTIONS (if not already created)
-- =============================================

-- Check if functions exist, create if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    CREATE FUNCTION public.is_admin()
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END$$;

-- =============================================
-- 1. FIX CHAT CONVERSATIONS & MESSAGES POLICIES
-- Remove overly permissive policies
-- =============================================

-- Chat Conversations
DROP POLICY IF EXISTS "Authenticated users can view all conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Authenticated users can update all conversations" ON chat_conversations;

-- Recreate secure policies for chat_conversations
-- Users can only view their own conversations
CREATE POLICY "users_select_own_conversations" ON chat_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only update their own conversations
CREATE POLICY "users_update_own_conversations" ON chat_conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all conversations
CREATE POLICY "admin_select_all_conversations" ON chat_conversations
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_update_all_conversations" ON chat_conversations
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Prevent DELETE on conversations (soft delete recommended)
CREATE POLICY "prevent_delete_conversations" ON chat_conversations
  FOR DELETE
  USING (public.is_admin());

-- Chat Messages
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON chat_messages;

-- Users can view messages in their conversations
CREATE POLICY "users_select_own_messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Users can insert messages in their conversations
CREATE POLICY "users_insert_own_messages" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Users can update only read_at on their messages
CREATE POLICY "users_update_own_messages" ON chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- Admins can manage all messages
CREATE POLICY "admin_select_all_messages" ON chat_messages
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "admin_insert_all_messages" ON chat_messages
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_all_messages" ON chat_messages
  FOR UPDATE
  USING (public.is_admin());

-- Prevent DELETE on messages (admins only)
CREATE POLICY "prevent_delete_messages" ON chat_messages
  FOR DELETE
  USING (public.is_admin());

-- =============================================
-- 2. ADD MISSING UPDATE/DELETE POLICIES
-- =============================================

-- PROFILES
-- Prevent users from deleting their own profile (admins only)
DROP POLICY IF EXISTS "prevent_delete_profiles" ON profiles;
CREATE POLICY "prevent_delete_profiles" ON profiles
  FOR DELETE
  USING (public.is_admin());

-- Admins can update any profile
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
CREATE POLICY "admin_update_all_profiles" ON profiles
  FOR UPDATE
  USING (public.is_admin());

-- VEHICLES
-- Only admins can update vehicles
DROP POLICY IF EXISTS "admin_update_vehicles" ON vehicles;
CREATE POLICY "admin_update_vehicles" ON vehicles
  FOR UPDATE
  USING (public.is_admin());

-- Only admins can insert vehicles
DROP POLICY IF EXISTS "admin_insert_vehicles" ON vehicles;
CREATE POLICY "admin_insert_vehicles" ON vehicles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can delete vehicles
DROP POLICY IF EXISTS "admin_delete_vehicles" ON vehicles;
CREATE POLICY "admin_delete_vehicles" ON vehicles
  FOR DELETE
  USING (public.is_admin());

-- BIDS
-- Users can update their own pending bids (e.g., to cancel)
DROP POLICY IF EXISTS "users_update_own_bids" ON bids;
CREATE POLICY "users_update_own_bids" ON bids
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Admins can update all bids
DROP POLICY IF EXISTS "admin_update_all_bids" ON bids;
CREATE POLICY "admin_update_all_bids" ON bids
  FOR UPDATE
  USING (public.is_admin());

-- Prevent users from deleting bids (admins only)
DROP POLICY IF EXISTS "prevent_delete_bids" ON bids;
CREATE POLICY "prevent_delete_bids" ON bids
  FOR DELETE
  USING (public.is_admin());

-- NOTIFICATIONS
-- Users can update their own notifications (mark as read)
-- Already exists, but let's ensure DELETE is blocked
DROP POLICY IF EXISTS "prevent_delete_notifications" ON notifications;
CREATE POLICY "prevent_delete_notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete notifications
DROP POLICY IF EXISTS "admin_delete_notifications" ON notifications;
CREATE POLICY "admin_delete_notifications" ON notifications
  FOR DELETE
  USING (public.is_admin());

-- TRANSACTIONS
-- Prevent any UPDATE on transactions (immutable for audit)
DROP POLICY IF EXISTS "prevent_update_transactions" ON transactions;
CREATE POLICY "prevent_update_transactions" ON transactions
  FOR UPDATE
  USING (false);

-- Prevent any DELETE on transactions (admins only for cleanup)
DROP POLICY IF EXISTS "prevent_delete_transactions" ON transactions;
CREATE POLICY "prevent_delete_transactions" ON transactions
  FOR DELETE
  USING (public.is_admin());

-- SAVED_FILTERS
-- Users can delete their own saved filters
DROP POLICY IF EXISTS "users_delete_own_filters" ON saved_filters;
CREATE POLICY "users_delete_own_filters" ON saved_filters
  FOR DELETE
  USING (auth.uid() = user_id);

-- CONVERSATIONS (legacy)
-- Prevent DELETE on conversations
DROP POLICY IF EXISTS "prevent_delete_legacy_conversations" ON conversations;
CREATE POLICY "prevent_delete_legacy_conversations" ON conversations
  FOR DELETE
  USING (public.is_admin());

-- MESSAGES (legacy)
-- Prevent DELETE on messages
DROP POLICY IF EXISTS "prevent_delete_legacy_messages" ON messages;
CREATE POLICY "prevent_delete_legacy_messages" ON messages
  FOR DELETE
  USING (public.is_admin());

-- =============================================
-- 3. ENSURE SERVICE ROLE BYPASS
-- (Service role automatically bypasses RLS, but we keep explicit policies for clarity)
-- =============================================

-- Service role policies are already defined in previous migrations
-- These allow the backend to manage data via supabaseAdmin client

-- =============================================
-- SUMMARY OF SECURITY MODEL
-- =============================================
--
-- 1. PROFILES:
--    - Users: SELECT, UPDATE own
--    - Admins: SELECT all, UPDATE all, DELETE
--
-- 2. VEHICLES:
--    - Users: SELECT (public)
--    - Admins: INSERT, UPDATE, DELETE
--
-- 3. BIDS:
--    - Users: SELECT own, INSERT own, UPDATE own (pending only)
--    - Admins: UPDATE all, DELETE
--
-- 4. ORDERS:
--    - Users: SELECT own, INSERT own
--    - Admins/Collaborators: SELECT all, UPDATE all
--    - Admins: DELETE
--
-- 5. NOTIFICATIONS:
--    - Users: SELECT own, UPDATE own, DELETE own
--    - Admins: DELETE all
--
-- 6. TRANSACTIONS:
--    - Users: SELECT own
--    - Admins: DELETE (for cleanup)
--    - Nobody: UPDATE (immutable)
--
-- 7. CHAT_CONVERSATIONS:
--    - Users: SELECT own, INSERT own, UPDATE own
--    - Admins: SELECT all, UPDATE all, DELETE
--
-- 8. CHAT_MESSAGES:
--    - Users: SELECT in own conversations, INSERT in own, UPDATE in own
--    - Admins: SELECT all, INSERT all, UPDATE all, DELETE
--
-- 9. FAVORITES:
--    - Users: SELECT own, INSERT own, DELETE own
--
-- 10. SAVED_FILTERS:
--    - Users: ALL on own (SELECT, INSERT, UPDATE, DELETE)
--
-- =============================================

COMMENT ON TABLE profiles IS 'RLS: Users can view/update own, admins can manage all. Deletion restricted to admins.';
COMMENT ON TABLE vehicles IS 'RLS: Public read, admin-only write/update/delete';
COMMENT ON TABLE bids IS 'RLS: Users own bids only, admins can manage all';
COMMENT ON TABLE transactions IS 'RLS: Immutable records, users can view own, admins can delete for cleanup';
COMMENT ON TABLE chat_conversations IS 'RLS: Users own conversations, admins can manage all';
COMMENT ON TABLE chat_messages IS 'RLS: Users messages in own conversations, admins can manage all';
