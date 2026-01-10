-- Migration: Add verification codes table and email_verified field
-- Feature: provider-system-redesign
-- Purpose: Support email verification flow

-- Add email_verified field to providers table
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'phone_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_verification_codes_provider_id ON verification_codes(provider_id);
CREATE INDEX idx_verification_codes_code ON verification_codes(code) WHERE used = FALSE;
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at) WHERE used = FALSE;

-- RLS policies for verification_codes
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage verification codes"
  ON verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Providers can only read their own verification codes
CREATE POLICY "Providers can read own verification codes"
  ON verification_codes
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- Function to cleanup expired verification codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours'
  AND used = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE verification_codes IS 'Stores verification codes for email, phone, and password reset';
COMMENT ON COLUMN verification_codes.code IS 'The verification code (6 digits for email/phone)';
COMMENT ON COLUMN verification_codes.type IS 'Type of verification: email_verification, phone_verification, or password_reset';
COMMENT ON COLUMN verification_codes.expires_at IS 'When the code expires (typically 15 minutes)';
COMMENT ON COLUMN verification_codes.used IS 'Whether the code has been used';
COMMENT ON COLUMN verification_codes.used_at IS 'When the code was used';
