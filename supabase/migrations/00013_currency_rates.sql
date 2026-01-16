-- Migration: Currency exchange rates and settings
-- This table stores exchange rates that can be manually adjusted by admins

-- Create currency_rates table
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code VARCHAR(3) NOT NULL UNIQUE,
  currency_name VARCHAR(100) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  rate_to_usd DECIMAL(15, 6) NOT NULL DEFAULT 1,
  countries TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on currency_code
CREATE INDEX IF NOT EXISTS idx_currency_rates_code ON currency_rates(currency_code);
CREATE INDEX IF NOT EXISTS idx_currency_rates_active ON currency_rates(is_active);

-- Insert default currencies
INSERT INTO currency_rates (currency_code, currency_name, currency_symbol, rate_to_usd, countries, is_active, display_order)
VALUES
  -- US Dollar (base currency)
  ('USD', 'Dollar américain', '$', 1, ARRAY['USA'], true, 1),

  -- Euro
  ('EUR', 'Euro', '€', 0.92, ARRAY['France', 'Belgique'], true, 2),

  -- CFA Franc BEAC (Central Africa)
  ('XAF', 'Franc CFA BEAC', 'FCFA', 615, ARRAY['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée équatoriale'], true, 3),

  -- CFA Franc BCEAO (West Africa)
  ('XOF', 'Franc CFA BCEAO', 'FCFA', 615, ARRAY['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', 'Côte d''Ivoire', 'Guinée-Bissau'], true, 4),

  -- Congolese Franc (DRC)
  ('CDF', 'Franc congolais', 'FC', 2800, ARRAY['RDC'], true, 5),

  -- Nigerian Naira
  ('NGN', 'Naira nigérian', '₦', 1550, ARRAY['Nigeria'], true, 6),

  -- Guinean Franc
  ('GNF', 'Franc guinéen', 'FG', 8600, ARRAY['Guinée'], true, 7),

  -- Rwandan Franc
  ('RWF', 'Franc rwandais', 'FRw', 1280, ARRAY['Rwanda'], true, 8),

  -- Burundian Franc
  ('BIF', 'Franc burundais', 'FBu', 2850, ARRAY['Burundi'], true, 9),

  -- Angolan Kwanza
  ('AOA', 'Kwanza angolais', 'Kz', 830, ARRAY['Angola'], true, 10)

ON CONFLICT (currency_code) DO UPDATE SET
  currency_name = EXCLUDED.currency_name,
  currency_symbol = EXCLUDED.currency_symbol,
  rate_to_usd = EXCLUDED.rate_to_usd,
  countries = EXCLUDED.countries,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Create rate history table for tracking changes
CREATE TABLE IF NOT EXISTS currency_rate_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code VARCHAR(3) NOT NULL REFERENCES currency_rates(currency_code),
  old_rate DECIMAL(15, 6),
  new_rate DECIMAL(15, 6) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_currency_rate_history_code ON currency_rate_history(currency_code);
CREATE INDEX IF NOT EXISTS idx_currency_rate_history_date ON currency_rate_history(changed_at DESC);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_currency_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_currency_rates_updated_at ON currency_rates;
CREATE TRIGGER trigger_currency_rates_updated_at
  BEFORE UPDATE ON currency_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_currency_rates_updated_at();

-- RLS policies
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rate_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read currency rates
CREATE POLICY "Anyone can read currency rates"
  ON currency_rates FOR SELECT
  USING (true);

-- Only authenticated admins can update (we'll check admin status in the API)
CREATE POLICY "Authenticated users can update currency rates"
  ON currency_rates FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can insert history
CREATE POLICY "Anyone can read currency rate history"
  ON currency_rate_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert rate history"
  ON currency_rate_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
