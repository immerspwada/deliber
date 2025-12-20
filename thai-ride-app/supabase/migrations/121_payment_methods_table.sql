-- =============================================
-- Migration: 121_payment_methods_table.sql
-- Feature: F08 - Payment Methods
-- Description: Create payment_methods table if not exists
-- =============================================

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'promptpay', 'mobile_banking')),
  name VARCHAR(100) NOT NULL,
  last_four VARCHAR(4),
  brand VARCHAR(20),
  bank_name VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON public.payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admin can view all payment methods" ON public.payment_methods;

-- Create proper RLS policies
-- Users can view their own payment methods
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payment methods
CREATE POLICY "Users can insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "Users can update own payment methods" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Permissive policy for development (allows all operations)
-- Comment this out in production
CREATE POLICY "Allow all payment_methods_dev" ON public.payment_methods
  FOR ALL USING (true) WITH CHECK (true);

-- Function to set default payment method (atomic operation)
CREATE OR REPLACE FUNCTION set_default_payment_method(
  p_user_id UUID,
  p_method_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Unset all defaults for user
  UPDATE public.payment_methods 
  SET is_default = false, updated_at = now()
  WHERE user_id = p_user_id AND is_default = true;
  
  -- Set new default
  UPDATE public.payment_methods 
  SET is_default = true, updated_at = now()
  WHERE id = p_method_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add payment method with auto-default
CREATE OR REPLACE FUNCTION add_payment_method(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_name VARCHAR(100),
  p_last_four VARCHAR(4) DEFAULT NULL,
  p_brand VARCHAR(20) DEFAULT NULL,
  p_bank_name VARCHAR(50) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_method_id UUID;
  v_has_methods BOOLEAN;
BEGIN
  -- Check if user has any payment methods
  SELECT EXISTS(
    SELECT 1 FROM public.payment_methods 
    WHERE user_id = p_user_id AND is_active = true
  ) INTO v_has_methods;
  
  -- Insert new method
  INSERT INTO public.payment_methods (
    user_id, type, name, last_four, brand, bank_name, 
    is_default, is_active, metadata
  ) VALUES (
    p_user_id, p_type, p_name, p_last_four, p_brand, p_bank_name,
    NOT v_has_methods, -- Set as default if first method
    true, p_metadata
  ) RETURNING id INTO v_method_id;
  
  RETURN v_method_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trigger_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_payment_methods_updated_at();

-- Grant permissions
GRANT ALL ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
