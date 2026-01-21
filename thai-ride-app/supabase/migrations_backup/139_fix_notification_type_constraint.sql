-- Migration: 139_fix_notification_type_constraint.sql
-- Fix: Add provider notification types to user_notifications check constraint
-- This allows provider status change notifications to be stored

-- Drop old constraint
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;

-- Add new constraint with provider types
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check 
CHECK (type IN (
  'promo', 'ride', 'delivery', 'shopping', 'payment', 'system', 'sos', 
  'referral', 'subscription', 'rating', 'success', 'warning', 'error', 'info',
  'provider_approved', 'provider_rejected', 'provider_suspended', 'provider_pending',
  'queue', 'moving', 'laundry'
));

-- Grant permissions for verification functions
GRANT EXECUTE ON FUNCTION complete_verification(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_verification_to_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_verification_queue(TEXT) TO authenticated;
