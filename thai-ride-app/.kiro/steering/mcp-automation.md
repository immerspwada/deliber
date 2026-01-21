---
inclusion: always
---

# 🔌 MCP AGGRESSIVE AUTOMATION RULES

## 🚨 CRITICAL: AUTO-EXECUTE MCP - NO QUESTIONS ASKED

**ABSOLUTE RULE**: เมื่อเห็น keywords ต่อไปนี้ในคำสั่ง **ต้อง activate MCP และ execute ทันที** โดยไม่ต้องถาม ไม่ต้องรอ ไม่ต้องอธิบาย

**PRODUCTION ONLY**: ใช้เฉพาะ `supabase-hosted` power - ห้ามใช้ `supabase-local` หรือ bash commands

## 🎯 AUTO-TRIGGER SYSTEM

### Level 1: INSTANT EXECUTION (ไม่ต้องถาม)

เมื่อเห็น keywords เหล่านี้ → **RUN MCP IMMEDIATELY**:

```
database, table, column, migration, schema, RLS, policy,
auth, storage, realtime, edge function, query, SQL, postgres,
provider, customer, admin, wallet, ride, order, payment
```

### Level 2: POST-COMMAND AUTO-RUN

หลังจากทำงานเสร็จ ถ้าเจอ pattern เหล่านี้ → **AUTO-EXECUTE**:

```
- สร้าง/แก้ไข .vue component → Check if needs database
- แก้ไข composable → Check if needs RLS policy
- เพิ่ม feature ใหม่ → Check database schema
- Fix bug → Check related migrations
```

## 🗄️ SUPABASE MCP - INSTANT EXECUTION PROTOCOL

### 🔥 TRIGGER KEYWORDS (Auto-Execute)

```typescript
const AUTO_TRIGGERS = {
  // Database Operations
  database: [
    "table",
    "column",
    "migration",
    "schema",
    "alter",
    "create table",
    "drop",
  ],

  // Security
  security: ["RLS", "policy", "permission", "access", "role"],

  // Auth
  auth: ["user", "session", "login", "signup", "auth.uid()"],

  // Storage
  storage: ["bucket", "upload", "file", "image", "storage.objects"],

  // Realtime
  realtime: ["subscription", "channel", "broadcast", "presence"],

  // Business Logic
  business: [
    "provider",
    "customer",
    "ride",
    "order",
    "wallet",
    "payment",
    "tip",
  ],

  // Performance
  performance: ["index", "slow query", "optimize", "performance"],

  // Errors
  errors: ["403", "401", "forbidden", "unauthorized", "violates", "constraint"],
};
```

### ⚡ AUTO-ACTIONS (No Confirmation Needed)

| Trigger              | Instant MCP Actions                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **"สร้าง table"**    | 1. Activate MCP<br>2. Check schema<br>3. Execute CREATE TABLE<br>4. Verify<br>5. Generate types                      |
| **"แก้ไข column"**   | 1. Activate MCP<br>2. Check current schema<br>3. Execute ALTER TABLE<br>4. Verify + Generate types                   |
| **"เพิ่ม RLS"**      | 1. Activate MCP<br>2. Check existing policies<br>3. Verify dual-role system<br>4. Execute CREATE POLICY<br>5. Verify |
| **"403 error"**      | 1. Activate MCP<br>2. Check RLS policies<br>3. Check dual-role joins<br>4. Fix policy<br>5. Execute                  |
| **"storage upload"** | 1. Activate MCP<br>2. Check bucket policies<br>3. Fix RLS with dual-role<br>4. Execute                               |
| **"slow query"**     | 1. Activate MCP<br>2. Check indexes<br>3. Execute CREATE INDEX<br>4. Verify                                          |
| **"migration"**      | 1. Activate MCP<br>2. Verify schema<br>3. Execute SQL<br>4. **AUTO-VERIFY**                                          |

### 🤖 AUTOMATED WORKFLOW (Zero Human Intervention)

```typescript
// BEFORE (Manual - ❌ BAD)
User: "สร้าง table tips"
Agent: "คุณต้องการให้ฉันสร้าง migration ไหม?"
User: "ใช่"
Agent: "ให้ฉัน apply migration ไหม?"
User: "ใช่"
// 😤 TOO MANY STEPS!

// AFTER (Auto - ✅ GOOD)
User: "สร้าง table tips"
Agent: [INSTANT EXECUTION]
  ✅ Activated: supabase-hosted
  ✅ Checked: current schema
  ✅ Executed: CREATE TABLE tips (...)
  ✅ Verified: Table created
  ✅ Generated: types
  ✅ Done in 5 seconds!
```

### 📋 MANDATORY EXECUTION SEQUENCE

**EVERY database-related command MUST follow this sequence:**

```markdown
## 1. INSTANT ACTIVATION (0.5s)

kiroPowers(action="activate", powerName="supabase-hosted")

## 2. SCHEMA VERIFICATION (1s)

execute_sql: SELECT table_name FROM information_schema.tables
execute_sql: SELECT column_name FROM information_schema.columns WHERE table_name = 'xxx'
execute_sql: SELECT \* FROM pg_policies WHERE tablename = 'xxx'

## 3. DUAL-ROLE CHECK (0.5s)

execute_sql: SELECT \* FROM providers_v2 LIMIT 1
// Verify user_id column exists

## 4. EXECUTE CHANGE (2s)

execute_sql: ALTER TABLE ... / CREATE POLICY ... / CREATE FUNCTION ...

## 5. VERIFY (1s)

execute_sql: Test query to verify changes

## 6. GENERATE TYPES (Optional - 2s)

generate_types: Update TypeScript types if schema changed

TOTAL TIME: ~5-7 seconds ⚡
```

## 🎨 FIGMA MCP - AUTO DESIGN SYNC

### Trigger Keywords (Auto-Execute)

```
design, UI, mockup, layout, component, frame, figma,
design system, style guide, frontend, visual, colors, spacing
```

### Auto-Actions

| Event                 | Instant MCP Actions                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **"สร้าง component"** | 1. Activate Figma MCP<br>2. Check design file<br>3. Extract styles<br>4. Generate component<br>5. Apply design tokens |
| **"แก้ไข UI"**        | 1. Activate Figma MCP<br>2. Compare with design<br>3. Sync changes<br>4. Update component                             |
| **"design system"**   | 1. Activate Figma MCP<br>2. Extract all tokens<br>3. Generate CSS variables<br>4. Update Tailwind config              |

## 🔄 POST-COMMAND AUTO-EXECUTION

### Pattern Detection & Auto-Run

```typescript
// After ANY command completion, check these patterns:

const POST_COMMAND_CHECKS = {
  // Component created → Check database needs
  "*.vue created": async () => {
    if (hasDataFetching) {
      await autoExecuteMCP("check-schema");
      await autoExecuteMCP("verify-rls");
    }
  },

  // Composable modified → Check RLS
  "composables/*.ts modified": async () => {
    if (hasSupabaseQuery) {
      await autoExecuteMCP("check-rls-policies");
      await autoExecuteMCP("verify-dual-role");
    }
  },

  // Migration created → Auto apply
  "migrations/*.sql created": async () => {
    await autoExecuteMCP("apply-migration");
    await autoExecuteMCP("generate-types");
    await autoExecuteMCP("verify-advisors");
  },

  // Error mentioned → Auto diagnose
  "error: 403|401|violates": async () => {
    await autoExecuteMCP("check-rls");
    await autoExecuteMCP("check-dual-role");
    await autoExecuteMCP("fix-policy");
  },
};
```

## 📊 EXECUTION METRICS

Track and report MCP execution speed:

```markdown
## ⚡ MCP Execution Report:

| Action           | Time     | Status |
| ---------------- | -------- | ------ |
| Activate MCP     | 0.5s     | ✅     |
| Load Steering    | 1.0s     | ✅     |
| Check Schema     | 0.8s     | ✅     |
| Create Migration | 2.0s     | ✅     |
| Apply Migration  | 1.5s     | ✅     |
| Generate Types   | 1.2s     | ✅     |
| Verify Security  | 0.8s     | ✅     |
| **TOTAL**        | **7.8s** | ✅     |

🎯 Target: < 10s | Actual: 7.8s | Performance: 🔥 EXCELLENT
```

## 📋 PRE-EXECUTION CHECKLIST (Auto-Verify)

**BEFORE any database operation, AUTO-CHECK:**

```typescript
const PRE_EXECUTION_CHECKS = {
  "✅ MCP Activated": "supabase-local",
  "✅ Steering Loaded": ["cli", "workflow", "rls", "dual-role"],
  "✅ Schema Verified": "information_schema checked",
  "✅ Dual-Role System": "providers_v2.user_id verified",
  "✅ RLS Policies": "existing policies checked",
  "✅ Performance": "indexes verified",
  "✅ Security": "advisors checked",
};

// If ANY check fails → Auto-fix before proceeding
```

## 🚨 ERROR AUTO-RECOVERY

### Automatic Error Detection & Fix

```typescript
const ERROR_PATTERNS = {
  // RLS Violation
  "violates row-level security": async () => {
    await autoExecuteMCP("check-rls-policies");
    await autoExecuteMCP("verify-dual-role-join");
    await autoExecuteMCP("create-fix-migration");
    await autoExecuteMCP("apply-migration");
    return "Fixed RLS policy with dual-role check";
  },

  // Storage 403
  "StorageApiError.*403": async () => {
    await autoExecuteMCP("check-storage-policies");
    await autoExecuteMCP("fix-bucket-rls");
    await autoExecuteMCP("apply-migration");
    return "Fixed storage bucket RLS";
  },

  // Missing Column
  "column.*does not exist": async () => {
    await autoExecuteMCP("check-schema");
    await autoExecuteMCP("create-alter-migration");
    await autoExecuteMCP("apply-migration");
    await autoExecuteMCP("generate-types");
    return "Added missing column";
  },

  // Slow Query
  "execution time > 1000ms": async () => {
    await autoExecuteMCP("run-performance-advisor");
    await autoExecuteMCP("create-index-migration");
    await autoExecuteMCP("apply-migration");
    return "Added performance index";
  },
};
```

## 🚨 Error Prevention & Common Pitfalls

### 1. Dual-Role System (providers_v2)

```sql
-- ❌ ห้ามทำ: ตรวจสอบ provider_id โดยตรง
CREATE POLICY "provider_access" ON table_name
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());  -- ผิด! provider_id ไม่ใช่ auth.uid()

-- ✅ ต้องทำ: ตรวจสอบผ่าน providers_v2.user_id
CREATE POLICY "provider_access" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = table_name.provider_id
      AND providers_v2.user_id = auth.uid()
    )
  );
```

**เหตุผล**: ระบบใช้ dual-role architecture:

- `auth.uid()` = User ID (จาก auth.users)
- `provider_id` = Provider ID (จาก providers_v2.id)
- ต้อง JOIN ผ่าน `providers_v2.user_id` เสมอ

### 2. Storage Bucket RLS

```sql
-- ❌ ห้ามทำ: ตรวจสอบ provider_id โดยตรง
CREATE POLICY "provider_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()  -- ผิด!
    )
  );

-- ✅ ต้องทำ: JOIN ผ่าน providers_v2
CREATE POLICY "provider_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = auth.uid()
      AND p.status = 'approved'
    )
  );
```

### 3. Schema Verification

```typescript
// ❌ ห้ามทำ: เขียน SQL โดยไม่ตรวจสอบ schema
CREATE TABLE users (...);  // อาจซ้ำกับที่มีอยู่

// ✅ ต้องทำ: ตรวจสอบก่อนเสมอ
1. kiroPowers → execute_sql (SELECT table_name FROM information_schema.tables)
2. kiroPowers → execute_sql (SELECT column_name FROM information_schema.columns)
3. อ่าน steering guide ที่เกี่ยวข้อง
4. สร้าง migration ที่ถูกต้อง
```

### 4. RLS Policy Performance

```sql
-- ❌ ช้า: ไม่ใช้ select wrapper
CREATE POLICY "slow_policy" ON table_name
  USING (auth.uid() = user_id);

-- ✅ เร็ว: ใช้ select wrapper (caches result)
CREATE POLICY "fast_policy" ON table_name
  USING ((SELECT auth.uid()) = user_id);
```

## 🔄 AUTO-SYNC PATTERN (Zero Manual Steps)

### After Schema Changes - AUTO-EXECUTE:

```typescript
// 1. Execute change directly on production (AUTO - NO CONFIRMATION)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: "ALTER TABLE ...",
  },
});

// 2. Generate types (AUTO)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "generate_types",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
  },
});

// 3. Verify (AUTO)
await execute_sql("SELECT * FROM ...");

// 4. Report (AUTO)
log("✅ Schema updated");
log("✅ Types generated");
log("✅ Verified");
```

### Migration Naming Convention (NOT NEEDED FOR PRODUCTION)

```typescript
// ❌ OLD WAY: Create migration files
// Migration files are NOT needed when working directly with production

// ✅ NEW WAY: Execute directly
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: "ALTER TABLE ...",
  },
});
```

## 🛠️ MCP TOOLS - INSTANT USAGE

### execute_sql - Main Workhorse (AUTO-EXECUTE)

```typescript
// Auto-execute for ALL database operations:

// 1. Schema Discovery (AUTO)
await execute_sql(`
  SELECT table_name, table_type 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name
`);

// 2. Column Check (AUTO)
await execute_sql(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = '${tableName}'
  ORDER BY ordinal_position
`);

// 3. RLS Policies (AUTO)
await execute_sql(`
  SELECT schemaname, tablename, policyname, 
         permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = '${tableName}'
`);

// 4. Dual-Role Verification (AUTO)
await execute_sql(`
  SELECT column_name 
  FROM information_schema.columns
  WHERE table_name = 'providers_v2' 
  AND column_name = 'user_id'
`);

// 5. Performance Check (AUTO)
await execute_sql(`
  SELECT schemaname, tablename, indexname, indexdef
  FROM pg_indexes
  WHERE tablename = '${tableName}'
`);
```

### get_logs - Auto-Diagnose

```typescript
// Auto-check logs on errors (if available):

// API logs (RLS issues)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "get_logs",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    type: "api",
    limit: 50,
  },
});
```

### get_advisors - Auto-Security

```typescript
// Auto-run after every change (if available):

// Security check
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "get_advisors",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    type: "security",
  },
});
```

### NO CLI Commands - Use MCP Only

```typescript
// ❌ NEVER USE THESE
executeBash("npx supabase db push");
executeBash("npx supabase gen types");
executeBash("npx supabase start");

// ✅ ALWAYS USE MCP
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { project_id: "onsflqhkgqhydeupiqyt", query: "..." },
});
```

## 🎯 COMPLETE AUTO-WORKFLOW EXAMPLE

### User Command: "เพิ่ม column tip_amount ใน ride_requests"

```typescript
// INSTANT AUTO-EXECUTION (No questions, no waiting)

// Step 1: Activate MCP (0.5s)
await kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// Step 2: Check Current Schema (0.8s)
const schema = await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ride_requests'
    `,
  },
});

// Step 3: Verify No Conflicts (0.2s)
if (schema.some((col) => col.column_name === "tip_amount")) {
  throw new Error("Column already exists");
}

// Step 4: Execute ALTER TABLE (1.5s)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      ALTER TABLE ride_requests 
      ADD COLUMN tip_amount DECIMAL(10,2) DEFAULT 0 CHECK (tip_amount >= 0);
    `,
  },
});

// Step 5: AUTO-VERIFY (0.5s)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: "SELECT tip_amount FROM ride_requests LIMIT 1",
  },
});

// Step 6: AUTO-GENERATE Types (2s)
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "generate_types",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
  },
});

// TOTAL: 5.5 seconds ⚡
// Result: Column added, types generated, verified - ALL AUTOMATIC!
```

## 📝 Response Format

เมื่อทำงานกับ database ต้องแสดง:

```markdown
## 🔌 MCP Actions Performed:

1. ✅ Activated: supabase-hosted
2. ✅ Checked schema: [tables checked]
3. ✅ Verified RLS: [policies checked]
4. ✅ Executed: ALTER TABLE / CREATE POLICY / CREATE FUNCTION
5. ✅ Verified: Changes applied successfully
6. ✅ Generated types: TypeScript types updated

## 📊 Schema Changes:

- Added: column_name (type)
- Modified: ...
- RLS: policy_name (fixed dual-role check)

## 🔍 Key Fixes:

- Fixed provider_id check to use providers_v2.user_id
- Added performance optimization with SELECT wrapper
- Verified security
```

## 🎯 Real-World Example: Storage Bucket RLS Fix

### Problem:

```
StorageApiError: new row violates RLS policy
POST /storage/v1/object/ride-evidence/... 403 (Forbidden)
```

### MCP Workflow:

1. **Activate MCP**

```typescript
await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
```

2. **Check Current Policies**

```typescript
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      SELECT * FROM pg_policies
      WHERE tablename = 'objects'
      AND policyname LIKE '%ride_evidence%'
    `,
  },
});
```

3. **Identify Issue**

```sql
-- ❌ Old policy (broken for dual-role)
USING (
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE id::text = (string_to_array(name, '/'))[1]
    AND provider_id = auth.uid()  -- ผิด!
  )
)
```

4. **Fix with Dual-Role Check**

```typescript
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      DROP POLICY IF EXISTS "provider_upload" ON storage.objects;
      
      CREATE POLICY "provider_upload" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'ride-evidence' AND
        EXISTS (
          SELECT 1 FROM ride_requests rr
          INNER JOIN providers_v2 p ON p.id = rr.provider_id
          WHERE rr.id::text = (string_to_array(name, '/'))[1]
          AND p.user_id = auth.uid()
          AND p.status = 'approved'
        )
      );
    `,
  },
});
```

5. **Verify**

```typescript
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      SELECT * FROM pg_policies
      WHERE tablename = 'objects'
      AND policyname = 'provider_upload'
    `,
  },
});
```

### Result:

```
✅ POST /storage/.../ride-evidence/... 200 (OK)
✅ Image uploaded successfully
```
