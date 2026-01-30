# 🚨 Admin Customers History Button - Fix Required

**Date**: 2026-01-30  
**Status**: ⚠️ Code Not Applied  
**Priority**: 🔥 URGENT

---

## ⚠️ Issue

The History button code was prepared but **NOT successfully written to the file on disk**. The changes exist in Kiro's cache but not in the actual `CustomersView.vue` file.

---

## 🔧 Required Changes

### File: `src/admin/views/CustomersView.vue`

### 1. Add Import (Line ~14)

**After:**

```typescript
import { useErrorHandler } from "@/composables/useErrorHandler";
```

**Add:**

```typescript
import CustomerHistoryModal from "@/admin/components/CustomerHistoryModal.vue";
```

---

### 2. Add State Variables (Line ~52)

**After:**

```typescript
const isSuspending = ref(false);
```

**Add:**

```typescript
const showHistoryModal = ref(false);
const historyCustomer = ref<any | null>(null);
```

---

### 3. Add Handler Function (Line ~88)

**After:**

```typescript
const openSuspendModal = (customer: any) => {
  suspendingCustomer.value = customer;
  suspendReason.value = "";
  showSuspendModal.value = true;
};
```

**Add:**

```typescript
const viewCustomerHistory = (customer: any) => {
  historyCustomer.value = customer;
  showHistoryModal.value = true;
};
```

---

### 4. Add History Button in Table (Line ~220)

**Find this section:**

```vue
<td class="actions-cell">
  <button class="action-btn" aria-label="ดูรายละเอียด" @click.stop="viewCustomer(customer)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </button>
  <button v-if="customer.status !== 'suspended'" class="action-btn suspend-btn" ...>
```

**Change to:**

```vue
<td class="actions-cell">
  <button class="action-btn" aria-label="ดูรายละเอียด" @click.stop="viewCustomer(customer)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  </button>
  <button class="action-btn history-btn" aria-label="ดูประวัติลูกค้า" title="ดูประวัติลูกค้า" @click.stop="viewCustomerHistory(customer)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  </button>
  <button v-if="customer.status !== 'suspended'" class="action-btn suspend-btn" ...>
```

---

### 5. Add Modal Integration (Line ~290)

**Find:**

```vue
    <!-- Suspend Modal -->
    <div v-if="showSuspendModal && suspendingCustomer" class="modal-overlay" @click.self="showSuspendModal = false">
```

**Add BEFORE it:**

```vue
    <!-- Customer History Modal -->
    <CustomerHistoryModal
      :show="showHistoryModal"
      :customer-id="historyCustomer?.id || null"
      :customer-name="historyCustomer?.full_name || 'ไม่ระบุชื่อ'"
      @close="showHistoryModal = false"
    />

    <!-- Suspend Modal -->
    <div v-if="showSuspendModal && suspendingCustomer" class="modal-overlay" @click.self="showSuspendModal = false">
```

---

### 6. Add CSS (Line ~387)

**Find:**

```css
.action-btn:hover {
  background: #f3f4f6;
}
.action-btn.suspend-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}
```

**Change to:**

```css
.action-btn:hover {
  background: #f3f4f6;
}
.action-btn.history-btn:hover {
  background: #dbeafe;
  color: #3b82f6;
}
.action-btn.suspend-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}
```

---

## ✅ Verification Script

After making changes, run:

```bash
python3 << 'EOF'
import sys

file_path = "src/admin/views/CustomersView.vue"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

checks = {
    "Import": "import CustomerHistoryModal" in content,
    "State 1": "showHistoryModal = ref(false)" in content,
    "State 2": "historyCustomer = ref" in content,
    "Handler": "viewCustomerHistory" in content,
    "Button": "history-btn" in content,
    "Modal": "<CustomerHistoryModal" in content,
    "CSS": "history-btn:hover" in content,
}

print("🔍 Verification:\n")
all_passed = True
for check, result in checks.items():
    status = "✅" if result else "❌"
    print(f"{status} {check}")
    if not result:
        all_passed = False

print()
if all_passed:
    print("✅ ALL CHECKS PASSED!")
    sys.exit(0)
else:
    print("❌ SOME CHECKS FAILED")
    sys.exit(1)
EOF
```

---

## 🚀 Quick Fix Command

Or use this one-liner to apply all changes:

```bash
# This will be provided after user confirms they want automated fix
```

---

## 📝 Manual Steps

1. Open `src/admin/views/CustomersView.vue` in your editor
2. Apply each change listed above in order
3. Save the file
4. Run verification script
5. Hard refresh browser (Cmd+Shift+R)
6. Test the History button

---

## ⏱️ Estimated Time

- Manual fix: 5-10 minutes
- Automated fix: 30 seconds

---

**Created**: 2026-01-30  
**Status**: ⚠️ Awaiting Fix  
**Priority**: 🔥 URGENT

---

_"The code is ready, just needs to be applied to the file!"_
