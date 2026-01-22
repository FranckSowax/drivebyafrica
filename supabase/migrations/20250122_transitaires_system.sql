-- Transitaires recommendation system
-- Allows Driveby to recommend customs brokers/freight forwarders for each destination
-- Users can rate transitaires after using their services

-- Table for transitaires (customs brokers/freight forwarders)
CREATE TABLE IF NOT EXISTS transitaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  country TEXT NOT NULL, -- Destination country (Gabon, Cameroun, etc.)
  port TEXT, -- Specific port if applicable (Libreville, Douala, etc.)
  phone TEXT NOT NULL,
  whatsapp TEXT, -- WhatsApp number if different from phone
  email TEXT,
  address TEXT,
  description TEXT, -- Brief description of services
  specialties TEXT[], -- Array of specialties: ['vehicles', 'heavy_machinery', 'containers']
  languages TEXT[], -- Languages spoken: ['french', 'english', 'chinese']
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Verified by Driveby team
  average_rating DECIMAL(2,1) DEFAULT 0, -- Cached average rating (0-5)
  total_reviews INTEGER DEFAULT 0, -- Cached total number of reviews
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for transitaire reviews/ratings
CREATE TABLE IF NOT EXISTS transitaire_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transitaire_id UUID NOT NULL REFERENCES transitaires(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Link to the order if applicable
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
  comment TEXT,
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5), -- Sub-rating
  communication INTEGER CHECK (communication >= 1 AND communication <= 5), -- Sub-rating
  speed INTEGER CHECK (speed >= 1 AND speed <= 5), -- Sub-rating
  price_fairness INTEGER CHECK (price_fairness >= 1 AND price_fairness <= 5), -- Sub-rating
  would_recommend BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false, -- Review verified by admin
  admin_response TEXT, -- Optional admin response to review
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transitaire_id, order_id) -- One review per order per transitaire
);

-- Table to track which transitaire was suggested/used for an order
CREATE TABLE IF NOT EXISTS order_transitaire_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transitaire_id UUID NOT NULL REFERENCES transitaires(id) ON DELETE CASCADE,
  was_selected BOOLEAN DEFAULT false, -- User clicked/contacted this transitaire
  feedback_requested_at TIMESTAMPTZ, -- When we sent WhatsApp feedback request
  feedback_received_at TIMESTAMPTZ, -- When user submitted feedback
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, transitaire_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transitaires_country ON transitaires(country);
CREATE INDEX IF NOT EXISTS idx_transitaires_port ON transitaires(port);
CREATE INDEX IF NOT EXISTS idx_transitaires_active ON transitaires(is_active);
CREATE INDEX IF NOT EXISTS idx_transitaires_rating ON transitaires(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_transitaire_reviews_transitaire ON transitaire_reviews(transitaire_id);
CREATE INDEX IF NOT EXISTS idx_transitaire_reviews_user ON transitaire_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_order_transitaire_order ON order_transitaire_suggestions(order_id);

-- Function to update transitaire average rating
CREATE OR REPLACE FUNCTION update_transitaire_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE transitaires
  SET
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
      FROM transitaire_reviews
      WHERE transitaire_id = COALESCE(NEW.transitaire_id, OLD.transitaire_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM transitaire_reviews
      WHERE transitaire_id = COALESCE(NEW.transitaire_id, OLD.transitaire_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.transitaire_id, OLD.transitaire_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update rating on review changes
DROP TRIGGER IF EXISTS trigger_update_transitaire_rating ON transitaire_reviews;
CREATE TRIGGER trigger_update_transitaire_rating
AFTER INSERT OR UPDATE OR DELETE ON transitaire_reviews
FOR EACH ROW
EXECUTE FUNCTION update_transitaire_rating();

-- RLS Policies
ALTER TABLE transitaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE transitaire_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_transitaire_suggestions ENABLE ROW LEVEL SECURITY;

-- Transitaires: Anyone can read active transitaires, only admins can modify
CREATE POLICY "Anyone can view active transitaires" ON transitaires
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage transitaires" ON transitaires
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Reviews: Users can read all, create their own, update their own
CREATE POLICY "Anyone can view reviews" ON transitaire_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON transitaire_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON transitaire_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage reviews" ON transitaire_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Order suggestions: Users can see their own, admins can manage all
CREATE POLICY "Users can view own order suggestions" ON order_transitaire_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_transitaire_suggestions.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage order suggestions" ON order_transitaire_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Comments
COMMENT ON TABLE transitaires IS 'Customs brokers/freight forwarders recommended by Driveby for vehicle clearance';
COMMENT ON TABLE transitaire_reviews IS 'User reviews and ratings for transitaires';
COMMENT ON TABLE order_transitaire_suggestions IS 'Tracks which transitaires were suggested for each order and user selections';
COMMENT ON COLUMN transitaires.average_rating IS 'Cached average rating from reviews (0-5)';
COMMENT ON COLUMN transitaires.is_verified IS 'Transitaire verified by Driveby team';
COMMENT ON COLUMN transitaire_reviews.is_verified IS 'Review verified as genuine by admin';
