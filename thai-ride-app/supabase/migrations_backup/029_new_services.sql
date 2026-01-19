-- Migration: 029_new_services.sql
-- Feature: F158 Queue Booking, F159 Moving Service, F160 Laundry Service
-- Description: Create tables and RPC functions for new services (Queue Booking, Moving, Laundry)

-- =====================================================
-- 1. QUEUE BOOKINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS queue_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id),
    
    -- Category
    category TEXT NOT NULL CHECK (category IN ('hospital', 'bank', 'government', 'restaurant', 'salon', 'other')),
    
    -- Details
    place_name TEXT,
    place_address TEXT,
    details TEXT,
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    
    -- Pricing
    service_fee DECIMAL(10,2) DEFAULT 50.00,
    final_fee DECIMAL(10,2),
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for queue_bookings
CREATE INDEX IF NOT EXISTS idx_queue_bookings_user_id ON queue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_provider_id ON queue_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_status ON queue_bookings(status);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_tracking_id ON queue_bookings(tracking_id);
CREATE INDEX IF NOT EXISTS idx_queue_bookings_scheduled ON queue_bookings(scheduled_date, scheduled_time);

-- =====================================================
-- 2. MOVING REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS moving_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id),
    
    -- Service Type
    service_type TEXT NOT NULL CHECK (service_type IN ('small', 'medium', 'large')),
    
    -- Locations
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(10,8),
    destination_lng DECIMAL(11,8),
    
    -- Details
    item_description TEXT,
    helper_count INTEGER DEFAULT 1 CHECK (helper_count >= 1 AND helper_count <= 5),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled')),
    
    -- Pricing
    estimated_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2),
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pickup_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes for moving_requests
CREATE INDEX IF NOT EXISTS idx_moving_requests_user_id ON moving_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_moving_requests_provider_id ON moving_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_moving_requests_status ON moving_requests(status);
CREATE INDEX IF NOT EXISTS idx_moving_requests_tracking_id ON moving_requests(tracking_id);

-- =====================================================
-- 3. LAUNDRY REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS laundry_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id),
    
    -- Services (JSON array)
    services JSONB NOT NULL DEFAULT '[]',
    
    -- Pickup Details
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),
    scheduled_pickup TIMESTAMPTZ NOT NULL,
    
    -- Weight & Pricing
    estimated_weight DECIMAL(5,2),
    actual_weight DECIMAL(5,2),
    price_per_kg DECIMAL(10,2) DEFAULT 40.00,
    estimated_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'picked_up', 'washing', 'ready', 'delivered', 'cancelled')),
    
    -- Notes
    notes TEXT,
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Indexes for laundry_requests
CREATE INDEX IF NOT EXISTS idx_laundry_requests_user_id ON laundry_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_requests_provider_id ON laundry_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_laundry_requests_status ON laundry_requests(status);
CREATE INDEX IF NOT EXISTS idx_laundry_requests_tracking_id ON laundry_requests(tracking_id);

-- =====================================================
-- 4. RATING TABLES
-- =====================================================

-- Queue Ratings
CREATE TABLE IF NOT EXISTS queue_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES queue_bookings(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_ratings_booking_id ON queue_ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_queue_ratings_provider_id ON queue_ratings(provider_id);

-- Moving Ratings
CREATE TABLE IF NOT EXISTS moving_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES moving_requests(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moving_ratings_request_id ON moving_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_moving_ratings_provider_id ON moving_ratings(provider_id);

-- Laundry Ratings
CREATE TABLE IF NOT EXISTS laundry_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES laundry_requests(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_id UUID REFERENCES service_providers(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laundry_ratings_request_id ON laundry_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_laundry_ratings_provider_id ON laundry_ratings(provider_id);


-- =====================================================
-- 5. TRACKING ID GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_new_service_tracking_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    seq_num INTEGER;
    new_tracking_id TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today based on prefix
    IF prefix = 'QUE' THEN
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(tracking_id FROM 14 FOR 6) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM queue_bookings 
        WHERE tracking_id LIKE prefix || '-' || date_part || '%';
    ELSIF prefix = 'MOV' THEN
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(tracking_id FROM 14 FOR 6) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM moving_requests 
        WHERE tracking_id LIKE prefix || '-' || date_part || '%';
    ELSIF prefix = 'LAU' THEN
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(tracking_id FROM 14 FOR 6) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM laundry_requests 
        WHERE tracking_id LIKE prefix || '-' || date_part || '%';
    ELSE
        seq_num := 1;
    END IF;
    
    new_tracking_id := prefix || '-' || date_part || '-' || LPAD(seq_num::TEXT, 6, '0');
    RETURN new_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. PRICE CALCULATION FUNCTIONS
-- =====================================================

-- Calculate Moving Price
CREATE OR REPLACE FUNCTION calculate_moving_price(
    p_service_type TEXT,
    p_helper_count INTEGER DEFAULT 1
) RETURNS DECIMAL AS $$
DECLARE
    base_price DECIMAL;
    helper_fee DECIMAL;
BEGIN
    -- Base price by service type
    CASE p_service_type
        WHEN 'small' THEN base_price := 150;
        WHEN 'medium' THEN base_price := 350;
        WHEN 'large' THEN base_price := 1500;
        ELSE base_price := 150;
    END CASE;
    
    -- Additional helper fee (100 per extra helper)
    helper_fee := GREATEST(0, (p_helper_count - 1)) * 100;
    
    RETURN base_price + helper_fee;
END;
$$ LANGUAGE plpgsql;

-- Calculate Laundry Price
CREATE OR REPLACE FUNCTION calculate_laundry_price(
    p_services JSONB,
    p_weight DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    total_price DECIMAL := 0;
    price_per_kg DECIMAL;
    express_fee DECIMAL := 0;
BEGIN
    -- Calculate base price per kg based on services
    IF p_services ? 'dry-clean' THEN
        -- Dry clean is per piece, estimate 5 pieces per kg
        total_price := p_weight * 5 * 150;
    ELSIF p_services ? 'wash-iron' THEN
        price_per_kg := 60;
        total_price := p_weight * price_per_kg;
    ELSE
        -- Default wash-fold
        price_per_kg := 40;
        total_price := p_weight * price_per_kg;
    END IF;
    
    -- Express fee
    IF p_services ? 'express' THEN
        express_fee := 100;
    END IF;
    
    RETURN total_price + express_fee;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ATOMIC ACCEPTANCE FUNCTIONS
-- =====================================================

-- Accept Queue Booking (Atomic)
CREATE OR REPLACE FUNCTION accept_queue_booking(
    p_booking_id UUID,
    p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_booking queue_bookings%ROWTYPE;
BEGIN
    -- Lock the row
    SELECT * INTO v_booking
    FROM queue_bookings
    WHERE id = p_booking_id
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบการจองนี้');
    END IF;
    
    IF v_booking.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'การจองนี้ถูกรับไปแล้ว');
    END IF;
    
    -- Update booking
    UPDATE queue_bookings
    SET status = 'confirmed',
        provider_id = p_provider_id,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'กำลังดำเนินการ กรุณารอสักครู่');
END;
$$ LANGUAGE plpgsql;

-- Accept Moving Request (Atomic)
CREATE OR REPLACE FUNCTION accept_moving_request(
    p_request_id UUID,
    p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_request moving_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_request
    FROM moving_requests
    WHERE id = p_request_id
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบคำขอนี้');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'คำขอนี้ถูกรับไปแล้ว');
    END IF;
    
    UPDATE moving_requests
    SET status = 'matched',
        provider_id = p_provider_id,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'กำลังดำเนินการ กรุณารอสักครู่');
END;
$$ LANGUAGE plpgsql;

-- Accept Laundry Request (Atomic)
CREATE OR REPLACE FUNCTION accept_laundry_request(
    p_request_id UUID,
    p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_request laundry_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_request
    FROM laundry_requests
    WHERE id = p_request_id
    FOR UPDATE NOWAIT;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบคำขอนี้');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'คำขอนี้ถูกรับไปแล้ว');
    END IF;
    
    UPDATE laundry_requests
    SET status = 'matched',
        provider_id = p_provider_id,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'กำลังดำเนินการ กรุณารอสักครู่');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. STATUS UPDATE FUNCTIONS
-- =====================================================

-- Update Queue Booking Status
CREATE OR REPLACE FUNCTION update_queue_status(
    p_booking_id UUID,
    p_new_status TEXT,
    p_provider_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_booking queue_bookings%ROWTYPE;
    v_valid_transition BOOLEAN := false;
BEGIN
    SELECT * INTO v_booking
    FROM queue_bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบการจองนี้');
    END IF;
    
    -- Validate status transition
    CASE v_booking.status
        WHEN 'pending' THEN v_valid_transition := p_new_status IN ('confirmed', 'cancelled');
        WHEN 'confirmed' THEN v_valid_transition := p_new_status IN ('in_progress', 'cancelled');
        WHEN 'in_progress' THEN v_valid_transition := p_new_status IN ('completed', 'cancelled');
        ELSE v_valid_transition := false;
    END CASE;
    
    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่สามารถเปลี่ยนสถานะได้');
    END IF;
    
    -- Update status
    UPDATE queue_bookings
    SET status = p_new_status,
        updated_at = NOW(),
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        final_fee = CASE WHEN p_new_status = 'completed' THEN service_fee ELSE final_fee END
    WHERE id = p_booking_id;
    
    -- Update provider stats on completion
    IF p_new_status = 'completed' AND v_booking.provider_id IS NOT NULL THEN
        UPDATE service_providers
        SET total_trips = total_trips + 1,
            updated_at = NOW()
        WHERE id = v_booking.provider_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql;

-- Update Moving Request Status
CREATE OR REPLACE FUNCTION update_moving_status(
    p_request_id UUID,
    p_new_status TEXT,
    p_final_price DECIMAL DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request moving_requests%ROWTYPE;
    v_valid_transition BOOLEAN := false;
BEGIN
    SELECT * INTO v_request
    FROM moving_requests
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบคำขอนี้');
    END IF;
    
    -- Validate status transition
    CASE v_request.status
        WHEN 'pending' THEN v_valid_transition := p_new_status IN ('matched', 'cancelled');
        WHEN 'matched' THEN v_valid_transition := p_new_status IN ('pickup', 'cancelled');
        WHEN 'pickup' THEN v_valid_transition := p_new_status IN ('in_progress', 'cancelled');
        WHEN 'in_progress' THEN v_valid_transition := p_new_status IN ('completed', 'cancelled');
        ELSE v_valid_transition := false;
    END CASE;
    
    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่สามารถเปลี่ยนสถานะได้');
    END IF;
    
    -- Update status
    UPDATE moving_requests
    SET status = p_new_status,
        updated_at = NOW(),
        pickup_at = CASE WHEN p_new_status = 'pickup' THEN NOW() ELSE pickup_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        final_price = CASE WHEN p_new_status = 'completed' THEN COALESCE(p_final_price, estimated_price) ELSE final_price END
    WHERE id = p_request_id;
    
    -- Update provider stats on completion
    IF p_new_status = 'completed' AND v_request.provider_id IS NOT NULL THEN
        UPDATE service_providers
        SET total_trips = total_trips + 1,
            updated_at = NOW()
        WHERE id = v_request.provider_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql;

-- Update Laundry Request Status
CREATE OR REPLACE FUNCTION update_laundry_status(
    p_request_id UUID,
    p_new_status TEXT,
    p_actual_weight DECIMAL DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_request laundry_requests%ROWTYPE;
    v_valid_transition BOOLEAN := false;
    v_final_price DECIMAL;
BEGIN
    SELECT * INTO v_request
    FROM laundry_requests
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่พบคำขอนี้');
    END IF;
    
    -- Validate status transition
    CASE v_request.status
        WHEN 'pending' THEN v_valid_transition := p_new_status IN ('matched', 'cancelled');
        WHEN 'matched' THEN v_valid_transition := p_new_status IN ('picked_up', 'cancelled');
        WHEN 'picked_up' THEN v_valid_transition := p_new_status IN ('washing', 'cancelled');
        WHEN 'washing' THEN v_valid_transition := p_new_status IN ('ready', 'cancelled');
        WHEN 'ready' THEN v_valid_transition := p_new_status IN ('delivered', 'cancelled');
        ELSE v_valid_transition := false;
    END CASE;
    
    IF NOT v_valid_transition THEN
        RETURN jsonb_build_object('success', false, 'error', 'ไม่สามารถเปลี่ยนสถานะได้');
    END IF;
    
    -- Calculate final price if weight is provided
    IF p_actual_weight IS NOT NULL THEN
        v_final_price := calculate_laundry_price(v_request.services, p_actual_weight);
    END IF;
    
    -- Update status
    UPDATE laundry_requests
    SET status = p_new_status,
        updated_at = NOW(),
        actual_weight = COALESCE(p_actual_weight, actual_weight),
        picked_up_at = CASE WHEN p_new_status = 'picked_up' THEN NOW() ELSE picked_up_at END,
        ready_at = CASE WHEN p_new_status = 'ready' THEN NOW() ELSE ready_at END,
        delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
        cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
        final_price = CASE WHEN p_new_status = 'ready' AND v_final_price IS NOT NULL THEN v_final_price ELSE final_price END
    WHERE id = p_request_id;
    
    -- Update provider stats on completion
    IF p_new_status = 'delivered' AND v_request.provider_id IS NOT NULL THEN
        UPDATE service_providers
        SET total_trips = total_trips + 1,
            updated_at = NOW()
        WHERE id = v_request.provider_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'status', p_new_status);
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 9. PROVIDER JOB FETCHING FUNCTIONS
-- =====================================================

-- Get Available Queue Bookings for Provider
CREATE OR REPLACE FUNCTION get_available_queue_bookings_for_provider(
    p_provider_id UUID
) RETURNS SETOF queue_bookings AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM queue_bookings
    WHERE status = 'pending'
    AND scheduled_date >= CURRENT_DATE
    ORDER BY scheduled_date, scheduled_time
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Get Available Moving Requests for Provider
CREATE OR REPLACE FUNCTION get_available_moving_requests_for_provider(
    p_provider_id UUID,
    p_lat DECIMAL DEFAULT NULL,
    p_lng DECIMAL DEFAULT NULL,
    p_radius_km DECIMAL DEFAULT 10
) RETURNS SETOF moving_requests AS $$
BEGIN
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        RETURN QUERY
        SELECT *
        FROM moving_requests
        WHERE status = 'pending'
        AND (
            6371 * acos(
                cos(radians(p_lat)) * cos(radians(pickup_lat)) *
                cos(radians(pickup_lng) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(pickup_lat))
            )
        ) <= p_radius_km
        ORDER BY created_at DESC
        LIMIT 20;
    ELSE
        RETURN QUERY
        SELECT *
        FROM moving_requests
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 20;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Get Available Laundry Requests for Provider
CREATE OR REPLACE FUNCTION get_available_laundry_requests_for_provider(
    p_provider_id UUID,
    p_lat DECIMAL DEFAULT NULL,
    p_lng DECIMAL DEFAULT NULL,
    p_radius_km DECIMAL DEFAULT 10
) RETURNS SETOF laundry_requests AS $$
BEGIN
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        RETURN QUERY
        SELECT *
        FROM laundry_requests
        WHERE status = 'pending'
        AND (
            6371 * acos(
                cos(radians(p_lat)) * cos(radians(pickup_lat)) *
                cos(radians(pickup_lng) - radians(p_lng)) +
                sin(radians(p_lat)) * sin(radians(pickup_lat))
            )
        ) <= p_radius_km
        ORDER BY scheduled_pickup
        LIMIT 20;
    ELSE
        RETURN QUERY
        SELECT *
        FROM laundry_requests
        WHERE status = 'pending'
        ORDER BY scheduled_pickup
        LIMIT 20;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE queue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry_ratings ENABLE ROW LEVEL SECURITY;

-- Queue Bookings Policies
CREATE POLICY "Users can view own queue bookings"
    ON queue_bookings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create queue bookings"
    ON queue_bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue bookings"
    ON queue_bookings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Providers can view assigned queue bookings"
    ON queue_bookings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.id = queue_bookings.provider_id
        )
    );

CREATE POLICY "Providers can view pending queue bookings"
    ON queue_bookings FOR SELECT
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.is_available = true
        )
    );

-- Moving Requests Policies
CREATE POLICY "Users can view own moving requests"
    ON moving_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create moving requests"
    ON moving_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moving requests"
    ON moving_requests FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Providers can view assigned moving requests"
    ON moving_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.id = moving_requests.provider_id
        )
    );

CREATE POLICY "Providers can view pending moving requests"
    ON moving_requests FOR SELECT
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.is_available = true
        )
    );

-- Laundry Requests Policies
CREATE POLICY "Users can view own laundry requests"
    ON laundry_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create laundry requests"
    ON laundry_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own laundry requests"
    ON laundry_requests FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Providers can view assigned laundry requests"
    ON laundry_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.id = laundry_requests.provider_id
        )
    );

CREATE POLICY "Providers can view pending laundry requests"
    ON laundry_requests FOR SELECT
    USING (
        status = 'pending'
        AND EXISTS (
            SELECT 1 FROM service_providers
            WHERE service_providers.user_id = auth.uid()
            AND service_providers.is_available = true
        )
    );

-- Rating Policies
CREATE POLICY "Users can view own queue ratings"
    ON queue_ratings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create queue ratings"
    ON queue_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own moving ratings"
    ON moving_ratings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create moving ratings"
    ON moving_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own laundry ratings"
    ON laundry_ratings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create laundry ratings"
    ON laundry_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE queue_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE moving_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE laundry_requests;

-- =====================================================
-- 12. TRIGGERS FOR TRACKING ID AUTO-GENERATION
-- =====================================================

-- Queue Booking Tracking ID Trigger
CREATE OR REPLACE FUNCTION set_queue_booking_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
        NEW.tracking_id := generate_new_service_tracking_id('QUE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_queue_booking_tracking_id
    BEFORE INSERT ON queue_bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_queue_booking_tracking_id();

-- Moving Request Tracking ID Trigger
CREATE OR REPLACE FUNCTION set_moving_request_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
        NEW.tracking_id := generate_new_service_tracking_id('MOV');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_moving_request_tracking_id
    BEFORE INSERT ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_moving_request_tracking_id();

-- Laundry Request Tracking ID Trigger
CREATE OR REPLACE FUNCTION set_laundry_request_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
        NEW.tracking_id := generate_new_service_tracking_id('LAU');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_laundry_request_tracking_id
    BEFORE INSERT ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_laundry_request_tracking_id();

-- =====================================================
-- 13. UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER trigger_queue_bookings_updated_at
    BEFORE UPDATE ON queue_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_moving_requests_updated_at
    BEFORE UPDATE ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_laundry_requests_updated_at
    BEFORE UPDATE ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
