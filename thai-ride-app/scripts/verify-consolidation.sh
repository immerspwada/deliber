#!/bin/bash

# Verification Script for Consolidation
# Checks that all outdated files are removed and current files are intact

set -e

echo "🔍 Verifying Thai Ride App Consolidation..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Function to check file should NOT exist
check_not_exists() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${RED}✗ FAIL:${NC} $file should be deleted but still exists"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ PASS:${NC} $file correctly deleted"
    fi
}

# Function to check file SHOULD exist
check_exists() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ PASS:${NC} $file exists"
    else
        echo -e "${RED}✗ FAIL:${NC} $file is missing"
        ((ERRORS++))
    fi
}

# Function to check directory should NOT exist
check_dir_not_exists() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo -e "${RED}✗ FAIL:${NC} $dir should be deleted but still exists"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ PASS:${NC} $dir correctly deleted"
    fi
}

echo "📋 Checking Views..."
check_not_exists "src/views/RideViewV2.vue"
check_not_exists "src/views/DeliveryViewV2.vue"
check_not_exists "src/views/WalletViewV2.vue"
check_not_exists "src/views/WalletViewV3.vue"
check_not_exists "src/views/RideBookingViewV3.vue"
check_not_exists "src/views/provider/ProviderDashboardV4.vue"
check_dir_not_exists "src/views/customer"

check_exists "src/views/RideView.vue"
check_exists "src/views/DeliveryView.vue"
check_exists "src/views/ShoppingView.vue"
check_exists "src/views/provider/ProviderDashboardView.vue"
echo ""

echo "📋 Checking Composables..."
check_not_exists "src/composables/useRideBookingV2.ts"
check_not_exists "src/composables/useRideBookingV3.ts"
check_not_exists "src/composables/useWalletV2.ts"
check_not_exists "src/composables/useDeliveryV2.ts"
check_not_exists "src/composables/useProviderDashboardV3.ts"

check_exists "src/composables/useServices.ts"
check_exists "src/composables/useProvider.ts"
check_exists "src/composables/useWallet.ts"
check_exists "src/composables/useAdmin.ts"
echo ""

echo "📋 Checking Stores..."
check_exists "src/stores/ride.ts"
check_exists "src/stores/delivery.ts"
check_exists "src/stores/shopping.ts"
check_exists "src/stores/auth.ts"
echo ""

echo "📋 Checking Migrations..."
check_not_exists "supabase/migrations/071_scheduled_rides_v2.sql"
check_not_exists "supabase/migrations/072_delivery_v2.sql"
check_not_exists "supabase/migrations/087_multi_role_ride_booking_v3.sql"
check_not_exists "supabase/migrations/092_rls_policies_v3.sql"

check_exists "supabase/migrations/001_initial_schema.sql"
check_exists "supabase/migrations/163_full_integration_core_setup.sql"
check_exists "supabase/migrations/164_complete_service_rls_policies.sql"
echo ""

echo "📋 Checking Documentation..."
check_not_exists "PROVIDER_DASHBOARD_V2_FIX.md"
check_not_exists "PROVIDER_DASHBOARD_V4_ARCHITECTURE.md"
check_not_exists "V3_QUICK_START_GUIDE.md"
check_not_exists "PHASE_0_DEPLOYMENT_GUIDE.md"

check_exists "README.md"
check_exists "DEPLOYMENT_GUIDE.md"
check_exists "CONSOLIDATION_TO_LATEST_VERSION.md"
echo ""

echo "📋 Checking for V2/V3/V4 references in code..."
if grep -r "V2\.vue" src/ 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
    echo -e "${YELLOW}⚠ WARNING:${NC} Found V2.vue references in code"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ PASS:${NC} No V2.vue references found"
fi

if grep -r "V3\.vue" src/ 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
    echo -e "${YELLOW}⚠ WARNING:${NC} Found V3.vue references in code"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ PASS:${NC} No V3.vue references found"
fi

if grep -r "V4\.vue" src/ 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
    echo -e "${YELLOW}⚠ WARNING:${NC} Found V4.vue references in code"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ PASS:${NC} No V4.vue references found"
fi
echo ""

echo "📊 Verification Summary:"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Consolidation successful.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings found. Review recommended.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS errors found. Consolidation incomplete.${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS warnings found.${NC}"
    exit 1
fi
