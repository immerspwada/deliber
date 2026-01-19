-- Fix database schema mismatch issues
-- Migration: 234_fix_database_schema_mismatch.sql

-- First, let's ensure jobs_v2 table exists with correct structure
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

-- Ensure earnings_v2 table exists
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

-- Enable RLS on both tables
ALTER TABLE public.jobs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "customers_can_view_own_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "customers_can_create_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "customers_can_update_own_pending_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "providers_can_view_available_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "providers_can_accept_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "providers_can_update_assigned_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "admin_can_view_all_jobs" ON public.jobs_v2;
DROP POLICY IF EXISTS "admin_can_update_all_jobs" ON public.jobs_v2;

-- Create correct RLS policies for jobs_v2
CREATE POLICY "jobs_v2_select_policy" ON public.jobs_v2
    FOR SELECT USING (
        -- Customers can see their own jobs
        customer_id = auth.uid()
        -- Providers can see available jobs or their assigned jobs
        OR (status = 'pending' AND provider_id IS NULL)
        OR provider_id IN (SELECT id FROM public.providers_v2 WHERE user_id = auth.uid())
        -- Admin can see all jobs
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
    );

CREATE POLICY "jobs_v2_insert_policy" ON public.jobs_v2
    FOR INSERT WITH CHECK (
        -- Customers can create jobs for themselves
        customer_id = auth.uid()
        -- Admin can create jobs for anyone
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
    );

CREATE POLICY "jobs_v2_update_policy" ON public.jobs_v2
    FOR UPDATE USING (
        -- Customers can update their own pending jobs
        (customer_id = auth.uid() AND status = 'pending')
        -- Providers can update jobs they're assigned to
        OR provider_id IN (SELECT id FROM public.providers_v2 WHERE user_id = auth.uid())
        -- Providers can accept available jobs
        OR (status = 'pending' AND provider_id IS NULL AND EXISTS (
            SELECT 1 FROM public.providers_v2 
            WHERE user_id = auth.uid() 
            AND status IN ('approved', 'active')
        ))
        -- Admin can update all jobs
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
    );

-- RLS policies for earnings_v2
DROP POLICY IF EXISTS "providers_can_view_own_earnings" ON public.earnings_v2;
DROP POLICY IF EXISTS "system_can_create_earnings" ON public.earnings_v2;
DROP POLICY IF EXISTS "admin_can_view_all_earnings" ON public.earnings_v2;

CREATE POLICY "earnings_v2_select_policy" ON public.earnings_v2
    FOR SELECT USING (
        -- Providers can see their own earnings
        provider_id IN (SELECT id FROM public.providers_v2 WHERE user_id = auth.uid())
        -- Admin can see all earnings
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND user_type = 'admin')
    );

CREATE POLICY "earnings_v2_insert_policy" ON public.earnings_v2
    FOR INSERT WITH CHECK (true); -- Allow system to create earnings

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_v2_status ON public.jobs_v2(status);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_provider_id ON public.jobs_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_customer_id ON public.jobs_v2(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_created_at ON public.jobs_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_v2_service_type ON public.jobs_v2(service_type);

CREATE INDEX IF NOT EXISTS idx_earnings_v2_provider_id ON public.earnings_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_job_id ON public.earnings_v2(job_id);
CREATE INDEX IF NOT EXISTS idx_earnings_v2_earned_at ON public.earnings_v2(earned_at);

-- Create updated_at trigger for jobs_v2
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_jobs_v2_updated_at ON public.jobs_v2;
CREATE TRIGGER update_jobs_v2_updated_at 
    BEFORE UPDATE ON public.jobs_v2 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clear existing jobs and insert fresh test data
DELETE FROM public.jobs_v2;

-- Insert test jobs with valid customer_id references
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
) 
SELECT 
    auth.uid() as customer_id,
    'ride' as service_type,
    'เซ็นทรัลเวิลด์' as pickup_address,
    13.7460 as pickup_lat,
    100.5340 as pickup_lng,
    'สุขุมวิท 24' as dropoff_address,
    13.7372 as dropoff_lat,
    100.5597 as dropoff_lng,
    3.2 as distance_km,
    15 as duration_minutes,
    95.00 as estimated_earnings,
    'งานทดสอบระบบ Provider' as special_instructions
WHERE auth.uid() IS NOT NULL

UNION ALL

SELECT 
    auth.uid() as customer_id,
    'delivery' as service_type,
    'ตลาดจตุจักร' as pickup_address,
    13.7997 as pickup_lat,
    100.5500 as pickup_lng,
    'มหาวิทยาลัยธรรมศาสตร์' as dropoff_address,
    13.7967 as dropoff_lat,
    100.5514 as dropoff_lng,
    1.5 as distance_km,
    10 as duration_minutes,
    60.00 as estimated_earnings,
    'ส่งเอกสารสำคัญ' as special_instructions
WHERE auth.uid() IS NOT NULL

UNION ALL

SELECT 
    auth.uid() as customer_id,
    'ride' as service_type,
    'สถานีรถไฟฟ้าสยาม' as pickup_address,
    13.7460 as pickup_lat,
    100.5340 as pickup_lng,
    'สถานีรถไฟฟ้าอโศก' as dropoff_address,
    13.7372 as dropoff_lat,
    100.5597 as dropoff_lng,
    2.8 as distance_km,
    12 as duration_minutes,
    85.00 as estimated_earnings,
    'รีบด่วน' as special_instructions
WHERE auth.uid() IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.jobs_v2 TO authenticated;
GRANT SELECT, INSERT ON public.earnings_v2 TO authenticated;

COMMENT ON TABLE public.jobs_v2 IS 'Jobs table for provider system v2 - fixed schema';
COMMENT ON TABLE public.earnings_v2 IS 'Earnings tracking for providers v2 - fixed schema';