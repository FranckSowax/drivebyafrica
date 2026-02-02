-- ============================================================
-- Partner Shipping Quotes System
-- Allows freight forwarders to submit their shipping rates
-- via a shareable link every 15 days
-- ============================================================

-- Table 1: shipping_partners (partner companies with unique tokens)
CREATE TABLE IF NOT EXISTS shipping_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_partners_token ON shipping_partners(token);
CREATE INDEX IF NOT EXISTS idx_shipping_partners_is_active ON shipping_partners(is_active);

-- Table 2: shipping_partner_quotes (one row per submission)
CREATE TABLE IF NOT EXISTS shipping_partner_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES shipping_partners(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_quotes_partner_id ON shipping_partner_quotes(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_quotes_submitted_at ON shipping_partner_quotes(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_quotes_cycle ON shipping_partner_quotes(cycle_start);

-- Table 3: shipping_partner_quote_routes (individual route prices per quote)
CREATE TABLE IF NOT EXISTS shipping_partner_quote_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES shipping_partner_quotes(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  destination_flag TEXT NOT NULL DEFAULT '',
  korea_cost_usd INTEGER,
  china_cost_usd INTEGER,
  dubai_cost_usd INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_quote_routes_quote_id ON shipping_partner_quote_routes(quote_id);
CREATE INDEX IF NOT EXISTS idx_partner_quote_routes_destination ON shipping_partner_quote_routes(destination_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE shipping_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_partner_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_partner_quote_routes ENABLE ROW LEVEL SECURITY;

-- shipping_partners: public read (needed for token lookup), admin write
CREATE POLICY "Anyone can view partners" ON shipping_partners
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage partners" ON shipping_partners
  FOR ALL USING (auth.role() = 'authenticated');

-- shipping_partner_quotes: public read + insert
CREATE POLICY "Anyone can view quotes" ON shipping_partner_quotes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert quotes" ON shipping_partner_quotes
  FOR INSERT WITH CHECK (true);

-- shipping_partner_quote_routes: public read + insert
CREATE POLICY "Anyone can view quote routes" ON shipping_partner_quote_routes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert quote routes" ON shipping_partner_quote_routes
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE shipping_partners IS 'Freight forwarder partners who submit shipping rate quotes via shareable links';
COMMENT ON TABLE shipping_partner_quotes IS 'Individual quote submissions from partners (one per 15-day cycle)';
COMMENT ON TABLE shipping_partner_quote_routes IS 'Per-destination shipping rates within a partner quote submission';
COMMENT ON COLUMN shipping_partners.token IS 'UUID token used in shareable URL for partner form access';
COMMENT ON COLUMN shipping_partner_quotes.cycle_start IS 'Start date of the 15-day submission cycle';
