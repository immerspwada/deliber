-- Fix provider access function to be consistent and work properly
-- This replaces all previous versions with a standardized implementation

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS can_access_provider_routes(UUID);
DROP FUNCTION IF EXISTS can_access_provider_routes();

-- Create standardized function that returns consistent JSONB
CREATE OR REPLACE FUNCTION can_access_provider_routes(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  user_id_to_check UUID;
  provider_record RECORD;
  result JSONB;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  user_id_to_check := COALESCE(p_user_id, auth.uid());
  
  -- Check if user_id is provided
  IF user_id_to_check IS NULL THEN
    RETURN jsonb_build_object(
      'canAccess', false,
      'can_access', false,
      'hasAccount', false,
      'status', null,
      'reason', 'No user ID provided'
    );
  END IF;

  -- Get provider record
  SELECT * INTO provider_record
  FROM providers_v2
  WHERE user_id = user_id_to_check;

  -- If no provider record exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'canAccess', false,
      'can_access', false,
      'hasAccount', false,
      'status', null,
      'reason', 'No provider account found'
    );
  END IF;

  -- Check provider status
  CASE provider_record.status
    WHEN 'approved', 'active' THEN
      result := jsonb_build_object(
        'canAccess', true,
        'can_access', true,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'reason', 'Provider account approved'
      );
    WHEN 'pending' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'reason', 'Provider account pending approval'
      );
    WHEN 'rejected' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'reason', 'Provider account rejected'
      );
    WHEN 'suspended' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'reason', 'Provider account suspended'
      );
    ELSE
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'reason', 'Unknown provider status'
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_access_provider_routes(UUID) TO authenticated;

-- Create helper function for getting provider details
CREATE OR REPLACE FUNCTION get_provider_details(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  user_id_to_check UUID;
  provider_record RECORD;
BEGIN
  user_id_to_check := COALESCE(p_user_id, auth.uid());
  
  IF user_id_to_check IS NULL THEN
    RETURN jsonb_build_object('error', 'No user ID provided');
  END IF;

  SELECT 
    id,
    user_id,
    provider_type,
    status,
    first_name,
    last_name,
    email,
    phone_number,
    service_types,
    is_online,
    is_available,
    rating,
    total_trips,
    total_earnings,
    created_at,
    updated_at,
    approved_at
  INTO provider_record
  FROM providers_v2
  WHERE user_id = user_id_to_check;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Provider not found');
  END IF;

  RETURN to_jsonb(provider_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_provider_details(UUID) TO authenticated;

-- Create function to update user role when provider is approved
CREATE OR REPLACE FUNCTION update_user_role_on_provider_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When provider status changes to approved or active, update user role
  IF NEW.status IN ('approved', 'active') AND OLD.status != NEW.status THEN
    UPDATE users 
    SET role = CASE 
      WHEN NEW.provider_type = 'driver' THEN 'driver'
      WHEN NEW.provider_type = 'delivery' THEN 'rider'
      ELSE 'provider'
    END,
    updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Updated user role for user_id: % to provider type: %', NEW.user_id, NEW.provider_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user role
DROP TRIGGER IF EXISTS trigger_update_user_role_on_provider_approval ON providers_v2;
CREATE TRIGGER trigger_update_user_role_on_provider_approval
  AFTER UPDATE ON providers_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_user_role_on_provider_approval();

-- Update existing approved providers' user roles
UPDATE users 
SET role = CASE 
  WHEN p.provider_type = 'driver' THEN 'driver'
  WHEN p.provider_type = 'delivery' THEN 'rider'
  ELSE 'provider'
END,
updated_at = NOW()
FROM providers_v2 p
WHERE users.id = p.user_id 
  AND p.status IN ('approved', 'active')
  AND users.role = 'customer';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % existing approved providers user roles', updated_count;
END $$;