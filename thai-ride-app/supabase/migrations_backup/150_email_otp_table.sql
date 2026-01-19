-- Migration: 150_email_otp_table.sql
-- Feature: F01 - Email OTP Verification System
-- Description: Table to store email verification OTPs

-- Create email_verification_otps table
CREATE TABLE IF NOT EXISTS email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otp_user_id ON email_verification_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires ON email_verification_otps(expires_at);

-- RLS Policies
ALTER TABLE email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OTP records
CREATE POLICY "Users can view own OTP" ON email_verification_otps
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role can manage all OTPs (for Edge Functions)
CREATE POLICY "Service role full access" ON email_verification_otps
  FOR ALL TO service_role
  USING (true);

-- Admin can view all OTPs
CREATE POLICY "Admin can view all OTPs" ON email_verification_otps
  FOR SELECT TO anon
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_otp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_otp_updated_at ON email_verification_otps;
CREATE TRIGGER trigger_email_otp_updated_at
  BEFORE UPDATE ON email_verification_otps
  FOR EACH ROW
  EXECUTE FUNCTION update_email_otp_updated_at();

-- Cleanup expired OTPs (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_verification_otps
  WHERE expires_at < NOW() - INTERVAL '1 day'
    AND verified = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_otps() TO service_role;
