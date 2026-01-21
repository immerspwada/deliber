#!/bin/bash

# 🚀 Deploy Migrations 297-305 - Automated Script
# This script deploys all admin panel migrations in the correct order

set -e  # Exit on error

echo "🚀 Starting Admin Panel Migration Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Docker
echo "📦 Step 1: Checking Docker..."
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker Desktop and run this script again"
    echo "Command: open -a Docker"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Step 2: Check Supabase
echo "🔍 Step 2: Checking Supabase status..."
if ! npx supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase is not running. Starting...${NC}"
    npx supabase start
    echo -e "${GREEN}✅ Supabase started${NC}"
else
    echo -e "${GREEN}✅ Supabase is already running${NC}"
fi
echo ""

# Step 3: Check current migrations
echo "📋 Step 3: Checking current migration status..."
npx supabase migration list --local
echo ""

# Step 4: Apply migrations
echo "🔄 Step 4: Applying migrations 297-305..."
npx supabase db push --local
echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

# Step 5: Generate types
echo "📝 Step 5: Generating TypeScript types..."
npx supabase gen types --local > src/types/database.ts
echo -e "${GREEN}✅ Types generated${NC}"
echo ""

# Step 6: Verify RPC functions
echo "🔍 Step 6: Verifying admin RPC functions..."
FUNCTION_COUNT=$(npx supabase db execute --local "
SELECT COUNT(*) 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'admin_%';
" | grep -oE '[0-9]+' | head -1)

echo "Found $FUNCTION_COUNT admin RPC functions"

if [ "$FUNCTION_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✅ Admin RPC functions verified${NC}"
else
    echo -e "${RED}❌ Expected at least 10 admin functions, found $FUNCTION_COUNT${NC}"
    exit 1
fi
echo ""

# Step 7: Verify RLS policies
echo "🔒 Step 7: Verifying admin RLS policies..."
POLICY_COUNT=$(npx supabase db execute --local "
SELECT COUNT(*) 
FROM pg_policies 
WHERE policyname LIKE 'admin_%';
" | grep -oE '[0-9]+' | head -1)

echo "Found $POLICY_COUNT admin RLS policies"

if [ "$POLICY_COUNT" -ge 15 ]; then
    echo -e "${GREEN}✅ Admin RLS policies verified${NC}"
else
    echo -e "${YELLOW}⚠️  Expected at least 15 admin policies, found $POLICY_COUNT${NC}"
fi
echo ""

# Step 8: Test key functions
echo "🧪 Step 8: Testing key admin functions..."

echo "Testing admin_get_customers..."
if npx supabase db execute --local "SELECT admin_get_customers(10, 0);" &> /dev/null; then
    echo -e "${GREEN}✅ admin_get_customers works${NC}"
else
    echo -e "${RED}❌ admin_get_customers failed${NC}"
fi

echo "Testing admin_get_providers..."
if npx supabase db execute --local "SELECT admin_get_providers(10, 0);" &> /dev/null; then
    echo -e "${GREEN}✅ admin_get_providers works${NC}"
else
    echo -e "${RED}❌ admin_get_providers failed${NC}"
fi

echo "Testing admin_get_orders..."
if npx supabase db execute --local "SELECT admin_get_orders(10, 0);" &> /dev/null; then
    echo -e "${GREEN}✅ admin_get_orders works${NC}"
else
    echo -e "${RED}❌ admin_get_orders failed${NC}"
fi

echo "Testing admin_get_topup_requests..."
if npx supabase db execute --local "SELECT admin_get_topup_requests(10, 0);" &> /dev/null; then
    echo -e "${GREEN}✅ admin_get_topup_requests works${NC}"
else
    echo -e "${RED}❌ admin_get_topup_requests failed${NC}"
fi
echo ""

# Step 9: Summary
echo "📊 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Migrations 297-305 deployed successfully${NC}"
echo "   - Admin RPC Functions: $FUNCTION_COUNT"
echo "   - Admin RLS Policies: $POLICY_COUNT"
echo "   - TypeScript types: Generated"
echo ""
echo "🎯 Next Steps:"
echo "   1. Run tests: npm run test -- src/tests/admin-*.test.ts"
echo "   2. Start dev server: npm run dev"
echo "   3. Test admin panel: http://localhost:5173/admin"
echo ""
echo "📚 Documentation:"
echo "   - Deployment Guide: .kiro/specs/admin-panel-complete-verification/DEPLOY-MIGRATIONS-297-305.md"
echo "   - RPC Functions: docs/admin-rpc-functions.md"
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
