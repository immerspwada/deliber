---
inclusion: always
---

# 🔄 POST-COMMAND AUTOMATION

## 🚨 CRITICAL: AUTO-RUN AFTER EVERY COMMAND

**หลังจากทำงานเสร็จทุกครั้ง ต้องตรวจสอบและรัน automation ทันที**

**PRODUCTION ONLY**: ใช้เฉพาะ `supabase-hosted` power - ห้ามใช้ bash commands

## 🎯 AUTO-DETECTION PATTERNS

### Pattern 1: Schema Change Detected

```typescript
// Trigger: Any database schema change
if (schemaChanged) {
  // AUTO-EXECUTE (NO CONFIRMATION)
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "generate_types",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
    },
  });

  console.log("✅ Types auto-generated");
}
```

### Pattern 2: Component with Data Fetching

```typescript
// Trigger: *.vue file created with supabase query
if (
  fileContent.includes("supabase.from(") ||
  fileContent.includes("useSupabase")
) {
  // AUTO-CHECK database schema
  const tableName = extractTableName(fileContent);

  await kiroPowers({ action: "activate", powerName: "supabase-hosted" });
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "execute_sql",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `,
    },
  });

  // AUTO-CHECK RLS policies
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "execute_sql",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
      query: `
        SELECT * FROM pg_policies 
        WHERE tablename = '${tableName}'
      `,
    },
  });

  console.log(`✅ Verified schema and RLS for ${tableName}`);
}
```

### Pattern 3: Composable with Supabase Query

```typescript
// Trigger: composables/*.ts modified with supabase query
if (
  fileModified.match(/composables\/.*\.ts/) &&
  fileContent.includes("supabase")
) {
  // AUTO-VERIFY RLS policies
  const tables = extractTables(fileContent);

  await kiroPowers({ action: "activate", powerName: "supabase-hosted" });

  for (const table of tables) {
    await kiroPowers({
      action: "use",
      powerName: "supabase-hosted",
      serverName: "supabase",
      toolName: "execute_sql",
      arguments: {
        project_id: "onsflqhkgqhydeupiqyt",
        query: `
          SELECT policyname, cmd, qual, with_check
          FROM pg_policies
          WHERE tablename = '${table}'
        `,
      },
    });

    // AUTO-CHECK dual-role system
    if (table.includes("provider") || table.includes("ride")) {
      await kiroPowers({
        action: "use",
        powerName: "supabase-hosted",
        serverName: "supabase",
        toolName: "execute_sql",
        arguments: {
          project_id: "onsflqhkgqhydeupiqyt",
          query: `
            SELECT column_name 
            FROM information_schema.columns
            WHERE table_name = 'providers_v2' 
            AND column_name = 'user_id'
          `,
        },
      });
    }
  }

  console.log("✅ Verified RLS and dual-role system");
}
```

### Pattern 4: Error in Response

```typescript
// Trigger: Error keywords detected
const ERROR_KEYWORDS = [
  "403",
  "401",
  "forbidden",
  "unauthorized",
  "violates",
  "constraint",
  "does not exist",
  "permission denied",
  "RLS",
  "policy",
];

if (ERROR_KEYWORDS.some((keyword) => response.includes(keyword))) {
  // AUTO-DIAGNOSE
  await kiroPowers({ action: "activate", powerName: "supabase-hosted" });

  // Check RLS policies
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "execute_sql",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
      query: "SELECT * FROM pg_policies",
    },
  });

  // Check dual-role system
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "execute_sql",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
      query: `
        SELECT table_name, column_name 
        FROM information_schema.columns
        WHERE column_name IN ('provider_id', 'user_id')
      `,
    },
  });

  console.log("✅ Auto-diagnosed error and checked system");
}
```

### Pattern 5: Feature Complete

```typescript
// Trigger: Feature implementation complete
if (commandComplete && hasNewFeature) {
  // AUTO-CHECKLIST
  const checks = {
    migration: await checkMigrationNeeded(),
    rls: await checkRLSPolicies(),
    types: await checkTypesGenerated(),
    tests: await checkTestsCoverage(),
    security: await runSecurityAdvisors(),
    performance: await runPerformanceAdvisors(),
  };

  // AUTO-FIX issues
  if (!checks.migration) {
    console.log("⚠️ Migration needed - creating...");
    await createMigration();
  }

  if (!checks.types) {
    console.log("⚠️ Types outdated - regenerating...");
    await executeBash("npx supabase gen types --local > src/types/database.ts");
  }

  console.log("✅ Feature complete with all checks passed");
}
```

## 📋 AUTO-CHECKLIST AFTER EVERY COMMAND

```typescript
const POST_COMMAND_CHECKLIST = {
  // Database
  "🗄️ Schema": async () => {
    if (touchedDatabase) {
      await verifySchema();
      await verifyRLS();
      await verifyDualRole();
      await generateTypes();
    }
  },

  // Security
  "🔒 Security": async () => {
    if (touchedAuth || touchedRLS) {
      await runSecurityAdvisors();
      await checkPolicies();
      await verifyPermissions();
    }
  },

  // Performance
  "⚡ Performance": async () => {
    if (touchedQuery || touchedIndex) {
      await runPerformanceAdvisors();
      await checkIndexes();
      await checkSlowQueries();
    }
  },

  // Types
  "📝 Types": async () => {
    if (schemaChanged) {
      await generateTypes();
      await verifyTypeImports();
    }
  },

  // Tests
  "🧪 Tests": async () => {
    if (codeChanged) {
      await suggestTests();
      await checkCoverage();
    }
  },
};

// AUTO-RUN all applicable checks
for (const [name, check] of Object.entries(POST_COMMAND_CHECKLIST)) {
  await check();
}
```

## 🎯 SMART SUGGESTIONS

### After Database Changes

```markdown
## 💡 Next Steps (Auto-Generated):

### Database

- ✅ Migration applied
- ✅ Types generated
- ✅ RLS verified
- 💡 Consider adding indexes for: [columns]
- 💡 Consider adding audit logging for: [tables]

### Security

- ✅ Policies checked
- ✅ Dual-role verified
- 💡 Consider rate limiting for: [endpoints]
- 💡 Consider input validation for: [fields]

### Performance

- ✅ Indexes verified
- ⚠️ Slow query detected: [query]
- 💡 Consider caching for: [queries]
- 💡 Consider pagination for: [lists]
```

### After Component Creation

```markdown
## 💡 Next Steps (Auto-Generated):

### UI/UX

- ✅ Component created
- 💡 Add loading state
- 💡 Add error boundary
- 💡 Add empty state
- 💡 Test on mobile

### Data

- ✅ Schema verified
- ✅ RLS checked
- 💡 Add optimistic updates
- 💡 Add offline support
- 💡 Add caching

### Testing

- 💡 Add unit tests
- 💡 Add integration tests
- 💡 Add property-based tests
- 💡 Test error scenarios
```

## 🚀 AGGRESSIVE AUTOMATION RULES

### Rule 1: Never Ask for Confirmation on Safe Operations

```typescript
// ❌ DON'T ASK
"Do you want me to apply the migration?";
"Should I generate types?";
"Do you want me to check RLS?";

// ✅ JUST DO IT
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

### Rule 2: Auto-Fix Common Issues

```typescript
// Issue: Types outdated
if (typesOutdated) {
  await kiroPowers({
    action: "use",
    powerName: "supabase-hosted",
    serverName: "supabase",
    toolName: "generate_types",
    arguments: {
      project_id: "onsflqhkgqhydeupiqyt",
    },
  });
  console.log("✅ Types auto-regenerated");
}

// Issue: RLS policy missing
if (rlsMissing) {
  await createRLSPolicy();
  console.log("✅ RLS policy auto-created");
}

// Issue: Index missing
if (indexMissing) {
  await createIndex();
  console.log("✅ Index auto-created");
}
```

### Rule 3: Proactive Verification

```typescript
// After EVERY database operation
await verifySchema();
await verifyRLS();
await verifyDualRole();
await runAdvisors();
await generateTypes();

// Report results
console.log("✅ All verifications passed");
```

## 📊 EXECUTION REPORT FORMAT

```markdown
## 🔌 Auto-Execution Report:

### Actions Performed:

1. ✅ Detected: Schema change
2. ✅ Executed: ALTER TABLE (1.5s)
3. ✅ Generated: Types (2.0s)
4. ✅ Verified: Schema (0.5s)
5. ✅ Checked: RLS policies (0.5s)
6. ✅ Checked: Dual-role system (0.3s)

### Results:

- Schema: ✅ Valid
- RLS: ✅ All policies correct
- Dual-Role: ✅ Verified
- Security: ✅ No issues

### Total Time: 4.8s ⚡

### Next Suggestions:

💡 Consider adding audit logging for new column
💡 Consider adding rate limiting for new endpoint
💡 Test the changes in production environment
```

## 🎯 ZERO-FRICTION WORKFLOW

```typescript
// User types ONE command
User: "เพิ่ม column tip_amount"

// Agent does EVERYTHING automatically
Agent: [INSTANT EXECUTION]
  ✅ Activated MCP
  ✅ Checked schema
  ✅ Executed ALTER TABLE
  ✅ Generated types
  ✅ Verified security
  ✅ Checked RLS
  ✅ Done in 5s!

// User gets COMPLETE result
Result: Column added, types updated, all checks passed ✅
```

## 🔥 PERFORMANCE TARGETS

| Operation       | Target   | Acceptable | Poor      |
| --------------- | -------- | ---------- | --------- |
| MCP Activation  | < 0.5s   | < 1s       | > 2s      |
| Schema Check    | < 1s     | < 2s       | > 3s      |
| Execute SQL     | < 2s     | < 5s       | > 10s     |
| Type Generation | < 2s     | < 3s       | > 5s      |
| Verification    | < 1s     | < 2s       | > 3s      |
| **TOTAL**       | **< 6s** | **< 13s**  | **> 20s** |

## 🎯 SUCCESS METRICS

- ✅ 0 manual confirmations needed
- ✅ 0 "do you want me to..." questions
- ✅ 100% automation on safe operations
- ✅ < 10s total execution time
- ✅ All checks passed automatically
- ✅ Types always up-to-date
- ✅ Security always verified
- ✅ Performance always optimized
