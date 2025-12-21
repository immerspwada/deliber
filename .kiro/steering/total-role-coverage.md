# Total Role Coverage Framework - Thai Ride App

## หลักการสำคัญ
**ห้ามสร้างฟีเจอร์สำหรับ Role เดียว** - ทุกฟีเจอร์ต้องออกแบบให้ครอบคลุมทุก Role พร้อมกัน

---

## System Roles สำหรับ Thai Ride App

### 1. Admin (Super Admin)
- **Path**: `/admin/*`
- **Login**: `/admin/login`
- **Composable**: `useAdmin.ts`, `useAdminAuth.ts`
- **Layout**: `AdminLayout.vue`
- **สิทธิ์**: Full access, system config, override capabilities
- **ความสามารถ**:
  - ดู/แก้ไข/ลบ ข้อมูลทั้งหมดในระบบ
  - อนุมัติ/ปฏิเสธ/ระงับ Providers
  - จัดการ Promos, Settings, Notifications
  - ดู Analytics, Reports, Audit Logs
  - Force update สถานะ, Refund

### 2. Provider (Driver/Rider/Shopper)
- **Path**: `/provider/*`
- **Composable**: `useProvider.ts`, `useProviderDashboard.ts`
- **Layout**: `ProviderLayout.vue` (ถ้ามี)
- **สิทธิ์**: รับงาน, อัพเดทสถานะ, ดูรายได้ของตัวเอง
- **Provider Types**:
  - `driver` - ขับรถรับส่ง
  - `rider` - ส่งของ/อาหาร
  - `shopper` - ซื้อของ
  - `mover` - ขนย้าย
  - `laundry` - ซักผ้า
- **Status Flow**: `pending` → `approved` → `active` ↔ `suspended`
- **ความสามารถ**:
  - รับ/ปฏิเสธงาน
  - อัพเดทสถานะงาน
  - ดูรายได้และประวัติของตัวเอง
  - ถอนเงิน

### 3. Customer (End User)
- **Path**: `/customer/*`, `/` (home)
- **Composable**: `useServices.ts`, `useRideBooking.ts`, etc.
- **Layout**: `AppShell.vue`
- **สิทธิ์**: สร้างออเดอร์, ติดตามสถานะ, ดูข้อมูลของตัวเอง
- **ความสามารถ**:
  - สร้างออเดอร์ทุกประเภท (Ride, Delivery, Shopping, etc.)
  - ติดตามสถานะ Realtime
  - ยกเลิกออเดอร์ (ตามเงื่อนไข)
  - ให้คะแนน/รีวิว
  - จัดการ Wallet, Saved Places

### 4. Guest/Public
- **Path**: `/login`, `/register`, `/track/:id`
- **สิทธิ์**: Read-only, ต้อง login เพื่อใช้งาน
- **ความสามารถ**:
  - ดูราคาประมาณ
  - ติดตามออเดอร์ด้วย Tracking ID (ไม่ต้อง login)
  - สมัครสมาชิก/เข้าสู่ระบบ

---

## Dual-Role System (สำคัญมาก!)

### หลักการ
**1 User ID สามารถเป็นทั้ง Customer และ Provider ได้**

```
users (ทุกคนเริ่มต้นที่นี่)
├── id (UUID)
├── member_uid (TRD-XXXXXXXX)
└── เป็น Customer โดยอัตโนมัติ
         │
         ▼
service_providers (เมื่อสมัครเป็น Provider)
├── id (UUID)
├── user_id (FK → users.id)
├── provider_uid (PRV-XXXXXXXX)
└── provider_type (driver/rider/shopper/mover/laundry)
```

### การเข้าถึง Routes
- **Customer routes** (`/customer/*`): ทุกคนเข้าได้
- **Provider routes** (`/provider/*`): เฉพาะ approved providers
- **Provider onboarding** (`/provider/onboarding`): ทุกคนเข้าได้

---

## Feature Development Checklist

### เมื่อสร้างฟีเจอร์ใหม่ ต้องทำครบทุก Layer:

#### 1. Database Layer (Supabase)
- [ ] สร้าง Migration file (`supabase/migrations/XXX_feature_name.sql`)
- [ ] กำหนด RLS Policies สำหรับทุก Role:
  ```sql
  -- Admin: เห็นทั้งหมด
  CREATE POLICY "admin_full_access" ON table_name
    FOR ALL TO authenticated
    USING (is_admin(auth.uid()));
  
  -- Provider: เห็นเฉพาะงานที่รับ
  CREATE POLICY "provider_own_jobs" ON table_name
    FOR SELECT TO authenticated
    USING (provider_id = get_provider_id(auth.uid()));
  
  -- Customer: เห็นเฉพาะของตัวเอง
  CREATE POLICY "customer_own_data" ON table_name
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  ```
- [ ] Enable Realtime (ถ้าต้องการ sync)

#### 2. Backend/API Layer (Supabase Functions)
- [ ] สร้าง Atomic Functions สำหรับ critical operations
- [ ] ตรวจสอบ Role ใน Function:
  ```sql
  CREATE FUNCTION do_something(...)
  RETURNS ... AS $$
  BEGIN
    -- Check role
    IF NOT is_admin(auth.uid()) AND NOT is_owner(auth.uid(), record_id) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    -- ... logic
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

#### 3. Frontend Layer (Vue)

##### Admin Side
- [ ] `useAdmin.ts` - เพิ่ม functions จัดการข้อมูล
- [ ] `Admin*View.vue` - UI สำหรับดู/จัดการ
- [ ] `AdminLayout.vue` - เพิ่ม menu (ถ้าจำเป็น)

##### Provider Side
- [ ] `useProvider.ts` - รับงาน/อัพเดทสถานะ
- [ ] `Provider*View.vue` - UI แสดงงานและจัดการ
- [ ] Realtime subscription รับงานใหม่
- [ ] Push notification แจ้งเตือนงานใหม่

##### Customer Side
- [ ] Composable ที่เกี่ยวข้อง - สร้างออเดอร์/ติดตาม
- [ ] View/Component - UI แสดงสถานะ
- [ ] Realtime subscription ติดตามสถานะ
- [ ] Push notification แจ้งเตือนการเปลี่ยนสถานะ

#### 4. Notifications
- [ ] ส่งแจ้งเตือนทุกฝ่ายเมื่อสถานะเปลี่ยน
- [ ] Push notification (ถ้าเปิดใช้)
- [ ] In-app notification

---

## Role-Based Behavior Matrix Template

เมื่อออกแบบฟีเจอร์ใหม่ ให้สร้าง Matrix นี้ก่อน:

| Role | Action Allowed | Data Scope | UI Experience | API Constraints |
|:-----|:---------------|:-----------|:--------------|:----------------|
| **Admin** | CRUD ทั้งหมด, Force actions | ทุก records | Full dashboard, Bulk actions | ไม่มี limit |
| **Provider** | Read assigned, Update status | เฉพาะงานที่รับ | Job list, Status buttons | ต้อง check ownership |
| **Customer** | Create, Read own, Cancel | เฉพาะของตัวเอง | Booking form, Tracking | ต้อง check ownership |
| **Guest** | Read public only | Public data | View only, Login prompt | Read-only endpoints |

---

## Status Flow ที่ต้อง Sync ทุก Role

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANDATORY FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CUSTOMER                PROVIDER                 ADMIN         │
│  ────────                ────────                 ─────         │
│                                                                 │
│  1. สร้างคำสั่ง ──────────────────────────────→ เห็นในระบบ      │
│     [pending]                                                   │
│                                                                 │
│  2. รอคนรับ ←──────── รับงาน ─────────────────→ เห็นการจับคู่   │
│     [matched]         [matched]                                 │
│                                                                 │
│  3. ติดตามสถานะ ←──── อัพเดทสถานะ ────────────→ ดูความคืบหน้า  │
│     [in_progress]     [in_progress]                             │
│                                                                 │
│  4. รับบริการ ←────── จบงาน ──────────────────→ เห็นสรุป       │
│     [completed]       [completed]                               │
│                                                                 │
│  5. ให้คะแนน ─────────────────────────────────→ ดูรีวิว        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Types และ Role ที่เกี่ยวข้อง

| Service | Customer Action | Provider Type | Admin View | Tables |
|---------|-----------------|---------------|------------|--------|
| Ride | สั่งรถ | driver | AdminRidesView | `ride_requests` |
| Delivery | ส่งของ | rider | AdminDeliveryView | `delivery_requests` |
| Shopping | ซื้อของ | shopper | AdminShoppingView | `shopping_requests` |
| Queue | จองคิว | service_provider | AdminQueueView | `queue_bookings` |
| Moving | ขนย้าย | mover | AdminMovingView | `moving_requests` |
| Laundry | ซักผ้า | laundry | AdminLaundryView | `laundry_requests` |

---

## Security Checklist

เมื่อสร้างฟีเจอร์ใหม่ ต้องตรวจสอบ:

- [ ] **IDOR Prevention**: ตรวจสอบ ownership ก่อนทุก operation
- [ ] **Role Guard**: ใช้ middleware/guard ตรวจสอบ role
- [ ] **RLS Policies**: ทุกตารางต้องมี RLS ที่ถูกต้อง
- [ ] **Input Sanitization**: Validate input ตาม role
- [ ] **Audit Log**: บันทึก sensitive actions (โดยเฉพาะ Admin)
- [ ] **Rate Limiting**: จำกัด requests ตาม role

---

## ข้อห้ามเด็ดขาด

| ❌ ห้ามทำ | ✅ ต้องทำ |
|----------|----------|
| สร้างฟีเจอร์แค่ฝั่ง Customer | ทำครบทั้ง Customer + Provider + Admin |
| ไม่มี Realtime sync | ต้องมี Realtime ทุกฝ่าย |
| ไม่มี Push notification | ต้องแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง |
| Admin ดูไม่ได้ | Admin ต้องดู/จัดการได้ทุกอย่าง |
| Provider รับงานไม่ได้ | Provider ต้องรับ/อัพเดท/จบงานได้ |
| ใช้ Mock Data | Query จาก Database เท่านั้น |
| ไม่มี RLS | ทุกตารางต้องมี RLS policies |

---

## Output Format เมื่อออกแบบฟีเจอร์

เมื่อออกแบบฟีเจอร์ใหม่ ให้ใช้ format นี้:

```markdown
## 1. High-Level Overview
(สรุปฟีเจอร์สั้นๆ)

## 2. Role-Based Behavior Matrix
| Role | Action Allowed | Data Scope | UI Experience | API Constraints |
|:-----|:---------------|:-----------|:--------------|:----------------|
| Admin | ... | ... | ... | ... |
| Provider | ... | ... | ... | ... |
| Customer | ... | ... | ... | ... |

## 3. Implementation Details

### Database (Migration)
(SQL snippets)

### Admin Side
- Composable: ...
- View: ...

### Provider Side
- Composable: ...
- View: ...

### Customer Side
- Composable: ...
- View: ...

## 4. Security Checklist
- [ ] IDOR Prevention
- [ ] Role Guard
- [ ] RLS Policies
- [ ] Input Sanitization
```

---

## Files Reference

| Role | Main Files |
|------|------------|
| Admin | `useAdmin.ts`, `Admin*View.vue`, `AdminLayout.vue` |
| Provider | `useProvider.ts`, `Provider*View.vue` |
| Customer | `useServices.ts`, `stores/ride.ts`, `*View.vue` |
| Shared | `useRealtime.ts`, `useNotifications.ts`, `usePushNotifications.ts` |
| Database | `supabase/migrations/*.sql` |
