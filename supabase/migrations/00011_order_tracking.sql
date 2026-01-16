-- Create order_tracking table for detailed order status tracking
CREATE TABLE IF NOT EXISTS order_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE UNIQUE,
    order_status TEXT NOT NULL DEFAULT 'deposit_paid' CHECK (order_status IN (
        'deposit_paid',      -- Acompte payé
        'vehicle_purchased', -- Véhicule acheté
        'in_transit',        -- En transit vers le port
        'at_port',           -- Au port d'origine
        'shipping',          -- En mer
        'customs',           -- En douane
        'ready_pickup',      -- Prêt pour retrait
        'delivered'          -- Livré
    )),
    tracking_steps JSONB DEFAULT '[]'::jsonb,
    shipping_eta DATE,
    vessel_name TEXT,
    container_number TEXT,
    bill_of_lading TEXT,
    customs_reference TEXT,
    delivery_address TEXT,
    delivery_contact TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_tracking_quote ON order_tracking(quote_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_status ON order_tracking(order_status);
CREATE INDEX IF NOT EXISTS idx_order_tracking_eta ON order_tracking(shipping_eta);

-- Enable RLS
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users have access (admin check at API level)
CREATE POLICY "Authenticated users access order_tracking"
    ON order_tracking
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_order_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_tracking_updated_at ON order_tracking;
CREATE TRIGGER order_tracking_updated_at
    BEFORE UPDATE ON order_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_order_tracking_updated_at();

-- Grant permissions
GRANT ALL ON order_tracking TO authenticated;
GRANT ALL ON order_tracking TO service_role;
