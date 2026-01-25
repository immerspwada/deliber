---
inclusion: always
priority: critical
---

# 🔌 MCP Configuration Guide

**Date**: 2026-01-24  
**Status**: ✅ Active  
**Priority**: 🔥 CRITICAL - Production Only

---

## 📖 Overview

MCP (Model Context Protocol) configuration สำหรับ Thai Ride App ที่ออกแบบมาเพื่อทำงานกับ **Production Database เท่านั้น** ไม่มี local development

---

## 🎯 Core Principles

### 1. Production-First

- ทุกการเปลี่ยนแปลง database ทำกับ Production โดยตรง
- ไม่มี local database, ไม่มี Docker
- ใช้ `supabase-hosted` power เท่านั้น

### 2. Zero Manual Steps

- Auto-activate เมื่อเจอ keywords
- Auto-approve safe operations
- Auto-verify หลัง execute

### 3. Security by Default

- RLS policies required
- Input validation required
- Secrets scanning enabled
- Auto security scan

---

## 🔧 MCP Powers Configuration

### ✅ supabase-hosted (ALWAYS USE)

```json
{
  "powers": {
    "supabase-hosted": {
      "enabled": true,
      "priority": "critical",
      "description": "Production Supabase Database",
      "autoActivate": {
        "keywords": [
          "database",
          "table",
          "column",
          "migration",
          "schema",
          "RLS",
          "policy",
          "function",
          "query",
          "SQL",
          "postgres"
        ]
      },
      "autoApprove": [
        "list_projects",
        "get_project",
        "list_tables",
        "execute_sql",
        "generate_types",
        "get_advisors",
        "get_logs"
      ],
      "config": {
        "project_id": "onsflqhkgqhydeupiqyt",
        "target": "production"
      }
    }
  }
}
```

**Usage:**

```typescript
// Auto-activates when keywords detected
await kiroPowers({
  action: "activate",
  powerName: "supabase-hosted",
});

// Execute SQL
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

// Generate types
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "generate_types",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
  },
});
```

### ⛔ supabase-local (DEPRECATED)

```json
{
  "powers": {
    "supabase-local": {
      "enabled": false,
      "deprecated": true,
      "reason": "Use supabase-hosted for all operations"
    }
  }
}
```

**DO NOT USE:**

- ❌ `supabase-local` power
- ❌ `npx supabase start`
- ❌ `npx supabase db push`
- ❌ Local Docker containers

### ✅ figma (Design Integration)

```json
{
  "powers": {
    "figma": {
      "enabled": true,
      "priority": "medium",
      "autoActivate": {
        "keywords": [
          "design",
          "UI",
          "mockup",
          "layout",
          "figma",
          "component",
          "style"
        ]
      },
      "autoApprove": [
        "get_file",
        "get_components",
        "get_styles",
        "export_assets"
      ]
    }
  }
}
```

---

## 🤖 Automation Rules

### 1. Database Changes

```json
{
  "automation": {
    "rules": {
      "database_changes": {
        "trigger": "schema_change",
        "actions": [
          "verify_schema",
          "check_rls",
          "generate_types",
          "run_security_scan"
        ]
      }
    }
  }
}
```

**Workflow:**

1. Detect schema change
2. Verify schema integrity
3. Check RLS policies
4. Generate TypeScript types
5. Run security scan
6. Report results

### 2. Component Creation

```json
{
  "automation": {
    "rules": {
      "component_creation": {
        "trigger": "*.vue created",
        "actions": [
          "check_database_needs",
          "verify_accessibility",
          "generate_tests"
        ]
      }
    }
  }
}
```

**Workflow:**

1. Detect new Vue component
2. Check if needs database access
3. Verify accessibility (a11y)
4. Generate test file
5. Report results

### 3. Composable Modification

```json
{
  "automation": {
    "rules": {
      "composable_modification": {
        "trigger": "composables/*.ts modified",
        "actions": ["check_rls_policies", "verify_types", "update_tests"]
      }
    }
  }
}
```

**Workflow:**

1. Detect composable change
2. Check RLS policies if has Supabase queries
3. Verify TypeScript types
4. Update test file
5. Report results

### 4. Pre-Commit Checks

```json
{
  "automation": {
    "rules": {
      "pre_commit": {
        "trigger": "commit",
        "actions": ["lint", "type_check", "test", "security_scan"],
        "blocking": true
      }
    }
  }
}
```

**Workflow:**

1. Run ESLint
2. Run TypeScript check
3. Run tests
4. Run security scan
5. Block commit if any fails

---

## 🔒 Security Configuration

```json
{
  "security": {
    "scan_on_save": true,
    "block_secrets": true,
    "require_rls": true,
    "validate_input": true
  }
}
```

### Security Checks

1. **Scan on Save**
   - Auto-scan files on save
   - Check for secrets
   - Check for vulnerabilities

2. **Block Secrets**
   - Prevent committing secrets
   - Scan for API keys, tokens
   - Block if found

3. **Require RLS**
   - All tables must have RLS enabled
   - All tables must have policies
   - Block if missing

4. **Validate Input**
   - All inputs must be validated
   - Use Zod schemas
   - Block if missing

---

## ⚡ Performance Configuration

```json
{
  "performance": {
    "target_execution_time": 10000,
    "warn_slow_queries": 1000,
    "auto_optimize": true
  }
}
```

### Performance Targets

| Metric         | Target  | Action           |
| -------------- | ------- | ---------------- |
| Execution Time | < 10s   | Warn if exceeded |
| Query Time     | < 1s    | Warn if exceeded |
| Bundle Size    | < 500KB | Warn if exceeded |

### Auto-Optimization

- Detect slow queries
- Suggest indexes
- Auto-apply if safe
- Report results

---

## 📋 Auto-Approve Lists

### Safe Operations (Auto-Approved)

```typescript
const AUTO_APPROVE = {
  supabase: [
    "list_projects",
    "get_project",
    "list_tables",
    "execute_sql", // Read-only queries
    "generate_types",
    "get_advisors",
    "get_logs",
  ],
  figma: ["get_file", "get_components", "get_styles", "export_assets"],
  filesystem: [
    "read_file",
    "read_multiple_files",
    "list_directory",
    "search_files",
    "get_file_info",
  ],
};
```

### Require Confirmation

```typescript
const REQUIRE_CONFIRMATION = {
  supabase: [
    "apply_migration", // Schema changes
    "deploy_edge_function",
    "restore_project",
  ],
  filesystem: ["delete_file", "move_file"],
};
```

---

## 🎯 Keyword Triggers

### Database Keywords

```typescript
const DATABASE_KEYWORDS = [
  "database",
  "table",
  "column",
  "migration",
  "schema",
  "RLS",
  "policy",
  "function",
  "query",
  "SQL",
  "postgres",
  "supabase",
];
```

**Action:** Auto-activate `supabase-hosted` power

### Design Keywords

```typescript
const DESIGN_KEYWORDS = [
  "design",
  "UI",
  "mockup",
  "layout",
  "figma",
  "component",
  "style",
  "visual",
];
```

**Action:** Auto-activate `figma` power

### Testing Keywords

```typescript
const TESTING_KEYWORDS = [
  "test",
  "bug",
  "verify",
  "check",
  "validate",
  "coverage",
  "vitest",
];
```

**Action:** Run test suite

### Security Keywords

```typescript
const SECURITY_KEYWORDS = [
  "auth",
  "permission",
  "access",
  "role",
  "encrypt",
  "secret",
  "token",
  "security",
];
```

**Action:** Run security scan

---

## 🚀 Quick Start

### 1. Verify Configuration

```bash
# Check MCP config
cat .kiro/settings/mcp.json

# Check powers
cat ~/.kiro/settings/mcp.json
```

### 2. Test Supabase Connection

```typescript
// Should auto-activate
User: "เช็ค schema ของ users table"

// AI will:
1. Detect keyword "schema"
2. Auto-activate supabase-hosted
3. Execute: SELECT * FROM information_schema.columns WHERE table_name='users'
4. Report results
```

### 3. Test Automation

```typescript
// Create new component
User: "สร้าง component RideCard.vue"

// AI will:
1. Create component file
2. Check if needs database
3. Verify accessibility
4. Generate test file
5. Report results
```

---

## 🐛 Troubleshooting

### Issue: MCP Not Activating

**Check:**

1. Keywords in user message
2. Power enabled in config
3. Auto-activate configured

**Fix:**

```json
{
  "powers": {
    "supabase-hosted": {
      "enabled": true,
      "autoActivate": {
        "keywords": ["database", "table", ...]
      }
    }
  }
}
```

### Issue: Operations Not Auto-Approved

**Check:**

1. Tool in autoApprove list
2. Power activated
3. Arguments valid

**Fix:**

```json
{
  "powers": {
    "supabase-hosted": {
      "autoApprove": ["execute_sql", "generate_types"]
    }
  }
}
```

### Issue: Slow Execution

**Check:**

1. Network connection
2. Query complexity
3. Database load

**Fix:**

- Optimize queries
- Add indexes
- Use caching

---

## 📊 Monitoring

### Execution Metrics

```typescript
// Track every MCP operation
const metrics = {
  activation_time: 0.5, // seconds
  execution_time: 2.0, // seconds
  verification_time: 0.5, // seconds
  total_time: 3.0, // seconds
};

// Report if exceeds target
if (metrics.total_time > 10) {
  console.warn("⚠️ Slow execution detected");
}
```

### Success Rate

```typescript
// Track success/failure
const stats = {
  total_operations: 100,
  successful: 98,
  failed: 2,
  success_rate: 98, // %
};

// Alert if below target
if (stats.success_rate < 95) {
  console.error("❌ Success rate below target");
}
```

---

## 🎓 Best Practices

### 1. Always Use Production

```typescript
// ✅ GOOD
await kiroPowers({ powerName: "supabase-hosted" });

// ❌ BAD
await kiroPowers({ powerName: "supabase-local" });
```

### 2. Verify After Execute

```typescript
// ✅ GOOD
await execute_sql("ALTER TABLE ...");
await execute_sql("SELECT * FROM ... LIMIT 1"); // Verify

// ❌ BAD
await execute_sql("ALTER TABLE ...");
// No verification
```

### 3. Use Auto-Approve Wisely

```typescript
// ✅ GOOD - Safe operations
autoApprove: ["list_tables", "get_project"];

// ❌ BAD - Dangerous operations
autoApprove: ["drop_table", "delete_all"];
```

### 4. Monitor Performance

```typescript
// ✅ GOOD
const start = Date.now();
await execute_sql(query);
const duration = Date.now() - start;
console.log(`⏱️ Execution time: ${duration}ms`);

// ❌ BAD
await execute_sql(query);
// No monitoring
```

---

## 📝 Configuration Files

### Workspace Config

`.kiro/settings/mcp.json` - Project-specific settings

### User Config

`~/.kiro/settings/mcp.json` - Global settings (powers)

### Priority

User config < Workspace config (workspace overrides user)

---

## 🔄 Updates

### When to Update

1. New power added
2. New automation rule
3. Security requirement changed
4. Performance target changed

### How to Update

1. Edit `.kiro/settings/mcp.json`
2. Restart Kiro (if needed)
3. Test configuration
4. Document changes

---

**Last Updated**: 2026-01-24  
**Next Review**: 2026-02-24  
**Maintained By**: AI Control System
