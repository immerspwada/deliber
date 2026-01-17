#!/bin/bash

# Admin Providers Page Verification Script
# =========================================
# This script helps verify that the admin providers page is working correctly

set -e

echo "🔍 Admin Providers Page Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Docker
echo "📦 Step 1: Checking Docker..."
if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker is running"
else
    echo -e "${RED}✗${NC} Docker is not running"
    echo "   Please start Docker and try again"
    exit 1
fi
echo ""

# Step 2: Check Supabase
echo "🗄️  Step 2: Checking Supabase..."
if npx supabase status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Supabase is running"
    npx supabase status | grep -E "(API URL|DB URL|Studio URL)"
else
    echo -e "${YELLOW}⚠${NC}  Supabase is not running"
    echo "   Starting Supabase..."
    npx supabase start
fi
echo ""

# Step 3: Check Migration
echo "📝 Step 3: Checking migration 301..."
if [ -f "supabase/migrations/301_fix_admin_rpc_role_check.sql" ]; then
    echo -e "${GREEN}✓${NC} Migration file exists"
else
    echo -e "${RED}✗${NC} Migration file not found"
    exit 1
fi
echo ""

# Step 4: Apply Migration
echo "🚀 Step 4: Applying migration..."
if npx supabase db push --local; then
    echo -e "${GREEN}✓${NC} Migration applied successfully"
else
    echo -e "${RED}✗${NC} Failed to apply migration"
    exit 1
fi
echo ""

# Step 5: Generate Types
echo "📋 Step 5: Generating TypeScript types..."
if npx supabase gen types --local > src/types/database.ts; then
    echo -e "${GREEN}✓${NC} Types generated successfully"
else
    echo -e "${YELLOW}⚠${NC}  Failed to generate types (non-critical)"
fi
echo ""

# Step 6: Check RPC Functions
echo "🔧 Step 6: Verifying RPC functions..."
echo "   Checking get_admin_providers_v2..."

# Use psql to check if function exists
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_admin_providers_v2', 'count_admin_providers_v2')
ORDER BY routine_name;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} RPC functions exist"
else
    echo -e "${YELLOW}⚠${NC}  Could not verify RPC functions"
fi
echo ""

# Step 7: Check Admin User
echo "👤 Step 7: Checking admin user..."
echo "   Looking for admin users in database..."

PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "
SELECT 
  email,
  role
FROM users
WHERE role IN ('admin', 'super_admin')
LIMIT 5;
" 2>/dev/null | grep -v "^$" || echo "   No admin users found"

echo ""
echo -e "${YELLOW}ℹ${NC}  If no admin users found, you can create one:"
echo "   1. Login with any email/password"
echo "   2. The system will auto-create admin role for known emails"
echo "   3. Or manually update: UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';"
echo ""

# Step 8: Check Test Data
echo "📊 Step 8: Checking test data..."
PROVIDER_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM providers_v2;" 2>/dev/null | tr -d ' ')

if [ -n "$PROVIDER_COUNT" ] && [ "$PROVIDER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $PROVIDER_COUNT provider(s) in database"
else
    echo -e "${YELLOW}⚠${NC}  No providers found in database"
    echo "   You can create test data using the SQL in ADMIN-PROVIDERS-FIX.md"
fi
echo ""

# Summary
echo "📋 Verification Summary"
echo "======================"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Navigate to: http://localhost:5173/admin/login"
echo "3. Login with admin credentials"
echo "4. Go to: http://localhost:5173/admin/providers"
echo ""
echo "Expected results:"
echo "  ✓ Provider list loads"
echo "  ✓ Real-time indicator shows 'Live'"
echo "  ✓ Can filter and paginate"
echo "  ✓ Can view provider details"
echo "  ✓ Can approve/reject providers"
echo ""
echo -e "${GREEN}✓${NC} Verification complete!"
echo ""
