#!/bin/bash

# 🔥 Clear Cache & Restart Dev Server
# ===================================
# สคริปต์นี้จะล้าง cache ทั้งหมดและรีสตาร์ท dev server

echo "🧹 กำลังล้าง cache..."

# ล้าง Vite cache
rm -rf node_modules/.vite
echo "✅ ล้าง Vite cache แล้ว"

# ล้าง dist
rm -rf dist
echo "✅ ล้าง dist แล้ว"

# ล้าง Service Worker cache (ถ้ามี)
rm -rf .vite-plugin-pwa
echo "✅ ล้าง PWA cache แล้ว"

echo ""
echo "🎉 ล้าง cache เสร็จสิ้น!"
echo ""
echo "📝 ขั้นตอนต่อไป:"
echo "1. รัน: npm run dev"
echo "2. เปิด browser ใน Incognito mode"
echo "3. ไปที่: http://localhost:5173/admin/customers"
echo "4. ทดสอบคลิกปุ่ม History"
echo ""
