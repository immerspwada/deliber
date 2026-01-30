#!/bin/bash

echo "🧹 กำลังลบ cache ทั้งหมด..."
echo ""

# 1. Clear Vite cache
echo "1️⃣ ลบ Vite cache..."
rm -rf node_modules/.vite
echo "   ✅ ลบ node_modules/.vite แล้ว"

# 2. Clear dist
echo ""
echo "2️⃣ ลบ dist folder..."
rm -rf dist
echo "   ✅ ลบ dist แล้ว"

# 3. Browser cache instruction
echo ""
echo "3️⃣ 🌐 ขั้นตอนต่อไป - ลบ Browser Cache:"
echo ""
echo "   📱 Chrome/Edge/Brave (Mac):"
echo "      กด: Cmd + Shift + R"
echo ""
echo "   📱 Chrome/Edge/Brave (Windows):"
echo "      กด: Ctrl + Shift + R"
echo ""
echo "   📱 Firefox:"
echo "      กด: Ctrl + F5 (Windows) หรือ Cmd + Shift + R (Mac)"
echo ""

# 4. Service Worker instruction
echo "4️⃣ 🔧 ลบ Service Worker:"
echo ""
echo "   1. กด F12 เปิด DevTools"
echo "   2. ไปที่ tab 'Application'"
echo "   3. ซ้ายมือเลือก 'Service Workers'"
echo "   4. คลิก 'Unregister' ทุกตัว"
echo "   5. ไปที่ 'Cache Storage'"
echo "   6. คลิกขวาแต่ละ cache → 'Delete'"
echo ""

# 5. Alternative: Force Clear Page
echo "5️⃣ 🚀 หรือใช้วิธีง่ายกว่า:"
echo ""
echo "   เปิด browser ไปที่:"
echo "   👉 http://localhost:5173/force-clear-sw.html"
echo "   แล้วกดปุ่ม 'ลบทั้งหมดและ Reload'"
echo ""

# 6. Restart dev server
echo "6️⃣ 🔄 กำลัง restart dev server..."
echo ""

# Kill existing dev server
pkill -f "vite" 2>/dev/null || true

# Wait a moment
sleep 1

# Start dev server in background
npm run dev &

echo ""
echo "✅ เสร็จสิ้น!"
echo ""
echo "📋 สิ่งที่ต้องทำต่อ:"
echo "   1. รอ dev server start (ประมาณ 3-5 วินาที)"
echo "   2. Hard refresh browser (Cmd+Shift+R หรือ Ctrl+Shift+R)"
echo "   3. หรือเปิด http://localhost:5173/force-clear-sw.html"
echo "   4. ตรวจสอบว่าเห็นปุ่ม History (ไอคอนนาฬิกา) แล้ว"
echo ""
echo "🎯 ถ้ายังไม่เห็น:"
echo "   - ลอง Incognito mode: Cmd+Shift+N (Mac) หรือ Ctrl+Shift+N (Windows)"
echo "   - หรือเปิด DevTools → Network → เช็ค 'Disable cache'"
echo ""
