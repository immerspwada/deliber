-- Migration: 148_auto_verify_customers.sql
-- Description: Auto-verify customers on registration (no manual verification needed)
-- Date: 2025-12-22

-- 1. Change default verification_status to 'verified' for new users
-- This means customers can use the app immediately after registration
ALTER TABLE users ALTER COLUMN verification_status SET DEFAULT 'verified';

-- 2. Update existing pending users to verified
UPDATE users 
SET verification_status = 'verified',
    verified_at = NOW()
WHERE verification_status = 'pending';

-- 3. Add comment explaining the change
COMMENT ON COLUMN users.verification_status IS 
  'User verification status. Default is verified - customers can use app immediately. 
   Values: pending, verified, rejected, suspended.
   Note: Provider verification is separate and still requires admin approval.';
