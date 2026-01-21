-- Fix RLS functions to handle NULL auth.uid() gracefully
-- This prevents 500 errors when anonymous users query tables with these policies

-- Fix is_admin() function to return FALSE when auth.uid() is NULL
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Return FALSE if user is not authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix is_collaborator() function to return FALSE when auth.uid() is NULL
CREATE OR REPLACE FUNCTION public.is_collaborator()
RETURNS BOOLEAN AS $$
BEGIN
  -- Return FALSE if user is not authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'collaborator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix is_admin_or_collaborator() function to return FALSE when auth.uid() is NULL
CREATE OR REPLACE FUNCTION public.is_admin_or_collaborator()
RETURNS BOOLEAN AS $$
BEGIN
  -- Return FALSE if user is not authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'collaborator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure the public "Anyone can view vehicles" policy exists
-- PostgreSQL RLS evaluates policies with OR, so this allows public access
DO $$
BEGIN
  -- Check if the public policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles'
    AND policyname = 'Anyone can view vehicles'
  ) THEN
    -- If it was dropped, recreate it
    CREATE POLICY "Anyone can view vehicles" ON vehicles
      FOR SELECT USING (true);
  END IF;
END $$;
