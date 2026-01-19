# Production Deployment Fixes - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Local Development          Production                       │
│  ┌──────────────┐          ┌──────────────┐                │
│  │   Docker     │          │  Supabase    │                │
│  │   Desktop    │          │  Hosted      │                │
│  └──────┬───────┘          └──────┬───────┘                │
│         │                          │                         │
│  ┌──────▼───────┐          ┌──────▼───────┐                │
│  │  Supabase    │  Deploy  │  Production  │                │
│  │  Local Stack │─────────▶│  Database    │                │
│  └──────────────┘          └──────────────┘                │
│         │                          │                         │
│  ┌──────▼───────┐          ┌──────▼───────┐                │
│  │  Migrations  │          │  Migrations  │                │
│  │  308, 309    │          │  306,308,309 │                │
│  └──────────────┘          └──────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Migration 306: Order Reassignment System

**Tables:**

```sql
order_reassignments (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  old_provider_id UUID,
  new_provider_id UUID NOT NULL,
  reassigned_by UUID NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
```

**RPC Functions:**

- `get_available_providers(p_service_type, p_limit)` → Returns approved providers
- `reassign_order(...)` → Reassigns order with validation
- `get_reassignment_history(...)` → Returns audit trail

**RLS Policies:**

- Admin-only access to all operations

### 2. Migration 308: Customer Suspension System

**Schema Changes:**

```sql
ALTER TABLE profiles ADD COLUMN:
  - status VARCHAR(20) DEFAULT 'active'
  - suspension_reason TEXT
  - suspended_at TIMESTAMPTZ
  - suspended_by UUID
```

**RPC Functions:**

- `suspend_customer_account(p_customer_id, p_reason)` → Suspends customer
- `unsuspend_customer_account(p_customer_id)` → Unsuspends customer

**RLS Policies:**

- `customer_suspended_blocked` → Blocks suspended customers from SELECT
- `customer_suspended_no_update` → Blocks suspended customers from UPDATE

**3 Roles System:**

- **Customer:** Can be suspended, cannot suspend others
- **Provider:** Cannot be suspended (separate system), cannot suspend others
- **Admin:** Can suspend customers only, cannot suspend providers/admins

### 3. Migration 309: Fix get_admin_customers

**Problem:** Function pulls from `users.status` but status is in `profiles.status`

**Solution:** Update function to use `profiles.status` instead

**Changes:**

```sql
-- Before
SELECT u.status FROM users u

-- After
SELECT COALESCE(p.status, 'active') FROM profiles p
```

## Data Flow

### Order Reassignment Flow

```
Admin clicks reassign button
  ↓
Modal opens
  ↓
Call get_available_providers()
  ↓
Display provider list
  ↓
Admin selects provider + reason
  ↓
Call reassign_order()
  ↓
Validate: admin role, provider approved, order status
  ↓
Update order.provider_id
  ↓
Insert audit record
  ↓
Return success
  ↓
Refresh order list
```

### Customer Suspension Flow

```
Admin clicks suspend button
  ↓
Modal opens with reason input
  ↓
Admin enters reason
  ↓
Call suspend_customer_account()
  ↓
Validate: admin role, target is customer
  ↓
Update profiles.status = 'suspended'
  ↓
Set suspension_reason, suspended_at, suspended_by
  ↓
Return success
  ↓
Customer blocked by RLS policies
  ↓
Refresh customer list
```

## Deployment Design

### Local Deployment Sequence

```bash
# 1. Prerequisites
open -a Docker
# Wait 10-30 seconds

# 2. Start Supabase
npx supabase start

# 3. Apply migrations
npx supabase db push --local

# 4. Generate types
npx supabase gen types --local > src/types/database.ts

# 5. Restart dev server
npm run dev
```

### Production Deployment Sequence

```bash
# 1. Link to production
npx supabase link --project-ref onsflqhkgqhydeupiqyt

# 2. Apply migrations
npx supabase db push

# 3. Verify functions
# Run verification SQL queries

# 4. Generate types
npx supabase gen types > src/types/database.ts

# 5. Deploy frontend
vercel --prod
```

## Error Handling

### Migration Errors

```typescript
try {
  await supabase.rpc('get_available_providers', { ... });
} catch (error) {
  if (error.message.includes('function does not exist')) {
    // Migration not applied
    showError('ฟีเจอร์นี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
  } else if (error.message.includes('Only admins')) {
    // Permission denied
    showError('คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้');
  } else {
    // Other errors
    showError('เกิดข้อผิดพลาด: ' + error.message);
  }
}
```

### RLS Policy Errors

```typescript
// Customer tries to access after suspension
try {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // RLS blocked access
    showError("บัญชีของคุณถูกระงับการใช้งาน");
    await supabase.auth.signOut();
    router.push("/login");
  }
} catch (error) {
  // Handle error
}
```

## Security Design

### Admin Role Validation

```sql
-- Every admin function must check role
DECLARE
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  -- Continue with function logic
END;
```

### 3 Roles Protection

```sql
-- Prevent suspending wrong roles
IF v_customer_role = 'admin' THEN
  RAISE EXCEPTION 'Cannot suspend admin accounts';
END IF;

IF v_customer_role = 'provider' THEN
  RAISE EXCEPTION 'Cannot suspend provider accounts. Use provider management instead.';
END IF;

IF v_customer_role != 'customer' THEN
  RAISE EXCEPTION 'Can only suspend customer accounts';
END IF;
```

### RLS Policies

```sql
-- Customer: Blocked if suspended
CREATE POLICY "customer_suspended_blocked" ON profiles
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN auth.uid() = id AND role = 'customer'
      THEN status != 'suspended'
      ELSE true
    END
  );

-- Admin: Full access
CREATE POLICY "admin_full_access" ON profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Performance Considerations

### Indexes

```sql
-- Order reassignments
CREATE INDEX idx_order_reassignments_order
  ON order_reassignments(order_id, order_type);
CREATE INDEX idx_order_reassignments_provider
  ON order_reassignments(new_provider_id);
CREATE INDEX idx_order_reassignments_admin
  ON order_reassignments(reassigned_by, created_at DESC);

-- Customer suspension
CREATE INDEX idx_profiles_status
  ON profiles(status);
CREATE INDEX idx_profiles_suspended_by
  ON profiles(suspended_by);
CREATE INDEX idx_profiles_role_status
  ON profiles(role, status);
```

### Query Optimization

```sql
-- Use SELECT wrapper for auth.uid() caching
USING ((SELECT auth.uid()) = user_id)

-- Limit result sets
LIMIT p_limit OFFSET p_offset

-- Use specific columns instead of SELECT *
SELECT id, full_name, status FROM profiles
```

## Monitoring & Logging

### Audit Trail

```sql
-- Track all reassignments
INSERT INTO order_reassignments (
  order_id, order_type, old_provider_id, new_provider_id,
  reassigned_by, reason, notes
) VALUES (...);

-- Track all suspensions
UPDATE profiles SET
  status = 'suspended',
  suspension_reason = p_reason,
  suspended_at = NOW(),
  suspended_by = auth.uid()
WHERE id = p_customer_id;
```

### Verification Queries

```sql
-- Check reassignment history
SELECT * FROM order_reassignments
ORDER BY created_at DESC LIMIT 10;

-- Check suspended customers
SELECT id, full_name, status, suspension_reason, suspended_at
FROM profiles
WHERE status = 'suspended'
ORDER BY suspended_at DESC;

-- Check admin actions
SELECT
  p.full_name as admin_name,
  COUNT(*) as total_actions
FROM order_reassignments r
JOIN profiles p ON p.id = r.reassigned_by
GROUP BY p.full_name;
```

## Rollback Strategy

### Database Rollback

```sql
-- Rollback migration 309
DROP FUNCTION IF EXISTS get_admin_customers(TEXT, TEXT, INT, INT);
-- Restore old version from migration 297

-- Rollback migration 308
DROP FUNCTION IF EXISTS suspend_customer_account;
DROP FUNCTION IF EXISTS unsuspend_customer_account;
DROP POLICY IF EXISTS customer_suspended_blocked ON profiles;
DROP POLICY IF EXISTS customer_suspended_no_update ON profiles;
ALTER TABLE profiles DROP COLUMN IF EXISTS status;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspension_reason;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspended_by;

-- Rollback migration 306
DROP FUNCTION IF EXISTS reassign_order;
DROP FUNCTION IF EXISTS get_reassignment_history;
DROP FUNCTION IF EXISTS get_available_providers;
DROP TABLE IF EXISTS order_reassignments;
```

### Frontend Rollback

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
npm run build
vercel --prod
```

## Testing Strategy

### Unit Tests

- ✅ Test RPC functions with valid inputs
- ✅ Test RPC functions with invalid inputs
- ✅ Test admin role validation
- ✅ Test 3 roles protection
- ✅ Test RLS policies

### Integration Tests

- ✅ Test complete reassignment flow
- ✅ Test complete suspension flow
- ✅ Test audit trail recording
- ✅ Test error handling

### Manual Testing

- ✅ Test in local environment
- ✅ Test in production environment
- ✅ Test with different user roles
- ✅ Test edge cases

## Correctness Properties

### Property 1: Admin-Only Access

**Validates: Requirements 1.1, 2.1**

```typescript
// For all users u and all admin functions f:
// f(u) succeeds ⟺ u.role = 'admin'

property("Only admins can call admin functions", () => {
  forAll(user(), adminFunction(), (user, func) => {
    const result = func(user);
    return (result.success === true) === (user.role === "admin");
  });
});
```

### Property 2: 3 Roles Protection

**Validates: Requirements 2.1**

```typescript
// For all users u:
// suspend(u) succeeds ⟺ u.role = 'customer'

property("Can only suspend customers", () => {
  forAll(user(), (user) => {
    const result = suspendCustomer(user.id);
    if (user.role === "customer") {
      return result.success === true;
    } else {
      return result.error.includes("Can only suspend customer accounts");
    }
  });
});
```

### Property 3: Audit Trail Completeness

**Validates: Requirements 1.1, 2.1**

```typescript
// For all successful operations op:
// ∃ audit record r where r.operation = op

property("All operations create audit records", () => {
  forAll(operation(), (op) => {
    const result = performOperation(op);
    if (result.success) {
      const audit = getAuditRecord(op.id);
      return audit !== null && audit.operation_id === op.id;
    }
    return true;
  });
});
```

### Property 4: RLS Policy Enforcement

**Validates: Requirements 2.1**

```typescript
// For all suspended customers c:
// c cannot access their own data

property("Suspended customers blocked by RLS", () => {
  forAll(customer(), (customer) => {
    suspendCustomer(customer.id);
    const result = customer.fetchOwnData();
    return result.error !== null;
  });
});
```

## Success Metrics

### Deployment Success

- ✅ All migrations applied without errors
- ✅ All RPC functions exist and work
- ✅ All RLS policies active
- ✅ No errors in logs
- ✅ Frontend deployed successfully

### Feature Success

- ✅ Order reassignment completes in < 2 seconds
- ✅ Customer suspension completes in < 1 second
- ✅ Audit trail records 100% of operations
- ✅ RLS policies block 100% of unauthorized access
- ✅ Zero false positives in role validation

### User Experience

- ✅ Clear error messages
- ✅ Immediate feedback on actions
- ✅ Intuitive UI
- ✅ No confusion about permissions
- ✅ Smooth workflow
