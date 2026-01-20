-- Migration: Add RLS policies for admin and collaborator access to orders table
-- This enables admins and collaborators to view and manage all orders

-- Function to check if user is admin (if not exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is collaborator (if not exists)
CREATE OR REPLACE FUNCTION public.is_collaborator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'collaborator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or collaborator
CREATE OR REPLACE FUNCTION public.is_admin_or_collaborator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'collaborator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

-- Recreate user policies with explicit names
CREATE POLICY "users_select_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies - full access to all orders
CREATE POLICY "admin_select_all_orders" ON orders
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_update_all_orders" ON orders
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_insert_orders" ON orders
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_orders" ON orders
  FOR DELETE USING (public.is_admin());

-- Collaborator policies - view and update orders (no delete)
CREATE POLICY "collaborator_select_all_orders" ON orders
  FOR SELECT USING (public.is_collaborator());

CREATE POLICY "collaborator_update_all_orders" ON orders
  FOR UPDATE USING (public.is_collaborator());

-- Also add policies for quotes table if missing
DROP POLICY IF EXISTS "admin_select_all_quotes" ON quotes;
DROP POLICY IF EXISTS "admin_update_all_quotes" ON quotes;
DROP POLICY IF EXISTS "collaborator_select_all_quotes" ON quotes;
DROP POLICY IF EXISTS "collaborator_update_all_quotes" ON quotes;

CREATE POLICY "admin_select_all_quotes" ON quotes
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_update_all_quotes" ON quotes
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "collaborator_select_all_quotes" ON quotes
  FOR SELECT USING (public.is_collaborator());

CREATE POLICY "collaborator_update_all_quotes" ON quotes
  FOR UPDATE USING (public.is_collaborator());

-- Add policies for order_tracking table
DROP POLICY IF EXISTS "admin_select_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "admin_update_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "admin_insert_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_select_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_update_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_insert_order_tracking" ON order_tracking;

CREATE POLICY "admin_select_all_order_tracking" ON order_tracking
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_update_all_order_tracking" ON order_tracking
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "admin_insert_order_tracking" ON order_tracking
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "collaborator_select_all_order_tracking" ON order_tracking
  FOR SELECT USING (public.is_collaborator());

CREATE POLICY "collaborator_update_all_order_tracking" ON order_tracking
  FOR UPDATE USING (public.is_collaborator());

CREATE POLICY "collaborator_insert_order_tracking" ON order_tracking
  FOR INSERT WITH CHECK (public.is_collaborator());

-- Add admin policies for profiles table (to fetch customer info)
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "collaborator_select_all_profiles" ON profiles;

CREATE POLICY "admin_select_all_profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "collaborator_select_all_profiles" ON profiles
  FOR SELECT USING (public.is_collaborator());

-- Add admin policies for vehicles table (to fetch vehicle info)
DROP POLICY IF EXISTS "admin_select_all_vehicles" ON vehicles;
DROP POLICY IF EXISTS "collaborator_select_all_vehicles" ON vehicles;

CREATE POLICY "admin_select_all_vehicles" ON vehicles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "collaborator_select_all_vehicles" ON vehicles
  FOR SELECT USING (public.is_collaborator());

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_collaborator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_collaborator() TO authenticated;
