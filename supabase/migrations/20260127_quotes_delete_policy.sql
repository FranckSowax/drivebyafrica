-- Add missing DELETE policy for quotes table
-- Users can delete their own quotes (except accepted ones - this is enforced in the API)

CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (auth.uid() = user_id);
