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

| Event               | MCP Action                                           |
| ------------------- | ---------------------------------------------------- |
| สร้าง/แก้ไข table   | `list_tables` → `get_table_schema` → apply migration |
| เพิ่ม RLS policy    | `list_policies` → create policy                      |
| ตรวจสอบ schema      | `get_table_schema`                                   |
| Debug query         | `execute_sql`                                        |
| สร้าง Edge Function | `list_functions` → deploy                            |
| จัดการ Storage      | `list_buckets` → create/update                       |

### Workflow Template

```markdown
## เมื่อได้รับคำสั่งเกี่ยวกับ Database:

1. **Activate Power**
   kiroPowers(action="activate", powerName="supabase-local")

2. **ตรวจสอบ Schema ปัจจุบัน**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="list_tables")

3. **ดู Table Schema**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="get_table_schema",
   arguments={"table_name": "xxx"})

4. **Execute SQL (ถ้าจำเป็น)**
   kiroPowers(action="use", powerName="supabase-local",
   serverName="supabase", toolName="execute_sql",
   arguments={"query": "SELECT ..."})

5. **สร้าง Migration File**
   สร้างไฟล์ใน supabase/migrations/

6. **Apply Migration**
   executeBash: supabase db push
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

- [ ] ✅ Activate supabase-local หรือ supabase-hosted
- [ ] ✅ ตรวจสอบ schema ปัจจุบันด้วย `list_tables`
- [ ] ✅ ดู table schema ที่เกี่ยวข้อง
- [ ] ✅ ตรวจสอบ RLS policies ที่มีอยู่
- [ ] ✅ สร้าง migration file ที่ถูกต้อง
- [ ] ✅ ทดสอบ query ก่อน apply

## 🚨 Error Prevention

```typescript
// ❌ ห้ามทำ: เขียน SQL โดยไม่ตรวจสอบ schema
CREATE TABLE users (...);  // อาจซ้ำกับที่มีอยู่

// ✅ ต้องทำ: ตรวจสอบก่อนเสมอ
1. kiroPowers → list_tables
2. kiroPowers → get_table_schema (ถ้ามี)
3. สร้าง migration ที่ถูกต้อง
```

## 🔄 Auto-Sync Pattern

เมื่อแก้ไข database schema:

```bash
# 1. Apply migration
supabase db push

# 2. Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# 3. Restart dev server (ถ้าจำเป็น)
```

## 📝 Response Format

เมื่อทำงานกับ database ต้องแสดง:

```markdown
## 🔌 MCP Actions Performed:

1. ✅ Activated: supabase-local
2. ✅ Listed tables: [table1, table2, ...]
3. ✅ Checked schema: table_name
4. ✅ Created migration: XXX_description.sql
5. ✅ Applied: supabase db push

## 📊 Schema Changes:

- Added: column_name (type)
- Modified: ...
- RLS: policy_name
```
