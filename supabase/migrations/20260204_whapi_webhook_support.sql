-- Add whatsapp_phone to chat_conversations for webhook-initiated conversations
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_whatsapp_phone
  ON chat_conversations(whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

-- Add whatsapp_message_id to chat_messages for deduplication
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_message_id
  ON chat_messages(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
