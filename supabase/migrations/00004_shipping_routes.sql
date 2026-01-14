-- Create shipping_routes table for storing shipping costs per destination
CREATE TABLE IF NOT EXISTS shipping_routes (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL UNIQUE,
  destination_name TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  destination_flag TEXT NOT NULL,
  korea_cost_usd INTEGER NOT NULL DEFAULT 0,
  china_cost_usd INTEGER NOT NULL DEFAULT 0,
  dubai_cost_usd INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipping_routes_destination_id ON shipping_routes(destination_id);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_is_active ON shipping_routes(is_active);

-- Insert default shipping routes for all African destinations
INSERT INTO shipping_routes (id, destination_id, destination_name, destination_country, destination_flag, korea_cost_usd, china_cost_usd, dubai_cost_usd, is_active) VALUES
  -- Afrique de l'Ouest
  ('1', 'dakar', 'Dakar', 'Sénégal', '🇸🇳', 2300, 2600, 2100, true),
  ('2', 'abidjan', 'Abidjan', 'Côte d''Ivoire', '🇨🇮', 2100, 2400, 1900, true),
  ('3', 'tema', 'Tema', 'Ghana', '🇬🇭', 2000, 2300, 1800, true),
  ('4', 'lagos', 'Lagos', 'Nigeria', '🇳🇬', 2200, 2500, 2000, true),
  ('5', 'lome', 'Lomé', 'Togo', '🇹🇬', 2000, 2300, 1800, true),
  ('6', 'cotonou', 'Cotonou', 'Bénin', '🇧🇯', 2050, 2350, 1850, true),
  ('7', 'conakry', 'Conakry', 'Guinée', '🇬🇳', 2400, 2700, 2200, true),
  ('8', 'freetown', 'Freetown', 'Sierra Leone', '🇸🇱', 2500, 2800, 2300, true),
  ('9', 'monrovia', 'Monrovia', 'Liberia', '🇱🇷', 2450, 2750, 2250, true),
  ('10', 'banjul', 'Banjul', 'Gambie', '🇬🇲', 2350, 2650, 2150, true),
  ('11', 'bissau', 'Bissau', 'Guinée-Bissau', '🇬🇼', 2400, 2700, 2200, true),
  ('12', 'nouakchott', 'Nouakchott', 'Mauritanie', '🇲🇷', 2500, 2800, 2300, true),
  ('13', 'praia', 'Praia', 'Cap-Vert', '🇨🇻', 2600, 2900, 2400, true),
  ('14', 'port-harcourt', 'Port Harcourt', 'Nigeria', '🇳🇬', 2000, 2300, 1800, true),
  -- Afrique Centrale
  ('17', 'douala', 'Douala', 'Cameroun', '🇨🇲', 1700, 2000, 1500, true),
  ('18', 'libreville', 'Libreville', 'Gabon', '🇬🇦', 1800, 2100, 1600, true),
  ('19', 'port-gentil', 'Port-Gentil', 'Gabon', '🇬🇦', 1850, 2150, 1650, true),
  ('20', 'pointe-noire', 'Pointe-Noire', 'Congo', '🇨🇬', 1900, 2200, 1700, true),
  ('21', 'kribi', 'Kribi', 'Cameroun', '🇨🇲', 1750, 2050, 1550, true),
  ('22', 'matadi', 'Matadi', 'RD Congo', '🇨🇩', 2000, 2300, 1800, true),
  ('23', 'luanda', 'Luanda', 'Angola', '🇦🇴', 2100, 2400, 1900, true),
  ('24', 'lobito', 'Lobito', 'Angola', '🇦🇴', 2050, 2350, 1850, true),
  ('25', 'malabo', 'Malabo', 'Guinée équatoriale', '🇬🇶', 1900, 2200, 1700, true),
  ('26', 'sao-tome', 'São Tomé', 'São Tomé-et-Príncipe', '🇸🇹', 2200, 2500, 2000, true),
  -- Afrique de l'Est
  ('30', 'mombasa', 'Mombasa', 'Kenya', '🇰🇪', 1600, 1900, 1400, true),
  ('31', 'dar-es-salaam', 'Dar es Salaam', 'Tanzanie', '🇹🇿', 1650, 1950, 1450, true),
  ('32', 'zanzibar', 'Zanzibar', 'Tanzanie', '🇹🇿', 1700, 2000, 1500, true),
  ('33', 'maputo', 'Maputo', 'Mozambique', '🇲🇿', 1750, 2050, 1550, true),
  ('34', 'beira', 'Beira', 'Mozambique', '🇲🇿', 1800, 2100, 1600, true),
  ('35', 'djibouti', 'Djibouti', 'Djibouti', '🇩🇯', 1500, 1800, 1200, true),
  ('36', 'port-sudan', 'Port-Soudan', 'Soudan', '🇸🇩', 1550, 1850, 1250, true),
  ('37', 'massawa', 'Massawa', 'Érythrée', '🇪🇷', 1600, 1900, 1300, true),
  ('38', 'mogadiscio', 'Mogadiscio', 'Somalie', '🇸🇴', 1650, 1950, 1350, true),
  ('39', 'port-louis', 'Port-Louis', 'Maurice', '🇲🇺', 1900, 2200, 1700, true),
  ('40', 'toamasina', 'Toamasina', 'Madagascar', '🇲🇬', 1850, 2150, 1650, true),
  ('41', 'moroni', 'Moroni', 'Comores', '🇰🇲', 1950, 2250, 1750, true),
  ('42', 'victoria', 'Victoria', 'Seychelles', '🇸🇨', 2000, 2300, 1800, true),
  -- Afrique Australe
  ('50', 'durban', 'Durban', 'Afrique du Sud', '🇿🇦', 1800, 2100, 1600, true),
  ('51', 'cape-town', 'Le Cap', 'Afrique du Sud', '🇿🇦', 1900, 2200, 1700, true),
  ('52', 'walvis-bay', 'Walvis Bay', 'Namibie', '🇳🇦', 2000, 2300, 1800, true),
  ('53', 'gaborone', 'Gaborone', 'Botswana', '🇧🇼', 2100, 2400, 1900, true),
  ('54', 'harare', 'Harare', 'Zimbabwe', '🇿🇼', 2050, 2350, 1850, true),
  ('55', 'lusaka', 'Lusaka', 'Zambie', '🇿🇲', 2100, 2400, 1900, true),
  ('56', 'lilongwe', 'Lilongwe', 'Malawi', '🇲🇼', 2150, 2450, 1950, true),
  ('57', 'mbabane', 'Mbabane', 'Eswatini', '🇸🇿', 1950, 2250, 1750, true),
  ('58', 'maseru', 'Maseru', 'Lesotho', '🇱🇸', 2000, 2300, 1800, true),
  -- Afrique du Nord
  ('60', 'alexandrie', 'Alexandrie', 'Égypte', '🇪🇬', 1700, 2000, 1300, true),
  ('61', 'port-said', 'Port-Saïd', 'Égypte', '🇪🇬', 1650, 1950, 1250, true),
  ('62', 'tripoli', 'Tripoli', 'Libye', '🇱🇾', 1900, 2200, 1500, true),
  ('63', 'tunis', 'Tunis', 'Tunisie', '🇹🇳', 2000, 2300, 1600, true),
  ('64', 'alger', 'Alger', 'Algérie', '🇩🇿', 2100, 2400, 1700, true),
  ('65', 'casablanca', 'Casablanca', 'Maroc', '🇲🇦', 2200, 2500, 1800, true),
  ('66', 'tanger', 'Tanger', 'Maroc', '🇲🇦', 2250, 2550, 1850, true)
ON CONFLICT (id) DO UPDATE SET
  destination_name = EXCLUDED.destination_name,
  destination_country = EXCLUDED.destination_country,
  destination_flag = EXCLUDED.destination_flag,
  korea_cost_usd = EXCLUDED.korea_cost_usd,
  china_cost_usd = EXCLUDED.china_cost_usd,
  dubai_cost_usd = EXCLUDED.dubai_cost_usd,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE shipping_routes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shipping routes (public data)
CREATE POLICY "Anyone can view shipping routes" ON shipping_routes
  FOR SELECT USING (true);

-- Only authenticated admins can modify shipping routes
-- Note: You'll need to implement admin role checking based on your auth setup
CREATE POLICY "Authenticated users can update shipping routes" ON shipping_routes
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert shipping routes" ON shipping_routes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
