#!/bin/bash
# Task 6 Verification Script: RLS Policy Verification
# Run this script after Docker is started to verify RLS policies

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Task 6: RLS Policy Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Supabase is running
echo "📋 Step 1: Checking Supabase status..."
if ! npx supabase status > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Starting Supabase..."
    npx supabase start
else
    echo "✅ Supabase is running"
fi
echo ""

# Apply migration 300
echo "📋 Step 2: Applying migration 300_admin_rls_policy_verification.sql..."
npx supabase db push --local
echo "✅ Migration applied"
echo ""

# Run verification queries
echo "📋 Step 3: Running RLS policy verification queries..."
echo ""

echo "🔍 3.1: Verifying admin policies exist on all tables..."
npx supabase db execute --local "SELECT * FROM verify_admin_policies() ORDER BY table_name;" > /tmp/admin_policies.txt
cat /tmp/admin_policies.txt
echo ""

echo "🔍 3.2: Verifying dual-role pattern in provider policies..."
npx supabase db execute --local "SELECT * FROM verify_dual_role_policies() ORDER BY table_name, policy_name;" > /tmp/dual_role_policies.txt
cat /tmp/dual_role_policies.txt
echo ""

echo "🔍 3.3: Verifying SELECT wrapper optimization..."
npx supabase db execute --local "SELECT table_name, policy_name, uses_select_wrapper FROM verify_select_wrapper_optimization() WHERE uses_select_wrapper = false LIMIT 10;" > /tmp/select_wrapper.txt
cat /tmp/select_wrapper.txt
echo ""

# Check for tables without admin policies
echo "📋 Step 4: Checking for tables without admin policies..."
TABLES_WITHOUT_ADMIN=$(npx supabase db execute --local "SELECT table_name FROM verify_admin_policies() WHERE has_admin_policy = false;" | wc -l)
if [ "$TABLES_WITHOUT_ADMIN" -gt 0 ]; then
    echo "⚠️  Found $TABLES_WITHOUT_ADMIN tables without admin policies:"
    npx supabase db execute --local "SELECT table_name FROM verify_admin_policies() WHERE has_admin_policy = false;"
else
    echo "✅ All tables have admin policies"
fi
echo ""

# Check for incorrect dual-role patterns
echo "📋 Step 5: Checking for incorrect dual-role patterns..."
INCORRECT_DUAL_ROLE=$(npx supabase db execute --local "SELECT COUNT(*) FROM verify_dual_role_policies() WHERE uses_dual_role = false;" | tail -1)
if [ "$INCORRECT_DUAL_ROLE" != "0" ]; then
    echo "⚠️  Found $INCORRECT_DUAL_ROLE policies without dual-role pattern:"
    npx supabase db execute --local "SELECT table_name, policy_name FROM verify_dual_role_policies() WHERE uses_dual_role = false;"
else
    echo "✅ All provider policies use dual-role pattern"
fi
echo ""

# Generate TypeScript types
echo "📋 Step 6: Generating TypeScript types..."
npx supabase gen types --local > src/types/database.ts
echo "✅ Types generated"
echo ""

# Run security advisor
echo "📋 Step 7: Running security advisor..."
npx supabase db lint --level warning --local
echo ""

# Run property tests
echo "📋 Step 8: Running property-based tests..."
npm run test -- src/tests/admin-rls-policies.property.test.ts
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Task 6 Verification Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  ✓ Migration 300 applied"
echo "  ✓ Admin policies verified"
echo "  ✓ Dual-role patterns verified"
echo "  ✓ SELECT wrapper optimization verified"
echo "  ✓ TypeScript types generated"
echo "  ✓ Security advisor run"
echo "  ✓ Property tests executed"
echo ""
echo "📝 Next Steps:"
echo "  1. Review verification output above"
echo "  2. Fix any tables without admin policies"
echo "  3. Fix any policies without dual-role pattern"
echo "  4. Commit migration 300 and updated types"
echo ""
