# Thai Ride App - Complete Agent Steering System

## 🎯 Project Overview

**โปรเจค**: Thai Ride App - Multi-Role Super App Platform  
**เทคโนโลยี**: Vue 3 + TypeScript + Supabase + Vercel  
**บทบาท**: Customer (42 routes) + Provider (24 routes) + Admin (123 routes)  
**ฟีเจอร์**: 200+ features (F01-F251+)  
**ตาราง**: 100+ tables  
**บริการ**: 6 services (Ride, Delivery, Shopping, Queue, Moving, Laundry)

---

## 🚨 CRITICAL LAWS (P0 - ห้ามละเมิด)

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

### Law 2: No Mock Data Policy
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

### Law 3: Migration Auto-Execute
```
เมื่อสร้าง migration → ต้อง execute ทันทีผ่าน MCP Supabase
ห้ามสร้างแล้วไม่ run

MANDATORY: Execute via MCP Supabase immediately after creation
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

### Law 5: Production-First Development
```
⚠️ ทุกการพัฒนาต้องคำนึงถึง Production เป็นหลัก ไม่ใช่ Local

Development Mindset:
├── ❌ "ทำให้ทำงานได้ก่อน แล้วค่อยแก้ทีหลัง"
├── ✅ "ทำให้ Production-Ready ตั้งแต่แรก"
└── ✅ "ถ้าไม่พร้อม Production ก็ไม่ควร commit"
```

---

## 🏗️ System Architecture

### Dual-Role User System
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

### Status Flow Consistency
```
ทุก Service ใช้ Status Flow เดียวกัน:

pending → matched → pickup → in_progress → completed
    ↓         ↓         ↓          ↓
cancelled  cancelled  cancelled  cancelled (with conditions)
```

### Route Architecture
```
Total: 197 Routes
├── Public:   8 routes  (4.1%)
├── Customer: 42 routes (21.3%)
├── Provider: 24 routes (12.2%)
└── Admin:    123 routes (62.4%)

Route Patterns:
/                       → Customer Home (redirect)
/login                  → Public Login
/register               → Public Register
/customer/*             → Customer Routes (auth required)
/provider/*             → Provider Routes (approved provider required)
/provider/onboarding    → Provider Onboarding (auth required, any user)
/admin/*                → Admin Routes (admin role required)
/admin/login            → Admin Login (separate auth)
/track/:id              → Public Tracking (no auth)
```

---

## 🔐 Security & RLS Policies

### Security Hierarchy (P0-P3)
```
Priority Order (P0 = Highest):

P0: Data Protection
├── RLS Policies (mandatory)
├── Input Validation
└── SQL Injection Prevention

P1: Authentication
├── JWT Validation
├── Session Management
└── Token Expiry

P2: Authorization
├── Role-Based Access
├── Resource Ownership
└── Admin Override

P3: Audit & Compliance
├── Action Logging
├── Data Retention
└── PDPA Compliance
```

### Mandatory RLS Pattern
```sql
-- Every table MUST have RLS enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Standard 3-Layer Policy Structure:

-- Layer 1: Admin Full Access
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Layer 2: Provider Access (if applicable)
CREATE POLICY "provider_access" ON table_name
  FOR SELECT TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM service_providers
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Layer 3: Customer Access
CREATE POLICY "customer_own_data" ON table_name
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Forbidden Actions
```typescript
// ❌ NEVER: Expose service_role key in frontend
const supabase = createClient(url, SERVICE_ROLE_KEY)

// ❌ NEVER: Log sensitive data
console.log('Password:', password)

// ❌ NEVER: Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

// ❌ NEVER: Use raw SQL with user input
const query = `SELECT * FROM users WHERE id = '${userId}'`
```

---

## 🔧 Development Standards

### Migration Workflow (MANDATORY)
```typescript
// Step 1: Create migration file
// supabase/migrations/XXX_feature_name.sql

// Step 2: Execute via MCP (MANDATORY)
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { sql: "..." }
});

// Step 3: Verify success
// Check for errors in response
// If error, fix and re-execute
```

### Standard Composable Pattern
```typescript
/**
 * Feature: F## - Feature Name
 * Tables: table1, table2
 * Migration: XXX_feature_name.sql
 */
export function useFeatureName() {
  // 1. Dependencies
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  // 2. State
  const data = ref<FeatureType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 3. Computed
  const isEmpty = computed(() => data.value.length === 0);

  // 4. Core Methods
  async function fetchData() {
    loading.value = true;
    error.value = null;
    try {
      const { data: result, error: err } = await supabase
        .from("table_name")
        .select("*")
        .eq("user_id", user.value?.id);

      if (err) throw err;
      data.value = result ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      console.error("[useFeatureName] fetchData error:", err);
    } finally {
      loading.value = false;
    }
  }

  // 5. Return
  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    fetchData,
  };
}
```

### Error Handling Pattern
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

// User-Friendly Error Messages
const ERROR_MESSAGES: Record<string, string> = {
  PGRST116: "ไม่พบข้อมูลที่ต้องการ",
  PGRST301: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
  "23505": "ข้อมูลนี้มีอยู่แล้วในระบบ",
  default: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
};
```

---

## 🎨 MUNEEF Design System

### Color System
```css
:root {
  /* Primary Colors */
  --color-primary: #00a86b; /* Green - Main accent */
  --color-primary-hover: #008f5b; /* Dark Green */
  --color-primary-light: #e8f5ef; /* Light Green */

  /* Text Colors */
  --color-text-primary: #1a1a1a; /* Near Black */
  --color-text-secondary: #666666; /* Gray */
  --color-text-muted: #999999; /* Light Gray */

  /* Background Colors */
  --color-bg-primary: #ffffff; /* White */
  --color-bg-secondary: #f5f5f5; /* Off White */

  /* Border Colors */
  --color-border: #e8e8e8; /* Light Gray */
  --color-border-focus: #00a86b; /* Green */
}
```

### Component Standards
```css
/* Primary Button */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border-radius: 14px;
  padding: 16px 24px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,168,107,0.3);
  min-height: 44px; /* Touch-friendly */
}

/* Card */
.card {
  background-color: var(--color-bg-primary);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

/* Input */
.input {
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
}

.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
}
```

### 🚫 CRITICAL: No Emoji Rule
```vue
<!-- ❌ WRONG: Never use emoji -->
<span>🚗</span>
<span>📍</span>

<!-- ✅ CORRECT: Always use SVG -->
<svg class="icon" viewBox="0 0 24 24">...</svg>
<IconCar class="icon" />
```

---

## 📊 Feature Registry System

### Feature ID Categories
```
F01-F10   → Core Features (Auth, Ride, Delivery, Shopping, Wallet)
F11-F26   → Extended Features (History, Chat, Safety, Admin)
F27-F50   → Provider Features (Earnings, Performance, Incentives)
F51-F100  → UI Components (Buttons, Cards, Modals)
F156-F170 → New Services (Queue, Moving, Laundry, Loyalty)
F172-F201 → Performance (Optimization, Caching)
F202-F251 → Advanced System (Feature Flags, A/B Testing, Analytics)
```

### Core Tables
```sql
-- User Management
users                    -- All users (customers by default)
service_providers        -- Provider profiles (linked to users)

-- Service Requests
ride_requests           -- Ride bookings
delivery_requests       -- Delivery orders
shopping_requests       -- Shopping orders
queue_bookings          -- Queue reservations
moving_requests         -- Moving services
laundry_requests        -- Laundry services

-- Financial
user_wallets            -- Wallet balances
wallet_transactions     -- Transaction history
topup_requests          -- Top-up requests
provider_withdrawals    -- Provider withdrawals

-- Notifications
user_notifications      -- In-app notifications
push_subscriptions      -- Push notification subscriptions

-- System
admin_audit_log         -- Admin action logs
analytics_events        -- Analytics data
```

---

## 📋 Standard Workflows

### Workflow A: สร้างฟีเจอร์ใหม่
```
1. Design Phase
   ├── Create Role-Based Behavior Matrix (Customer/Provider/Admin)
   ├── Define Status Flow
   └── Identify affected tables/composables

2. Database Phase
   ├── Create migration file
   ├── Define RLS policies
   ├── Execute via MCP Supabase (MANDATORY)
   └── Verify execution success

3. Frontend Phase
   ├── Create/update composables
   ├── Create Customer views
   ├── Create Provider views
   ├── Create Admin views
   └── Add realtime subscriptions

4. Integration Phase
   ├── Add notifications
   ├── Test cross-role sync
   └── Verify all roles work

5. Verification Phase
   ├── Test as Customer
   ├── Test as Provider
   ├── Test as Admin
   └── Test edge cases
```

### Role-Based Behavior Matrix Template
```
| Role     | Create | Read      | Update    | Delete    | Special Actions |
|:---------|:-------|:----------|:----------|:----------|:----------------|
| Admin    | ✅     | All       | All       | Soft only | Force, Override |
| Provider | ❌     | Own jobs  | Own jobs  | ❌        | Accept, Complete|
| Customer | ✅     | Own data  | Limited   | Cancel    | Rate, Review    |
| Guest    | ❌     | Public    | ❌        | ❌        | Track by ID     |
```

---

## 🎯 Decision Matrix (Priority Order)

| Priority | Category       | Rule                                               |
|:---------|:---------------|:---------------------------------------------------|
| **P0**   | Security       | ห้ามละเมิด RLS, ห้าม expose secrets                |
| **P1**   | Data Integrity | ห้ามใช้ mock data, ต้อง query จาก DB จริง          |
| **P2**   | Cross-Role     | ทุกฟีเจอร์ต้องครอบคลุม Customer + Provider + Admin |
| **P3**   | Production     | ทุกอย่างต้อง production-ready                      |
| **P4**   | UX             | ใช้ MUNEEF Design System                           |
| **P5**   | Performance    | Optimize ตาม guidelines                            |

---

## ✅ Production-Ready Checklist

### Before Every Deploy
```
□ Database Layer
  □ Migration executed via MCP Supabase
  □ RLS policies for all roles
  □ Realtime enabled (if needed)

□ Customer Side
  □ Composable created/updated
  □ View created
  □ Empty states implemented

□ Provider Side
  □ Composable created/updated
  □ View created
  □ Job acceptance flow

□ Admin Side
  □ Composable created/updated
  □ View created
  □ Full CRUD capabilities

□ Cross-Role
  □ Notifications to all parties
  □ Realtime sync verified
  □ All roles tested

□ Code Quality
  □ No console.log statements (except DEV mode)
  □ Error handling complete
  □ Loading states implemented
  □ Thai language messages
  □ Mobile responsive

□ Security
  □ RLS policies verified
  □ Input validation complete
  □ No secrets in frontend code
```

---

## 🚫 Anti-Patterns (ห้ามทำ)

### Code Anti-Patterns
```typescript
// ❌ WRONG: Mock data
const users = [{ id: 1, name: "Test User" }];

// ✅ CORRECT: Query from DB
const { data: users } = await supabase.from("users").select("*");

// ❌ WRONG: Using emoji
<span>🚗</span>

// ✅ CORRECT: Using SVG
<IconCar class="w-6 h-6" />
```

### Architecture Anti-Patterns
```
❌ Feature for Customer only (missing Provider + Admin)
❌ Direct DB access without RLS
❌ Hardcoded credentials
❌ Skipping migration execution
❌ Using emoji instead of SVG icons
❌ Responding in English (should be Thai)
```

---

## 🔧 MCP Commands Quick Reference

```typescript
// Activate Supabase Power
kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// Execute Migration
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { sql: "..." }
});

// List Tables
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "list_tables",
  arguments: { project_id: "onsflqhkgqhydeupiqyt", schemas: ["public"] }
});
```

---

## 🚨 Incident Response

### Severity Levels
```
P1 - CRITICAL (Response: < 15 min):
├── Complete system outage
├── Data breach or security incident
├── Payment system failure
└── Authentication bypass

P2 - HIGH (Response: < 1 hour):
├── Major feature broken
├── Performance degradation > 50%
└── Partial data access issues

P3 - MEDIUM (Response: < 4 hours):
├── Minor feature issues
├── UI bugs affecting UX
└── Non-critical errors

P4 - LOW (Response: < 24 hours):
├── Cosmetic issues
├── Documentation errors
└── Minor improvements
```

---

**สรุป**: ระบบ Agent Steering นี้ครอบคลุมทุกแง่มุมของการพัฒนา Thai Ride App ตั้งแต่หลักการพื้นฐาน, สถาปัตยกรรม, การพัฒนา, ความปลอดภัย, การออกแบบ UI, จนถึงการ deploy production พร้อมกฎเกณฑ์ที่ชัดเจนและ checklist ที่ครบถ้วน

**Version**: 2.1.0  
**Last Updated**: January 13, 2026