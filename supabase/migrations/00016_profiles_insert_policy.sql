-- Add INSERT policy for profiles to allow users to create their own profile
-- This is needed when the trigger fails to create the profile on signup

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
