-- Create quote_reassignments table for managing vehicle unavailability and alternative proposals
CREATE TABLE IF NOT EXISTS quote_reassignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_vehicle_id TEXT NOT NULL,
    original_vehicle_make TEXT NOT NULL,
    original_vehicle_model TEXT NOT NULL,
    original_vehicle_year INTEGER NOT NULL,
    original_vehicle_price_usd NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined', 'expired')),
    proposed_vehicles JSONB DEFAULT '[]'::jsonb,
    selected_vehicle_id TEXT,
    new_quote_id UUID REFERENCES quotes(id),
    whatsapp_sent_at TIMESTAMPTZ,
    whatsapp_message_id TEXT,
    customer_response TEXT,
    customer_responded_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quote_reassignments_original_quote ON quote_reassignments(original_quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_reassignments_user ON quote_reassignments(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_reassignments_status ON quote_reassignments(status);
CREATE INDEX IF NOT EXISTS idx_quote_reassignments_created ON quote_reassignments(created_at DESC);

-- Enable RLS
ALTER TABLE quote_reassignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can do everything (admin access is handled at API level)
CREATE POLICY "Authenticated users full access to quote_reassignments"
    ON quote_reassignments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_quote_reassignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_reassignments_updated_at ON quote_reassignments;
CREATE TRIGGER quote_reassignments_updated_at
    BEFORE UPDATE ON quote_reassignments
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_reassignments_updated_at();

-- Grant permissions
GRANT ALL ON quote_reassignments TO authenticated;
GRANT ALL ON quote_reassignments TO service_role;
