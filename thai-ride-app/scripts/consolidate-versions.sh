#!/bin/bash

# =====================================================
# Consolidate Version Duplicates
# =====================================================
# This script consolidates V2/V3/V4 versions into main versions
# Run with: ./scripts/consolidate-versions.sh [--dry-run]

set -e

DRY_RUN=false
if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No changes will be made"
  echo ""
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

execute() {
  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY RUN] $1"
  else
    eval "$1"
  fi
}

echo "🔄 Starting Version Consolidation..."
echo ""

# =====================================================
# Phase 1: Backup current state
# =====================================================
echo "📦 Phase 1: Creating backup..."
if [ "$DRY_RUN" = false ]; then
  BACKUP_DIR="backups/consolidation-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # Backup files that will be modified
  cp src/router/index.ts "$BACKUP_DIR/" 2>/dev/null || true
  
  log_info "Backup created at $BACKUP_DIR"
else
  log_info "Would create backup directory"
fi
echo ""

# =====================================================
# Phase 2: Update Router Imports
# =====================================================
echo "🔧 Phase 2: Updating router imports..."

# Update RideViewV2 -> RideView
if grep -q "RideViewV2" src/router/index.ts; then
  log_warn "Found RideViewV2 in router - needs manual review"
  log_info "  Current: import('../views/RideViewV2.vue')"
  log_info "  Suggest: import('../views/RideView.vue')"
fi

# WalletViewV3 is already the latest, just note it
if grep -q "WalletViewV3" src/router/index.ts; then
  log_info "WalletViewV3 found - this is the latest version"
fi

# ProviderDashboardV4 is already the latest
if grep -q "ProviderDashboardV4" src/router/index.ts; then
  log_info "ProviderDashboardV4 found - this is the latest version"
fi

# RideBookingViewV3 is the latest
if grep -q "RideBookingViewV3" src/router/index.ts; then
  log_info "RideBookingViewV3 found - this is the latest version"
fi

echo ""

# =====================================================
# Phase 3: Check for V2 composable usage
# =====================================================
echo "🔍 Phase 3: Checking for V2 composable usage..."

V2_USAGE=$(grep -r "useRideBookingV2" src/ --include="*.vue" --include="*.ts" | grep -v "useRideBookingV2.ts" | wc -l)
if [ "$V2_USAGE" -gt 0 ]; then
  log_warn "Found $V2_USAGE files using useRideBookingV2"
  echo "  Files using V2:"
  grep -r "useRideBookingV2" src/ --include="*.vue" --include="*.ts" | grep -v "useRideBookingV2.ts" | cut -d: -f1 | sort -u | sed 's/^/    - /'
else
  log_info "No files using useRideBookingV2 (safe to remove)"
fi

echo ""

# =====================================================
# Phase 4: List files to be removed
# =====================================================
echo "📋 Phase 4: Files that can be removed after migration..."
echo ""

FILES_TO_REMOVE=(
  # V2 Composables (if V3 exists and is used)
  "src/composables/useRideBookingV2.ts"
  
  # V2 Views (if updated to use latest)
  "src/views/RideViewV2.vue"
  
  # Old provider dashboard versions
  "src/views/provider/ProviderDashboardView.vue"
  "src/views/provider/ProviderDashboardViewV2.vue"
  "src/composables/useProviderDashboard.ts"
  
  # V2 Wallet (if V3 is used)
  "src/views/WalletViewV2.vue"
  
  # V2 Service Area (if V3 exists)
  "src/composables/useServiceAreaV2.ts"
  
  # Admin V3 views (if consolidated)
  "src/views/AdminProviderCancellationsViewV3.vue"
  "src/views/AdminRideDetailViewV3.vue"
  "src/views/AdminRideMonitoringViewV3.vue"
  
  # Provider V3 views (if consolidated)
  "src/views/provider/ProviderActiveRideV3.vue"
  "src/views/provider/ProviderAvailableRidesV3.vue"
  
  # Other V2 views
  "src/views/ProviderOnboardingViewV2.vue"
  "src/views/QueueBookingViewV2.vue"
  "src/views/RideBookingViewV3.vue"
  "src/views/RideTrackingViewV3.vue"
  "src/views/AdminSettingsViewV2.vue"
  "src/views/DeliveryViewV2.vue"
)

for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(wc -l < "$file")
    log_warn "Can remove: $file ($SIZE lines)"
  fi
done

echo ""

# =====================================================
# Phase 5: Recommendations
# =====================================================
echo "💡 Phase 5: Recommendations..."
echo ""
echo "Manual steps required:"
echo ""
echo "1. Update router imports:"
echo "   - Change RideViewV2 -> RideView"
echo "   - Change WalletViewV3 -> WalletView"
echo "   - Change ProviderDashboardV4 -> ProviderDashboardView"
echo "   - Change RideBookingViewV3 -> RideBookingView"
echo ""
echo "2. Rename latest versions to remove version suffix:"
echo "   - mv src/views/WalletViewV3.vue src/views/WalletView.vue"
echo "   - mv src/views/provider/ProviderDashboardV4.vue src/views/provider/ProviderDashboardView.vue"
echo "   - mv src/views/RideBookingViewV3.vue src/views/RideBookingView.vue"
echo "   - mv src/composables/useRideBookingV3.ts src/composables/useRideBooking.ts"
echo "   - mv src/composables/useProviderDashboardV3.ts src/composables/useProviderDashboard.ts"
echo ""
echo "3. Update imports in components using these composables"
echo ""
echo "4. Test thoroughly:"
echo "   - Customer ride booking flow"
echo "   - Provider dashboard"
echo "   - Wallet operations"
echo ""
echo "5. Remove old version files (listed above)"
echo ""

# =====================================================
# Summary
# =====================================================
echo "📊 Summary:"
echo "   - Router uses: RideViewV2, WalletViewV3, ProviderDashboardV4, RideBookingViewV3"
echo "   - Latest versions should be renamed to remove version suffix"
echo "   - Old versions can be removed after testing"
echo "   - Estimated cleanup: ~20 files, ~15,000 lines of duplicate code"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "🔍 This was a dry run. Run without --dry-run to see actual recommendations."
else
  echo "✅ Analysis complete! Follow the manual steps above."
fi
