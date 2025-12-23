#!/bin/bash

# Consolidation to Latest Version - Automated Cleanup Script
# This script removes all outdated V2/V3/V4 files and consolidates to the latest version

set -e  # Exit on error

echo "🚀 Starting Thai Ride App Consolidation to Latest Version..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for deleted files
DELETED_COUNT=0

# Function to safely delete file
delete_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Deleting:${NC} $file"
        rm -f "$file"
        ((DELETED_COUNT++))
    else
        echo -e "${RED}Not found:${NC} $file (skipping)"
    fi
}

# Function to safely delete directory
delete_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}Deleting directory:${NC} $dir"
        rm -rf "$dir"
        ((DELETED_COUNT++))
    else
        echo -e "${RED}Not found:${NC} $dir (skipping)"
    fi
}

echo "📦 Step 1: Creating backup branch..."
git checkout -b backup-before-consolidation-$(date +%Y%m%d-%H%M%S) 2>/dev/null || echo "Branch already exists or not in git repo"
git add . 2>/dev/null || echo "Not in git repo"
git commit -m "Backup before version consolidation" 2>/dev/null || echo "Nothing to commit"
git checkout main 2>/dev/null || echo "Not on main branch"
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

echo "🗑️  Step 2: Deleting outdated View files..."
delete_file "src/views/RideViewV2.vue"
delete_file "src/views/DeliveryViewV2.vue"
delete_file "src/views/WalletViewV2.vue"
delete_file "src/views/WalletViewV3.vue"
delete_file "src/views/ProviderOnboardingViewV2.vue"
delete_file "src/views/AdminSettingsViewV2.vue"
delete_file "src/views/provider/ProviderDashboardViewV2.vue"
delete_file "src/views/RideBookingViewV3.vue"
delete_file "src/views/RideTrackingViewV3.vue"
delete_file "src/views/provider/ProviderAvailableRidesV3.vue"
delete_file "src/views/provider/ProviderActiveRideV3.vue"
delete_file "src/views/AdminRideMonitoringViewV3.vue"
delete_file "src/views/AdminRideDetailViewV3.vue"
delete_file "src/views/AdminProviderCancellationsViewV3.vue"
delete_file "src/views/provider/ProviderDashboardV4.vue"
delete_dir "src/views/customer"
echo -e "${GREEN}✓ Views cleaned${NC}"
echo ""

echo "🗑️  Step 3: Deleting outdated Composable files..."
delete_file "src/composables/useRideBookingV2.ts"
delete_file "src/composables/useRideBookingV3.ts"
delete_file "src/composables/useWalletV2.ts"
delete_file "src/composables/useLoyaltyV2.ts"
delete_file "src/composables/useDeliveryV2.ts"
delete_file "src/composables/useShoppingV2.ts"
delete_file "src/composables/useScheduledRidesV2.ts"
delete_file "src/composables/useCorporateV2.ts"
delete_file "src/composables/useSafetyV2.ts"
delete_file "src/composables/useServiceAreaV2.ts"
delete_file "src/composables/useProviderEarningsV2.ts"
delete_file "src/composables/useI18nV2.ts"
delete_file "src/composables/useOfflineSyncV2.ts"
delete_file "src/composables/useQueueV2.ts"
delete_file "src/composables/useMovingV2.ts"
delete_file "src/composables/useLaundryV2.ts"
delete_file "src/composables/useProviderDashboardV3.ts"
delete_file "src/composables/useAdminRideMonitoring.ts"
echo -e "${GREEN}✓ Composables cleaned${NC}"
echo ""

echo "🗑️  Step 4: Deleting outdated Migration files..."
delete_file "supabase/migrations/071_scheduled_rides_v2.sql"
delete_file "supabase/migrations/072_delivery_v2.sql"
delete_file "supabase/migrations/073_shopping_v2.sql"
delete_file "supabase/migrations/074_queue_v2.sql"
delete_file "supabase/migrations/075_moving_v2.sql"
delete_file "supabase/migrations/076_laundry_v2.sql"
delete_file "supabase/migrations/065_loyalty_v2.sql"
delete_file "supabase/migrations/066_service_area_v2.sql"
delete_file "supabase/migrations/064_provider_earnings_v2.sql"
delete_file "supabase/migrations/062_notification_system_v2.sql"
delete_file "supabase/migrations/061_rating_system_v2.sql"
delete_file "supabase/migrations/059_realtime_tracking_v2.sql"
delete_file "supabase/migrations/070_corporate_v2.sql"
delete_file "supabase/migrations/069_safety_v2.sql"
delete_file "supabase/migrations/067_i18n_system.sql"
delete_file "supabase/migrations/087_multi_role_ride_booking_v3.sql"
delete_file "supabase/migrations/088_create_ride_atomic_function.sql"
delete_file "supabase/migrations/089_accept_ride_atomic_function.sql"
delete_file "supabase/migrations/090_complete_ride_atomic_function.sql"
delete_file "supabase/migrations/091_cancel_ride_atomic_function.sql"
delete_file "supabase/migrations/092_rls_policies_v3.sql"
delete_file "supabase/migrations/093_network_recovery_system.sql"
echo -e "${GREEN}✓ Migrations cleaned${NC}"
echo ""

echo "🗑️  Step 5: Deleting outdated Documentation files..."
delete_file "PROVIDER_DASHBOARD_V2_FIX.md"
delete_file "PROVIDER_DASHBOARD_V4_ARCHITECTURE.md"
delete_file "PROVIDER_DASHBOARD_V4_SUMMARY.md"
delete_file "PROVIDER_SIDE_V3_VERIFICATION.md"
delete_file "V3_QUICK_START_GUIDE.md"
delete_file "MULTI_ROLE_RIDE_BOOKING_V3_COMPLETE.md"
delete_file "DEPLOYMENT_INSTRUCTIONS.md"
delete_file "PHASE_0_DEPLOYMENT_GUIDE.md"
delete_file "PHASE_0_STATUS_REPORT.md"
delete_file "BUG_FIX_SUMMARY.md"
delete_file "FINAL_BUG_FIX_REPORT.md"
echo -e "${GREEN}✓ Documentation cleaned${NC}"
echo ""

echo "🗑️  Step 6: Deleting outdated Script files..."
delete_file "scripts/fix-admin-provider-visibility.sh"
delete_file "scripts/fix-duplicate-migrations.sh"
delete_file "scripts/fix-ride-acceptance.sql"
delete_file "scripts/fix-provider-toggle-now.sql"
delete_file "scripts/run-provider-toggle-fix.sql"
delete_file "scripts/run-provider-fix.sql"
delete_file "scripts/fix-verification-queue.sql"
delete_file "scripts/fix-ride-visibility.sql"
delete_file "scripts/fix-find-nearby-providers.sql"
delete_file "scripts/deploy-phase-0-fix.sql"
delete_file "scripts/deploy-phase-0-migrations.sh"
delete_file "scripts/deploy-atomic-functions.sql"
echo -e "${GREEN}✓ Scripts cleaned${NC}"
echo ""

echo "🗑️  Step 7: Deleting outdated Component files..."
delete_file "src/components/admin/EnhancedAdminLayout.vue"
delete_file "src/admin/composables/useAdminAPI.patch.ts"
delete_dir "src/admin"
echo -e "${GREEN}✓ Components cleaned${NC}"
echo ""

echo "📊 Cleanup Summary:"
echo -e "${GREEN}✓ Total files/directories deleted: $DELETED_COUNT${NC}"
echo ""

echo "⚠️  Manual Steps Required:"
echo "1. Review and update src/router/index.ts to remove references to deleted views"
echo "2. Search for imports of deleted composables and update them"
echo "3. Run 'npm run build' to verify no build errors"
echo "4. Run 'npm run type-check' to verify no type errors"
echo "5. Run 'npm run test' to verify all tests pass"
echo ""

echo "🎉 Consolidation complete!"
echo ""
echo "Next steps:"
echo "  cd thai-ride-app"
echo "  npm run build"
echo "  npm run type-check"
echo "  npm run test"
echo ""
