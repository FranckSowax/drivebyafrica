-- Migration: Restrict shipping_routes UPDATE to admins only
-- Date: 2026-02-08
-- Reason: The previous policy allowed ANY authenticated user to update shipping routes,
-- which is a security risk. Only admins should modify shipping costs.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can update shipping routes" ON shipping_routes;

-- Create admin-only update policy
CREATE POLICY "admin_update_shipping_routes" ON shipping_routes
  FOR UPDATE USING (public.is_admin());

-- Also restrict INSERT to admins (if not already restricted)
DROP POLICY IF EXISTS "Authenticated users can insert shipping routes" ON shipping_routes;
CREATE POLICY "admin_insert_shipping_routes" ON shipping_routes
  FOR INSERT WITH CHECK (public.is_admin());

-- Also restrict DELETE to admins
DROP POLICY IF EXISTS "admin_delete_shipping_routes" ON shipping_routes;
CREATE POLICY "admin_delete_shipping_routes" ON shipping_routes
  FOR DELETE USING (public.is_admin());
