-- Migration: Vehicle Count History
-- Purpose: Store daily vehicle count snapshots at noon GMT for accurate historical tracking

-- Create vehicle_count_history table
CREATE TABLE IF NOT EXISTS vehicle_count_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_count INTEGER NOT NULL DEFAULT 0,
  korea_count INTEGER NOT NULL DEFAULT 0,
  china_count INTEGER NOT NULL DEFAULT 0,
  dubai_count INTEGER NOT NULL DEFAULT 0,
  available_count INTEGER NOT NULL DEFAULT 0,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_vehicle_count_history_date ON vehicle_count_history(date DESC);

-- Enable RLS
ALTER TABLE vehicle_count_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for analytics)
CREATE POLICY "Allow public read access to vehicle_count_history"
  ON vehicle_count_history
  FOR SELECT
  USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage vehicle_count_history"
  ON vehicle_count_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE vehicle_count_history IS 'Daily snapshots of vehicle counts, recorded at noon GMT each day';
