-- Create jobs_v2 and earnings_v2 tables with proper RLS policies
-- Migration: 232_create_jobs_v2_and_earnings_v2_tables.sql

-- Create jobs_v2 table
CREATE TABLE IF NOT EXISTS public.jobs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers_v2(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL DEFAULT 'ride',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
    
    -- Location data
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    dropoff_address TEXT,
    dropoff_lat DECIMAL(10, 8),
    dropoff_lng DECIMAL(11, 8),
    
    -- Trip details
    distance_km DECIMAL(8, 2),
    duration_minutes INTEGER,
    estimated_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_earnings DECIMAL(10, 2),
    
    -- Special instructions
    special_instructions TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create earnings_v2 table
CREATE TABLE IF NOT EXISTS public.earnings_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.providers_v2(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs_v2(id) ON DELETE SET NULL,
    
    -- Earnings breakdown
    gross_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Earning details
    earning_type TEXT NOT NULL DEFAULT 'job_completion' CHECK (earning_type IN ('job_completion', 'bonus', 'incentive', 'tip')),
    service_type TEXT NOT NULL DEFAULT 'ride',
    
    -- Timestamps
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_v2_status ON public.jobs_v2(status);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_provider_id ON public.jobs_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_customer_id ON public.jobs_v2(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_created_at ON public.jobs_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_service_type ON public.jobs_v2(service_type);

CREATE INDEX IF NOT EXISTS idx_earnings_v2_provider_id ON public.earnings_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_job_id ON public.earnings_v2(job_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_earned_at ON public.earnings_v2(earned_at);

-- Enable RLS
ALTER TABLE public.jobs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_v2 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs_v2
-- Customers can see their own jobs
CREATE POLICY "customers_can_view_own_jobs" ON public.jobs_v2
    FOR SELECT USING (customer_id = auth.uid());

-- Customers can create jobs
CREATE POLICY "customers_can_create_jobs" ON public.jobs_v2
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their own pending jobs
CREATE POLICY "customers_can_update_own_pending_jobs" ON public.jobs_v2
    FOR UPDATE USING (customer_id = auth.uid() AND status = 'pending');

-- Providers can see available jobs (pending with no provider assigned)
CREATE POLICY "providers_can_view_available_jobs" ON public.jobs_v2
    FOR SELECT USING (
        status = 'pending' AND provider_id IS NULL
        OR provider_id IN (
            SELECT id FROM public.providers_v2 WHERE user_id = auth.uid()
        )
    );

-- Providers can accept jobs (update pending jobs to assign themselves)
CREATE POLICY "providers_can_accept_jobs" ON public.jobs_v2
    FOR UPDATE USING (
        status = 'pending' 
        AND provider_id IS NULL
        AND EXISTS (
            SELECT 1 FROM public.providers_v2 
            WHERE user_id = auth.uid() 
            AND status IN ('approved', 'active')
            AND is_online = true
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT id FROM public.providers_v2 WHERE user_id = auth.uid()
        )
    );

-- Providers can update their assigned jobs
CREATE POLICY "providers_can_update_assigned_jobs" ON public.jobs_v2
    FOR UPDATE USING (
        provider_id IN (
            SELECT id FROM public.providers_v2 WHERE user_id = auth.uid()
        )
    );

-- Admin can see all jobs
CREATE POLICY "admin_can_view_all_jobs" ON public.jobs_v2
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- Admin can update all jobs
CREATE POLICY "admin_can_update_all_jobs" ON public.jobs_v2
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- RLS Policies for earnings_v2
-- Providers can see their own earnings
CREATE POLICY "providers_can_view_own_earnings" ON public.earnings_v2
    FOR SELECT USING (
        provider_id IN (
            SELECT id FROM public.providers_v2 WHERE user_id = auth.uid()
        )
    );

-- System can create earnings (via functions)
CREATE POLICY "system_can_create_earnings" ON public.earnings_v2
    FOR INSERT WITH CHECK (true);

-- Admin can see all earnings
CREATE POLICY "admin_can_view_all_earnings" ON public.earnings_v2
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- Create updated_at trigger for jobs_v2
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_v2_updated_at 
    BEFORE UPDATE ON public.jobs_v2 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data
INSERT INTO public.jobs_v2 (
    customer_id,
    service_type,
    pickup_address,
    pickup_lat,
    pickup_lng,
    dropoff_address,
    dropoff_lat,
    dropoff_lng,
    distance_km,
    duration_minutes,
    estimated_earnings,
    special_instructions
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'ride',
    'เซ็นทรัลเวิลด์',
    13.7460,
    100.5340,
    'สุขุมวิท 24',
    13.7372,
    100.5597,
    3.2,
    15,
    95.00,
    'งานทดสอบระบบ Provider'
),
(
    '22222222-2222-2222-2222-222222222222',
    'delivery',
    'ตลาดจตุจักร',
    13.7997,
    100.5500,
    'มหาวิทยาลัยธรรมศาสตร์',
    13.7967,
    100.5514,
    1.5,
    10,
    60.00,
    'ส่งเอกสารสำคัญ'
),
(
    '33333333-3333-3333-3333-333333333333',
    'ride',
    'สถานีรถไฟฟ้าสยาม',
    13.7460,
    100.5340,
    'สถานีรถไฟฟ้าอโศก',
    13.7372,
    100.5597,
    2.8,
    12,
    85.00,
    'รีบด่วน'
),
(
    '44444444-4444-4444-4444-444444444444',
    'delivery',
    'เทอร์มินอล 21',
    13.7372,
    100.5597,
    'เอ็มโพเรียม',
    13.7208,
    100.5692,
    2.1,
    8,
    70.00,
    'ของเปราะบาง'
),
(
    '55555555-5555-5555-5555-555555555555',
    'ride',
    'สนามบินสุวรรณภูมิ',
    13.6900,
    100.7501,
    'ห้างสยามพารากอน',
    13.7460,
    100.5340,
    28.5,
    45,
    350.00,
    'เที่ยวบินเช้า'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.jobs_v2 IS 'Jobs table for provider system v2';
COMMENT ON TABLE public.earnings_v2 IS 'Earnings tracking for providers v2';