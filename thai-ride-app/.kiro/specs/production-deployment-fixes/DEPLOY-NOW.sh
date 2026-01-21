#!/bin/bash
# Deploy Production Fixes - ใช้งานได้จริง
# สำหรับแก้ไข error: get_available_providers not found

set -e  # หยุดทันทีถ้ามี error

echo "🚀 เริ่ม Deploy Production Fixes..."
echo ""

# ========================================
# Step 1: ตรวจสอบ Docker
# ========================================
echo "📦 Step 1: ตรวจสอบ Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker ไม่ได้เปิด!"
    echo "👉 เปิด Docker Desktop: open -a Docker"
    echo "👉 รอ 10-30 วินาที แล้วรันคำสั่งนี้อีกครั้ง"
    exit 1
fi
echo "✅ Docker running"
echo ""

# ========================================
# Step 2: ตรวจสอบ Supabase Local
# ========================================
echo "🔧 Step 2: ตรวจสอบ Supabase Local..."
if ! npx supabase status > /dev/null 2>&1; then
    echo "⚠️  Supabase local ไม่ได้เปิด"
    echo "🔄 กำลัง start Supabase..."
    npx supabase start
    echo "✅ Supabase started"
else
    echo "✅ Supabase running"
fi
echo ""

# ========================================
# Step 3: Apply Local Migrations (308-309)
# ========================================
echo "📝 Step 3: Apply Local Migrations..."
echo "Applying migrations 308-309..."
npx supabase db push --local
echo "✅ Local migrations applied"
echo ""

# ========================================
# Step 4: Generate Types
# ========================================
echo "🔨 Step 4: Generate Types..."
npx supabase gen types --local > src/types/database.ts
echo "✅ Types generated"
echo ""

# ========================================
# Step 5: Link to Production
# ========================================
echo "🔗 Step 5: Link to Production..."
echo "Project: onsflqhkgqhydeupiqyt"
echo ""
echo "⚠️  คุณจะต้องใส่ database password"
echo "👉 หา password ได้ที่: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/settings/database"
echo ""

# ตรวจสอบว่า link แล้วหรือยัง
if npx supabase link --project-ref onsflqhkgqhydeupiqyt 2>&1 | grep -q "already linked"; then
    echo "✅ Already linked to production"
else
    npx supabase link --project-ref onsflqhkgqhydeupiqyt
    echo "✅ Linked to production"
fi
echo ""

# ========================================
# Step 6: Deploy to Production
# ========================================
echo "🚀 Step 6: Deploy to Production..."
echo "Deploying migrations 306, 308, 309..."
echo ""
echo "⚠️  กำลัง deploy ไป production!"
echo "⏳ รอสักครู่..."
echo ""

npx supabase db push

echo ""
echo "✅ Migrations deployed to production!"
echo ""

# ========================================
# Step 7: Verify Production
# ========================================
echo "🔍 Step 7: Verify Production..."
echo "กำลังตรวจสอบ functions..."
echo ""

# สร้าง SQL verification file
cat > /tmp/verify-production.sql << 'EOF'
-- ตรวจสอบ functions
SELECT 
  'Functions Check' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ All functions exist'
    ELSE '❌ Missing functions'
  END as status
FROM pg_proc 
WHERE proname IN (
  'reassign_order',
  'get_available_providers',
  'get_reassignment_history',
  'suspend_customer_account',
  'unsuspend_customer_account'
);

-- ตรวจสอบ tables
SELECT 
  'Tables Check' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Table exists'
    ELSE '❌ Table missing'
  END as status
FROM information_schema.tables
WHERE table_name = 'order_reassignments';

-- ตรวจสอบ columns
SELECT 
  'Columns Check' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ All columns exist'
    ELSE '❌ Missing columns'
  END as status
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');
EOF

echo "📊 Verification Results:"
echo "======================="
npx supabase db execute --file /tmp/verify-production.sql
echo ""

# ========================================
# Step 8: Summary
# ========================================
echo "✅ Deployment Complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Docker running"
echo "  ✅ Supabase local running"
echo "  ✅ Local migrations applied (308-309)"
echo "  ✅ Types generated"
echo "  ✅ Linked to production"
echo "  ✅ Production migrations deployed (306, 308, 309)"
echo ""
echo "🎯 Next Steps:"
echo "  1. Restart dev server: npm run dev"
echo "  2. Test locally: http://localhost:5173/admin/customers"
echo "  3. Test production: https://YOUR_DOMAIN/admin/orders"
echo ""
echo "📝 Test Checklist:"
echo "  [ ] Local: ปุ่มระงับแสดงที่ /admin/customers"
echo "  [ ] Local: ระงับ/ปลดระงับทำงาน"
echo "  [ ] Production: ปุ่มย้ายงานทำงานที่ /admin/orders"
echo "  [ ] Production: เลือก provider และย้ายงานสำเร็จ"
echo ""
echo "🔍 Troubleshooting:"
echo "  - ถ้ายังมี error: npx supabase db push --include-all"
echo "  - ดู logs: npx supabase logs --local"
echo "  - ตรวจสอบ functions: ดูที่ Supabase Dashboard → SQL Editor"
echo ""
echo "✨ Done!"
