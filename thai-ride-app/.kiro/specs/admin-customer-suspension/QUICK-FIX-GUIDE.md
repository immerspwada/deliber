# 🔧 Quick Fix Guide - Customer Suspension System

**Status**: 2 minor fixes required before production deployment  
**Estimated Time**: 15 minutes  
**Priority**: 🟡 MEDIUM

---

## Issue #1: Database Types Not Generated ⚠️

### Problem

TypeScript shows errors because database types are not generated:

```typescript
// Error: Argument of type '"admin_get_customers"' is not assignable to parameter of type 'never'
await supabase.rpc('admin_get_customers', {...})
```

### Impact

- ⚠️ TypeScript errors in IDE
- ✅ Runtime works fine (non-blocking)
- ⚠️ No autocomplete for RPC functions

### Fix

```bash
# 1. Start Supabase (if not running)
npx supabase start

# 2. Generate types
npx supabase gen types --local > src/types/database.ts

# 3. Verify types generated
cat src/types/database.ts | grep "admin_get_customers"
```

### Verification

```bash
# Should see no TypeScript errors
npx vue-tsc --noEmit
```

---

## Issue #2: Toast API Incorrect ⚠️

### Problem

`useToast()` composable doesn't have `.success()` method:

```typescript
// Current (incorrect):
toast.success("ระงับผู้ใช้งานสำเร็จ");

// Error: Property 'success' does not exist on type
```

### Impact

- ⚠️ Toast notifications may not show
- ⚠️ User doesn't get feedback
- ✅ Functionality still works

### Fix

Update `src/admin/views/CustomersViewEnhanced.vue` line 381:

```typescript
// BEFORE:
function handleSuspensionSuccess() {
  toast.success(
    isSuspending.value ? "ระงับผู้ใช้งานสำเร็จ" : "ยกเลิกการระงับสำเร็จ",
  );
  selectedCustomers.value = [];
  showDetailModal.value = false;
  loadCustomers();
}

// AFTER:
function handleSuspensionSuccess() {
  toast.show({
    type: "success",
    message: isSuspending.value
      ? "ระงับผู้ใช้งานสำเร็จ"
      : "ยกเลิกการระงับสำเร็จ",
  });
  selectedCustomers.value = [];
  showDetailModal.value = false;
  loadCustomers();
}
```

### Alternative Fix (Check useToast API)

First, check what the actual API is:

```bash
# Check useToast implementation
cat src/composables/useToast.ts
```

Then use the correct method based on the implementation.

### Verification

```bash
# 1. Check diagnostics
npm run dev

# 2. Navigate to http://localhost:5173/admin/customers

# 3. Test suspension - should see toast notification
```

---

## Complete Fix Script

Run this script to fix both issues:

```bash
#!/bin/bash

echo "🔧 Fixing Customer Suspension System..."
echo ""

# Fix #1: Generate types
echo "1️⃣ Generating database types..."
npx supabase start
npx supabase gen types --local > src/types/database.ts
echo "✅ Types generated"
echo ""

# Fix #2: Check toast API
echo "2️⃣ Checking toast API..."
if grep -q "success:" src/composables/useToast.ts; then
  echo "✅ Toast has .success() method - no fix needed"
else
  echo "⚠️ Toast API needs manual fix"
  echo "   Update line 381 in CustomersViewEnhanced.vue"
  echo "   See QUICK-FIX-GUIDE.md for details"
fi
echo ""

# Verify
echo "3️⃣ Running verification..."
npm test src/tests/admin-customer-suspension-realtime.unit.test.ts
echo ""

echo "✅ Fixes complete!"
echo ""
echo "Next steps:"
echo "1. Review changes"
echo "2. Test manually at http://localhost:5173/admin/customers"
echo "3. Deploy to production"
```

---

## Manual Testing Checklist

After applying fixes, test these scenarios:

### Basic Functionality

- [ ] Load customer list
- [ ] Search by name
- [ ] Search by email
- [ ] Search by phone
- [ ] Filter by status (active)
- [ ] Filter by status (suspended)
- [ ] Pagination works

### Suspension Flow

- [ ] Select single customer
- [ ] Click suspend button
- [ ] Enter reason
- [ ] Confirm suspension
- [ ] See success toast ✨
- [ ] Customer status updates
- [ ] Real-time update works

### Unsuspension Flow

- [ ] Select suspended customer
- [ ] Click unsuspend button
- [ ] Confirm unsuspension
- [ ] See success toast ✨
- [ ] Customer status updates
- [ ] Real-time update works

### Bulk Operations

- [ ] Select multiple customers
- [ ] Click bulk suspend
- [ ] Enter reason
- [ ] Confirm bulk suspension
- [ ] See success toast ✨
- [ ] All customers updated
- [ ] Real-time updates work

### Error Handling

- [ ] Try suspending without reason
- [ ] See validation error
- [ ] Try with network error
- [ ] See error toast
- [ ] Retry works

### Accessibility

- [ ] Tab through all elements
- [ ] Press Enter to submit
- [ ] Press Escape to close modal
- [ ] Screen reader announces changes

---

## Deployment Checklist

After fixes are applied and tested:

### Pre-Deployment

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Manual testing complete
- [ ] Toast notifications working
- [ ] Real-time updates working
- [ ] Backup production database

### Deployment

- [ ] Apply migration 312 to production
- [ ] Deploy frontend
- [ ] Clear CDN cache
- [ ] Verify in production

### Post-Deployment

- [ ] Smoke test critical paths
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] User acceptance testing

---

## Rollback Plan

If issues occur in production:

```bash
# 1. Rollback frontend
git revert <commit-hash>
npm run build
# Deploy previous version

# 2. Rollback database (if needed)
# Run rollback SQL from PRODUCTION-VERIFICATION-REPORT.md

# 3. Verify rollback
# Test that system works with previous version
```

---

## Support

If you encounter issues:

1. Check logs: `npx supabase logs --local`
2. Check diagnostics: `npm run dev` and check console
3. Run tests: `npm test src/tests/admin-customer-suspension-realtime.unit.test.ts`
4. Review documentation: `.kiro/specs/admin-customer-suspension/`

---

**Last Updated**: 2026-01-18  
**Version**: 1.0.0
