-- Add admin policies for chat tables
-- Allow authenticated users to view all conversations (admin check at API level)

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Authenticated users can view all conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Authenticated users can update all conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON chat_messages;

-- Allow authenticated users to view all conversations (for admin panel)
CREATE POLICY "Authenticated users can view all conversations"
    ON chat_conversations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to update all conversations (for admin panel)
CREATE POLICY "Authenticated users can update all conversations"
    ON chat_conversations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to view all messages (for admin panel)
CREATE POLICY "Authenticated users can view all messages"
    ON chat_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert messages (for agent responses)
CREATE POLICY "Authenticated users can insert messages"
    ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update messages (for read_at)
CREATE POLICY "Authenticated users can update messages"
    ON chat_messages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
