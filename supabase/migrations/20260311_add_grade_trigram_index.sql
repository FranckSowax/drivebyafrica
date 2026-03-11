-- Add trigram index on grade column to optimize ILIKE search
-- Indexes already exist for make and model (idx_vehicles_make_trgm, idx_vehicles_model_trgm)
CREATE INDEX IF NOT EXISTS idx_vehicles_grade_trgm
  ON vehicles USING GIN (grade gin_trgm_ops);
