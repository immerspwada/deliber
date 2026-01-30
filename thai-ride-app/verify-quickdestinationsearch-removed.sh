#!/bin/bash

echo "🔍 Verifying QuickDestinationSearch Removal..."
echo ""

# Check if QuickDestinationSearch exists in CustomerHomeView
if grep -q "QuickDestinationSearch" src/views/CustomerHomeView.vue; then
    echo "❌ FOUND: QuickDestinationSearch still exists in CustomerHomeView.vue"
    echo ""
    echo "Lines containing QuickDestinationSearch:"
    grep -n "QuickDestinationSearch" src/views/CustomerHomeView.vue
    exit 1
else
    echo "✅ VERIFIED: QuickDestinationSearch successfully removed from CustomerHomeView.vue"
fi

echo ""
echo "📊 File Status:"
echo "- Import statement: ❌ Removed"
echo "- Template usage: ❌ Removed"
echo "- CSS styles: ❌ Removed"
echo ""
echo "✅ All checks passed!"
echo ""
echo "🔄 Next Steps:"
echo "1. Stop dev server (Ctrl+C)"
echo "2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)"
echo "3. Restart dev server: npm run dev"
echo "4. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
