-- Migration: Fix collaborator RLS policies to properly filter by assigned_country
-- Date: 2026-01-27
-- Description: Remove old unfiltered policies and ensure country-based filtering works correctly
-- Problem: Old policies (collaborator_select_all_*) don't filter by assigned_country,
--          giving ALL collaborators access to ALL data regardless of their assignment.

-- =============================================
-- 1. DROP OLD UNFILTERED COLLABORATOR POLICIES
-- =============================================

-- Orders table - remove unfiltered policies
DROP POLICY IF EXISTS "collaborator_select_all_orders" ON orders;
DROP POLICY IF EXISTS "collaborator_update_all_orders" ON orders;

-- Quotes table - remove unfiltered policies
DROP POLICY IF EXISTS "collaborator_select_all_quotes" ON quotes;
DROP POLICY IF EXISTS "collaborator_update_all_quotes" ON quotes;

-- Order tracking table - remove unfiltered policies (will be replaced with filtered ones)
DROP POLICY IF EXISTS "collaborator_select_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_update_all_order_tracking" ON order_tracking;
DROP POLICY IF EXISTS "collaborator_insert_order_tracking" ON order_tracking;

-- =============================================
-- 2. ENSURE COUNTRY-FILTERED POLICIES FOR ORDERS
-- =============================================
-- These may already exist from 20250124_collaborator_all_countries.sql
-- but we recreate them to ensure consistency

DROP POLICY IF EXISTS "collaborator_select_assigned_orders" ON orders;
DROP POLICY IF EXISTS "collaborator_update_assigned_orders" ON orders;

CREATE POLICY "collaborator_select_assigned_orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        -- If assigned_country is 'all', see all orders
        profiles.assigned_country = 'all'
        OR
        -- Otherwise, filter by vehicle source matching assigned country
        EXISTS (
          SELECT 1 FROM vehicles
          WHERE vehicles.id = orders.vehicle_id
          AND vehicles.source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

CREATE POLICY "collaborator_update_assigned_orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        EXISTS (
          SELECT 1 FROM vehicles
          WHERE vehicles.id = orders.vehicle_id
          AND vehicles.source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

-- =============================================
-- 3. ENSURE COUNTRY-FILTERED POLICIES FOR QUOTES
-- =============================================

DROP POLICY IF EXISTS "collaborator_select_assigned_quotes" ON quotes;
DROP POLICY IF EXISTS "collaborator_update_assigned_quotes" ON quotes;

CREATE POLICY "collaborator_select_assigned_quotes" ON quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        profiles.assigned_country IS NULL  -- NULL means all countries too (legacy)
        OR
        vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
      )
    )
    OR
    public.is_admin()
  );

CREATE POLICY "collaborator_update_assigned_quotes" ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        profiles.assigned_country IS NULL
        OR
        vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
      )
    )
    OR
    public.is_admin()
  );

-- =============================================
-- 4. CREATE COUNTRY-FILTERED POLICIES FOR ORDER_TRACKING
-- =============================================
-- Order tracking needs to filter based on the quote's vehicle source

CREATE POLICY "collaborator_select_assigned_order_tracking" ON order_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        -- If assigned_country is 'all', see all tracking
        profiles.assigned_country = 'all'
        OR
        -- Otherwise, check the quote's vehicle_source
        EXISTS (
          SELECT 1 FROM quotes
          WHERE quotes.id = order_tracking.quote_id
          AND quotes.vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

CREATE POLICY "collaborator_update_assigned_order_tracking" ON order_tracking
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        EXISTS (
          SELECT 1 FROM quotes
          WHERE quotes.id = order_tracking.quote_id
          AND quotes.vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

CREATE POLICY "collaborator_insert_assigned_order_tracking" ON order_tracking
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'collaborator'
      AND (
        profiles.assigned_country = 'all'
        OR
        EXISTS (
          SELECT 1 FROM quotes
          WHERE quotes.id = order_tracking.quote_id
          AND quotes.vehicle_source = ANY(get_sources_for_country(profiles.assigned_country))
        )
      )
    )
    OR
    public.is_admin()
  );

-- =============================================
-- 5. VERIFICATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 20260127_fix_collaborator_rls_country_filter completed';
  RAISE NOTICE 'Old unfiltered policies removed, country-filtered policies active';
  RAISE NOTICE 'Collaborators now only see data matching their assigned_country';
END $$;
