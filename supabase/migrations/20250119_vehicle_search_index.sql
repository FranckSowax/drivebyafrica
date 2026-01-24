-- Add trigram extension and indexes for fast ILIKE searches on vehicles
-- This fixes the statement timeout issue when searching through 80k+ vehicles

-- Enable the pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes using trigrams for fast ILIKE searches
-- These indexes support pattern matching with wildcards (e.g., '%toyota%')
-- Note: Not using CONCURRENTLY as it cannot run inside a transaction block
CREATE INDEX IF NOT EXISTS idx_vehicles_make_trgm
ON vehicles USING GIN (make gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicles_model_trgm
ON vehicles USING GIN (model gin_trgm_ops);

-- Note: Sorting indexes are not effective for 80k+ rows with Supabase's
-- statement timeout. The app uses ORDER BY id DESC which uses the primary
-- key index and is fast enough.
