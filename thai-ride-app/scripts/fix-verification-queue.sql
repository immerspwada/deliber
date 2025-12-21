-- ============================================================================
-- FIX: Provider Verification Queue - Already Applied via MCP
-- ============================================================================
-- 
-- สถานะ: ✅ APPLIED (2025-12-21)
-- 
-- สิ่งที่ทำไปแล้ว:
-- 1. สร้างตาราง provider_verification_queue
-- 2. สร้าง function add_to_verification_queue()
-- 3. สร้าง trigger auto_add_to_verification_queue
-- 4. สร้าง function assign_verification_to_admin()
-- 5. สร้าง function complete_verification()
-- 6. สร้าง function get_verification_queue_stats()
-- 7. Backfill providers ที่ status='pending' เข้า queue (6 รายการ)
--
-- ============================================================================

-- ถ้าต้องการตรวจสอบสถานะ ให้รัน query นี้:
SELECT 
  'Pending providers' as check_type, COUNT(*) as count 
FROM service_providers WHERE status = 'pending'
UNION ALL
SELECT 
  'In verification queue' as check_type, COUNT(*) as count 
FROM provider_verification_queue WHERE status IN ('pending', 'in_review');

-- ดูรายละเอียด providers ใน queue:
SELECT 
  pvq.queue_position,
  pvq.status as queue_status,
  sp.provider_type,
  sp.vehicle_type,
  sp.vehicle_plate,
  u.email,
  pvq.created_at
FROM provider_verification_queue pvq
JOIN service_providers sp ON pvq.provider_id = sp.id
LEFT JOIN users u ON sp.user_id = u.id
WHERE pvq.status IN ('pending', 'in_review')
ORDER BY pvq.queue_position;
