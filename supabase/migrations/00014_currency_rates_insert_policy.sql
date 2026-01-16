-- Migration: Add INSERT policy for currency_rates
-- The original migration was missing an INSERT policy, preventing the admin from adding new currencies

-- Drop existing insert policy if it exists (to be safe)
DROP POLICY IF EXISTS "Authenticated users can insert currency rates" ON currency_rates;

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert currency rates"
  ON currency_rates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Also add missing currencies that weren't in the original migration
-- New currencies: CDF (Congo), AOA (Angola), NAD (Namibia), SZL (Eswatini), LSL (Lesotho), SLE (Sierra Leone new code), ZWG (Zimbabwe new currency)

INSERT INTO currency_rates (currency_code, currency_name, currency_symbol, rate_to_usd, countries, is_active, display_order)
VALUES
  -- Congolese Franc
  ('CDF', 'Franc congolais', 'FC', 2800, ARRAY['RD Congo'], true, 40),

  -- Angolan Kwanza
  ('AOA', 'Kwanza angolais', 'Kz', 830, ARRAY['Angola'], true, 41),

  -- Namibian Dollar
  ('NAD', 'Dollar namibien', 'N$', 18.5, ARRAY['Namibie'], true, 42),

  -- Swazi Lilangeni
  ('SZL', 'Lilangeni swazi', 'E', 18.5, ARRAY['Eswatini'], true, 43),

  -- Lesotho Loti
  ('LSL', 'Loti lesothan', 'L', 18.5, ARRAY['Lesotho'], true, 44),

  -- Sierra Leone new currency code (SLE replaced SLL in 2022)
  ('SLE', 'Leone sierra-léonais', 'Le', 22.5, ARRAY['Sierra Leone'], true, 45),

  -- Zimbabwe Gold (ZiG) - new currency 2024
  ('ZWG', 'Dollar zimbabwéen ZiG', 'ZiG', 13.5, ARRAY['Zimbabwe'], true, 46)

ON CONFLICT (currency_code) DO NOTHING;
