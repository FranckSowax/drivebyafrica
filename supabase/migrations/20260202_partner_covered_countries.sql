-- Add covered_countries column to shipping_partners
-- Stores the list of destination country names where the partner has shipping lines
-- When the partner opens their form, destinations matching these countries are active by default
ALTER TABLE shipping_partners
  ADD COLUMN IF NOT EXISTS covered_countries TEXT[] DEFAULT '{}';

COMMENT ON COLUMN shipping_partners.covered_countries IS 'Array of destination country names where this partner operates shipping lines';
