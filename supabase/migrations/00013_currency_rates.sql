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
  -- US Dollar (base currency) - Also used in RD Congo and Angola
  ('USD', 'Dollar américain', '$', 1, ARRAY['USA', 'RD Congo', 'Angola'], true, 1),

  -- Euro
  ('EUR', 'Euro', '€', 0.92, ARRAY['France', 'Belgique'], true, 2),

  -- ========== ZONE FRANC CFA ==========
  -- CFA Franc BEAC (Central Africa - CEMAC)
  ('XAF', 'Franc CFA BEAC', 'FCFA', 615, ARRAY['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée Équatoriale'], true, 3),

  -- CFA Franc BCEAO (West Africa - UEMOA)
  ('XOF', 'Franc CFA BCEAO', 'FCFA', 615, ARRAY['Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Niger', 'Côte d''Ivoire', 'Guinée-Bissau'], true, 4),

  -- ========== AFRIQUE DE L''OUEST ==========
  -- Nigerian Naira
  ('NGN', 'Naira nigérian', '₦', 1550, ARRAY['Nigeria'], true, 5),

  -- Ghanaian Cedi
  ('GHS', 'Cedi ghanéen', 'GH₵', 15.5, ARRAY['Ghana'], true, 6),

  -- Guinean Franc
  ('GNF', 'Franc guinéen', 'FG', 8600, ARRAY['Guinée'], true, 7),

  -- Sierra Leonean Leone
  ('SLL', 'Leone sierra-léonais', 'Le', 22500, ARRAY['Sierra Leone'], true, 8),

  -- Liberian Dollar
  ('LRD', 'Dollar libérien', 'L$', 192, ARRAY['Liberia'], true, 9),

  -- Gambian Dalasi
  ('GMD', 'Dalasi gambien', 'D', 67, ARRAY['Gambie'], true, 10),

  -- Mauritanian Ouguiya
  ('MRU', 'Ouguiya mauritanien', 'UM', 39.5, ARRAY['Mauritanie'], true, 11),

  -- Cape Verdean Escudo
  ('CVE', 'Escudo cap-verdien', '$', 103, ARRAY['Cap-Vert'], true, 12),

  -- ========== AFRIQUE CENTRALE ==========
  -- Note: RD Congo and Angola use USD (added to USD countries above)

  -- São Tomé and Príncipe Dobra
  ('STN', 'Dobra santoméen', 'Db', 23, ARRAY['São Tomé-et-Príncipe'], true, 13),

  -- ========== AFRIQUE DE L''EST ==========
  -- Kenyan Shilling
  ('KES', 'Shilling kényan', 'KSh', 154, ARRAY['Kenya'], true, 14),

  -- Tanzanian Shilling
  ('TZS', 'Shilling tanzanien', 'TSh', 2640, ARRAY['Tanzanie'], true, 15),

  -- Ugandan Shilling
  ('UGX', 'Shilling ougandais', 'USh', 3750, ARRAY['Ouganda'], true, 16),

  -- Rwandan Franc
  ('RWF', 'Franc rwandais', 'FRw', 1280, ARRAY['Rwanda'], true, 17),

  -- Burundian Franc
  ('BIF', 'Franc burundais', 'FBu', 2850, ARRAY['Burundi'], true, 18),

  -- Ethiopian Birr
  ('ETB', 'Birr éthiopien', 'Br', 56.5, ARRAY['Éthiopie'], true, 19),

  -- Djiboutian Franc
  ('DJF', 'Franc djiboutien', 'Fdj', 178, ARRAY['Djibouti'], true, 20),

  -- Eritrean Nakfa
  ('ERN', 'Nakfa érythréen', 'Nkf', 15, ARRAY['Érythrée'], true, 21),

  -- Somali Shilling
  ('SOS', 'Shilling somalien', 'Sh.So.', 571, ARRAY['Somalie'], true, 22),

  -- South Sudanese Pound
  ('SSP', 'Livre sud-soudanaise', 'SSP', 1300, ARRAY['Soudan du Sud'], true, 23),

  -- ========== AFRIQUE DU NORD ==========
  -- Moroccan Dirham
  ('MAD', 'Dirham marocain', 'DH', 10.1, ARRAY['Maroc'], true, 24),

  -- Algerian Dinar
  ('DZD', 'Dinar algérien', 'DA', 135, ARRAY['Algérie'], true, 25),

  -- Tunisian Dinar
  ('TND', 'Dinar tunisien', 'DT', 3.15, ARRAY['Tunisie'], true, 26),

  -- Libyan Dinar
  ('LYD', 'Dinar libyen', 'LD', 4.85, ARRAY['Libye'], true, 27),

  -- Egyptian Pound
  ('EGP', 'Livre égyptienne', 'E£', 50.5, ARRAY['Égypte'], true, 28),

  -- Sudanese Pound
  ('SDG', 'Livre soudanaise', 'SDG', 600, ARRAY['Soudan'], true, 29),

  -- ========== AFRIQUE AUSTRALE ==========
  -- South African Rand
  ('ZAR', 'Rand sud-africain', 'R', 18.5, ARRAY['Afrique du Sud', 'Eswatini', 'Lesotho', 'Namibie'], true, 30),

  -- Mozambican Metical
  ('MZN', 'Metical mozambicain', 'MT', 63.5, ARRAY['Mozambique'], true, 31),

  -- Zambian Kwacha
  ('ZMW', 'Kwacha zambien', 'ZK', 27, ARRAY['Zambie'], true, 32),

  -- Zimbabwean Dollar (ZiG - new currency 2024)
  ('ZWL', 'Dollar zimbabwéen', 'Z$', 13.5, ARRAY['Zimbabwe'], true, 33),

  -- Botswana Pula
  ('BWP', 'Pula botswanais', 'P', 13.7, ARRAY['Botswana'], true, 34),

  -- Malawian Kwacha
  ('MWK', 'Kwacha malawien', 'MK', 1750, ARRAY['Malawi'], true, 35),

  -- ========== ÎLES DE L''OCÉAN INDIEN ==========
  -- Malagasy Ariary
  ('MGA', 'Ariary malgache', 'Ar', 4650, ARRAY['Madagascar'], true, 36),

  -- Mauritian Rupee
  ('MUR', 'Roupie mauricienne', 'Rs', 46, ARRAY['Maurice'], true, 37),

  -- Seychellois Rupee
  ('SCR', 'Roupie seychelloise', 'SCR', 14.5, ARRAY['Seychelles'], true, 38),

  -- Comorian Franc
  ('KMF', 'Franc comorien', 'CF', 460, ARRAY['Comores'], true, 39)

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
