-- Check all get_topup_requests_admin functions in production
SELECT 
  proname as function_name,
  pronargs as num_args,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_args,
  pronamespace::regnamespace as schema_name,
  oid
FROM pg_proc 
WHERE proname = 'get_topup_requests_admin'
ORDER BY pronargs;
