# Dual-Role System Guide (Customer + Provider)

## หลักการสำคัญ
**1 User ID = 1 ลูกค้า + 1 Provider (ถ้าสมัคร)**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-ROLE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  users (ทุกคนเริ่มต้นที่นี่)                                      │
│  ├── id (UUID) ─────────────────┐                               │
│  ├── member_uid (TRD-XXXXXXXX)  │  ← UID ลูกค้า                  │
│  ├── first_name                 │                               │
│  ├── last_name                  │                               │
│  └── phone_number               │                               │
│                                 │                               │
│                                 ▼                               │
│  service_providers (เมื่อสมัครเป็น Provider)                     │
│  ├── id (UUID)                                                  │
│  ├── user_id (FK → users.id) ◄──┘  ← เชื่อมกับ User เดียวกัน     │
│  ├── provider_uid (PRV-XXXXXXXX)   ← UID Provider               │
│  ├── provider_type (rider/driver)                               │
│  └── status (pending/approved/rejected/suspended)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## UID System

| UID Type | Format | ตาราง | ใช้สำหรับ |
|----------|--------|-------|----------|
| **Member UID** | `TRD-XXXXXXXX` | `users.member_uid` | ติดตามลูกค้า |
| **Provider UID** | `PRV-XXXXXXXX` | `service_providers.provider_uid` | ติดตาม Provider |

**ตัวอย่าง:**
- User สมัครเป็นลูกค้า → ได้ `TRD-F91E78DC`
- User สมัครเป็น Provider → ได้ `PRV-ABDBFABF`
- **ทั้งสอง UID ชี้ไปที่ user_id เดียวกัน**

---

## Provider Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              PROVIDER REGISTRATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ลูกค้าสมัครไรเดอร์                                           │
│     ├── เข้า /provider/onboarding                               │
│     ├── กด "เริ่มสมัครเลย"                                       │
│     ├── ไป /provider/register                                   │
│     ├── กรอกข้อมูล + อัพโหลดเอกสาร                               │
│     └── สร้าง record ใน service_providers                       │
│         ├── user_id = UUID ของลูกค้า (เดียวกัน!)                 │
│         ├── provider_uid = PRV-XXXXXXXX (สร้างใหม่)              │
│         └── status = 'pending'                                  │
│                                                                 │
│  2. รออนุมัติ                                                    │
│     ├── แสดงหน้า /provider/onboarding (สถานะ: รอการอนุมัติ)       │
│     ├── ไม่สามารถเข้า /provider (dashboard) ได้                  │
│     └── ยังใช้บริการในฐานะลูกค้าได้ปกติ                           │
│                                                                 │
│  3. Admin อนุมัติ                                                │
│     ├── เข้า /admin/providers                                   │
│     ├── เห็นใบสมัครที่รอตรวจสอบ                                   │
│     ├── ตรวจสอบเอกสาร                                           │
│     ├── กดอนุมัติ                                                │
│     └── อัพเดท status = 'approved', is_verified = true          │
│                                                                 │
│  4. Provider รับงานได้                                          │
│     ├── เข้า /provider (dashboard) ได้                          │
│     ├── รับงาน ride/delivery/shopping ได้                       │
│     ├── ใช้ user_id เดียวกับตอนเป็นลูกค้า                        │
│     └── สลับไปใช้บริการลูกค้าได้ตลอดเวลา                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Status Flow

```
ลูกค้าสมัครเป็น Provider
        ↓
    [pending] ──────────────────────────────────────┐
        ↓                                           │
   Admin ตรวจสอบ                                    │
        ↓                                           │
  ┌─────┴─────┐                                     │
  ↓           ↓                                     │
[approved] [rejected] ──→ สมัครใหม่ได้ ─────────────┘
  ↓
[active] ←→ [suspended] (Admin ระงับ/ปลดระงับ)
```

| Status | คำอธิบาย | เข้า Dashboard ได้? | รับงานได้? |
|--------|---------|-------------------|-----------|
| `pending` | รอการอนุมัติ | ❌ | ❌ |
| `approved` | อนุมัติแล้ว | ✅ | ✅ |
| `active` | กำลังทำงาน | ✅ | ✅ |
| `rejected` | ถูกปฏิเสธ | ❌ | ❌ |
| `suspended` | ถูกระงับ | ❌ | ❌ |

---

## Route Access Control

| Route | ใครเข้าได้ | เงื่อนไข |
|-------|----------|---------|
| `/customer/*` | ทุกคน | ต้อง login |
| `/provider/onboarding` | ทุกคน | ต้อง login |
| `/provider/register` | ทุกคน | ต้อง login |
| `/provider` (dashboard) | Provider ที่ approved | status = approved/active |
| `/provider/*` (อื่นๆ) | Provider ที่ approved | status = approved/active |
| `/admin/*` | Admin เท่านั้น | ต้อง login เป็น admin |

---

## Database Functions

| Function | รายละเอียด |
|----------|------------|
| `get_user_roles(user_id)` | ตรวจสอบว่า User มี Role อะไรบ้าง |
| `apply_as_provider(...)` | สมัครเป็น Provider |
| `admin_review_provider(...)` | Admin อนุมัติ/ปฏิเสธ/ระงับ |
| `can_access_provider_routes(user_id)` | ตรวจสอบสิทธิ์เข้า Provider routes |

---

## ตัวอย่างข้อมูลจริง

```
User: asadafdasf@gmail.com
├── user_id: b7df4443-0459-44f3-b19c-65c8ae62f654
├── member_uid: TRD-F91E78DC (UID ลูกค้า)
│
└── Provider:
    ├── provider_id: 837de67f-f563-4a70-9e0a-9f726f1f51ab
    ├── provider_uid: PRV-ABDBFABF (UID Provider)
    ├── provider_type: rider
    ├── status: approved ✅
    └── is_verified: true ✅

→ User นี้สามารถ:
  - ใช้บริการในฐานะลูกค้า (เรียกรถ, สั่งของ)
  - รับงานในฐานะ Provider (รับงานส่งของ)
  - สลับ Role ได้ตลอดเวลา
```

---

## Admin View

Admin สามารถดูข้อมูล Dual-Role ได้ที่ `/admin/providers`:

1. **เห็นใบสมัครที่รอตรวจสอบ** (status = pending)
2. **ตรวจสอบเอกสาร** (บัตรประชาชน, ใบขับขี่, รูปรถ)
3. **อนุมัติ/ปฏิเสธ** พร้อมเหตุผล
4. **ระงับ/ปลดระงับ** Provider ที่มีปัญหา
5. **ดูประวัติการสมัคร** (application_count)

---

## Migrations ที่เกี่ยวข้อง

| Migration | รายละเอียด |
|-----------|------------|
| `027_user_member_uid.sql` | Member UID system |
| `121_fix_can_access_provider_routes.sql` | แก้ไข function ให้คืน JSON |
| `122_dual_role_user_provider_system.sql` | Provider UID และ Dual-Role functions |
