-- Safety Features Migration
-- Emergency contacts and trip sharing

-- Emergency contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip shares table
CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  share_code VARCHAR(20) UNIQUE NOT NULL,
  shared_with_phone VARCHAR(15),
  shared_with_email VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_code ON public.trip_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_trip_shares_ride ON public.trip_shares(ride_id);

-- RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create trip shares" ON public.trip_shares
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = ride_id AND r.user_id::text = auth.uid()::text)
  );

CREATE POLICY "Anyone can view trip shares by code" ON public.trip_shares
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
