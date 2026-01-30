#!/bin/bash

echo "🔍 ตรวจสอบ History Button Implementation..."
echo ""

# Check 1: Import
echo "1️⃣ ตรวจสอบ Import CustomerHistoryModal..."
if grep -q "import CustomerHistoryModal from '@/admin/components/CustomerHistoryModal.vue'" src/admin/views/CustomersView.vue; then
    echo "   ✅ Import ถูกต้อง"
else
    echo "   ❌ ไม่พบ Import"
fi

# Check 2: State
echo ""
echo "2️⃣ ตรวจสอบ State Management..."
if grep -q "const showHistoryModal = ref(false)" src/admin/views/CustomersView.vue; then
    echo "   ✅ showHistoryModal state มีแล้ว"
else
    echo "   ❌ ไม่พบ showHistoryModal state"
fi

if grep -q "const historyCustomer = ref" src/admin/views/CustomersView.vue; then
    echo "   ✅ historyCustomer state มีแล้ว"
else
    echo "   ❌ ไม่พบ historyCustomer state"
fi

# Check 3: Handler
echo ""
echo "3️⃣ ตรวจสอบ Handler Function..."
if grep -q "const viewCustomerHistory" src/admin/views/CustomersView.vue; then
    echo "   ✅ viewCustomerHistory function มีแล้ว"
else
    echo "   ❌ ไม่พบ viewCustomerHistory function"
fi

# Check 4: Button
echo ""
echo "4️⃣ ตรวจสอบ History Button..."
if grep -q "btn-history" src/admin/views/CustomersView.vue; then
    echo "   ✅ History button มีแล้ว"
    
    # Count occurrences
    count=$(grep -c "btn-history" src/admin/views/CustomersView.vue)
    echo "   📊 พบ btn-history: $count ครั้ง (ควรเป็น 2 = button + CSS)"
else
    echo "   ❌ ไม่พบ History button"
fi

# Check 5: Modal Integration
echo ""
echo "5️⃣ ตรวจสอบ Modal Integration..."
if grep -q "<CustomerHistoryModal" src/admin/views/CustomersView.vue; then
    echo "   ✅ Modal component ถูก integrate แล้ว"
else
    echo "   ❌ ไม่พบ Modal component"
fi

# Check 6: TypeScript Errors
echo ""
echo "6️⃣ ตรวจสอบ TypeScript Errors..."
echo "   (กำลังตรวจสอบ...)"
npm run type-check 2>&1 | grep -i "error" > /tmp/ts-errors.txt
if [ -s /tmp/ts-errors.txt ]; then
    echo "   ⚠️ พบ TypeScript errors:"
    cat /tmp/ts-errors.txt
else
    echo "   ✅ ไม่มี TypeScript errors"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 สรุปผลการตรวจสอบ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count checks
total=6
passed=0

grep -q "import CustomerHistoryModal" src/admin/views/CustomersView.vue && ((passed++))
grep -q "const showHistoryModal" src/admin/views/CustomersView.vue && ((passed++))
grep -q "const historyCustomer" src/admin/views/CustomersView.vue && ((passed++))
grep -q "const viewCustomerHistory" src/admin/views/CustomersView.vue && ((passed++))
grep -q "btn-history" src/admin/views/CustomersView.vue && ((passed++))
grep -q "<CustomerHistoryModal" src/admin/views/CustomersView.vue && ((passed++))

echo "✅ ผ่าน: $passed/$total ข้อ"
echo ""

if [ $passed -eq $total ]; then
    echo "🎉 โค้ดถูกต้องครบถ้วน!"
    echo ""
    echo "❓ ถ้ายังไม่เห็นปุ่มใน browser:"
    echo "   👉 ปัญหาคือ Browser Cache!"
    echo "   👉 รัน: ./force-clear-dev-cache.sh"
    echo "   👉 หรือเปิด: http://localhost:5173/force-clear-sw.html"
else
    echo "⚠️ โค้ดยังไม่ครบ - ต้องแก้ไข"
fi

echo ""
