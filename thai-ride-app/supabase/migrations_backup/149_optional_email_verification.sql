-- Migration: 149_optional_email_verification.sql
-- Feature: F01 - Optional Email Verification for Customers
-- Description: Add email_verified columns for optional email verification
-- Note: Customer verification_status is now auto-verified on registration
--       This email verification is OPTIONAL for customers who want extra security

-- Add email_verified column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add email_verified_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN users.email_verified IS 'Optional email verification status - customers can use app without verifying email';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when email was verified (optional)';

-- Function to verify email
CREATE OR REPLACE FUNCTION verify_user_email(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users
  SET 
    email_verified = true,
    email_verified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_email(UUID) TO anon;
