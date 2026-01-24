-- Add original price and currency columns to vehicles
-- This allows recalculating USD price with real-time exchange rates

-- Add original price column (price in source currency)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS original_price DECIMAL(15,2);

-- Add original currency column (CNY, KRW, AED, etc.)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS original_currency TEXT;

-- Add index for currency-based queries
CREATE INDEX IF NOT EXISTS idx_vehicles_original_currency ON vehicles(original_currency);

-- Comment explaining the columns
COMMENT ON COLUMN vehicles.original_price IS 'Price in original currency (CNY for China, KRW for Korea, AED for Dubai)';
COMMENT ON COLUMN vehicles.original_currency IS 'Currency code of the original price (CNY, KRW, AED)';
