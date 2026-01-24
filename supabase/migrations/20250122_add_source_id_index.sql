-- Add trigram index for source_id to speed up admin search
-- This fixes the timeout issues when searching for vehicles
-- because the OR query includes source_id which wasn't indexed for ILIKE

CREATE INDEX IF NOT EXISTS idx_vehicles_source_id_trgm
ON vehicles USING GIN (source_id gin_trgm_ops);
