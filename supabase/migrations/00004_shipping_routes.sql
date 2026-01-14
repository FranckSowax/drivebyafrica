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

-- Insert default shipping routes for all African destinations (prices doubled)
INSERT INTO shipping_routes (id, destination_id, destination_name, destination_country, destination_flag, korea_cost_usd, china_cost_usd, dubai_cost_usd, is_active) VALUES
  -- Afrique de l'Ouest
  ('1', 'dakar', 'Dakar', 'Sénégal', '🇸🇳', 4600, 5200, 4200, true),
  ('2', 'abidjan', 'Abidjan', 'Côte d''Ivoire', '🇨🇮', 4200, 4800, 3800, true),
  ('3', 'tema', 'Tema', 'Ghana', '🇬🇭', 4000, 4600, 3600, true),
  ('4', 'lagos', 'Lagos', 'Nigeria', '🇳🇬', 4400, 5000, 4000, true),
  ('5', 'lome', 'Lomé', 'Togo', '🇹🇬', 4000, 4600, 3600, true),
  ('6', 'cotonou', 'Cotonou', 'Bénin', '🇧🇯', 4100, 4700, 3700, true),
  ('7', 'conakry', 'Conakry', 'Guinée', '🇬🇳', 4800, 5400, 4400, true),
  ('8', 'freetown', 'Freetown', 'Sierra Leone', '🇸🇱', 5000, 5600, 4600, true),
  ('9', 'monrovia', 'Monrovia', 'Liberia', '🇱🇷', 4900, 5500, 4500, true),
  ('10', 'banjul', 'Banjul', 'Gambie', '🇬🇲', 4700, 5300, 4300, true),
  ('11', 'bissau', 'Bissau', 'Guinée-Bissau', '🇬🇼', 4800, 5400, 4400, true),
  ('12', 'nouakchott', 'Nouakchott', 'Mauritanie', '🇲🇷', 5000, 5600, 4600, true),
  ('13', 'praia', 'Praia', 'Cap-Vert', '🇨🇻', 5200, 5800, 4800, true),
  ('14', 'port-harcourt', 'Port Harcourt', 'Nigeria', '🇳🇬', 4000, 4600, 3600, true),
  -- Afrique Centrale
  ('17', 'douala', 'Douala', 'Cameroun', '🇨🇲', 3400, 4000, 3000, true),
  ('18', 'libreville', 'Libreville', 'Gabon', '🇬🇦', 3600, 4200, 3200, true),
  ('19', 'port-gentil', 'Port-Gentil', 'Gabon', '🇬🇦', 3700, 4300, 3300, true),
  ('20', 'pointe-noire', 'Pointe-Noire', 'Congo', '🇨🇬', 3800, 4400, 3400, true),
  ('21', 'kribi', 'Kribi', 'Cameroun', '🇨🇲', 3500, 4100, 3100, true),
  ('22', 'matadi', 'Matadi', 'RD Congo', '🇨🇩', 4000, 4600, 3600, true),
  ('23', 'luanda', 'Luanda', 'Angola', '🇦🇴', 4200, 4800, 3800, true),
  ('24', 'lobito', 'Lobito', 'Angola', '🇦🇴', 4100, 4700, 3700, true),
  ('25', 'malabo', 'Malabo', 'Guinée équatoriale', '🇬🇶', 3800, 4400, 3400, true),
  ('26', 'sao-tome', 'São Tomé', 'São Tomé-et-Príncipe', '🇸🇹', 4400, 5000, 4000, true),
  -- Afrique de l'Est
  ('30', 'mombasa', 'Mombasa', 'Kenya', '🇰🇪', 3200, 3800, 2800, true),
  ('31', 'dar-es-salaam', 'Dar es Salaam', 'Tanzanie', '🇹🇿', 3300, 3900, 2900, true),
  ('32', 'zanzibar', 'Zanzibar', 'Tanzanie', '🇹🇿', 3400, 4000, 3000, true),
  ('33', 'maputo', 'Maputo', 'Mozambique', '🇲🇿', 3500, 4100, 3100, true),
  ('34', 'beira', 'Beira', 'Mozambique', '🇲🇿', 3600, 4200, 3200, true),
  ('35', 'djibouti', 'Djibouti', 'Djibouti', '🇩🇯', 3000, 3600, 2400, true),
  ('36', 'port-sudan', 'Port-Soudan', 'Soudan', '🇸🇩', 3100, 3700, 2500, true),
  ('37', 'massawa', 'Massawa', 'Érythrée', '🇪🇷', 3200, 3800, 2600, true),
  ('38', 'mogadiscio', 'Mogadiscio', 'Somalie', '🇸🇴', 3300, 3900, 2700, true),
  ('39', 'port-louis', 'Port-Louis', 'Maurice', '🇲🇺', 3800, 4400, 3400, true),
  ('40', 'toamasina', 'Toamasina', 'Madagascar', '🇲🇬', 3700, 4300, 3300, true),
  ('41', 'moroni', 'Moroni', 'Comores', '🇰🇲', 3900, 4500, 3500, true),
  ('42', 'victoria', 'Victoria', 'Seychelles', '🇸🇨', 4000, 4600, 3600, true),
  -- Afrique Australe
  ('50', 'durban', 'Durban', 'Afrique du Sud', '🇿🇦', 3600, 4200, 3200, true),
  ('51', 'cape-town', 'Le Cap', 'Afrique du Sud', '🇿🇦', 3800, 4400, 3400, true),
  ('52', 'walvis-bay', 'Walvis Bay', 'Namibie', '🇳🇦', 4000, 4600, 3600, true),
  ('53', 'gaborone', 'Gaborone', 'Botswana', '🇧🇼', 4200, 4800, 3800, true),
  ('54', 'harare', 'Harare', 'Zimbabwe', '🇿🇼', 4100, 4700, 3700, true),
  ('55', 'lusaka', 'Lusaka', 'Zambie', '🇿🇲', 4200, 4800, 3800, true),
  ('56', 'lilongwe', 'Lilongwe', 'Malawi', '🇲🇼', 4300, 4900, 3900, true),
  ('57', 'mbabane', 'Mbabane', 'Eswatini', '🇸🇿', 3900, 4500, 3500, true),
  ('58', 'maseru', 'Maseru', 'Lesotho', '🇱🇸', 4000, 4600, 3600, true),
  -- Afrique du Nord
  ('60', 'alexandrie', 'Alexandrie', 'Égypte', '🇪🇬', 3400, 4000, 2600, true),
  ('61', 'port-said', 'Port-Saïd', 'Égypte', '🇪🇬', 3300, 3900, 2500, true),
  ('62', 'tripoli', 'Tripoli', 'Libye', '🇱🇾', 3800, 4400, 3000, true),
  ('63', 'tunis', 'Tunis', 'Tunisie', '🇹🇳', 4000, 4600, 3200, true),
  ('64', 'alger', 'Alger', 'Algérie', '🇩🇿', 4200, 4800, 3400, true),
  ('65', 'casablanca', 'Casablanca', 'Maroc', '🇲🇦', 4400, 5000, 3600, true),
  ('66', 'tanger', 'Tanger', 'Maroc', '🇲🇦', 4500, 5100, 3700, true)
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
