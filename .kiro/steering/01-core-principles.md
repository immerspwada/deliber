# Core Principles - Thai Ride App

## 🎯 Fundamental Laws (ห้ามละเมิด)

### Law 1: Three-Role Completeness

```
ทุกฟีเจอร์ต้องครอบคลุม 3 Role พร้อมกัน:

┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER          PROVIDER           ADMIN                │
│  ─────────         ────────           ─────                │
│  สร้างคำสั่ง   →   รับงาน        →   เห็นในระบบ           │
│  ติดตามสถานะ  ←   อัพเดทสถานะ   →   ดูความคืบหน้า        │
│  รับบริการ    ←   จบงาน         →   เห็นสรุป             │
│  ให้คะแนน     →   รับคะแนน      →   ดูรีวิว              │
└─────────────────────────────────────────────────────────────┘
```

**Violation = Rejection** - ห้าม deploy ฟีเจอร์ที่ไม่ครบ 3 Role

### Law 2: Real Data Only

```
❌ FORBIDDEN:
- Mock data ใน production code
- Hardcoded arrays แทน DB query
- Fake users/providers/orders
- Demo credentials ใน production

✅ REQUIRED:
- Query จาก Supabase เท่านั้น
- Empty state เมื่อไม่มีข้อมูล
- Real user accounts
- Production credentials
```

### Law 3: Security First

```
Priority Order:
1. RLS Policies (ทุกตารางต้องมี)
2. Input Validation (ทุก endpoint)
3. Authentication Check (ทุก route)
4. Authorization Check (ตาม role)
5. Audit Logging (sensitive actions)
```

### Law 4: Thai Language Response

```
Agent ต้องตอบภาษาไทยเสมอ

ยกเว้น:
- Code snippets
- Technical terms (ไม่มีคำแปลที่เหมาะสม)
- File names
- Variable names
- System error messages
```

---

## 🏗️ Architectural Principles

### Principle 1: Dual-Role Architecture

```
1 User ID = Customer + Provider (optional)

users (ทุกคนเริ่มที่นี่)
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

### Principle 2: Status Flow Consistency

```
ทุก Service ใช้ Status Flow เดียวกัน:

pending → matched → pickup → in_progress → completed
    ↓         ↓         ↓          ↓
cancelled  cancelled  cancelled  cancelled (with conditions)
```

### Principle 3: Realtime Sync

```
ทุกการเปลี่ยนสถานะต้อง sync ทุกฝ่าย:

Customer App ←──── Supabase Realtime ────→ Provider App
                         ↑
                         │
                    Admin Dashboard
```

### Principle 4: Notification Completeness

```
เมื่อสถานะเปลี่ยน ต้องแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง:

Status Change → Push Notification (if enabled)
             → In-App Notification
             → Realtime Update
             → Admin Dashboard Update
```

---

## 📐 Design Patterns

### Pattern 1: Composable Structure

```typescript
// Standard Composable Pattern
export function useFeatureName() {
  // 1. State
  const data = ref<Type[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 2. Computed
  const computed = computed(() => ...)

  // 3. Methods
  async function fetchData() { ... }
  async function createItem() { ... }
  async function updateItem() { ... }
  async function deleteItem() { ... }

  // 4. Lifecycle
  onMounted(() => { ... })
  onUnmounted(() => { ... })

  // 5. Return
  return {
    data,
    loading,
    error,
    computed,
    fetchData,
    createItem,
    updateItem,
    deleteItem
  }
}
```

### Pattern 2: RLS Policy Structure

```sql
-- Standard RLS Pattern for each table

-- 1. Admin: Full Access
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- 2. Provider: Own Jobs Only
CREATE POLICY "provider_own_jobs" ON table_name
  FOR SELECT TO authenticated
  USING (provider_id = get_provider_id(auth.uid()));

-- 3. Customer: Own Data Only
CREATE POLICY "customer_own_data" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### Pattern 3: Error Handling

```typescript
// Standard Error Handling Pattern
try {
  const { data, error } = await supabase.from("table").select("*");

  if (error) throw error;
  return { success: true, data };
} catch (err) {
  console.error("[FeatureName] Error:", err);
  return { success: false, error: err.message };
}
```

---

## 🔄 State Machine Definitions

### Service Request States

```
┌─────────┐
│ pending │ ← Initial state
└────┬────┘
     │ provider accepts
     ▼
┌─────────┐
│ matched │
└────┬────┘
     │ provider arrives
     ▼
┌─────────┐
│ pickup  │
└────┬────┘
     │ service starts
     ▼
┌─────────────┐
│ in_progress │
└──────┬──────┘
       │ service completes
       ▼
┌───────────┐
│ completed │ ← Terminal state
└───────────┘

Any state → cancelled (with conditions)
```

### Provider Status States

```
┌─────────┐
│ pending │ ← After registration
└────┬────┘
     │ admin reviews
     ▼
┌──────────┬───────────┐
│ approved │ rejected  │
└────┬─────┴───────────┘
     │ provider goes online
     ▼
┌────────┐
│ active │ ←→ suspended (admin action)
└────────┘
```

---

## 📊 Role-Based Behavior Matrix

### Template for New Features

```
| Role     | Create | Read      | Update    | Delete    | Special Actions |
|:---------|:-------|:----------|:----------|:----------|:----------------|
| Admin    | ✅     | All       | All       | Soft only | Force, Override |
| Provider | ❌     | Own jobs  | Own jobs  | ❌        | Accept, Complete|
| Customer | ✅     | Own data  | Limited   | Cancel    | Rate, Review    |
| Guest    | ❌     | Public    | ❌        | ❌        | Track by ID     |
```

### Service-Specific Matrix

```
| Service  | Customer Action | Provider Type | Admin View        |
|:---------|:----------------|:--------------|:------------------|
| Ride     | สั่งรถ          | driver        | AdminRidesView    |
| Delivery | ส่งของ          | rider         | AdminDeliveryView |
| Shopping | ซื้อของ         | shopper       | AdminShoppingView |
| Queue    | จองคิว          | service_prov  | AdminQueueView    |
| Moving   | ขนย้าย          | mover         | AdminMovingView   |
| Laundry  | ซักผ้า          | laundry       | AdminLaundryView  |
```

---

## ✅ Checklist Templates

### New Feature Checklist

```
□ Database Layer
  □ Migration file created
  □ RLS policies for all roles
  □ Realtime enabled (if needed)
  □ Migration executed via MCP

□ Customer Side
  □ Composable created/updated
  □ View created
  □ Realtime subscription
  □ Push notification integration

□ Provider Side
  □ Composable created/updated
  □ View created
  □ Job acceptance flow
  □ Status update flow

□ Admin Side
  □ Composable created/updated
  □ View created
  □ Full CRUD capabilities
  □ Override capabilities

□ Cross-Role
  □ Notifications to all parties
  □ Realtime sync verified
  □ Status flow tested
```

### Security Checklist

```
□ RLS policies verified
□ Input validation complete
□ Authentication required
□ Authorization by role
□ Audit logging for sensitive actions
□ No secrets in frontend code
□ HTTPS only
```

---

## 🚫 Anti-Patterns (ห้ามทำ)

### Code Anti-Patterns

```typescript
// ❌ WRONG: Mock data
const users = [
  { id: 1, name: "Test User" },
  { id: 2, name: "Demo User" },
];

// ✅ CORRECT: Query from DB
const { data: users } = await supabase.from("users").select("*");
```

### Architecture Anti-Patterns

```
❌ Feature for Customer only (missing Provider + Admin)
❌ Direct DB access without RLS
❌ Hardcoded credentials
❌ Skipping migration execution
❌ Missing error handling
❌ No realtime sync for status changes
```

### Process Anti-Patterns

```
❌ Creating migration without executing
❌ Deploying without testing all roles
❌ Skipping security review
❌ Using demo data in production
❌ Responding in English (should be Thai)
```

---

## 📝 Documentation Standards

### Code Comments

```typescript
/**
 * Feature: F## - Feature Name
 * Tables: table1, table2
 * Migration: XXX_feature_name.sql
 *
 * @description Brief description
 * @roles Customer, Provider, Admin
 */
```

### Migration Comments

```sql
-- ============================================
-- Migration: XXX_feature_name.sql
-- Feature: F## - Feature Name
-- Date: YYYY-MM-DD
-- ============================================
-- Description: What this migration does
-- Tables: table1, table2
-- RLS: Yes/No
-- Realtime: Yes/No
-- ============================================
```

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
