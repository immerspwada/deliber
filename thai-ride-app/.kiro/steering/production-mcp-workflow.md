# 🚀 Production MCP Workflow

## 🎯 CRITICAL RULE: Always Work with Production

**ABSOLUTE REQUIREMENT**: ทุกคำสั่งที่เกี่ยวกับ database ต้องทำงานกับ **Production Database** โดยตรง ผ่าน MCP

**NO LOCAL DATABASE**: ห้ามใช้ `supabase-local`, `npx supabase db push`, หรือ bash commands ใดๆ - ใช้เฉพาะ `supabase-hosted` MCP power เท่านั้น

## 🔌 MCP Configuration for Production

### Setup Required

1. **Supabase Hosted MCP** (NOT Local)
   - Power: `supabase-hosted`
   - Connects to: Production Supabase Cloud (https://onsflqhkgqhydeupiqyt.supabase.co)
   - Requires: Project ID (`onsflqhkgqhydeupiqyt`) + Service Role Key

2. **MCP Power Activation**

   ```typescript
   // ALWAYS use supabase-hosted for production
   await kiroPowers({
     action: "activate",
     powerName: "supabase-hosted",
   });

   // Then use execute_sql with project_id
   await kiroPowers({
     action: "use",
     powerName: "supabase-hosted",
     serverName: "supabase",
     toolName: "execute_sql",
     arguments: {
       project_id: "onsflqhkgqhydeupiqyt",
       query: "SELECT ...",
     },
   });
   ```

## 🔄 Automated Workflow (Zero Manual Steps)

### Pattern 1: Database Schema Changes

```typescript
// User: "เพิ่ม column tip_amount"

// Agent AUTO-EXECUTES:
1. kiroPowers({ action: "activate", powerName: "supabase-hosted" })
2. kiroPowers({
     action: "use",
     powerName: "supabase-hosted",
     serverName: "supabase",
     toolName: "execute_sql",
     arguments: {
       project_id: "onsflqhkgqhydeupiqyt",
       query: "ALTER TABLE ride_requests ADD COLUMN tip_amount DECIMAL(10,2)"
     }
   })
3. kiroPowers({
     action: "use",
     powerName: "supabase-hosted",
     serverName: "supabase",
     toolName: "execute_sql",
     arguments: {
       project_id: "onsflqhkgqhydeupiqyt",
       query: "SELECT column_name FROM information_schema.columns WHERE table_name='ride_requests'"
     }
   })
4. kiroPowers({
     action: "use",
     powerName: "supabase-hosted",
     serverName: "supabase",
     toolName: "generate_types",
     arguments: {
       project_id: "onsflqhkgqhydeupiqyt"
     }
   })

// Result: ✅ Done in 8 seconds, no manual steps!
```

### Pattern 2: RLS Policy Changes

```typescript
// User: "แก้ไข RLS policy สำหรับ admin"

// Agent AUTO-EXECUTES:
1. kiroPowers({ action: "activate", powerName: "supabase-hosted" })
2. execute_sql("SELECT * FROM pg_policies WHERE tablename='users'")
3. execute_sql("DROP POLICY IF EXISTS 'admin_access' ON users")
4. execute_sql("CREATE POLICY 'admin_access' ON users FOR ALL USING (...)")

// Result: ✅ Policy updated, verified, done!
```

### Pattern 3: Function Creation/Update

```typescript
// User: "สร้าง function admin_get_customers"

// Agent AUTO-EXECUTES:
1. kiroPowers({ action: "activate", powerName: "supabase-hosted" })
2. execute_sql("CREATE OR REPLACE FUNCTION admin_get_customers(...) ...")
3. execute_sql("GRANT EXECUTE ON FUNCTION admin_get_customers TO authenticated")
4. execute_sql("SELECT * FROM admin_get_customers(NULL, NULL, 10, 0)") // Test

// Result: ✅ Function created, tested, verified!
```

## 🚨 NEVER DO THESE (Old Way)

### ❌ DON'T: Create SQL files for user to copy

```typescript
// ❌ BAD
fsWrite("fix-admin-access.sql", sqlContent);
log("Copy this SQL to Supabase Dashboard...");

// ✅ GOOD
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: sqlContent,
  },
});
log("✅ Executed successfully!");
```

### ❌ DON'T: Use local Supabase or bash commands

```typescript
// ❌ BAD - NEVER DO THIS
executeBash("npx supabase start");
executeBash("npx supabase db push --local");
executeBash("npx supabase db push");
kiroPowers({ action: "activate", powerName: "supabase-local" });

// ✅ GOOD - ALWAYS DO THIS
kiroPowers({ action: "activate", powerName: "supabase-hosted" });
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { project_id: "onsflqhkgqhydeupiqyt", query: "..." },
});
```

### ❌ DON'T: Ask for confirmation

```typescript
// ❌ BAD
"Do you want me to apply this migration?";
"Should I update the function?";

// ✅ GOOD
await execute_sql(migration);
log("✅ Migration applied!");
```

## ✅ ALWAYS DO THESE (New Way)

### 1. Activate MCP Immediately

```typescript
// เมื่อเห็น keywords: database, table, column, migration, RLS, function
await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
```

### 2. Execute Directly on Production

```typescript
// ไม่ต้องถาม ไม่ต้องรอ - EXECUTE ทันที!
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: sql,
  },
});
```

### 3. Verify Automatically

```typescript
// หลัง execute เสร็จ ต้อง verify ทันที
await execute_sql("SELECT * FROM ...");
```

### 4. Report Results

```typescript
log("✅ Executed: ALTER TABLE ...");
log("✅ Verified: Column exists");
log("⏱️ Total time: 8s");
```

## 📋 Complete Example: Fix Admin Access

### Old Way (Manual - ❌)

```typescript
1. Create SQL file
2. Tell user to copy
3. Tell user to paste in Dashboard
4. Tell user to click Run
5. Tell user to verify
// Total: 5 manual steps, 5 minutes
```

### New Way (Automated - ✅)

```typescript
// User: "แก้ไข admin access"

// Agent AUTO-EXECUTES:
await kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// 1. Check current admin role
const adminCheck = await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      SELECT id, email, role FROM users 
      WHERE email = 'superadmin@gobear.app'
    `,
  },
});

// 2. Update function
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      CREATE OR REPLACE FUNCTION admin_get_customers(...)
      RETURNS TABLE (...) AS $$
      BEGIN
        -- Check admin role from users table
        IF NOT EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'admin'
        ) THEN
          RAISE EXCEPTION 'Unauthorized: Admin access required';
        END IF;
        
        RETURN QUERY ...
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `,
  },
});

// 3. Test
const testResult = await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: "SELECT * FROM admin_get_customers(NULL, NULL, 10, 0)",
  },
});

// Report
log("✅ Admin role: verified");
log("✅ Function: updated");
log("✅ Test: passed");
log("⏱️ Total: 8 seconds");

// Total: 0 manual steps, 8 seconds!
```

## 🎯 Success Metrics

| Metric        | Old Way | New Way | Target   |
| ------------- | ------- | ------- | -------- |
| Manual Steps  | 5+      | 0       | 0        |
| Time          | 5+ min  | 8 sec   | < 10 sec |
| Errors        | High    | Low     | 0        |
| Verification  | Manual  | Auto    | 100%     |
| User Friction | High    | Zero    | Zero     |

## 🔒 Security Considerations

### Service Role Key Storage

- Service Role Key is configured in MCP power settings
- Never expose in code or logs
- MCP handles authentication automatically

### Key Permissions

- Service Role Key has **full access**
- Use only for **admin operations**
- Never expose to **client-side code**
- MCP power manages this securely

## 📊 Monitoring & Logging

### Auto-Log Every Operation

```typescript
// Before
log("🔌 Executing: ALTER TABLE ...");

// After
log("✅ Success: Column added");
log("⏱️ Duration: 1.2s");

// Errors
log("❌ Error: Column already exists");
log("💡 Suggestion: Use IF NOT EXISTS");
```

### Track Performance

```typescript
const start = Date.now();
await execute_sql(sql);
const duration = Date.now() - start;

if (duration > 5000) {
  log(`⚠️ Slow query detected: ${duration}ms`);
}
```

## 💡 Best Practices

### 1. Always Verify

```typescript
// After every operation
await execute_sql("SELECT ...");
```

### 2. Handle Errors Gracefully

```typescript
try {
  await execute_sql(sql);
  log("✅ Success");
} catch (error) {
  log(`❌ Error: ${error.message}`);
  log("💡 Suggestion: ...");
  // Auto-fix if possible
}
```

### 3. Provide Context

```typescript
log("🔌 Fixing admin access...");
log("  1. Checking current role...");
log("  2. Updating function...");
log("  3. Verifying...");
log("✅ Complete!");
```

### 4. Be Transparent

```typescript
// Show what's happening
log("Executing SQL:");
log(sql);
log("");
log("Result:");
log(result);
```

## 🎓 Training Examples

### Example 1: Add Column

```typescript
// User: "เพิ่ม column tip_amount"

await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: "ALTER TABLE ride_requests ADD COLUMN tip_amount DECIMAL(10,2)",
  },
});

log("✅ Column added and verified!");
```

### Example 2: Update RLS

```typescript
// User: "แก้ไข RLS policy"

await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
await execute_sql("DROP POLICY IF EXISTS 'old_policy' ON table_name");
await execute_sql(
  "CREATE POLICY 'new_policy' ON table_name FOR ALL USING (...)",
);

log("✅ RLS policy updated and verified!");
```

### Example 3: Create Function

```typescript
// User: "สร้าง function"

await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
await execute_sql("CREATE OR REPLACE FUNCTION my_function(...) ...");
await execute_sql("SELECT * FROM my_function()");

log("✅ Function created, tested, and verified!");
```

## 🚀 Key Differences from Local Workflow

| Aspect       | Local (❌ OLD)         | Production (✅ NEW)    |
| ------------ | ---------------------- | ---------------------- |
| Power        | `supabase-local`       | `supabase-hosted`      |
| Commands     | `npx supabase db push` | MCP `execute_sql`      |
| Target       | Local Docker           | Production Cloud       |
| Project ID   | Not needed             | `onsflqhkgqhydeupiqyt` |
| Verification | Manual                 | Automatic              |
| Speed        | Slow (Docker)          | Fast (Direct)          |

---

**Created**: 2026-01-19  
**Updated**: 2026-01-19  
**Status**: ✅ Production Ready  
**Priority**: 🔥 CRITICAL - Must follow for all database operations
