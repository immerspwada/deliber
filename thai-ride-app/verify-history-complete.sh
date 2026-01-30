#!/bin/bash

echo "🔍 Verifying Customer History Implementation..."
echo ""

# Check all components
checks=0
passed=0

# 1. Import
echo -n "1. Import Statement... "
if grep -q "import CustomerHistoryModal" src/admin/views/CustomersView.vue; then
  echo "✅"
  ((passed++))
else
  echo "❌"
fi
((checks++))

# 2. State
echo -n "2. State Variables... "
if grep -q "showHistoryModal" src/admin/views/CustomersView.vue && grep -q "historyCustomer" src/admin/views/CustomersView.vue; then
  echo "✅"
  ((passed++))
else
  echo "❌"
fi
((checks++))

# 3. Function
echo -n "3. Function Declaration... "
if grep -q "function viewCustomerHistory" src/admin/views/CustomersView.vue; then
  echo "✅"
  ((passed++))
else
  echo "❌"
fi
((checks++))

# 4. Button
echo -n "4. History Button... "
if grep -q "history-btn" src/admin/views/CustomersView.vue; then
  echo "✅"
  ((passed++))
else
  echo "❌"
fi
((checks++))

# 5. Modal
echo -n "5. Modal Component... "
if grep -q "<CustomerHistoryModal" src/admin/views/CustomersView.vue; then
  echo "✅"
  ((passed++))
else
  echo "❌"
fi
((checks++))

echo ""
echo "📊 Results: $passed/$checks checks passed"
echo ""

if [ $passed -eq $checks ]; then
  echo "✅ All checks passed! Feature is ready to test."
  echo ""
  echo "🚀 Next Steps:"
  echo "   1. Open http://localhost:5173/admin/customers"
  echo "   2. Click the History button (🕐) on any customer"
  echo "   3. Verify modal opens with customer data"
  exit 0
else
  echo "❌ Some checks failed. Please review the implementation."
  exit 1
fi
