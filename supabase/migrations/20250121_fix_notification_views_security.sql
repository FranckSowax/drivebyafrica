-- Fix security issues with notification queue views
-- The views were created with SECURITY DEFINER which is flagged by Supabase Security Advisor

-- Drop and recreate views with SECURITY INVOKER (default, more secure)
DROP VIEW IF EXISTS public.notification_queue_stats;
DROP VIEW IF EXISTS public.failed_notifications;
DROP VIEW IF EXISTS public.recent_status_changes;

-- Recreate views without SECURITY DEFINER
-- These views will respect the RLS policies of the underlying tables

-- Dashboard view for notification queue status
CREATE VIEW notification_queue_stats AS
SELECT
  status,
  notification_type,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts,
  MIN(created_at) as oldest_pending,
  MAX(created_at) as newest
FROM notification_queue
GROUP BY status, notification_type;

-- Failed notifications requiring attention
CREATE VIEW failed_notifications AS
SELECT
  nq.*,
  p.email as recipient_email
FROM notification_queue nq
LEFT JOIN profiles p ON p.id = nq.recipient_user_id
WHERE nq.status = 'failed'
ORDER BY nq.created_at DESC;

-- Recent status changes (without join to orders table to avoid issues)
CREATE VIEW recent_status_changes AS
SELECT
  osl.*
FROM order_status_log osl
ORDER BY osl.created_at DESC
LIMIT 100;

-- Grant access to views
GRANT SELECT ON notification_queue_stats TO authenticated;
GRANT SELECT ON failed_notifications TO authenticated;
GRANT SELECT ON recent_status_changes TO authenticated;
