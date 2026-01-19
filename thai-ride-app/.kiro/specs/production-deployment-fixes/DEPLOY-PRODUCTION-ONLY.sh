#!/bin/bash
# Deploy to Production ONLY (ไม่ต้องใช้ Docker)
# แก้ไข error: get_available_providers not found

set -e

echo "🚀 Deploy Migration 306 to Production"
echo "======================================"
echo ""
echo "⚠️  คำเตือน: จะ deploy ไป production ทันที!"
echo ""

# ========================================
# Step 1: Link to Production
# ========================================
echo "🔗 Step 1: Link to Production..."
echo "Project: onsflqhkgqhydeupiqyt"
echo ""
echo "⚠️  คุณจะต้องใส่ database password"
echo "👉 หา password ได้ที่:"
echo "   https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/settings/database"
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
# Step 2: Check Current Migrations
# ========================================
echo "📋 Step 2: Check Current Migrations..."
echo "Migrations in production:"
npx supabase migration list | head -20
echo ""

# ========================================
# Step 3: Deploy Migration 306
# ========================================
echo "🚀 Step 3: Deploy Migration 306..."
echo ""
echo "⚠️  กำลัง deploy migration 306 ไป production!"
echo "   - order_reassignments table"
echo "   - reassign_order() function"
echo "   - get_available_providers() function"
echo "   - get_reassignment_history() function"
echo ""
read -p "ยืนยันการ deploy? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "❌ ยกเลิกการ deploy"
    exit 0
fi

echo ""
echo "⏳ กำลัง deploy..."
npx supabase db push

echo ""
echo "✅ Migration 306 deployed!"
echo ""

# ========================================
# Step 4: Verify Functions
# ========================================
echo "🔍 Step 4: Verify Functions..."
echo ""

# สร้าง SQL verification
cat > /tmp/verify-306.sql << 'EOF'
-- ตรวจสอบ table
SELECT 
  'order_reassignments table' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'order_reassignments'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ตรวจสอบ functions
SELECT 
  'reassign_order function' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'reassign_order'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'get_available_providers function' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'get_available_providers'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT 
  'get_reassignment_history function' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'get_reassignment_history'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ทดสอบ function
SELECT 'Test get_available_providers' as test_name;
SELECT COUNT(*) as provider_count FROM get_available_providers('ride', 5);
EOF

echo "📊 Verification Results:"
echo "======================="
npx supabase db execute --file /tmp/verify-306.sql
echo ""

# ========================================
# Step 5: Summary
# ========================================
echo "✅ Deployment Complete!"
echo ""
echo "📋 What was deployed:"
echo "  ✅ Migration 306: Order Reassignment System"
echo "  ✅ Table: order_reassignments"
echo "  ✅ Function: reassign_order()"
echo "  ✅ Function: get_available_providers()"
echo "  ✅ Function: get_reassignment_history()"
echo ""
echo "🎯 Next Steps:"
echo "  1. ทดสอบที่ production: https://YOUR_DOMAIN/admin/orders"
echo "  2. คลิกปุ่มย้ายงาน (🔄)"
echo "  3. ควรเห็น modal แสดง provider list"
echo "  4. เลือก provider และยืนยัน"
echo ""
echo "🔍 Troubleshooting:"
echo "  - ถ้ายังมี error: รอ 1-2 นาที (PostgREST cache)"
echo "  - ตรวจสอบ logs: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/logs"
echo "  - ดู functions: SQL Editor → SELECT * FROM pg_proc WHERE proname LIKE '%available%'"
echo ""
echo "✨ Done!"
