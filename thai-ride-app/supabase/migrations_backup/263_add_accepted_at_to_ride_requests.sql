-- Migration: 263_add_accepted_at_to_ride_requests.sql
-- Description: Add accepted_at column to ride_requests table for tracking when provider accepts job
-- Date: 2026-01-14

BEGIN;

-- Add accepted_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ride_requests' 
        AND column_name = 'accepted_at'
    ) THEN
        ALTER TABLE public.ride_requests 
        ADD COLUMN accepted_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added accepted_at column to ride_requests';
    ELSE
        RAISE NOTICE 'accepted_at column already exists in ride_requests';
    END IF;
END $$;

-- Add arrived_at column if not exists (for tracking when provider arrives at pickup)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ride_requests' 
        AND column_name = 'arrived_at'
    ) THEN
        ALTER TABLE public.ride_requests 
        ADD COLUMN arrived_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added arrived_at column to ride_requests';
    ELSE
        RAISE NOTICE 'arrived_at column already exists in ride_requests';
    END IF;
END $$;

-- Add started_at column if not exists (for tracking when ride actually starts)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ride_requests' 
        AND column_name = 'started_at'
    ) THEN
        ALTER TABLE public.ride_requests 
        ADD COLUMN started_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added started_at column to ride_requests';
    ELSE
        RAISE NOTICE 'started_at column already exists in ride_requests';
    END IF;
END $$;

-- Add completed_at column if not exists (for tracking when ride completes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ride_requests' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.ride_requests 
        ADD COLUMN completed_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added completed_at column to ride_requests';
    ELSE
        RAISE NOTICE 'completed_at column already exists in ride_requests';
    END IF;
END $$;

-- Create index for performance on accepted_at queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_accepted_at 
ON public.ride_requests(accepted_at) 
WHERE accepted_at IS NOT NULL;

-- Create index for status + accepted_at queries
CREATE INDEX IF NOT EXISTS idx_ride_requests_status_accepted 
ON public.ride_requests(status, accepted_at);

COMMIT;
