# Admin Verification Queue Fix

## สรุปปัญหา
`/admin/verification-queue` ไม่ทำงาน - ไม่แสดงรายการ providers ที่รอตรวจสอบ

## การแก้ไข

### 1. Database (Migration 166)
ไฟล์: `supabase/migrations/166_fix_verification_queue_complete.sql`

สร้าง RPC Functions:
- `admin_get_verification_queue()` - ดู queue
- `admin_get_pending_providers()` - fallback
- `admin_approve_provider_from_queue()` - อนุมัติ + ส่ง notification
- `admin_reject_provider_from_queue()` - ปฏิเสธ + ส่ง notification

### 2. Frontend (useAdminAPI.ts)
แก้ไข 2 functions ใน `src/admin/composables/useAdminAPI.ts`:

1. `getVerificationQueue()` - ใช้ RPC ใหม่
2. `updateProviderStatus()` - ใช้ RPC สำหรับ approve/reject

### 3. การทดสอบ
```bash
# 1. Run migration
supabase db push

# 2. ทดสอบใน Admin UI
# เข้า /admin/verification-queue
# ควรเห็นรายการ pending providers
```

## ผลลัพธ์
✅ Admin เห็นรายการ providers ที่รอตรวจสอบ
✅ อนุมัติ/ปฏิเสธทำงานได้
✅ Provider ได้รับ notification อัตโนมัติ
✅ Auto-add pending providers เข้า queue
