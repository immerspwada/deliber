#!/bin/bash

# Verification Script: EmptyOrdersState Removal
# Date: 2026-01-30

echo "🔍 Verifying EmptyOrdersState removal from CustomerHomeView..."
echo ""

# Check 1: Not imported in CustomerHomeView
echo "✓ Check 1: Import removed from CustomerHomeView.vue"
if grep -q "EmptyOrdersState" src/views/CustomerHomeView.vue; then
  echo "  ❌ FAIL: EmptyOrdersState still found in CustomerHomeView.vue"
  exit 1
else
  echo "  ✅ PASS: EmptyOrdersState not found in CustomerHomeView.vue"
fi

# Check 2: Not exported from customer components index
echo "✓ Check 2: Not exported from customer components index"
if grep -q "EmptyOrdersState" src/components/customer/index.ts; then
  echo "  ❌ FAIL: EmptyOrdersState still exported from index.ts"
  exit 1
else
  echo "  ✅ PASS: EmptyOrdersState not exported from index.ts"
fi

# Check 3: Component file still exists (for future use)
echo "✓ Check 3: Component file preserved for future use"
if [ -f "src/components/customer/EmptyOrdersState.vue" ]; then
  echo "  ✅ PASS: Component file exists at src/components/customer/EmptyOrdersState.vue"
else
  echo "  ⚠️  WARNING: Component file not found (may have been deleted)"
fi

# Check 4: Active orders section logic
echo "✓ Check 4: Active orders section conditional rendering"
if grep -q 'v-if="loadingOrders || activeOrders.length > 0"' src/views/CustomerHomeView.vue; then
  echo "  ✅ PASS: Section hidden when no orders"
else
  echo "  ❌ FAIL: Section logic not updated correctly"
  exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Summary:"
echo "  - EmptyOrdersState removed from CustomerHomeView.vue"
echo "  - Not exported from customer components index"
echo "  - Component file preserved for future use"
echo "  - Active orders section hides when empty"
echo ""
echo "🚀 Ready for testing!"
echo ""
echo "Test Steps:"
echo "  1. npm run dev"
echo "  2. Navigate to http://localhost:5173/customer"
echo "  3. Verify no empty state when no active orders"
echo "  4. Verify main service grid is visible"
echo "  5. Test with active orders (should show order cards)"
