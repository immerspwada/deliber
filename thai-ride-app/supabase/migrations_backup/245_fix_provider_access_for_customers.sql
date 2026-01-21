-- Fix provider access function to allow customers to access onboarding
-- This allows customers to register as providers

-- Update the provider access function to be more permissive for onboarding
CREATE OR REPLACE FUNCTION can_access_provider_routes(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  user_id_to_check UUID;
  user_role TEXT;
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
      'reason', 'not_authenticated',
      'message', 'No user ID provided'
    );
  END IF;

  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id_to_check;

  -- If user not found
  IF user_role IS NULL THEN
    RETURN jsonb_build_object(
      'canAccess', false,
      'can_access', false,
      'hasAccount', false,
      'status', null,
      'reason', 'not_authenticated',
      'message', 'User not found'
    );
  END IF;

  -- Allow admin roles full access
  IF user_role IN ('admin', 'super_admin', 'manager') THEN
    RETURN jsonb_build_object(
      'canAccess', true,
      'can_access', true,
      'hasAccount', true,
      'status', 'admin',
      'userRole', user_role,
      'reason', 'Admin access granted'
    );
  END IF;

  -- Get provider record
  SELECT * INTO provider_record
  FROM providers_v2
  WHERE user_id = user_id_to_check;

  -- If no provider record exists
  IF NOT FOUND THEN
    -- For customers, allow access to onboarding (they can register)
    IF user_role = 'customer' THEN
      RETURN jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', false,
        'status', null,
        'userRole', user_role,
        'reason', 'no_provider_record',
        'message', 'No provider account found - can register'
      );
    ELSE
      -- For other roles, deny access
      RETURN jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', false,
        'status', null,
        'userRole', user_role,
        'reason', 'invalid_role',
        'message', 'User role does not allow provider access'
      );
    END IF;
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
        'userRole', user_role,
        'reason', 'provider_approved',
        'message', 'Provider account approved'
      );
    WHEN 'pending' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'userRole', user_role,
        'reason', 'provider_not_approved',
        'message', 'Provider account pending approval'
      );
    WHEN 'rejected' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'userRole', user_role,
        'reason', 'provider_rejected',
        'message', 'Provider account rejected'
      );
    WHEN 'suspended' THEN
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'userRole', user_role,
        'reason', 'provider_suspended',
        'message', 'Provider account suspended'
      );
    ELSE
      result := jsonb_build_object(
        'canAccess', false,
        'can_access', false,
        'hasAccount', true,
        'status', provider_record.status,
        'providerId', provider_record.id,
        'providerType', provider_record.provider_type,
        'userRole', user_role,
        'reason', 'unknown_status',
        'message', 'Unknown provider status'
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_access_provider_routes(UUID) TO authenticated;