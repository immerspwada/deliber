# Production Deployment Fixes - Tasks

## Task 1: Start Docker and Supabase Local

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 5 minutes

### Subtasks:

- [ ] 1.1 Start Docker Desktop
  - Run: `open -a Docker`
  - Wait 10-30 seconds for Docker to be ready
  - Verify: `docker ps` should work without errors

- [ ] 1.2 Start Supabase Local Stack
  - Run: `npx supabase start`
  - Wait for all services to start
  - Verify: `npx supabase status` shows all services running

- [ ] 1.3 Verify MCP Connection
  - Check MCP server at http://127.0.0.1:54321/mcp
  - Verify no connection errors

**Acceptance Criteria:**

- Docker Desktop running
- Supabase local stack running
- All services healthy
- MCP server accessible

---

## Task 2: Apply Local Migrations (308-309)

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 3 minutes  
**Dependencies:** Task 1

### Subtasks:

- [ ] 2.1 Check Current Migration Status
  - Run: `npx supabase migration list --local`
  - Identify which migrations are pending

- [ ] 2.2 Apply Migrations
  - Run: `npx supabase db push --local`
  - Verify no errors in output

- [ ] 2.3 Verify Schema Changes
  - Check profiles table has status columns
  - Check get_admin_customers function updated
  - Run verification SQL queries

**Verification SQL:**

```sql
-- Check status column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'status';

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('suspend_customer_account', 'unsuspend_customer_account', 'get_admin_customers');

-- Test get_admin_customers
SELECT * FROM get_admin_customers(NULL, NULL, 5, 0);
```

**Acceptance Criteria:**

- Migrations 308-309 applied successfully
- profiles.status column exists
- All suspension functions exist
- get_admin_customers returns data with status field

---

## Task 3: Generate Types

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 2 minutes  
**Dependencies:** Task 2

### Subtasks:

- [ ] 3.1 Generate TypeScript Types
  - Run: `npx supabase gen types --local > src/types/database.ts`
  - Verify file updated

- [ ] 3.2 Check for Type Errors
  - Run: `npm run type-check`
  - Fix any type errors if they appear

**Acceptance Criteria:**

- database.ts file updated
- No TypeScript errors
- New types include status fields

---

## Task 4: Test Customer Suspension Locally

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 10 minutes  
**Dependencies:** Task 3

### Subtasks:

- [ ] 4.1 Restart Dev Server
  - Stop current dev server (Ctrl+C)
  - Run: `npm run dev`
  - Wait for server to start

- [ ] 4.2 Test Suspend Button Visibility
  - Navigate to http://localhost:5173/admin/customers
  - Verify suspend button (🚫) visible in table
  - Verify suspend button visible in customer modal

- [ ] 4.3 Test Suspend Functionality
  - Click suspend button on a customer
  - Enter suspension reason
  - Click confirm
  - Verify success message
  - Verify status changes to "ระงับการใช้งาน"

- [ ] 4.4 Test Unsuspend Functionality
  - Click unsuspend button on suspended customer
  - Verify success message
  - Verify status changes back to "ใช้งานปกติ"

- [ ] 4.5 Test RLS Policies
  - Try to access data as suspended customer
  - Verify access is blocked

**Acceptance Criteria:**

- Suspend button visible
- Suspend functionality works
- Unsuspend functionality works
- Status updates immediately
- RLS policies block suspended customers

---

## Task 5: Link to Production

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 2 minutes  
**Dependencies:** Task 4 (local testing complete)

### Subtasks:

- [ ] 5.1 Link to Production Project
  - Run: `npx supabase link --project-ref onsflqhkgqhydeupiqyt`
  - Enter database password when prompted
  - Verify link successful

- [ ] 5.2 Verify Production Connection
  - Run: `npx supabase db remote commit`
  - Check connection to production database

**Acceptance Criteria:**

- Successfully linked to production
- Can connect to production database
- No authentication errors

---

## Task 6: Deploy Migration 306 to Production

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 5 minutes  
**Dependencies:** Task 5

### Subtasks:

- [ ] 6.1 Check Production Migration Status
  - Run: `npx supabase migration list`
  - Identify which migrations are missing in production

- [ ] 6.2 Apply Migration 306
  - Run: `npx supabase db push`
  - Verify migration 306 applied
  - Check for errors

- [ ] 6.3 Verify Order Reassignment Functions
  - Run verification SQL in production

**Verification SQL:**

```sql
-- Check table exists
SELECT COUNT(*) FROM public.order_reassignments;

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
);

-- Test get_available_providers
SELECT * FROM get_available_providers('ride', 5);
```

**Acceptance Criteria:**

- Migration 306 applied to production
- order_reassignments table exists
- All 3 RPC functions exist
- Functions return data without errors

---

## Task 7: Deploy Migrations 308-309 to Production

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 5 minutes  
**Dependencies:** Task 6

### Subtasks:

- [ ] 7.1 Apply Migrations 308-309
  - Run: `npx supabase db push`
  - Verify both migrations applied
  - Check for errors

- [ ] 7.2 Verify Customer Suspension Functions
  - Run verification SQL in production

**Verification SQL:**

```sql
-- Check status column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('suspend_customer_account', 'unsuspend_customer_account');

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'profiles' AND policyname LIKE '%suspend%';
```

**Acceptance Criteria:**

- Migrations 308-309 applied to production
- All status columns exist
- All suspension functions exist
- RLS policies active

---

## Task 8: Test Order Reassignment in Production

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 10 minutes  
**Dependencies:** Task 6

### Subtasks:

- [ ] 8.1 Navigate to Production Orders Page
  - Go to https://onsflqhkgqhydeupiqyt.supabase.co (admin panel)
  - Login as admin
  - Navigate to orders page

- [ ] 8.2 Test Reassignment Button
  - Find an order with a provider
  - Click reassignment button (orange circular arrows)
  - Verify modal opens

- [ ] 8.3 Test Provider List Loading
  - Verify provider list loads
  - Verify online/offline status shown
  - Verify search works

- [ ] 8.4 Test Reassignment
  - Select a different provider
  - Enter reason (optional)
  - Click confirm
  - Verify success message
  - Verify order shows new provider

- [ ] 8.5 Verify Audit Trail
  - Run SQL to check audit record created

**Verification SQL:**

```sql
SELECT * FROM order_reassignments
ORDER BY created_at DESC
LIMIT 1;
```

**Acceptance Criteria:**

- Reassignment button works
- Modal opens and loads providers
- Reassignment completes successfully
- Order updates with new provider
- Audit record created

---

## Task 9: Test Customer Suspension in Production

**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 10 minutes  
**Dependencies:** Task 7

### Subtasks:

- [ ] 9.1 Navigate to Production Customers Page
  - Go to production admin panel
  - Navigate to customers page

- [ ] 9.2 Test Suspend Button
  - Verify suspend button visible
  - Click suspend button
  - Verify modal opens

- [ ] 9.3 Test Suspension
  - Enter suspension reason
  - Click confirm
  - Verify success message
  - Verify status changes

- [ ] 9.4 Test Customer Access
  - Try to login as suspended customer
  - Verify access is blocked

- [ ] 9.5 Test Unsuspend
  - Click unsuspend button
  - Verify success message
  - Verify status changes back

**Acceptance Criteria:**

- Suspend button visible in production
- Suspension works correctly
- Suspended customers blocked by RLS
- Unsuspend works correctly
- Audit trail complete

---

## Task 10: Monitor and Verify

**Status:** Not Started  
**Priority:** Medium  
**Estimated Time:** 15 minutes  
**Dependencies:** Tasks 8, 9

### Subtasks:

- [ ] 10.1 Check Supabase Logs
  - Go to Supabase Dashboard → Logs
  - Check API logs for errors
  - Check Postgres logs for errors

- [ ] 10.2 Check Browser Console
  - Open browser console
  - Check for JavaScript errors
  - Check network tab for failed requests

- [ ] 10.3 Run Performance Queries
  - Check query performance
  - Verify indexes are used

**Performance SQL:**

```sql
-- Check reassignment frequency
SELECT
  DATE(created_at) as date,
  COUNT(*) as reassignments
FROM order_reassignments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Check suspended customers
SELECT COUNT(*) as total_suspended
FROM profiles
WHERE status = 'suspended';

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Acceptance Criteria:**

- No errors in Supabase logs
- No JavaScript errors
- No failed API requests
- Query performance acceptable
- Indexes being used

---

## Task 11: Update Documentation

**Status:** Not Started  
**Priority:** Low  
**Estimated Time:** 10 minutes  
**Dependencies:** Task 10

### Subtasks:

- [ ] 11.1 Update Deployment Status
  - Mark migrations as deployed
  - Update CURRENT-STATUS.md files

- [ ] 11.2 Document Production URLs
  - Add production URLs to documentation
  - Document any production-specific configuration

- [ ] 11.3 Create Deployment Summary
  - Document what was deployed
  - Document any issues encountered
  - Document verification results

**Acceptance Criteria:**

- Documentation updated
- Deployment summary created
- Production URLs documented

---

## Task 12: Notify Team

**Status:** Not Started  
**Priority:** Low  
**Estimated Time:** 5 minutes  
**Dependencies:** Task 11

### Subtasks:

- [ ] 12.1 Notify Admin Users
  - Inform about new order reassignment feature
  - Inform about customer suspension feature
  - Provide usage instructions

- [ ] 12.2 Create User Guide
  - Document how to reassign orders
  - Document how to suspend customers
  - Include screenshots if needed

**Acceptance Criteria:**

- Team notified
- User guide created
- Instructions clear and complete

---

## Summary

### Critical Path:

1. Task 1: Start Docker and Supabase
2. Task 2: Apply local migrations
3. Task 3: Generate types
4. Task 4: Test locally
5. Task 5: Link to production
6. Task 6: Deploy migration 306
7. Task 7: Deploy migrations 308-309
8. Task 8: Test order reassignment in production
9. Task 9: Test customer suspension in production
10. Task 10: Monitor and verify

### Estimated Total Time: ~75 minutes

### Risk Mitigation:

- Test everything locally first
- Have rollback plan ready
- Monitor logs during deployment
- Deploy during low-traffic period

### Success Criteria:

- ✅ All migrations deployed
- ✅ All features working in production
- ✅ No errors in logs
- ✅ Audit trails complete
- ✅ RLS policies enforced
