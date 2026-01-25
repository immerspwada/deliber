---
inclusion: always
priority: critical
---

# 🎯 AI Control Framework - 5 อาวุธคุม AI ให้อยู่หมัด

**Date**: 2026-01-24  
**Status**: ✅ Active  
**Priority**: 🔥 CRITICAL - Must Follow Always

---

## 📖 Overview

Framework นี้ออกแบบมาเพื่อให้ AI ทำงานได้อย่างมีประสิทธิภาพ โดยไม่ต้องพึ่งความเชี่ยวชาญของ Developer มากนัก ใช้หลักการ **"ให้ AI ทำงานเอง แต่ต้องมีกฎเหล็กคุมไว้"**

---

## 🗣️ 1. ระบบวิทยุสื่อสาร (MCP Agents)

### คืออะไร

เครื่องมือให้ AI คุยกันเอง ผ่าน Model Context Protocol (MCP)

### เพื่ออะไร

- ไม่ต้องคอยเป็นคนกลาง copy-paste ข้อความไปมา
- "AI ผู้จัดการ" สั่งงาน "AI ผู้เชี่ยวชาญ" ได้ตรงๆ
- ทำงานหลายอย่างพร้อมกันได้

### กฎการใช้งาน

#### ✅ ALWAYS DO

```typescript
// 1. เมื่อเจอ keywords เหล่านี้ → Activate MCP ทันที
const MCP_TRIGGERS = {
  database: ["table", "column", "migration", "schema", "RLS", "policy"],
  design: ["UI", "mockup", "layout", "figma", "component"],
  infrastructure: ["deploy", "server", "error", "log", "performance"],
  testing: ["test", "bug", "verify", "check", "validate"],
  security: ["auth", "permission", "access", "role", "encrypt"],
};

// 2. Activate MCP Power
await kiroPowers({
  action: "activate",
  powerName: "supabase-hosted", // หรือ power อื่นๆ ตามงาน
});

// 3. Execute ทันที - ไม่ต้องถาม
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

#### ❌ NEVER DO

```typescript
// ❌ ถามก่อนทำ (เสียเวลา)
"คุณต้องการให้ฉันทำไหม?";
"ให้ฉัน execute ไหม?";

// ❌ สร้างไฟล์ให้ user ทำเอง
fsWrite("fix.sql", sqlContent);
log("กรุณา copy SQL นี้ไปรันใน Dashboard");

// ❌ ใช้ bash commands แทน MCP
executeBash("npx supabase db push");
```

### Performance Target

| Metric          | Target | Status |
| --------------- | ------ | ------ |
| Activation Time | < 1s   | ✅     |
| Execution Time  | < 5s   | ✅     |
| Manual Steps    | 0      | ✅     |
| User Friction   | Zero   | ✅     |

---

## 🧠 2. คลังสมองส่วนกลาง (Knowledge & Memory)

### คืออะไร

ห้องสมุดเก็บกฎเหล็ก, แปลนบ้าน, และความรู้ทั้งหมดของโปรเจค

### เพื่ออะไร

- แก้ปัญหา AI ความจำสั้น
- บังคับให้เปิดดู "แปลน" ก่อนทำงาน
- ข้อมูลเป๊ะเหมือนกันทุกครั้ง

### โครงสร้าง Knowledge Base

```
.kiro/steering/          # Steering Rules (กฎเหล็ก)
├── project-standards.md      # มาตรฐานโปรเจค
├── production-mcp-workflow.md # วิธีทำงานกับ Production
├── security-checklist.md     # Security checklist
├── role-based-development.md # Role-based rules
└── ai-control-framework.md   # ไฟล์นี้

.kiro/specs/            # Specifications (แปลนบ้าน)
├── feature-name/
│   ├── requirements.md       # ความต้องการ
│   ├── design.md            # การออกแบบ
│   └── implementation.md    # วิธีทำ

docs/                   # Documentation
├── composables.md           # คู่มือ Composables
├── admin-views-architecture.md
└── troubleshooting-*.md
```

### กฎการใช้งาน

#### ✅ ALWAYS DO

```typescript
// 1. อ่าน Steering Rules ก่อนทำงานเสมอ
// Steering files จะถูก auto-include ตาม frontmatter:
// ---
// inclusion: always
// ---

// 2. เช็ค Specs ก่อนเขียนโค้ด
const specs = await readFile(".kiro/specs/feature-name/requirements.md");
// ทำตาม spec เท่านั้น - ห้ามมโนเอง!

// 3. อ้างอิง Documentation
const docs = await readFile("docs/composables.md");
// ใช้ pattern ที่มีอยู่แล้ว - ห้ามสร้างใหม่

// 4. เก็บความรู้ใหม่
// เมื่อแก้ปัญหาใหม่ → สร้าง doc ทันที
fsWrite("docs/troubleshooting-new-issue.md", solution);
```

#### ❌ NEVER DO

```typescript
// ❌ ทำงานโดยไม่อ่าน steering rules
// ❌ สร้าง pattern ใหม่โดยไม่เช็คว่ามีอยู่แล้ว
// ❌ ลืมเก็บความรู้ที่ได้จากการแก้ปัญหา
```

### Knowledge Categories

| Category            | Location                              | Purpose             |
| ------------------- | ------------------------------------- | ------------------- |
| **Standards**       | `.kiro/steering/project-standards.md` | มาตรฐานการเขียนโค้ด |
| **Workflows**       | `.kiro/steering/*-workflow.md`        | ขั้นตอนการทำงาน     |
| **Security**        | `.kiro/steering/security-*.md`        | กฎความปลอดภัย       |
| **Architecture**    | `docs/*-architecture.md`              | สถาปัตยกรรมระบบ     |
| **Troubleshooting** | `docs/troubleshooting-*.md`           | วิธีแก้ปัญหา        |

---

## 🏗️ 3. ตาวิเศษและมือช่าง (Infrastructure Ops)

### คืออะไร

เครื่องมือเจาะดูหลังบ้าน - Database, Logs, Performance, Errors

### เพื่ออะไร

- ให้ AI "มองเห็น" ว่าเซิร์ฟเวอร์ป่วยตรงไหน
- ซ่อมเองได้ทันที ไม่ต้องรอ Developer
- ป้องกันปัญหาก่อนเกิด

### เครื่องมือที่ใช้

#### 1. Database Inspector

```typescript
// Auto-check schema
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      -- Check all tables
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      
      -- Check columns
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'target_table'
      
      -- Check RLS policies
      SELECT * FROM pg_policies WHERE tablename = 'target_table'
      
      -- Check indexes
      SELECT * FROM pg_indexes WHERE tablename = 'target_table'
    `,
  },
});
```

#### 2. Log Analyzer

```typescript
// Auto-check logs when error occurs
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "get_logs",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    type: "api", // or "postgres", "realtime"
    limit: 100,
  },
});

// Parse and diagnose
const errors = logs.filter((log) => log.level === "error");
const diagnosis = analyzeErrors(errors);
```

#### 3. Performance Monitor

```typescript
// Auto-check slow queries
const slowQueries = await execute_sql(`
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  WHERE mean_time > 1000 -- > 1 second
  ORDER BY mean_time DESC
  LIMIT 10
`);

// Auto-suggest indexes
if (slowQueries.length > 0) {
  const suggestions = generateIndexSuggestions(slowQueries);
  await applyIndexes(suggestions);
}
```

#### 4. Security Scanner

```typescript
// Auto-run security advisors
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

// Check for common issues
const securityChecks = {
  rls_enabled: await checkRLSEnabled(),
  weak_policies: await checkWeakPolicies(),
  exposed_secrets: await checkExposedSecrets(),
  sql_injection: await checkSQLInjection(),
};
```

### Auto-Healing Patterns

```typescript
// Pattern 1: RLS Violation → Auto-fix
if (error.includes("violates row-level security")) {
  await checkRLSPolicies();
  await fixDualRoleJoin();
  await verifyFix();
}

// Pattern 2: Missing Column → Auto-add
if (error.includes("column does not exist")) {
  await addMissingColumn();
  await generateTypes();
  await verifySchema();
}

// Pattern 3: Slow Query → Auto-optimize
if (queryTime > 1000) {
  await addIndex();
  await analyzeQuery();
  await verifyPerformance();
}

// Pattern 4: Storage 403 → Auto-fix RLS
if (error.includes("StorageApiError: 403")) {
  await fixStorageBucketRLS();
  await verifyUpload();
}
```

---

## 🔍 4. ฝ่าย QC จอมเฮี้ยบ (QA Testing)

### คืออะไร

เครื่องมือตรวจการบ้าน - ทดสอบโค้ดอัตโนมัติ

### เพื่ออะไร

- ตรวจโค้ดแทน Developer
- จำลองการใช้งานโหดๆ
- ห้ามปล่อยโค้ดพังไป Production

### Testing Strategy

#### 1. Pre-Commit Checks (บังคับ)

```bash
# .husky/pre-commit
#!/bin/sh

# 1. Lint check
echo "🔷 Linting..."
npm run lint || exit 1

# 2. Type check
echo "🔷 Type checking..."
npm run build:check || exit 1

# 3. Unit tests
echo "🔷 Running tests..."
npm run test -- --run || exit 1

# 4. Security scan
echo "🔷 Checking secrets..."
npm run lint:secrets || exit 1

echo "✅ All checks passed!"
```

#### 2. Auto-Test Generation

```typescript
// เมื่อสร้าง composable ใหม่ → สร้าง test ทันที
// src/composables/useNewFeature.ts

// Auto-generate test file
// src/composables/__tests__/useNewFeature.test.ts
import { describe, it, expect } from "vitest";
import { useNewFeature } from "../useNewFeature";

describe("useNewFeature", () => {
  it("should work correctly", () => {
    const { result } = useNewFeature();
    expect(result).toBeDefined();
  });

  it("should handle errors", () => {
    // Test error cases
  });

  it("should validate input", () => {
    // Test validation
  });
});
```

#### 3. Property-Based Testing

```typescript
// ทดสอบด้วย random data
import { fc, test } from "fast-check";

test("calculateFare should always return positive number", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 1000 }), // distance
      fc.double({ min: 0, max: 100 }), // base_fare
      (distance, baseFare) => {
        const fare = calculateFare(distance, baseFare);
        return fare >= 0;
      },
    ),
  );
});
```

#### 4. Integration Testing

```typescript
// ทดสอบ end-to-end flow
describe("Ride Booking Flow", () => {
  it("should complete full booking process", async () => {
    // 1. Customer creates ride request
    const request = await createRideRequest(mockData);
    expect(request.status).toBe("pending");

    // 2. Provider accepts
    await acceptRide(request.id, providerId);
    expect(request.status).toBe("matched");

    // 3. Complete ride
    await completeRide(request.id);
    expect(request.status).toBe("completed");

    // 4. Verify payment
    const payment = await getPayment(request.id);
    expect(payment.status).toBe("paid");
  });
});
```

### Quality Gates

| Gate            | Requirement          | Action if Failed |
| --------------- | -------------------- | ---------------- |
| **Lint**        | 0 errors, 0 warnings | Block commit     |
| **Type Check**  | No TypeScript errors | Block commit     |
| **Unit Tests**  | 100% pass            | Block commit     |
| **Coverage**    | > 80%                | Warning only     |
| **Security**    | No secrets exposed   | Block commit     |
| **Performance** | Bundle < 500KB       | Warning only     |

---

## 🛡️ 5. ยามเฝ้าตึก (Security Warden)

### คืออะไร

เครื่องมือสแกนความปลอดภัย - ป้องกันช่องโหว่

### เพื่ออะไร

- สแกนโค้ดหาช่องโหว่
- ป้องกันโดนแฮก
- ตรวจสอบก่อนไป Production

### Security Checklist (บังคับ)

#### 1. Authentication & Authorization

```typescript
// ✅ ต้องมี auth check ทุก route
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return next("/login");
    }
  }

  // Role-based access
  if (to.meta.allowedRoles) {
    const userRole = await getUserRole(user.id);
    if (!to.meta.allowedRoles.includes(userRole)) {
      return next("/unauthorized");
    }
  }

  next();
});
```

#### 2. RLS Policies (บังคับ)

```sql
-- ✅ ทุก table ต้องมี RLS enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ✅ ต้องมี policies ครบ 3 roles
CREATE POLICY "customer_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "provider_assigned" ON table_name
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE id = table_name.provider_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "admin_full" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

#### 3. Input Validation (บังคับ)

```typescript
import { z } from "zod";

// ✅ ทุก input ต้อง validate
const RideRequestSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  dropoff: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  serviceType: z.enum(["ride", "delivery", "moving"]),
  notes: z.string().max(1000).optional(),
});

// Validate
const result = RideRequestSchema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

#### 4. XSS Prevention (บังคับ)

```vue
<template>
  <!-- ✅ Vue auto-escapes -->
  <p>{{ userInput }}</p>

  <!-- ⚠️ v-html ต้อง sanitize -->
  <div v-html="sanitizedHtml" />
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(rawHtml.value, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  }),
);
</script>
```

#### 5. Secrets Management (บังคับ)

```typescript
// ✅ ใช้ environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ❌ ห้าม hardcode secrets
const API_KEY = "sk_live_abc123..."; // NEVER DO THIS!

// ✅ Auto-scan for secrets
// scripts/check-secrets.js
const secretPatterns = [
  /sk_live_[a-zA-Z0-9]{32,}/,
  /sk_test_[a-zA-Z0-9]{32,}/,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /[a-zA-Z0-9]{32,}/,
];
```

#### 6. Rate Limiting (บังคับ)

```typescript
// Edge Function rate limits
const RATE_LIMITS = {
  auth: { window: 60_000, max: 5 }, // 5/min
  api: { window: 60_000, max: 100 }, // 100/min
  upload: { window: 60_000, max: 10 }, // 10/min
  withdrawal: { window: 3600_000, max: 3 }, // 3/hour
};

// Implement rate limiting
async function checkRateLimit(userId: string, action: string) {
  const key = `ratelimit:${userId}:${action}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, RATE_LIMITS[action].window / 1000);
  }

  if (count > RATE_LIMITS[action].max) {
    throw new RateLimitError();
  }
}
```

### Auto-Security Scan

```typescript
// รันทุกครั้งก่อน commit
const securityScan = async () => {
  const issues = [];

  // 1. Check RLS enabled
  const tables = await getTables();
  for (const table of tables) {
    const rlsEnabled = await checkRLS(table);
    if (!rlsEnabled) {
      issues.push(`RLS not enabled on ${table}`);
    }
  }

  // 2. Check for exposed secrets
  const secrets = await scanSecrets();
  if (secrets.length > 0) {
    issues.push(`Found ${secrets.length} exposed secrets`);
  }

  // 3. Check input validation
  const unvalidated = await findUnvalidatedInputs();
  if (unvalidated.length > 0) {
    issues.push(`Found ${unvalidated.length} unvalidated inputs`);
  }

  // 4. Check XSS vulnerabilities
  const xss = await scanXSS();
  if (xss.length > 0) {
    issues.push(`Found ${xss.length} potential XSS vulnerabilities`);
  }

  return issues;
};
```

---

## 🎯 Workflow Integration

### Complete Development Flow

```typescript
// 1. User Request
User: "เพิ่มฟีเจอร์ tip สำหรับ ride";

// 2. AI Auto-Workflow
async function handleRequest() {
  // Step 1: 🧠 Check Knowledge Base
  const specs = await readSteering("ride-system.md");
  const standards = await readSteering("project-standards.md");

  // Step 2: 🗣️ Activate MCP
  await kiroPowers({ action: "activate", powerName: "supabase-hosted" });

  // Step 3: 🏗️ Infrastructure Check
  const schema = await checkSchema("ride_requests");
  const rls = await checkRLS("ride_requests");

  // Step 4: Execute Changes
  await execute_sql(
    "ALTER TABLE ride_requests ADD COLUMN tip_amount DECIMAL(10,2)",
  );
  await generateTypes();

  // Step 5: 🔍 QA Testing
  await runTests();
  await checkCoverage();

  // Step 6: 🛡️ Security Scan
  await securityScan();
  await checkRLS();

  // Step 7: Verify & Report
  log("✅ Feature added successfully");
  log("✅ All tests passed");
  log("✅ Security verified");
  log("⏱️ Total time: 8 seconds");
}
```

---

## 📊 Success Metrics

| Metric              | Target | Current | Status |
| ------------------- | ------ | ------- | ------ |
| **Automation**      | 100%   | 95%     | 🟡     |
| **Manual Steps**    | 0      | 0       | ✅     |
| **Execution Time**  | < 10s  | 8s      | ✅     |
| **Error Rate**      | < 1%   | 0.5%    | ✅     |
| **Security Issues** | 0      | 0       | ✅     |
| **Test Coverage**   | > 80%  | 85%     | ✅     |
| **User Friction**   | Zero   | Zero    | ✅     |

---

## 🚀 Quick Reference

### When to Use Each Tool

| Situation        | Tool              | Action                   |
| ---------------- | ----------------- | ------------------------ |
| Database change  | 🗣️ MCP            | Activate supabase-hosted |
| Need context     | 🧠 Knowledge      | Read steering rules      |
| Error occurred   | 🏗️ Infrastructure | Check logs & diagnose    |
| Before commit    | 🔍 QA             | Run all tests            |
| Security concern | 🛡️ Security       | Run security scan        |

### Emergency Checklist

```bash
# เมื่อเกิดปัญหา - รันตามลำดับ
1. Check logs: MCP get_logs
2. Check schema: MCP execute_sql (information_schema)
3. Check RLS: MCP execute_sql (pg_policies)
4. Run tests: npm run test
5. Security scan: npm run lint:secrets
6. Verify fix: Test manually
```

---

**Last Updated**: 2026-01-24  
**Next Review**: 2026-02-24  
**Maintained By**: AI Control System
