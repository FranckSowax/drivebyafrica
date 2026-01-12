-- Driveby Africa - Additional Functions

-- Function to increment vehicle views
CREATE OR REPLACE FUNCTION increment_vehicle_views(vehicle_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE vehicles
  SET views_count = views_count + 1
  WHERE id = vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vehicle stats
CREATE OR REPLACE FUNCTION get_vehicle_stats()
RETURNS TABLE (
  total_vehicles BIGINT,
  upcoming_auctions BIGINT,
  ongoing_auctions BIGINT,
  total_bids BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM vehicles)::BIGINT,
    (SELECT COUNT(*) FROM vehicles WHERE auction_status = 'upcoming')::BIGINT,
    (SELECT COUNT(*) FROM vehicles WHERE auction_status = 'ongoing')::BIGINT,
    (SELECT COUNT(*) FROM bids)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search vehicles with full-text search
CREATE OR REPLACE FUNCTION search_vehicles(search_term TEXT)
RETURNS SETOF vehicles AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM vehicles
  WHERE
    make ILIKE '%' || search_term || '%'
    OR model ILIKE '%' || search_term || '%'
    OR CONCAT(make, ' ', model) ILIKE '%' || search_term || '%'
  ORDER BY auction_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
