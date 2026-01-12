# 🎭 Role-Based Development Guidelines

## 🚨 กฎบังคับ: ต้องคำนึงถึง Role ทุกครั้ง

> **⚠️ MANDATORY: ทุกคำสั่งที่ออกไป ต้องพิจารณาบริบท Role เสมอ**
>
> ก่อนเขียนโค้ด/แก้ไข/ตอบคำถาม ต้องถามตัวเองว่า:
>
> 1. คำสั่งนี้กระทบ **Customer** อย่างไร?
> 2. คำสั่งนี้กระทบ **Provider** อย่างไร?
> 3. คำสั่งนี้กระทบ **Admin** อย่างไร?
> 4. ต้องทำอะไรเพิ่มสำหรับแต่ละ Role?

---

## ⚠️ กฎสำคัญ: ทุกคำสั่งต้องพิจารณา Role

**ทุกครั้งที่พัฒนาฟีเจอร์ใหม่หรือแก้ไขโค้ด ต้องพิจารณาผลกระทบต่อทุก Role:**

| Role         | คำอธิบาย                     | Path Prefix   | Layout         |
| ------------ | ---------------------------- | ------------- | -------------- |
| **Customer** | ผู้ใช้บริการ (ลูกค้า)        | `/customer/*` | AppShell       |
| **Provider** | ผู้ให้บริการ (คนขับ/ไรเดอร์) | `/provider/*` | ProviderLayout |
| **Admin**    | ผู้ดูแลระบบ                  | `/admin/*`    | AdminLayout    |

---

## 🔄 Checklist ก่อนทำทุกคำสั่ง

### 1. Database Changes (Migrations)

```sql
-- ✅ ต้องพิจารณา RLS Policies สำหรับทุก Role
-- Customer: เห็นเฉพาะข้อมูลตัวเอง
-- Provider: เห็นข้อมูลงานและรายได้ตัวเอง
-- Admin: เห็นทุกอย่าง

-- ตัวอย่าง: ถ้าเพิ่ม table ใหม่
CREATE POLICY "Customers can view own data"
ON new_table FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Providers can view assigned data"
ON new_table FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all"
ON new_table FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### 2. API/Edge Functions

```typescript
// ✅ ต้องตรวจสอบ role ก่อนดำเนินการ
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

// ตรวจสอบสิทธิ์ตาม role
if (profile.role === "customer") {
  // Logic สำหรับ customer
} else if (profile.role === "provider") {
  // Logic สำหรับ provider
} else if (profile.role === "admin") {
  // Logic สำหรับ admin
}
```

### 3. Frontend Components

```typescript
// ✅ ใช้ composable ตรวจสอบ role
import { useRoleAccess } from "@/composables/useRoleAccess";

const { isCustomer, isProvider, isAdmin, currentRole } = useRoleAccess();

// แสดง UI ตาม role
<template>
  <div v-if="isCustomer">Customer UI</div>
  <div v-if="isProvider">Provider UI</div>
  <div v-if="isAdmin">Admin UI</div>
</template>;
```

### 4. Router/Navigation

```typescript
// ✅ ต้องกำหนด meta สำหรับทุก route
{
  path: '/customer/feature',
  meta: {
    requiresAuth: true,
    isCustomerRoute: true,
    allowedRoles: ['customer']
  }
},
{
  path: '/provider/feature',
  meta: {
    requiresAuth: true,
    isProviderRoute: true,
    allowedRoles: ['provider']
  }
},
{
  path: '/admin/feature',
  meta: {
    requiresAuth: true,
    isAdminRoute: true,
    allowedRoles: ['admin']
  }
}
```

---

## 📋 Role-Specific Considerations

### Customer (ลูกค้า)

- **UI/UX**: Mobile-first, ใช้งานง่าย, สีสันสดใส
- **Features**: จองบริการ, ติดตามสถานะ, ชำระเงิน, ให้คะแนน
- **Data Access**: เห็นเฉพาะข้อมูลตัวเอง
- **Layout**: AppShell พร้อม BottomNavigation

### Provider (คนขับ/ไรเดอร์)

- **UI/UX**: เน้นประสิทธิภาพ, ข้อมูลชัดเจน, ใช้งานขณะขับรถได้
- **Features**: รับงาน, อัพเดทสถานะ, ดูรายได้, ถอนเงิน
- **Data Access**: เห็นงานที่ได้รับมอบหมาย + รายได้ตัวเอง
- **Layout**: ProviderLayout พร้อม OnlineStatusToggle

### Admin (ผู้ดูแลระบบ)

- **UI/UX**: Dashboard, ตาราง, กราฟ, รายงาน
- **Features**: จัดการผู้ใช้, อนุมัติเอกสาร, ดู Analytics, จัดการการเงิน
- **Data Access**: เห็นทุกอย่าง + สิทธิ์แก้ไข
- **Layout**: AdminLayout พร้อม Sidebar

---

## 🔐 Security by Role

### RLS Policy Template

```sql
-- Template สำหรับทุก table ใหม่
-- 1. Customer Policy
CREATE POLICY "customer_select_own" ON table_name
FOR SELECT USING (auth.uid() = user_id);

-- 2. Provider Policy
CREATE POLICY "provider_select_assigned" ON table_name
FOR SELECT USING (auth.uid() = provider_id);

-- 3. Admin Policy
CREATE POLICY "admin_full_access" ON table_name
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### API Authorization

```typescript
// ✅ ทุก Edge Function ต้องมี role check
function authorizeRole(allowedRoles: string[], userRole: string): boolean {
  if (!allowedRoles.includes(userRole)) {
    throw new Error("PERMISSION_DENIED");
  }
  return true;
}

// Usage
authorizeRole(["admin"], profile.role); // Admin only
authorizeRole(["customer", "provider"], profile.role); // Customer or Provider
authorizeRole(["admin", "provider"], profile.role); // Admin or Provider
```

---

## 📱 UI Components by Role

### Shared Components (ใช้ได้ทุก Role)

- `LoadingState.vue`
- `ErrorBoundary.vue`
- `ToastContainer.vue`
- `OfflineIndicator.vue`

### Customer-Specific

- `src/components/customer/*`
- `src/views/customer/*`
- Layout: `AppShell.vue`

### Provider-Specific

- `src/components/provider/*`
- `src/views/provider/*`
- Layout: `ProviderLayout.vue`

### Admin-Specific

- `src/admin/components/*`
- `src/admin/views/*`
- Layout: `AdminLayout.vue`

---

## ✅ Pre-Commit Checklist

ก่อน commit ทุกครั้ง ต้องตอบคำถามเหล่านี้:

- [ ] **Customer**: ฟีเจอร์นี้กระทบ Customer หรือไม่? ถ้าใช่ ทำครบหรือยัง?
- [ ] **Provider**: ฟีเจอร์นี้กระทบ Provider หรือไม่? ถ้าใช่ ทำครบหรือยัง?
- [ ] **Admin**: ฟีเจอร์นี้ต้องมี Admin management หรือไม่?
- [ ] **RLS**: เพิ่ม RLS policies สำหรับทุก role ที่เกี่ยวข้องหรือยัง?
- [ ] **Routes**: เพิ่ม route พร้อม meta ที่ถูกต้องหรือยัง?
- [ ] **Navigation**: อัพเดท navigation/menu สำหรับ role ที่เกี่ยวข้องหรือยัง?

---

## 🚨 Common Mistakes to Avoid

```typescript
// ❌ ผิด: ไม่ตรวจสอบ role
const { data } = await supabase.from('rides').select('*');

// ✅ ถูก: ใช้ RLS หรือ filter ตาม role
const { data } = await supabase
  .from('rides')
  .select('*')
  .eq('customer_id', userId); // RLS จะ filter อีกชั้น

// ❌ ผิด: Hardcode role check
if (user.email === 'admin@example.com') { ... }

// ✅ ถูก: ใช้ role จาก database
if (profile.role === 'admin') { ... }

// ❌ ผิด: ไม่มี role-specific layout
<AppShell> // ใช้กับทุก role

// ✅ ถูก: ใช้ layout ตาม role
<AppShell v-if="isCustomer">
<ProviderLayout v-else-if="isProvider">
<AdminLayout v-else-if="isAdmin">
```

---

## 📝 Example: Adding New Feature

สมมติต้องเพิ่มฟีเจอร์ "Favorite Drivers":

### 1. Database

```sql
-- Table
CREATE TABLE favorite_drivers (...);

-- RLS for Customer (เพิ่ม/ลบ/ดู favorites ตัวเอง)
CREATE POLICY "customer_manage_favorites" ON favorite_drivers
FOR ALL USING (auth.uid() = customer_id);

-- RLS for Provider (ดูว่าใครเพิ่มตัวเองเป็น favorite)
CREATE POLICY "provider_view_fans" ON favorite_drivers
FOR SELECT USING (auth.uid() = provider_id);

-- RLS for Admin (ดูทั้งหมด)
CREATE POLICY "admin_view_all_favorites" ON favorite_drivers
FOR SELECT USING (is_admin());
```

### 2. Frontend

```
Customer: /customer/favorite-drivers (จัดการ favorites)
Provider: /provider/fans (ดูว่าใครชอบตัวเอง)
Admin: /admin/analytics (ดูสถิติ popular drivers)
```

### 3. API

```typescript
// Customer: เพิ่ม/ลบ favorite
// Provider: ดู fans count
// Admin: ดู analytics
```

---

**จำไว้: ทุกฟีเจอร์ต้องคิดถึง 3 มุมมอง - Customer, Provider, Admin**

---

## 📣 Response Format (บังคับ)

**ทุกครั้งที่ตอบคำถามหรือทำงาน ต้องระบุ Role Impact:**

```markdown
## 🎭 Role Impact Analysis

| Role        | ผลกระทบ  | Action Required |
| ----------- | -------- | --------------- |
| 👤 Customer | [อธิบาย] | [ต้องทำอะไร]    |
| 🚗 Provider | [อธิบาย] | [ต้องทำอะไร]    |
| 👑 Admin    | [อธิบาย] | [ต้องทำอะไร]    |
```

### ตัวอย่างการตอบ:

**คำสั่ง:** "เพิ่มฟีเจอร์ Favorite Drivers"

**Response:**

```
## 🎭 Role Impact Analysis

| Role | ผลกระทบ | Action Required |
|------|---------|-----------------|
| 👤 Customer | เพิ่ม/ลบคนขับโปรดได้ | สร้างหน้า /customer/favorite-drivers |
| 🚗 Provider | เห็นว่าใครเพิ่มตัวเองเป็น favorite | สร้างหน้า /provider/fans |
| 👑 Admin | ดูสถิติ popular drivers | เพิ่มใน Analytics Dashboard |

[ดำเนินการ...]
```
