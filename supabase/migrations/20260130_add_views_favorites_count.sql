-- Add views_count and favorites_count columns to vehicles table
-- These columns are used by the popular vehicles section on the homepage

-- Add columns if they don't exist
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;

-- Index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_vehicles_favorites_count ON vehicles(favorites_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_vehicles_views_count ON vehicles(views_count DESC NULLS LAST);

-- Function to increment vehicle views (drop+recreate to handle parameter name changes)
DROP FUNCTION IF EXISTS increment_vehicle_views(UUID);
CREATE OR REPLACE FUNCTION increment_vehicle_views(vehicle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE vehicles
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment favorites count (trigger on favorites insert)
CREATE OR REPLACE FUNCTION increment_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles
  SET favorites_count = COALESCE(favorites_count, 0) + 1
  WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement favorites count (trigger on favorites delete)
CREATE OR REPLACE FUNCTION decrement_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles
  SET favorites_count = GREATEST(COALESCE(favorites_count, 0) - 1, 0)
  WHERE id = OLD.vehicle_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_favorite_added ON favorites;
CREATE TRIGGER on_favorite_added
  AFTER INSERT ON favorites
  FOR EACH ROW EXECUTE FUNCTION increment_favorites_count();

DROP TRIGGER IF EXISTS on_favorite_removed ON favorites;
CREATE TRIGGER on_favorite_removed
  AFTER DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION decrement_favorites_count();
