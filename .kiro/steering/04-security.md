# Security & Production Rules - Thai Ride App

## 🔐 Security Hierarchy

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

---

## 🛡️ Row Level Security (RLS)

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

### RLS Verification Checklist

```
□ Table has RLS enabled
□ Admin policy exists (full access)
□ Provider policy exists (if applicable)
□ Customer policy exists (own data only)
□ No policy allows unauthorized access
□ WITH CHECK clause for INSERT/UPDATE
□ Tested with each role
```

---

## 🔒 Authentication Rules

### JWT Token Handling

```typescript
// ✅ CORRECT: Use Supabase client
const {
  data: { user },
} = await supabase.auth.getUser();

// ❌ WRONG: Manual JWT parsing
const user = jwt.decode(token); // Never do this

// ✅ CORRECT: Check auth state
if (!user) {
  router.push("/login");
  return;
}
```

### Session Management

```typescript
// Auto-refresh session
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    // Clear local state
    clearUserData();
    router.push("/login");
  }

  if (event === "TOKEN_REFRESHED") {
    // Session refreshed automatically
  }
});
```

### Protected Routes

```typescript
// Route guard pattern
const requireAuth: NavigationGuard = async (to, from, next) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    next({ path: "/login", query: { redirect: to.fullPath } });
    return;
  }

  next();
};

// Admin route guard
const requireAdmin: NavigationGuard = async (to, from, next) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    next("/admin/login");
    return;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    next("/admin/login");
    return;
  }

  next();
};
```

---

## 🚫 Forbidden Actions

### Never Do These

```typescript
// ❌ NEVER: Expose service_role key in frontend
const supabase = createClient(url, SERVICE_ROLE_KEY)

// ❌ NEVER: Log sensitive data
console.log('Password:', password)
console.log('Token:', token)

// ❌ NEVER: Store secrets in code
const API_KEY = 'sk_live_xxxxx'

// ❌ NEVER: Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

// ❌ NEVER: Use raw SQL with user input
const query = `SELECT * FROM users WHERE id = '${userId}'`

// ❌ NEVER: Trust client-side data
const isAdmin = request.body.isAdmin // Don't trust this!
```

### Always Do These

```typescript
// ✅ ALWAYS: Use anon key in frontend
const supabase = createClient(url, ANON_KEY);

// ✅ ALWAYS: Use parameterized queries
const { data } = await supabase.from("users").select("*").eq("id", userId);

// ✅ ALWAYS: Validate on server
const isAdmin = await checkAdminRole(auth.uid());

// ✅ ALWAYS: Use environment variables
const apiKey = import.meta.env.VITE_API_KEY;
```

---

## 📝 Input Validation

### Frontend Validation

```typescript
// Validation schema
const schema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  amount: z.number().min(1).max(100000),
  status: z.enum(["pending", "approved", "rejected"]),
});

// Validate before submit
function handleSubmit(data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    showError(result.error.message);
    return;
  }
  // Proceed with validated data
  submitData(result.data);
}
```

### Database Validation

```sql
-- Use CHECK constraints
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  amount DECIMAL(10,2) CHECK (amount > 0 AND amount <= 100000),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use triggers for complex validation
CREATE FUNCTION validate_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 Audit Logging

### Admin Action Logging

```sql
-- Audit log table
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log function
CREATE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_id, action, target_type, target_id, old_value, new_value
  ) VALUES (
    auth.uid(), p_action, p_target_type, p_target_id, p_old_value, p_new_value
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Sensitive Actions to Log

```
✅ Must Log:
- User status changes (suspend, activate)
- Provider approval/rejection
- Refund processing
- Wallet adjustments
- Role changes
- Settings modifications
- Data exports
- Bulk operations

❌ Don't Log:
- Read operations
- Search queries
- Page views
```

---

## 🚀 Production Environment

### Environment Variables

```env
# Required for Production
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[production-anon-key]
VITE_GOOGLE_MAPS_API_KEY=[production-maps-key]
VITE_VAPID_PUBLIC_KEY=[production-vapid-key]

# Never in Production
# VITE_DEBUG=true
# VITE_MOCK_DATA=true
# SERVICE_ROLE_KEY=...
```

### Build Configuration

```typescript
// vite.config.ts - Production
export default defineConfig({
  build: {
    minify: "terser",
    sourcemap: false, // No sourcemaps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
```

### Security Headers

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(self)" }
      ]
    }
  ]
}
```

---

## 🚨 Incident Response

### Severity Levels

```
P1 - Critical (Immediate Response):
├── Data breach
├── Authentication bypass
├── Payment system failure
├── Complete system outage
└── Response: < 15 minutes

P2 - High (1 Hour Response):
├── Major feature broken
├── Performance degradation > 50%
├── Partial data access issues
└── Response: < 1 hour

P3 - Medium (4 Hour Response):
├── Minor feature issues
├── UI bugs affecting UX
├── Non-critical errors
└── Response: < 4 hours

P4 - Low (24 Hour Response):
├── Cosmetic issues
├── Documentation errors
├── Minor improvements
└── Response: < 24 hours
```

### Response Protocol

```
1. DETECT
   └── Monitor alerts, user reports, error tracking

2. ASSESS
   └── Determine severity (P1-P4)
   └── Identify affected systems/users

3. CONTAIN
   └── Isolate affected components
   └── Prevent further damage

4. COMMUNICATE
   └── Notify stakeholders
   └── Update status page

5. RESOLVE
   └── Implement fix
   └── Deploy to production

6. POSTMORTEM
   └── Document incident
   └── Identify root cause
   └── Implement preventive measures
```

---

## 📋 Security Checklist

### Before Deploy

```
□ RLS enabled on all tables
□ RLS policies tested for each role
□ No hardcoded secrets
□ Environment variables configured
□ Input validation complete
□ Error messages don't leak info
□ Audit logging for sensitive actions
□ HTTPS enforced
□ Security headers configured
□ Dependencies updated
```

### Regular Audits

```
Weekly:
□ Review error logs
□ Check failed login attempts
□ Monitor unusual activity

Monthly:
□ Review RLS policies
□ Update dependencies
□ Check access patterns
□ Review audit logs

Quarterly:
□ Security assessment
□ Penetration testing
□ Policy review
□ Compliance check
```

---

## 🔐 Data Protection

### Sensitive Data Handling

```typescript
// ❌ WRONG: Logging sensitive data
console.log("User data:", user);

// ✅ CORRECT: Redact sensitive fields
console.log("User ID:", user.id);

// ❌ WRONG: Exposing full data
return { ...user };

// ✅ CORRECT: Return only needed fields
return {
  id: user.id,
  first_name: user.first_name,
  member_uid: user.member_uid,
};
```

### Soft Delete Policy

```sql
-- ❌ WRONG: Hard delete
DELETE FROM users WHERE id = '...';

-- ✅ CORRECT: Soft delete
UPDATE users SET
  deleted_at = NOW(),
  status = 'deleted',
  -- Anonymize PII
  email = 'deleted_' || id || '@deleted.local',
  phone_number = NULL,
  first_name = 'Deleted',
  last_name = 'User'
WHERE id = '...';
```

### Financial Data

```
Rules:
├── Never modify transaction records directly
├── All changes via atomic functions
├── Maintain audit trail
├── Reconciliation checks
└── Immutable payment records
```

---

## 🏭 Production-First Development (MANDATORY)

### Core Principle

```
⚠️ ทุกการพัฒนาต้องคำนึงถึง Production เป็นหลัก ไม่ใช่ Local

Development Mindset:
├── ❌ "ทำให้ทำงานได้ก่อน แล้วค่อยแก้ทีหลัง"
├── ✅ "ทำให้ Production-Ready ตั้งแต่แรก"
└── ✅ "ถ้าไม่พร้อม Production ก็ไม่ควร commit"
```

### Production-First Checklist

```
□ Database Changes
  □ Migration ต้อง execute ผ่าน MCP Supabase (Production)
  □ ห้ามใช้ supabase db push --local
  □ RLS policies ต้องทดสอบกับ Production data
  □ Indexes ต้องคำนึงถึง Production scale

□ Code Quality
  □ ไม่มี console.log ที่ไม่จำเป็น
  □ ไม่มี TODO/FIXME ที่ค้างไว้
  □ Error handling ครบถ้วน
  □ Loading states ครบทุก async operation

□ Performance
  □ Query optimization (select เฉพาะ columns ที่ต้องการ)
  □ Pagination สำหรับ list ที่มีข้อมูลมาก
  □ Lazy loading สำหรับ components ที่ไม่จำเป็นต้องโหลดทันที
  □ Image optimization

□ Security
  □ Input validation ทุก field
  □ RLS policies ครบทุก table
  □ ไม่มี hardcoded credentials
  □ HTTPS only

□ User Experience
  □ Empty states สำหรับทุก list
  □ Error messages ที่เข้าใจง่าย (ภาษาไทย)
  □ Loading indicators
  □ Offline handling (ถ้าจำเป็น)
```

### Database Migration Rules (Production)

```sql
-- ✅ CORRECT: Execute via MCP Supabase (Production)
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: { sql: "..." }
})

-- ❌ WRONG: Local only
npx supabase db push --local
npx supabase migration up --local
```

### Code Standards for Production

```typescript
// ❌ WRONG: Development shortcuts
console.log("Debug:", data);
const result = data as any;
// TODO: fix this later

// ✅ CORRECT: Production-ready code
if (import.meta.env.DEV) {
  console.log("[Debug]", data);
}
const result: TypedResult = validateData(data);
// Proper error handling
```

### Query Optimization for Production

```typescript
// ❌ WRONG: Fetch all columns
const { data } = await supabase.from("users").select("*");

// ✅ CORRECT: Select only needed columns
const { data } = await supabase
  .from("users")
  .select("id, first_name, last_name, member_uid")
  .limit(50); // Always limit for production

// ❌ WRONG: No pagination
const { data } = await supabase.from("ride_requests").select("*");

// ✅ CORRECT: With pagination
const { data, count } = await supabase
  .from("ride_requests")
  .select("*", { count: "exact" })
  .range(offset, offset + limit - 1)
  .order("created_at", { ascending: false });
```

### Error Handling for Production

```typescript
// ❌ WRONG: Generic error
catch (err) {
  console.error(err)
  error.value = 'Error occurred'
}

// ✅ CORRECT: Production-grade error handling
catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error'

  // Log for monitoring (Sentry in production)
  if (import.meta.env.PROD) {
    captureException(err, { context: 'fetchProviderJobs' })
  }

  // User-friendly message
  error.value = getThaiErrorMessage(errorMessage)
}

function getThaiErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'PGRST116': 'ไม่พบข้อมูลที่ต้องการ',
    'PGRST301': 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
    '23505': 'ข้อมูลนี้มีอยู่แล้วในระบบ',
    'network_error': 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
    'default': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  }
  return messages[code] ?? messages.default
}
```

### Realtime Subscriptions for Production

```typescript
// ❌ WRONG: No cleanup, no error handling
const channel = supabase.channel('jobs')
  .on('postgres_changes', { ... }, callback)
  .subscribe()

// ✅ CORRECT: Production-ready subscription
const channel = supabase.channel('provider-jobs')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'ride_requests',
      filter: `provider_id=eq.${providerId}`
    },
    (payload) => {
      try {
        handleRealtimeChange(payload)
      } catch (err) {
        captureException(err, { context: 'realtime_handler' })
      }
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      connectionStatus.value = 'connected'
    } else if (status === 'CHANNEL_ERROR') {
      connectionStatus.value = 'error'
      // Retry logic
      setTimeout(() => channel.subscribe(), 5000)
    }
  })

// Cleanup on unmount
onUnmounted(() => {
  channel.unsubscribe()
})
```

### Production Deployment Checklist

```
Before Every Deploy:
□ All migrations executed on Production Supabase
□ RLS policies verified with production data
□ No console.log statements (except DEV mode)
□ Error handling complete
□ Loading states implemented
□ Empty states implemented
□ Thai language messages
□ Mobile responsive
□ Cross-role testing complete (Customer, Provider, Admin)
□ Performance tested with realistic data volume
```

---

**Version**: 2.1.0
**Last Updated**: January 1, 2026
