-- =========================================================================
-- Fix 4 RLS security issues identified during audit
-- Run in Supabase SQL Editor
-- =========================================================================

-- =========================================================================
-- FIX 1: quote_reassignments - restrict to admin, collaborator, and owner
-- Currently: ALL with qual=true (any authenticated user has full access)
-- =========================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users full access to quote_reassignments" ON quote_reassignments;

-- Admin full access
CREATE POLICY "admin_manage_quote_reassignments"
  ON quote_reassignments FOR ALL
  USING (is_admin());

-- Collaborators can view reassignments for quotes they manage
CREATE POLICY "collaborator_select_quote_reassignments"
  ON quote_reassignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'collaborator'
    )
  );

-- Users can view their own reassignments (via quote ownership)
CREATE POLICY "users_select_own_quote_reassignments"
  ON quote_reassignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_reassignments.original_quote_id
        AND quotes.user_id = auth.uid()
    )
  );

-- Users can update their own reassignments (to select/decline)
CREATE POLICY "users_update_own_quote_reassignments"
  ON quote_reassignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_reassignments.original_quote_id
        AND quotes.user_id = auth.uid()
    )
  );

-- =========================================================================
-- FIX 2: sync_config / sync_logs - restrict write to service_role only
-- Currently: ALL with qual=true (any authenticated user has full access)
-- =========================================================================

-- sync_config: drop overly permissive ALL policy
DROP POLICY IF EXISTS "Allow service role full access to sync_config" ON sync_config;

-- Keep read for authenticated (used by admin dashboard)
-- Already exists: "Allow authenticated users to read sync_config"

-- Service role only for write operations
CREATE POLICY "service_role_insert_sync_config"
  ON sync_config FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_sync_config"
  ON sync_config FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_delete_sync_config"
  ON sync_config FOR DELETE
  USING (auth.role() = 'service_role');

-- sync_logs: drop overly permissive ALL policy
DROP POLICY IF EXISTS "Allow service role full access to sync_logs" ON sync_logs;

-- Keep read for authenticated (used by admin analytics)
-- Already exists: "Allow authenticated users to read sync_logs"

-- Service role only for write operations
CREATE POLICY "service_role_insert_sync_logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_update_sync_logs"
  ON sync_logs FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_delete_sync_logs"
  ON sync_logs FOR DELETE
  USING (auth.role() = 'service_role');

-- =========================================================================
-- FIX 3: Add WITH CHECK on INSERT policies to prevent user_id spoofing
-- Ensures users can only insert rows with their own user_id
-- =========================================================================

-- quotes: ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can create own quotes" ON quotes;
CREATE POLICY "Users can create own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- favorites: ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
CREATE POLICY "Users can create favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- chat_conversations: ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can create own conversations" ON chat_conversations;
CREATE POLICY "Users can create own conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- chat_messages: ensure user can only insert in own conversations
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON chat_messages;
CREATE POLICY "Users can insert messages in own conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

-- Also fix the duplicate insert policy
DROP POLICY IF EXISTS "users_insert_own_messages" ON chat_messages;

-- bids: ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can create bids" ON bids;
CREATE POLICY "Users can create bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- batch_orders: ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "users_insert_own_batch_orders" ON batch_orders;
CREATE POLICY "users_insert_own_batch_orders"
  ON batch_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- collaborator_activity_log: ensure collaborator_id matches auth.uid()
DROP POLICY IF EXISTS "System can insert activity logs" ON collaborator_activity_log;
CREATE POLICY "System can insert activity logs"
  ON collaborator_activity_log FOR INSERT
  WITH CHECK (
    auth.uid() = collaborator_id
    OR auth.role() = 'service_role'
  );

-- orders: admin/service_role insert only (no user self-insert needed based on codebase)
-- Keep existing admin_insert_orders policy as-is

-- =========================================================================
-- FIX 4: shipping_routes - restrict write to admin only
-- Currently: any authenticated user can INSERT and UPDATE
-- =========================================================================

DROP POLICY IF EXISTS "Authenticated users can insert shipping routes" ON shipping_routes;
DROP POLICY IF EXISTS "Authenticated users can update shipping routes" ON shipping_routes;

CREATE POLICY "admin_insert_shipping_routes"
  ON shipping_routes FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "admin_update_shipping_routes"
  ON shipping_routes FOR UPDATE
  USING (is_admin());

CREATE POLICY "admin_delete_shipping_routes"
  ON shipping_routes FOR DELETE
  USING (is_admin());
