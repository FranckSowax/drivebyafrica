-- Optimized index for search + sort by created_at
-- The ILIKE search with OR across make/model/grade + ORDER BY created_at
-- causes timeouts on 190k+ rows even with trigram indexes.
-- A btree index on (make, created_at DESC) helps PostgreSQL narrow down quickly
-- when the search term matches an exact make (most common case: "Toyota", "Jetour", etc.)

CREATE INDEX IF NOT EXISTS idx_vehicles_make_lower_created
  ON vehicles (lower(make), created_at DESC, id DESC)
  WHERE is_visible = true;

CREATE INDEX IF NOT EXISTS idx_vehicles_model_lower_created
  ON vehicles (lower(model), created_at DESC, id DESC)
  WHERE is_visible = true;
