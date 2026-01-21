-- Customer Suspension System
-- ===========================
-- Allows admin to suspend/unsuspend customer accounts

-- Add suspension columns to users table (if not exists)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.users(id);

-- Function to suspend a customer
CREATE OR REPLACE FUNCTION public.suspend_customer(
  p_customer_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET 
    is_active = false,
    suspended_at = NOW(),
    suspended_reason = p_reason,
    suspended_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN FOUND;
END;
$$;

-- Function to unsuspend a customer
CREATE OR REPLACE FUNCTION public.unsuspend_customer(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET 
    is_active = true,
    suspended_at = NULL,
    suspended_reason = NULL,
    suspended_by = NULL,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.suspend_customer TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_customer TO authenticated;
