# Admin Dashboard Rules

## 🚨 กฎบังคับ: Auto-Run Migrations ผ่าน MCP (CRITICAL)

**เมื่อสร้าง migration file ใหม่ ต้อง run ทันทีอัตโนมัติผ่าน MCP Supabase:**

### วิธีที่ 1: ใช้ MCP Supabase (แนะนำ - บังคับใช้)

```
ใช้ kiroPowers tool เพื่อรัน migration:
1. Activate power: supabase-hosted หรือ supabase-local
2. ใช้ tool: execute_sql หรือ run_migration
3. ส่ง SQL content จาก migration file ที่สร้าง
```

**ขั้นตอนบังคับหลังสร้าง Migration:**

1. **สร้าง migration file** → `supabase/migrations/XXX_feature_name.sql`
2. **รัน migration ทันที** ผ่าน MCP Supabase power
3. **ตรวจสอบผลลัพธ์** ว่า migration สำเร็จ
4. **ถ้า error** → แก้ไขและรันใหม่จนสำเร็จ

### วิธีที่ 2: ใช้ CLI (Fallback)

```bash
cd thai-ride-app && npx supabase db push --linked
```

### ⚠️ กฎเหล็ก

| ❌ ห้ามทำ                    | ✅ ต้องทำ                             |
| ---------------------------- | ------------------------------------- |
| สร้าง migration แล้วไม่ run  | รัน migration ทันทีหลังสร้าง          |
| รอให้ user รัน migration เอง | Agent ต้องรัน migration อัตโนมัติ     |
| ข้าม error แล้วไปต่อ         | แก้ไข error จนกว่า migration จะสำเร็จ |
| ใช้ bash command เมื่อมี MCP | ใช้ MCP Supabase power เป็นหลัก       |

### ตัวอย่างการใช้ MCP รัน Migration

```typescript
// 1. Activate Supabase power
kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// 2. Execute SQL migration
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    sql: "-- SQL content from migration file",
  },
});
```

**ห้ามสร้าง migration แล้วไม่ run** - ต้อง execute ผ่าน MCP ทันทีเสมอ!

---

## กฏสำคัญสำหรับ Admin

### 1. Admin ต้องรองรับทุกฟีเจอร์

- เมื่อมีการเพิ่มหรือแก้ไขฟีเจอร์ใดๆ ใน User app ต้องอัพเดท Admin Dashboard ให้รองรับด้วยเสมอ
- Admin ต้องสามารถ ดู (View), อ่าน (Read), แก้ไข (Edit) ข้อมูลทุกอย่างได้

### 2. สิทธิ์การจัดการสูงสุด

Admin มีสิทธิ์จัดการข้อมูลทั้งหมดในระบบ:

- **Users**: ดู/แก้ไข/ยืนยัน/ระงับ ผู้ใช้
- **Providers**: ดู/อนุมัติ/ปฏิเสธ/ระงับ ผู้ให้บริการ
- **Orders**: ดู/แก้ไขสถานะ ออเดอร์ทุกประเภท (ride/delivery/shopping)
- **Payments**: ดู/จัดการ การชำระเงิน/คืนเงิน
- **Support**: ดู/ตอบ/แก้ไข Support tickets และ Complaints
- **Promos**: สร้าง/แก้ไข/ปิด โปรโมชั่น
- **Safety**: ดู/จัดการ Safety incidents
- **Settings**: จัดการการตั้งค่าระบบ

### 3. Admin แยกจาก User App

- Admin ใช้ path `/admin/*` ทั้งหมด
- Admin มี Login แยก (`/admin/login`)
- Admin ใช้ Layout แยก (`AdminLayout.vue`)
- Admin ไม่แชร์ authentication กับ User app

### 4. เมื่อเพิ่มฟีเจอร์ใหม่

ต้องตรวจสอบและอัพเดทไฟล์เหล่านี้:

- `src/composables/useAdmin.ts` - เพิ่ม functions สำหรับจัดการข้อมูลใหม่
- `src/views/Admin*.vue` - เพิ่ม UI สำหรับจัดการ
- `src/components/AdminLayout.vue` - เพิ่ม menu ถ้าจำเป็น

### 5. Admin Entry Point

- URL: `/admin/login` - หน้า Login สำหรับ Admin
- Demo credentials: `admin@demo.com` / `admin1234`

---

## กฎการทำงานร่วมกันข้ามระบบ (Cross-Platform Integration)

### หลักการสำคัญ

**เมื่อมีการเปลี่ยนแปลงใดๆ ทุกฝ่ายต้องทำงานร่วมกัน**

### 1. เมื่ออัพเดทฟีเจอร์ Order/Ride/Delivery/Shopping

ต้องตรวจสอบและอัพเดททุกส่วนที่เกี่ยวข้อง:

| ส่วนที่ต้องอัพเดท  | รายละเอียด                   |
| ------------------ | ---------------------------- |
| **Admin**          | ต้องรับ/ดู/จัดการออเดอร์ได้  |
| **Provider/Rider** | ต้องรับงาน/อัพเดทสถานะได้    |
| **Customer**       | ต้องทราบสถานะ/ติดตามได้      |
| **Database**       | ต้องมี columns/tables รองรับ |
| **Realtime**       | ต้อง sync สถานะทุกฝ่าย       |

### 2. Checklist เมื่อเพิ่ม/แก้ไขฟีเจอร์

#### Database Layer

- [ ] Migration file สร้าง/อัพเดทตารางที่จำเป็น
- [ ] RLS policies รองรับทุก role (admin, provider, customer)
- [ ] Realtime enabled สำหรับตารางที่ต้อง sync

#### Admin Side

- [ ] `useAdmin.ts` - เพิ่ม functions จัดการข้อมูล
- [ ] `Admin*View.vue` - UI สำหรับดู/จัดการ
- [ ] สามารถดูสถานะ/แก้ไข/อนุมัติ/ปฏิเสธได้

#### Provider/Rider Side

- [ ] `useProvider.ts` - รับงาน/อัพเดทสถานะ
- [ ] `Provider*View.vue` - UI แสดงงานและจัดการ
- [ ] Realtime subscription รับงานใหม่
- [ ] Push notification แจ้งเตือนงานใหม่

#### Customer Side

- [ ] Composable ที่เกี่ยวข้อง - สร้างออเดอร์/ติดตาม
- [ ] View/Component - UI แสดงสถานะ
- [ ] Realtime subscription ติดตามสถานะ
- [ ] Push notification แจ้งเตือนการเปลี่ยนสถานะ

### 3. Status Flow ที่ต้อง Sync

```
Customer สร้างออเดอร์
    ↓
[pending] → Admin เห็นในระบบ
    ↓
Provider รับงาน → [matched]
    ↓
Customer เห็นสถานะ "กำลังมารับ"
    ↓
Provider อัพเดท → [in_progress]
    ↓
Customer เห็นสถานะ "กำลังเดินทาง"
    ↓
Provider จบงาน → [completed]
    ↓
Customer ให้คะแนน + Admin เห็นสรุป
```

### 4. ตัวอย่างการอัพเดทฟีเจอร์ Order

**สมมติ: เพิ่มฟีเจอร์ "ยกเลิกออเดอร์"**

1. **Database**: เพิ่ม `cancelled_at`, `cancel_reason` columns
2. **Admin**: เพิ่มปุ่มยกเลิก + ดูเหตุผล + refund
3. **Provider**: แจ้งเตือนเมื่อถูกยกเลิก + หยุดงาน
4. **Customer**: ปุ่มยกเลิก + เลือกเหตุผล + ดูสถานะ refund
5. **Notification**: ส่งแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง

### 5. ไฟล์ที่ต้องตรวจสอบเสมอ

| ฝ่าย     | ไฟล์หลัก                                                           |
| -------- | ------------------------------------------------------------------ |
| Admin    | `useAdmin.ts`, `Admin*View.vue`, `AdminLayout.vue`                 |
| Provider | `useProvider.ts`, `Provider*View.vue`, `ProviderLayout.vue`        |
| Customer | `useServices.ts`, `stores/ride.ts`, `*View.vue`                    |
| Shared   | `useRealtime.ts`, `useNotifications.ts`, `usePushNotifications.ts` |
| Database | `supabase/migrations/*.sql`                                        |

---

## 🚨 กฎเหล็ก: ทุกฟีเจอร์ต้องทำงานครบทุก Role (MANDATORY)

### หลักการสำคัญที่สุด

**ทุกการสร้างฟีเจอร์ใหม่หรือ UI ต้องทำงานครบทุก Role ตามบริบทอย่างถูกต้อง**

### กฎบังคับ (MUST DO)

#### 1. เมื่อสร้างฟีเจอร์ที่ลูกค้าสั่ง (Customer Creates Order)

ต้องทำให้ครบ 3 ฝ่าย:

| Role         | สิ่งที่ต้องทำ                | ตัวอย่าง                     |
| ------------ | ---------------------------- | ---------------------------- |
| **Customer** | สร้างคำสั่ง + ติดตามสถานะ    | สั่งรถ, สั่งอาหาร, ส่งของ    |
| **Provider** | รับงาน + อัพเดทสถานะ + จบงาน | คนขับรับงาน, ไรเดอร์รับงาน   |
| **Admin**    | ดู/จัดการ/แก้ไข/ยกเลิก       | ดูออเดอร์ทั้งหมด, แก้ไขสถานะ |

#### 2. Flow ที่ถูกต้องสำหรับทุกบริการ

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

#### 3. Checklist บังคับก่อน Deploy

**❌ ห้าม Deploy ถ้าไม่ครบ:**

- [ ] **Customer สามารถ**: สร้างคำสั่ง + ติดตาม Realtime + ยกเลิก + ให้คะแนน
- [ ] **Provider สามารถ**: เห็นงานใหม่ + รับงาน + อัพเดทสถานะ + จบงาน
- [ ] **Admin สามารถ**: ดูทั้งหมด + แก้ไขสถานะ + ยกเลิก + Refund
- [ ] **Notification**: ส่งแจ้งเตือนทุกฝ่ายเมื่อสถานะเปลี่ยน
- [ ] **Realtime**: Sync สถานะระหว่าง Customer ↔ Provider

#### 4. ตัวอย่างการสร้างฟีเจอร์ใหม่ที่ถูกต้อง

**ตัวอย่าง: สร้างบริการ "เรียกรถ"**

```
1. Database (Migration)
   - สร้างตาราง ride_requests
   - RLS: customer อ่าน/สร้างของตัวเอง
   - RLS: provider อ่าน pending + อัพเดทที่รับ
   - RLS: admin อ่าน/แก้ไขทั้งหมด
   - Enable Realtime

2. Customer Side
   - useServices.ts: createRideRequest()
   - RideView.vue: UI สร้างคำสั่ง
   - Realtime: subscribe ride status
   - Push: รับแจ้งเตือนสถานะ

3. Provider Side
   - useProvider.ts: acceptRide(), updateRideStatus()
   - ProviderDashboardView.vue: แสดงงานใหม่
   - Realtime: subscribe new rides
   - Push: รับแจ้งเตือนงานใหม่

4. Admin Side
   - useAdmin.ts: getAllRides(), updateRideStatus()
   - AdminRidesView.vue: ดู/จัดการทั้งหมด
   - สามารถยกเลิก/แก้ไข/refund
```

#### 5. ข้อห้ามเด็ดขาด

| ❌ ห้ามทำ                    | ✅ ต้องทำ                             |
| ---------------------------- | ------------------------------------- |
| สร้างฟีเจอร์แค่ฝั่ง Customer | ทำครบทั้ง Customer + Provider + Admin |
| ไม่มี Realtime sync          | ต้องมี Realtime ทุกฝ่าย               |
| ไม่มี Push notification      | ต้องแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง     |
| Admin ดูไม่ได้               | Admin ต้องดู/จัดการได้ทุกอย่าง        |
| Provider รับงานไม่ได้        | Provider ต้องรับ/อัพเดท/จบงานได้      |

#### 6. Service Types และ Role ที่เกี่ยวข้อง

| Service  | Customer | Provider Type    | Admin View        |
| -------- | -------- | ---------------- | ----------------- |
| Ride     | สั่งรถ   | Driver           | AdminRidesView    |
| Delivery | ส่งของ   | Rider            | AdminDeliveryView |
| Shopping | ซื้อของ  | Shopper          | AdminShoppingView |
| Queue    | จองคิว   | Service Provider | AdminQueueView    |
| Moving   | ขนย้าย   | Mover            | AdminMovingView   |
| Laundry  | ซักผ้า   | Laundry Provider | AdminLaundryView  |

---

## กฎการตอบกลับหลังดำเนินการ

### ทุกครั้งที่ดำเนินการเสร็จ ต้องแนะนำ 3 อย่าง:

1. **ฟีเจอร์ใหม่ที่แนะนำ** - ต้องสอดคล้องกับฟีเจอร์หรือการพัฒนาล่าสุดที่ขอไป
2. **การปรับปรุงเล็กน้อย** - แนะนำสิ่งที่ทำให้ดีขึ้นได้
3. **ตรวจสอบตามกฎ** - ยืนยันว่าทุกอย่างเป็นไปตามกฎที่กำหนด (Admin rules, UI Design rules)
