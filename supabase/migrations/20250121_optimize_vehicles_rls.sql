-- Optimize vehicles RLS policies
-- Problem: The admin/collaborator policies on vehicles table cause performance issues
-- with 140k+ rows because each policy function call queries the profiles table.
--
-- Solution: Since "Anyone can view vehicles" policy already allows all SELECT,
-- the admin/collaborator policies are redundant and just add overhead.
-- We remove them to improve query performance.

-- Remove redundant admin/collaborator SELECT policies on vehicles
-- These are unnecessary since "Anyone can view vehicles" already covers all SELECT
DROP POLICY IF EXISTS "admin_select_all_vehicles" ON vehicles;
DROP POLICY IF EXISTS "collaborator_select_all_vehicles" ON vehicles;

-- Ensure the public policy exists and is the only SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles'
    AND policyname = 'Anyone can view vehicles'
  ) THEN
    CREATE POLICY "Anyone can view vehicles" ON vehicles
      FOR SELECT USING (true);
  END IF;
END $$;

-- Also optimize the RLS functions to use STABLE marker for better caching
-- STABLE tells PostgreSQL the function returns the same result within a single query
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Return FALSE immediately if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get role in a single query
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_collaborator()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role = 'collaborator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_collaborator()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'super_admin', 'collaborator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
