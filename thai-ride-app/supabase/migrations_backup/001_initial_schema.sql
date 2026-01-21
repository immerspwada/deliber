-- Thai Ride App Database Schema
-- Version: 1.0.0
-- Description: Initial database schema for Thai ride-hailing application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table with Thai-specific fields
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  national_id VARCHAR(13) UNIQUE NOT NULL,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  profile_image TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  preferred_language VARCHAR(2) DEFAULT 'th' CHECK (preferred_language IN ('th', 'en')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service providers table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_type VARCHAR(20) NOT NULL CHECK (provider_type IN ('driver', 'delivery', 'shopper')),
  license_number VARCHAR(50),
  vehicle_type VARCHAR(50),
  vehicle_plate VARCHAR(20),
  background_check_status VARCHAR(20) DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  service_radius INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ride requests table
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_address TEXT NOT NULL,
  ride_type VARCHAR(20) DEFAULT 'standard' CHECK (ride_type IN ('standard', 'premium', 'shared')),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  passenger_count INTEGER DEFAULT 1,
  special_requests TEXT,
  estimated_fare DECIMAL(10,2) NOT NULL,
  actual_fare DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery requests table
CREATE TABLE IF NOT EXISTS public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  sender_name VARCHAR(100) NOT NULL,
  sender_phone VARCHAR(15) NOT NULL,
  sender_address TEXT NOT NULL,
  sender_lat DECIMAL(10,8) NOT NULL,
  sender_lng DECIMAL(11,8) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  recipient_address TEXT NOT NULL,
  recipient_lat DECIMAL(10,8) NOT NULL,
  recipient_lng DECIMAL(11,8) NOT NULL,
  package_description TEXT NOT NULL,
  package_weight DECIMAL(5,2) NOT NULL,
  package_type VARCHAR(20) DEFAULT 'small' CHECK (package_type IN ('document', 'small', 'medium', 'large')),
  estimated_fee DECIMAL(10,2) NOT NULL,
  actual_fee DECIMAL(10,2),
  pickup_photo TEXT,
  delivery_photo TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'pickup', 'in_transit', 'delivered', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping requests table
CREATE TABLE IF NOT EXISTS public.shopping_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  store_name VARCHAR(200) NOT NULL,
  store_address TEXT NOT NULL,
  store_lat DECIMAL(10,8) NOT NULL,
  store_lng DECIMAL(11,8) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DECIMAL(10,8) NOT NULL,
  delivery_lng DECIMAL(11,8) NOT NULL,
  item_list TEXT NOT NULL,
  budget_limit DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  service_fee DECIMAL(10,2) NOT NULL,
  items_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  receipt_photo TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.service_providers(id),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('ride', 'delivery', 'shopping')),
  request_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('promptpay', 'credit_card', 'cash', 'mobile_banking')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_ref VARCHAR(100),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON public.users(national_id);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON public.service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_online ON public.service_providers(is_online);
CREATE INDEX IF NOT EXISTS idx_providers_location ON public.service_providers(current_lat, current_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_user ON public.ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_provider ON public.ride_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_user ON public.delivery_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON public.delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_user ON public.shopping_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_status ON public.shopping_requests(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for service_providers table
CREATE POLICY "Providers can view own profile" ON public.service_providers
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Providers can update own profile" ON public.service_providers
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view online providers" ON public.service_providers
  FOR SELECT USING (is_online = true);

-- RLS Policies for ride_requests table
CREATE POLICY "Users can view own ride requests" ON public.ride_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create ride requests" ON public.ride_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Providers can view assigned rides" ON public.ride_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp 
      WHERE sp.id = provider_id AND sp.user_id::text = auth.uid()::text
    )
  );

-- RLS Policies for delivery_requests table
CREATE POLICY "Users can view own delivery requests" ON public.delivery_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create delivery requests" ON public.delivery_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for shopping_requests table
CREATE POLICY "Users can view own shopping requests" ON public.shopping_requests
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create shopping requests" ON public.shopping_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for payments table
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_requests_updated_at BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_requests_updated_at BEFORE UPDATE ON public.shopping_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate Thai National ID
CREATE OR REPLACE FUNCTION validate_thai_national_id(national_id VARCHAR(13))
RETURNS BOOLEAN AS $$
DECLARE
  sum INTEGER := 0;
  check_digit INTEGER;
  i INTEGER;
BEGIN
  -- Check length
  IF LENGTH(national_id) != 13 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if all characters are digits
  IF national_id !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate checksum
  FOR i IN 1..12 LOOP
    sum := sum + (CAST(SUBSTRING(national_id FROM i FOR 1) AS INTEGER) * (14 - i));
  END LOOP;
  
  check_digit := (11 - (sum % 11)) % 10;
  
  RETURN check_digit = CAST(SUBSTRING(national_id FROM 13 FOR 1) AS INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Add constraint for Thai National ID validation
ALTER TABLE public.users ADD CONSTRAINT valid_national_id 
  CHECK (validate_thai_national_id(national_id));

-- Function to find nearby providers
CREATE OR REPLACE FUNCTION find_nearby_providers(
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  radius_km INTEGER DEFAULT 2,
  provider_type_filter VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
  provider_id UUID,
  user_id UUID,
  provider_type VARCHAR(20),
  rating DECIMAL(3,2),
  distance_km DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    sp.user_id,
    sp.provider_type,
    sp.rating,
    (6371 * acos(
      cos(radians(lat)) * cos(radians(sp.current_lat)) *
      cos(radians(sp.current_lng) - radians(lng)) +
      sin(radians(lat)) * sin(radians(sp.current_lat))
    ))::DECIMAL(10,2) as distance_km
  FROM public.service_providers sp
  WHERE sp.is_online = true
    AND sp.background_check_status = 'approved'
    AND (provider_type_filter IS NULL OR sp.provider_type = provider_type_filter)
    AND sp.current_lat IS NOT NULL
    AND sp.current_lng IS NOT NULL
    AND (6371 * acos(
      cos(radians(lat)) * cos(radians(sp.current_lat)) *
      cos(radians(sp.current_lng) - radians(lng)) +
      sin(radians(lat)) * sin(radians(sp.current_lat))
    )) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;