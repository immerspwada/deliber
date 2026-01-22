-- Migration: 320_seed_payment_accounts.sql
-- Description: Seed initial payment receiving account data
-- Author: Kiro AI Assistant
-- Date: 2026-01-22

-- Insert default bank account (matching customer view)
INSERT INTO public.payment_receiving_accounts (
  account_type,
  account_name,
  account_number,
  bank_code,
  bank_name,
  qr_code_url,
  display_name,
  description,
  is_active,
  display_order
) VALUES (
  'bank_transfer',
  'บริษัท ไทยไรด์ จำกัด',
  '123-4-56789-01111',
  'KBANK',
  'ธนาคารกสิกรไทย',
  'https://onsflqhkgqhydeupiqyt.supabase.co/storage/v1/object/public/payment-qr/qr_32a6865d-4320-4048-a853-7a3bc4e63fdd_1767857711651.png',
  'บัญชีหลัก - ธนาคารกสิกรไทย',
  'บัญชีรับเงินหลักสำหรับการเติมเงินของลูกค้า',
  true,
  0
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON MIGRATION IS 'Seed initial payment receiving account matching customer view';
