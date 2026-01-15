---
inclusion: always
---

# 🔌 MCP Automation Rules

## ⚠️ MANDATORY: ต้องเรียกใช้ MCP ทุกครั้ง

เมื่อได้รับคำสั่งที่เกี่ยวข้องกับหัวข้อต่อไปนี้ **ต้อง activate และใช้ MCP Power ทันที**:

## 🗄️ Supabase MCP (supabase-local / supabase-hosted)

### Trigger Keywords

- database, table, column, migration, schema
- RLS, policy, security
- auth, user, session, login, signup
- storage, bucket, file, upload
- realtime, subscription, channel
- edge function, serverless
- query, insert, update, delete, select
- postgres, sql

### Auto-Actions

| Event               | MCP Action                                       |
| ------------------- | ------------------------------------------------ |
| สร้าง/แก้ไข table   | Read steering → `execute_sql` → create migration |
| เพิ่ม RLS policy    | Read steering → verify schema → create policy    |
| ตรวจสอบ schema      | `execute_sql` with SELECT query                  |
| Debug query         | `execute_sql`                                    |
| สร้าง Edge Function | Use CLI commands                                 |
| จัดการ Storage      | `execute_sql` on storage.buckets                 |

### Workflow Template

```markdown
## เมื่อได้รับคำสั่งเกี่ยวกับ Database:

1. **Activate Power & Read Steering**
   kiroPowers(action="activate", powerName="supabase-local")
   kiroPowers(action="readSteering", powerName="supabase-local",
   steeringFile="supabase-cli.md")
   kiroPowers(action="readSteering", powerName="supabase-local",
   steeringFile="supabase-local-database-workflow.md")

2. **ตรวจสอบ Schema ปัจจุบัน (ใช้ execute_sql)**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="execute_sql",
   arguments={"query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"})

3. **ดู Table Schema**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="execute_sql",
   arguments={"query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'xxx'"})

4. **ตรวจสอบ RLS Policies**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="execute_sql",
   arguments={"query": "SELECT \* FROM pg_policies WHERE tablename = 'xxx'"})

5. **สร้าง Migration File**
   สร้างไฟล์ใน supabase/migrations/ ตาม steering guide

6. **Apply Migration**
   executeBash: npx supabase db push --local
```

## 🎨 Figma MCP

### Trigger Keywords

- design, UI, mockup, layout
- component, frame, figma
- design system, style guide
- frontend, visual

### Auto-Actions

| Event                | MCP Action                |
| -------------------- | ------------------------- |
| สร้าง Component ใหม่ | ตรวจสอบ Figma design ก่อน |
| แก้ไข UI             | เทียบกับ design           |
| Design System        | sync กับ Figma            |

## 📋 Execution Checklist

ก่อนตอบคำถามที่เกี่ยวกับ database/backend:

- [ ] ✅ Activate supabase-local
- [ ] ✅ Read steering guides (cli, workflow, และ topic-specific)
- [ ] ✅ ตรวจสอบ schema ปัจจุบันด้วย `execute_sql`
- [ ] ✅ ตรวจสอบ table schema ที่เกี่ยวข้อง
- [ ] ✅ ตรวจสอบ RLS policies ที่มีอยู่
- [ ] ✅ ตรวจสอบ dual-role system (providers_v2.user_id)
- [ ] ✅ สร้าง migration file ที่ถูกต้อง
- [ ] ✅ ทดสอบ query ก่อน apply
- [ ] ✅ Run advisors (security, performance) ก่อน commit
- [ ] ✅ Generate types หลัง apply migration

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

## 🔄 Auto-Sync Pattern

เมื่อแก้ไข database schema:

```bash
# 1. Apply migration
npx supabase db push --local

# 2. Generate TypeScript types
npx supabase gen types --local > src/types/database.ts

# 3. Check advisors (security, performance)
# Use MCP execute_sql to check pg_stat_statements, pg_policies, etc.

# 4. Restart dev server (ถ้าจำเป็น)
```

## 🛠️ MCP Tools Available

### Note: Limited Tools in Local MCP

The local Supabase MCP server has **limited tools** compared to hosted. Most operations use:

1. **execute_sql** - Main tool for all database operations

   - Query schema: `SELECT * FROM information_schema.tables`
   - Check policies: `SELECT * FROM pg_policies`
   - Test queries: `SELECT * FROM table_name LIMIT 1`
   - Create/modify: Use for development iteration

2. **get_logs** - View Supabase logs

   - `api` logs: PostgREST endpoint failures, RLS issues
   - `postgres` logs: Slow queries, errors, connections

3. **get_advisors** - Check security and performance
   - `security`: RLS issues, exposed tables
   - `performance`: Missing indexes, slow queries

### CLI Commands (via executeBash)

```bash
# Schema management
npx supabase db diff --local              # See schema changes
npx supabase db push --local              # Apply migrations
npx supabase db reset --local             # Reset database
npx supabase migration list --local       # List migrations

# Type generation
npx supabase gen types --local > src/types/database.ts

# Status
npx supabase status                       # Check if running
npx supabase start                        # Start local stack
npx supabase stop                         # Stop local stack
```

## 📝 Response Format

เมื่อทำงานกับ database ต้องแสดง:

```markdown
## 🔌 MCP Actions Performed:

1. ✅ Activated: supabase-local
2. ✅ Read steering: supabase-cli.md, supabase-local-database-workflow.md, [topic].md
3. ✅ Checked schema: [tables checked]
4. ✅ Verified RLS: [policies checked]
5. ✅ Created migration: XXX_description.sql
6. ✅ Applied: npx supabase db push --local
7. ✅ Generated types: npx supabase gen types --local

## 📊 Schema Changes:

- Added: column_name (type)
- Modified: ...
- RLS: policy_name (fixed dual-role check)

## 🔍 Key Fixes:

- Fixed provider_id check to use providers_v2.user_id
- Added performance optimization with SELECT wrapper
- Verified security with advisors
```

## 🎯 Real-World Example: Storage Bucket RLS Fix

### Problem:

```
StorageApiError: new row violates RLS policy
POST /storage/v1/object/ride-evidence/... 403 (Forbidden)
```

### MCP Workflow:

1. **Activate & Read Steering**

```typescript
kiroPowers((action = "activate"), (powerName = "supabase-local"));
kiroPowers(
  (action = "readSteering"),
  (steeringFile = "supabase-prompts-database-rls-policies.md")
);
```

2. **Check Current Policies**

```sql
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%ride_evidence%';
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

```sql
-- ✅ New policy (works with dual-role)
USING (
  EXISTS (
    SELECT 1 FROM ride_requests rr
    INNER JOIN providers_v2 p ON p.id = rr.provider_id
    WHERE rr.id::text = (string_to_array(name, '/'))[1]
    AND p.user_id = auth.uid()
    AND p.status = 'approved'
  )
)
```

5. **Create Migration**

```bash
# Create file: supabase/migrations/269_ride_evidence_storage.sql
# Include DROP POLICY IF EXISTS and CREATE POLICY
```

6. **Apply & Verify**

```bash
npx supabase db push --local
npx supabase gen types --local > src/types/database.ts
```

### Result:

```
✅ POST /storage/.../ride-evidence/... 200 (OK)
✅ Image uploaded successfully
```
