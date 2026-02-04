-- =====================================================
-- NOTIFICATION QUEUE SYSTEM FOR PRODUCTION SCALE
-- =====================================================
-- This migration creates a robust message queue system
-- for WhatsApp notifications with retry, logging, and monitoring

-- =====================================================
-- 1. NOTIFICATION QUEUE TABLE
-- =====================================================
-- Stores pending notifications to be processed by background worker

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target information
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Message content
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'status_change',
    'document_upload',
    'order_confirmation',
    'payment_reminder',
    'shipping_update',
    'delivery_notification',
    'custom'
  )),

  -- Related entities
  order_id UUID,
  quote_id UUID,

  -- Message payload (all data needed to construct the message)
  payload JSONB NOT NULL DEFAULT '{}',
  -- Example payload:
  -- {
  --   "status": "in_transit",
  --   "vehicle_info": {"make": "Toyota", "model": "Hilux", "year": 2024},
  --   "order_number": "ORD-123ABC",
  --   "documents": [...],
  --   "custom_message": "Optional custom text"
  -- }

  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Waiting to be processed
    'processing',   -- Currently being processed
    'sent',         -- Successfully sent
    'delivered',    -- Confirmed delivered (if receipt available)
    'failed',       -- Failed after all retries
    'cancelled'     -- Manually cancelled
  )),

  -- Retry mechanism
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_code TEXT,

  -- WhatsApp message tracking
  whatsapp_message_id TEXT,
  whatsapp_status TEXT, -- 'sent', 'delivered', 'read', 'failed'

  -- Idempotency key to prevent duplicate sends
  idempotency_key TEXT UNIQUE,

  -- Priority (lower = higher priority)
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Who triggered this notification
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_by_role TEXT CHECK (triggered_by_role IN ('admin', 'collaborator', 'system'))
);

-- =====================================================
-- 2. NOTIFICATION LOG TABLE (Audit Trail)
-- =====================================================
-- Permanent log of all notification attempts for debugging

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created',
    'processing_started',
    'message_sent',
    'delivery_confirmed',
    'retry_scheduled',
    'failed',
    'cancelled'
  )),

  -- Context
  status_before TEXT,
  status_after TEXT,
  attempt_number INTEGER,

  -- API response
  api_response JSONB,
  error_message TEXT,
  error_code TEXT,

  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. STATUS CHANGE LOG TABLE (Order History)
-- =====================================================
-- Tracks all status changes with full context

CREATE TABLE IF NOT EXISTS order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order reference
  order_id UUID,
  quote_id UUID,
  order_number TEXT,

  -- Status change
  previous_status TEXT,
  new_status TEXT NOT NULL,

  -- Who made the change
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  changed_by_role TEXT CHECK (changed_by_role IN ('admin', 'super_admin', 'collaborator', 'system')),

  -- What was sent
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_queue_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,

  -- Additional context
  note TEXT,
  metadata JSONB DEFAULT '{}',

  -- Client info (for audit)
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Queue processing indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled
  ON notification_queue(status, scheduled_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry
  ON notification_queue(next_retry_at)
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_queue_idempotency
  ON notification_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_queue_order
  ON notification_queue(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_queue_priority_status
  ON notification_queue(priority, status, scheduled_at);

-- Log indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_queue_id
  ON notification_log(queue_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_created
  ON notification_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_log_order
  ON order_status_log(order_id) WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_status_log_quote
  ON order_status_log(quote_id) WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_status_log_created
  ON order_status_log(created_at DESC);

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function to enqueue a notification
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_recipient_phone TEXT,
  p_recipient_name TEXT,
  p_recipient_user_id UUID,
  p_notification_type TEXT,
  p_order_id UUID,
  p_quote_id UUID,
  p_payload JSONB,
  p_triggered_by UUID,
  p_triggered_by_role TEXT,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check for existing notification with same idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM notification_queue
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_id IS NOT NULL THEN
      RETURN v_existing_id; -- Return existing, don't create duplicate
    END IF;
  END IF;

  -- Insert new notification
  INSERT INTO notification_queue (
    recipient_phone,
    recipient_name,
    recipient_user_id,
    notification_type,
    order_id,
    quote_id,
    payload,
    triggered_by,
    triggered_by_role,
    priority,
    scheduled_at,
    idempotency_key
  ) VALUES (
    p_recipient_phone,
    p_recipient_name,
    p_recipient_user_id,
    p_notification_type,
    p_order_id,
    p_quote_id,
    p_payload,
    p_triggered_by,
    p_triggered_by_role,
    p_priority,
    p_scheduled_at,
    COALESCE(p_idempotency_key, gen_random_uuid()::TEXT)
  ) RETURNING id INTO v_queue_id;

  -- Log creation
  INSERT INTO notification_log (queue_id, event_type, status_after)
  VALUES (v_queue_id, 'created', 'pending');

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next notification to process
CREATE OR REPLACE FUNCTION get_next_notification_to_process()
RETURNS notification_queue AS $$
DECLARE
  v_notification notification_queue;
BEGIN
  -- Select and lock the next notification
  SELECT * INTO v_notification
  FROM notification_queue
  WHERE status = 'pending'
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  ORDER BY priority ASC, scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_notification.id IS NOT NULL THEN
    -- Mark as processing
    UPDATE notification_queue
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = v_notification.id;

    -- Log processing start
    INSERT INTO notification_log (queue_id, event_type, status_before, status_after, attempt_number)
    VALUES (v_notification.id, 'processing_started', 'pending', 'processing', v_notification.attempts + 1);
  END IF;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_queue_id UUID,
  p_whatsapp_message_id TEXT,
  p_api_response JSONB,
  p_duration_ms INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue
  SET status = 'sent',
      whatsapp_message_id = p_whatsapp_message_id,
      whatsapp_status = 'sent',
      processed_at = NOW(),
      updated_at = NOW(),
      attempts = attempts + 1
  WHERE id = p_queue_id;

  INSERT INTO notification_log (queue_id, event_type, status_before, status_after, api_response, duration_ms)
  VALUES (p_queue_id, 'message_sent', 'processing', 'sent', p_api_response, p_duration_ms);
END;
$$ LANGUAGE plpgsql;

-- Function to handle notification failure
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_queue_id UUID,
  p_error_message TEXT,
  p_error_code TEXT,
  p_api_response JSONB,
  p_duration_ms INTEGER
) RETURNS VOID AS $$
DECLARE
  v_notification notification_queue;
  v_new_status TEXT;
  v_next_retry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_notification FROM notification_queue WHERE id = p_queue_id;

  IF v_notification.attempts + 1 >= v_notification.max_attempts THEN
    -- Max retries exceeded - mark as failed
    v_new_status := 'failed';
    v_next_retry := NULL;
  ELSE
    -- Schedule retry with exponential backoff
    v_new_status := 'pending';
    -- Backoff: 1min, 5min, 15min, 30min, 1hr
    v_next_retry := NOW() + (POWER(2, v_notification.attempts) * INTERVAL '1 minute');
  END IF;

  UPDATE notification_queue
  SET status = v_new_status,
      attempts = attempts + 1,
      last_error = p_error_message,
      last_error_code = p_error_code,
      next_retry_at = v_next_retry,
      updated_at = NOW()
  WHERE id = p_queue_id;

  INSERT INTO notification_log (
    queue_id, event_type, status_before, status_after,
    attempt_number, error_message, error_code, api_response, duration_ms
  ) VALUES (
    p_queue_id,
    CASE WHEN v_new_status = 'failed' THEN 'failed' ELSE 'retry_scheduled' END,
    'processing',
    v_new_status,
    v_notification.attempts + 1,
    p_error_message,
    p_error_code,
    p_api_response,
    p_duration_ms
  );
END;
$$ LANGUAGE plpgsql;

-- Function to log status change
CREATE OR REPLACE FUNCTION log_order_status_change(
  p_order_id UUID,
  p_quote_id UUID,
  p_order_number TEXT,
  p_previous_status TEXT,
  p_new_status TEXT,
  p_changed_by UUID,
  p_changed_by_email TEXT,
  p_changed_by_role TEXT,
  p_notification_sent BOOLEAN,
  p_notification_queue_id UUID,
  p_note TEXT,
  p_metadata JSONB,
  p_ip_address TEXT,
  p_user_agent TEXT
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO order_status_log (
    order_id, quote_id, order_number,
    previous_status, new_status,
    changed_by, changed_by_email, changed_by_role,
    notification_sent, notification_queue_id,
    note, metadata, ip_address, user_agent
  ) VALUES (
    p_order_id, p_quote_id, p_order_number,
    p_previous_status, p_new_status,
    p_changed_by, p_changed_by_email, p_changed_by_role,
    p_notification_sent, p_notification_queue_id,
    p_note, p_metadata, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VIEWS FOR MONITORING
-- =====================================================

-- Dashboard view for notification queue status
CREATE OR REPLACE VIEW notification_queue_stats AS
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
CREATE OR REPLACE VIEW failed_notifications AS
SELECT
  nq.*,
  p.email as recipient_email
FROM notification_queue nq
LEFT JOIN profiles p ON p.id = nq.recipient_user_id
WHERE nq.status = 'failed'
ORDER BY nq.created_at DESC;

-- Recent status changes
CREATE OR REPLACE VIEW recent_status_changes AS
SELECT
  osl.*,
  o.vehicle_make,
  o.vehicle_model,
  o.customer_name
FROM order_status_log osl
LEFT JOIN orders o ON o.id = osl.order_id
ORDER BY osl.created_at DESC
LIMIT 100;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;

-- Admins can see all
DROP POLICY IF EXISTS "Admins can manage notification_queue" ON notification_queue;
CREATE POLICY "Admins can manage notification_queue" ON notification_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view notification_log" ON notification_log;
CREATE POLICY "Admins can view notification_log" ON notification_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can view order_status_log" ON order_status_log;
CREATE POLICY "Admins can view order_status_log" ON order_status_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Collaborators can see their own logs
DROP POLICY IF EXISTS "Collaborators can view own status logs" ON order_status_log;
CREATE POLICY "Collaborators can view own status logs" ON order_status_log
  FOR SELECT USING (
    changed_by = auth.uid()
  );

-- System/Service role can do everything (for background workers)
DROP POLICY IF EXISTS "Service role full access notification_queue" ON notification_queue;
CREATE POLICY "Service role full access notification_queue" ON notification_queue
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access notification_log" ON notification_log;
CREATE POLICY "Service role full access notification_log" ON notification_log
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access order_status_log" ON order_status_log;
CREATE POLICY "Service role full access order_status_log" ON order_status_log
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON notification_queue TO authenticated;
GRANT SELECT, INSERT ON notification_log TO authenticated;
GRANT SELECT, INSERT ON order_status_log TO authenticated;

GRANT EXECUTE ON FUNCTION enqueue_notification TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_notification_to_process TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_sent TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_failed TO authenticated;
GRANT EXECUTE ON FUNCTION log_order_status_change TO authenticated;

-- =====================================================
-- 9. CLEANUP JOB (Manual trigger or cron)
-- =====================================================

-- Function to clean up old processed notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Archive to notification_log before deleting
  -- (already logged, so just delete from queue)

  DELETE FROM notification_queue
  WHERE status IN ('sent', 'delivered', 'cancelled')
    AND processed_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO authenticated;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE notification_queue IS 'Queue for WhatsApp and other notifications with retry support';
COMMENT ON TABLE notification_log IS 'Audit trail of all notification processing attempts';
COMMENT ON TABLE order_status_log IS 'History of all order status changes with context';

COMMENT ON COLUMN notification_queue.idempotency_key IS 'Unique key to prevent duplicate notifications';
COMMENT ON COLUMN notification_queue.priority IS '1-10, lower = higher priority';
COMMENT ON COLUMN notification_queue.payload IS 'JSON containing all data needed to send the notification';
