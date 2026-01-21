# 🎯 Action Items - Migration 306 Deployment

## 🔴 CRITICAL (ทำเลย!)

### 1. Deploy Migration 306 to Production

- **Priority:** P0 (Blocker)
- **Time:** 5 นาที
- **Owner:** User
- **Status:** ❌ Not Done

**Steps:**

1. เปิด `DEPLOY-306-NOW.md`
2. Copy SQL ทั้งหมด
3. Paste ใน Supabase Dashboard SQL Editor
4. กด Run
5. Verify ด้วย queries ในไฟล์

**Success Criteria:**

- ✅ SQL รันสำเร็จ ไม่มี error
- ✅ Table `order_reassignments` ถูกสร้าง
- ✅ Functions 3 ตัวถูกสร้าง
- ✅ ปุ่ม "ย้ายงาน" ใช้งานได้
- ✅ Modal เปิดขึ้นมา แสดง providers

---

## 🟡 HIGH PRIORITY (ทำสัปดาห์นี้)

### 2. Fix Error Handling Pattern

- **Priority:** P1
- **Time:** 2 ชั่วโมง
- **Owner:** Developer
- **Status:** ❌ Not Done

**Current Code:**

```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : 'Failed';
  error.value = message;
  console.error(err);
  return [];
}
```

**Should Be:**

```typescript
} catch (err) {
  if (err instanceof AppError) throw err;
  throw new AppError(
    (err as Error).message,
    ErrorCode.NETWORK,
    'ไม่สามารถโหลดรายชื่อไรเดอร์ได้',
    { serviceType }
  );
}
```

**Files to Update:**

- `src/admin/composables/useOrderReassignment.ts`

**Success Criteria:**

- ✅ ใช้ AppError class
- ✅ ใช้ ErrorCode enum
- ✅ มี Thai user messages
- ✅ มี context object

---

### 3. Add Accessibility Labels

- **Priority:** P1
- **Time:** 1 ชั่วโมง
- **Owner:** Developer
- **Status:** ❌ Not Done

**Issues:**

```vue
<!-- ❌ Missing ARIA labels -->
<button class="close-btn" @click="handleClose">
  <svg>...</svg>
</button>

<!-- ✅ Should have -->
<button
  class="close-btn"
  @click="handleClose"
  aria-label="ปิดหน้าต่าง"
  type="button"
>
  <svg aria-hidden="true">...</svg>
</button>
```

**Files to Update:**

- `src/admin/components/OrderReassignmentModal.vue`

**Success Criteria:**

- ✅ ทุก button มี aria-label
- ✅ ทุก icon มี aria-hidden="true"
- ✅ Modal มี role="dialog"
- ✅ Focus management ถูกต้อง

---

### 4. Add Integration Tests

- **Priority:** P1
- **Time:** 4 ชั่วโมง
- **Owner:** Developer
- **Status:** ❌ Not Done

**Missing Tests:**

```typescript
describe("Order Reassignment Integration", () => {
  it("should complete full reassignment flow");
  it("should handle network timeout");
  it("should handle RPC function not found");
  it("should handle invalid provider ID");
  it("should handle concurrent reassignments");
});
```

**Files to Create:**

- `src/tests/admin-order-reassignment.integration.test.ts`

**Success Criteria:**

- ✅ End-to-end flow tested
- ✅ Error scenarios covered
- ✅ Edge cases tested
- ✅ All tests passing

---

## 🟢 MEDIUM PRIORITY (ทำเดือนนี้)

### 5. Add Retry Logic

- **Priority:** P2
- **Time:** 1 ชั่วโมง
- **Owner:** Developer
- **Status:** ❌ Not Done

**Implementation:**

```typescript
const { data, error } = await withRetry(
  () =>
    supabase.rpc("get_available_providers", {
      p_service_type: serviceType || null,
      p_limit: 100,
    }),
  3, // max attempts
  1000, // base delay
);
```

**Files to Update:**

- `src/admin/composables/useOrderReassignment.ts`

**Success Criteria:**

- ✅ Retry on network failure
- ✅ Exponential backoff
- ✅ Max 3 attempts
- ✅ User feedback during retry

---

### 6. Add Rollback Migration

- **Priority:** P2
- **Time:** 30 นาที
- **Owner:** Developer
- **Status:** ❌ Not Done

**Create File:**

```sql
-- supabase/migrations/306_admin_order_reassignment_system_rollback.sql

BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_available_providers;
DROP FUNCTION IF EXISTS public.get_reassignment_history;
DROP FUNCTION IF EXISTS public.reassign_order;

-- Drop table
DROP TABLE IF EXISTS public.order_reassignments;

COMMIT;
```

**Files to Create:**

- `supabase/migrations/306_admin_order_reassignment_system_rollback.sql`

**Success Criteria:**

- ✅ Rollback script created
- ✅ Tested in local
- ✅ Documented in README

---

### 7. Add Loading Skeleton

- **Priority:** P2
- **Time:** 1 ชั่วโมง
- **Owner:** Developer
- **Status:** ❌ Not Done

**Implementation:**

```vue
<div v-if="isLoading" class="provider-list">
  <div v-for="i in 3" :key="i" class="provider-card skeleton">
    <div class="skeleton-header"></div>
    <div class="skeleton-details"></div>
  </div>
</div>
```

**Files to Update:**

- `src/admin/components/OrderReassignmentModal.vue`

**Success Criteria:**

- ✅ Skeleton loader แทน spinner
- ✅ Smooth animation
- ✅ Better perceived performance

---

## 🔵 LOW PRIORITY (อนาคต)

### 8. Add Virtual Scrolling

- **Priority:** P3
- **Time:** 3 ชั่วโมง
- **Impact:** Better performance with 1000+ providers

### 9. Add Caching Strategy

- **Priority:** P3
- **Time:** 2 ชั่วโมง
- **Impact:** Reduce API calls

### 10. Add Circuit Breaker

- **Priority:** P3
- **Time:** 2 ชั่วโมง
- **Impact:** Prevent cascading failures

---

## 📊 Progress Tracking

| Priority      | Total  | Done  | In Progress | Not Started |
| ------------- | ------ | ----- | ----------- | ----------- |
| P0 (Critical) | 1      | 0     | 0           | 1           |
| P1 (High)     | 3      | 0     | 0           | 3           |
| P2 (Medium)   | 3      | 0     | 0           | 3           |
| P3 (Low)      | 3      | 0     | 0           | 3           |
| **Total**     | **10** | **0** | **0**       | **10**      |

**Completion:** 0% (0/10)

---

## 🎯 Sprint Planning

### Sprint 1 (This Week)

- [ ] Deploy migration 306 (P0)
- [ ] Fix error handling (P1)
- [ ] Add accessibility (P1)
- [ ] Add integration tests (P1)

**Estimated Time:** 8 hours  
**Target Completion:** 100% of P0-P1 items

### Sprint 2 (Next Week)

- [ ] Add retry logic (P2)
- [ ] Add rollback migration (P2)
- [ ] Add loading skeleton (P2)

**Estimated Time:** 2.5 hours  
**Target Completion:** 100% of P2 items

### Sprint 3 (Future)

- [ ] Add virtual scrolling (P3)
- [ ] Add caching strategy (P3)
- [ ] Add circuit breaker (P3)

**Estimated Time:** 7 hours  
**Target Completion:** 100% of P3 items

---

## ✅ Definition of Done

### For Each Item:

- [ ] Code implemented
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to production
- [ ] Verified in production
- [ ] No regressions

### For Sprint:

- [ ] All items completed
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] User acceptance passed

---

## 📞 Contact

**Questions?** Ask in:

- Slack: #engineering
- Email: dev@example.com
- Jira: ADMIN-306

**Escalation:**

- P0 issues: Immediate
- P1 issues: Same day
- P2 issues: This week
- P3 issues: This month
