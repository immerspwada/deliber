-- Verify wallet table structure
-- ==============================

-- 1. Check if user_wallets table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name LIKE '%wallet%'
ORDER BY table_name;

-- 2. Check user_wallets columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_wallets'
ORDER BY ordinal_position;

-- 3. Check current get_admin_providers_v2 function definition
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_admin_providers_v2';

-- 4. Test query to see if user_wallets has data
SELECT 
  COUNT(*) as total_wallets,
  SUM(balance) as total_balance
FROM user_wallets;

-- 5. Check if any providers have wallets
SELECT 
  COUNT(DISTINCT pv.user_id) as providers_with_wallets
FROM providers_v2 pv
INNER JOIN user_wallets uw ON pv.user_id = uw.user_id;
