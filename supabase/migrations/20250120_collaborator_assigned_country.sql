-- Migration: Add assigned_country column for collaborators
-- This allows restricting collaborator access to vehicles from specific source countries

-- Add assigned_country column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assigned_country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assigned_country TEXT;

    -- Add comment explaining the field
    COMMENT ON COLUMN profiles.assigned_country IS 'Source country assigned to collaborator: china, korea, dubai. NULL means access to all countries.';
  END IF;
END $$;

-- Add constraint for valid country values (only for collaborators)
-- Note: We use a CHECK constraint that allows NULL (for non-collaborators or admins with full access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_assigned_country_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_assigned_country_check
      CHECK (assigned_country IS NULL OR assigned_country IN ('china', 'korea', 'dubai'));
  END IF;
END $$;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_country ON profiles(assigned_country) WHERE assigned_country IS NOT NULL;

-- Update RLS function to include country check for collaborators
CREATE OR REPLACE FUNCTION public.get_collaborator_country()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT assigned_country FROM profiles
    WHERE id = auth.uid()
    AND role = 'collaborator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_collaborator_country() TO authenticated;
