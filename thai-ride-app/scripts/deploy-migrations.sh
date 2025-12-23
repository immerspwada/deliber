#!/bin/bash

# ============================================================================
# Deploy Atomic Functions to Supabase
# ============================================================================
# This script helps deploy missing migrations to Supabase hosted database
#
# Usage:
#   ./scripts/deploy-migrations.sh
#
# Prerequisites:
#   - Supabase project linked
#   - Database credentials in .env file
# ============================================================================

set -e

echo "========================================="
echo "Thai Ride App - Migration Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create .env file with Supabase credentials"
  exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo -e "${GREEN}✓${NC} Found Supabase credentials"
echo "  URL: $VITE_SUPABASE_URL"
echo ""

# List of critical migrations to deploy
MIGRATIONS=(
  "088_create_ride_atomic_function.sql"
  "089_accept_ride_atomic_function.sql"
  "090_complete_ride_atomic_function.sql"
  "091_cancel_ride_atomic_function.sql"
  "102_atomic_create_functions.sql"
  "103_accept_atomic_functions.sql"
  "104_complete_atomic_functions.sql"
  "105_cancel_request_atomic.sql"
  "106_data_consistency_checks.sql"
)

echo "========================================="
echo "Step 1: Apply Schema Fixes"
echo "========================================="
echo ""

echo -e "${YELLOW}→${NC} Applying notification constraint fix and missing columns..."
echo ""
echo "Please run the following SQL in Supabase Dashboard SQL Editor:"
echo ""
echo -e "${GREEN}File: scripts/deploy-atomic-functions.sql${NC}"
echo ""
echo "Or copy and paste this command:"
echo ""
echo "cat scripts/deploy-atomic-functions.sql | pbcopy"
echo ""
read -p "Press Enter after you've run the schema fixes in Supabase Dashboard..."

echo ""
echo "========================================="
echo "Step 2: Deploy Atomic Function Migrations"
echo "========================================="
echo ""

echo "The following migrations need to be deployed:"
echo ""

for migration in "${MIGRATIONS[@]}"; do
  migration_path="supabase/migrations/$migration"
  
  if [ -f "$migration_path" ]; then
    echo -e "${GREEN}✓${NC} Found: $migration"
  else
    echo -e "${RED}✗${NC} Missing: $migration"
  fi
done

echo ""
echo "========================================="
echo "Deployment Options"
echo "========================================="
echo ""
echo "Option 1: Deploy via Supabase Dashboard (Recommended)"
echo "  1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo "  2. Copy content from each migration file"
echo "  3. Run in SQL Editor"
echo ""
echo "Option 2: Deploy via Supabase CLI"
echo "  1. Link project: supabase link --project-ref YOUR_PROJECT_REF"
echo "  2. Push migrations: supabase db push"
echo ""
echo "Option 3: Manual deployment"
echo "  Run each migration file manually in order"
echo ""

read -p "Have you deployed all migrations? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "========================================="
  echo "Step 3: Verify Deployment"
  echo "========================================="
  echo ""
  
  echo -e "${YELLOW}→${NC} Running property tests to verify..."
  echo ""
  
  npm test -- service-request-creation.property.test.ts 2>&1 | head -50
  
  echo ""
  echo "========================================="
  echo "Deployment Complete!"
  echo "========================================="
  echo ""
  echo "Next steps:"
  echo "  1. Check test results above"
  echo "  2. If tests still fail, check Supabase logs"
  echo "  3. Run full test suite: npm test"
  echo ""
else
  echo ""
  echo -e "${YELLOW}Deployment cancelled${NC}"
  echo "Please deploy migrations and run this script again"
  echo ""
fi
