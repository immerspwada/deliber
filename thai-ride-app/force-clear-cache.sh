#!/bin/bash

# 🔥 Force Clear Cache Script
# ล้าง cache ทั้งหมดเพื่อแก้ปัญหา Browser Cache

echo "🔥 Force Clear Cache - Admin Customers History Fix"
echo "=================================================="
echo ""

# 1. ล้าง Vite cache
echo "1️⃣ ล้าง Vite cache..."
rm -rf node_modules/.vite
echo "   ✅ node_modules/.vite ลบแล้ว"

# 2. ล้าง dist
echo ""
echo "2️⃣ ล้าง dist..."
rm -rf dist
echo "   ✅ dist ลบแล้ว"

# 3. ล้าง PWA cache
echo ""
echo "3️⃣ ล้าง PWA cache..."
rm -rf .vite-plugin-pwa
echo "   ✅ .vite-plugin-pwa ลบแล้ว"

# 4. ล้าง TypeScript cache
echo ""
echo "4️⃣ ล้าง TypeScript cache..."
rm -rf tsconfig.tsbuildinfo
echo "   ✅ tsconfig.tsbuildinfo ลบแล้ว"

echo ""
echo "=================================================="
echo "✅ Cache ทั้งหมดถูกล้างแล้ว!"
echo ""
echo "📝 ขั้นตอนต่อไป:"
echo "   1. รัน: npm run dev"
echo "   2. ปิดแท็บเก่าทั้งหมด"
echo "   3. เปิดแท็บใหม่: http://localhost:5173/admin/customers"
echo "   4. กด Cmd+Shift+R (Hard Refresh)"
echo "   5. ทดสอบคลิกปุ่ม History"
echo ""
echo "🔍 ตรวจสอบ:"
echo "   - HTML ต้องมี class: btn-action btn-history"
echo "   - HTML ต้องมี attribute: data-debug=\"new-code-2026-01-29\""
echo "   - Hover บนปุ่มต้องเห็น log: 🖱️ Mouse hover on History button"
echo "   - คลิกปุ่มต้องเห็น logs ครบ 9 บรรทัด"
echo ""
