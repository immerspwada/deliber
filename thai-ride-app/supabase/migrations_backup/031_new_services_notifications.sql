-- Migration: 031_new_services_notifications.sql
-- Feature: F158, F159, F160 - Notification Triggers for New Services
-- Description: Create notification triggers for queue booking, moving, and laundry services

-- =====================================================
-- 1. QUEUE BOOKING NOTIFICATION TRIGGERS
-- =====================================================

-- Notify customer when queue booking is confirmed
CREATE OR REPLACE FUNCTION notify_queue_booking_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'การจองคิวได้รับการยืนยัน',
            'การจองคิวของคุณ ' || NEW.tracking_id || ' ได้รับการยืนยันแล้ว',
            'queue_confirmed',
            jsonb_build_object('booking_id', NEW.id, 'tracking_id', NEW.tracking_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_queue_booking_confirmed
    AFTER UPDATE ON queue_bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_queue_booking_confirmed();

-- Notify customer when queue booking is completed
CREATE OR REPLACE FUNCTION notify_queue_booking_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'การจองคิวเสร็จสิ้น',
            'การจองคิว ' || NEW.tracking_id || ' เสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ',
            'queue_completed',
            jsonb_build_object('booking_id', NEW.id, 'tracking_id', NEW.tracking_id, 'fee', NEW.final_fee)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_queue_booking_completed
    AFTER UPDATE ON queue_bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_queue_booking_completed();

-- =====================================================
-- 2. MOVING SERVICE NOTIFICATION TRIGGERS
-- =====================================================

-- Notify customer when moving request is matched
CREATE OR REPLACE FUNCTION notify_moving_matched()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'matched' AND OLD.status = 'pending' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'พบผู้ให้บริการแล้ว',
            'คำขอยกของ ' || NEW.tracking_id || ' ได้จับคู่กับผู้ให้บริการแล้ว',
            'moving_matched',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_moving_matched
    AFTER UPDATE ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_moving_matched();

-- Notify customer when provider arrives at pickup
CREATE OR REPLACE FUNCTION notify_moving_pickup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pickup' AND OLD.status = 'matched' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'ผู้ให้บริการมาถึงแล้ว',
            'ผู้ให้บริการมาถึงจุดรับของแล้ว กรุณาเตรียมสิ่งของ',
            'moving_pickup',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_moving_pickup
    AFTER UPDATE ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_moving_pickup();

-- Notify customer when moving is completed
CREATE OR REPLACE FUNCTION notify_moving_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'ขนย้ายเสร็จสิ้น',
            'การขนย้าย ' || NEW.tracking_id || ' เสร็จสิ้นแล้ว กรุณาให้คะแนนบริการ',
            'moving_completed',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id, 'price', NEW.final_price)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_moving_completed
    AFTER UPDATE ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_moving_completed();

-- =====================================================
-- 3. LAUNDRY SERVICE NOTIFICATION TRIGGERS
-- =====================================================

-- Notify customer when laundry request is matched
CREATE OR REPLACE FUNCTION notify_laundry_matched()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'matched' AND OLD.status = 'pending' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'พบผู้ให้บริการซักผ้าแล้ว',
            'คำขอซักผ้า ' || NEW.tracking_id || ' ได้จับคู่กับผู้ให้บริการแล้ว',
            'laundry_matched',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_laundry_matched
    AFTER UPDATE ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_laundry_matched();

-- Notify customer when laundry is picked up
CREATE OR REPLACE FUNCTION notify_laundry_picked_up()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'picked_up' AND OLD.status = 'matched' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'รับผ้าแล้ว',
            'ผู้ให้บริการรับผ้าของคุณแล้ว น้ำหนัก ' || COALESCE(NEW.actual_weight::TEXT, '-') || ' กก.',
            'laundry_picked_up',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id, 'weight', NEW.actual_weight)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_laundry_picked_up
    AFTER UPDATE ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_laundry_picked_up();

-- Notify customer when laundry is ready
CREATE OR REPLACE FUNCTION notify_laundry_ready()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ready' AND OLD.status = 'washing' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'ผ้าพร้อมส่งแล้ว',
            'ผ้าของคุณซักเสร็จแล้ว รอจัดส่ง ราคา ฿' || COALESCE(NEW.final_price::TEXT, '-'),
            'laundry_ready',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id, 'price', NEW.final_price)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_laundry_ready
    AFTER UPDATE ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_laundry_ready();

-- Notify customer when laundry is delivered
CREATE OR REPLACE FUNCTION notify_laundry_delivered()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status = 'ready' THEN
        INSERT INTO user_notifications (user_id, title, message, type, data)
        VALUES (
            NEW.user_id,
            'ส่งผ้าเรียบร้อย',
            'ผ้าของคุณส่งถึงแล้ว กรุณาให้คะแนนบริการ',
            'laundry_delivered',
            jsonb_build_object('request_id', NEW.id, 'tracking_id', NEW.tracking_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_laundry_delivered
    AFTER UPDATE ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_laundry_delivered();

-- =====================================================
-- 4. PROVIDER NOTIFICATION FOR NEW JOBS
-- =====================================================

-- Notify providers when new queue booking is created
CREATE OR REPLACE FUNCTION notify_providers_new_queue_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue push notification for available providers
    INSERT INTO push_notification_queue (user_id, title, body, data)
    SELECT 
        sp.user_id,
        'งานจองคิวใหม่',
        'มีงานจองคิว ' || NEW.category || ' รอรับงาน',
        jsonb_build_object('type', 'new_queue_booking', 'booking_id', NEW.id, 'tracking_id', NEW.tracking_id)
    FROM service_providers sp
    WHERE sp.is_available = true
    AND sp.is_verified = true
    LIMIT 10;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_providers_new_queue_booking
    AFTER INSERT ON queue_bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_providers_new_queue_booking();

-- Notify providers when new moving request is created
CREATE OR REPLACE FUNCTION notify_providers_new_moving_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue push notification for nearby providers
    INSERT INTO push_notification_queue (user_id, title, body, data)
    SELECT 
        sp.user_id,
        'งานยกของใหม่',
        'มีงานยกของ ' || NEW.service_type || ' รอรับงาน',
        jsonb_build_object('type', 'new_moving_request', 'request_id', NEW.id, 'tracking_id', NEW.tracking_id)
    FROM service_providers sp
    WHERE sp.is_available = true
    AND sp.is_verified = true
    AND (
        NEW.pickup_lat IS NULL OR NEW.pickup_lng IS NULL OR
        sp.current_lat IS NULL OR sp.current_lng IS NULL OR
        (6371 * acos(
            cos(radians(sp.current_lat)) * cos(radians(NEW.pickup_lat)) *
            cos(radians(NEW.pickup_lng) - radians(sp.current_lng)) +
            sin(radians(sp.current_lat)) * sin(radians(NEW.pickup_lat))
        )) <= 10
    )
    LIMIT 10;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_providers_new_moving_request
    AFTER INSERT ON moving_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_providers_new_moving_request();

-- Notify providers when new laundry request is created
CREATE OR REPLACE FUNCTION notify_providers_new_laundry_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue push notification for nearby providers
    INSERT INTO push_notification_queue (user_id, title, body, data)
    SELECT 
        sp.user_id,
        'งานซักผ้าใหม่',
        'มีงานซักผ้ารอรับงาน',
        jsonb_build_object('type', 'new_laundry_request', 'request_id', NEW.id, 'tracking_id', NEW.tracking_id)
    FROM service_providers sp
    WHERE sp.is_available = true
    AND sp.is_verified = true
    AND (
        NEW.pickup_lat IS NULL OR NEW.pickup_lng IS NULL OR
        sp.current_lat IS NULL OR sp.current_lng IS NULL OR
        (6371 * acos(
            cos(radians(sp.current_lat)) * cos(radians(NEW.pickup_lat)) *
            cos(radians(NEW.pickup_lng) - radians(sp.current_lng)) +
            sin(radians(sp.current_lat)) * sin(radians(NEW.pickup_lat))
        )) <= 10
    )
    LIMIT 10;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_providers_new_laundry_request
    AFTER INSERT ON laundry_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_providers_new_laundry_request();
