-- Add theme_preference column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT CHECK (theme_preference IN ('light', 'dark'));

-- Set default to dark for existing users
UPDATE profiles
SET theme_preference = 'dark'
WHERE theme_preference IS NULL;

-- Add comment
COMMENT ON COLUMN profiles.theme_preference IS 'User theme preference: light or dark mode';
