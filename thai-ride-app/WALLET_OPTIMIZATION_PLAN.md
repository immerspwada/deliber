# 🚀 Wallet System - High-Performance Optimization Plan

## 🎯 เป้าหมาย

1. **Performance**: ลดเวลาโหลดและ render ลง 70%
2. **Stability**: ไม่มีการค้าง หรือ lag
3. **Code Quality**: โค้ดสะอาด เป็นระเบียบ maintainable
4. **User Experience**: ลื่นไหล responsive ทุก interaction

---

## 📊 ปัญหาที่พบ (Current Issues)

### WalletView.vue

1. ❌ **Re-render ไม่จำเป็น** - ใช้ `ref` แทน `shallowRef`
2. ❌ **Computed ซับซ้อน** - คำนวณซ้ำทุกครั้ง
3. ❌ **Image resize blocking** - ทำใน main thread
4. ❌ **Multiple API calls** - ไม่มี caching
5. ❌ **Large component** - 792 lines ควรแยก
6. ❌ **No virtualization** - แสดง transactions ทั้งหมด

### AdminTopupRequestsView.vue

1. ❌ **Formatter re-creation** - สร้างใหม่ทุก render
2. ❌ **Heavy filtering** - filter ทุกครั้งที่ search
3. ❌ **No pagination** - โหลดทั้งหมด 100 รายการ
4. ❌ **Inline styles** - ไม่ optimize
5. ❌ **No debounce** - search ทุก keystroke

---

## 🔧 Solutions & Optimizations

### 1. Performance Optimizations

#### A. Memoization & Caching

```typescript
// ✅ Memoize formatters
const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "short",
  timeStyle: "short",
});

// ✅ Cache computed values
const cachedStats = computed(() => {
  // Use Map for O(1) lookups
  const statusMap = new Map();
  for (const req of requests.value) {
    const count = statusMap.get(req.status) || 0;
    statusMap.set(req.status, count + 1);
  }
  return statusMap;
});
```

#### B. Debouncing & Throttling

```typescript
// ✅ Debounce search
import { useDebounceFn } from "@vueuse/core";

const debouncedSearch = useDebounceFn((query: string) => {
  searchQuery.value = query;
}, 300);
```

#### C. Virtual Scrolling

```typescript
// ✅ Use virtual list for large datasets
import { useVirtualList } from "@vueuse/core";

const { list, containerProps, wrapperProps } = useVirtualList(
  filteredRequests,
  { itemHeight: 80 }
);
```

#### D. Lazy Loading

```typescript
// ✅ Lazy load images
<img :src="slip_url" loading="lazy" decoding="async" />

// ✅ Lazy load components
const PaymentAccountModal = defineAsyncComponent(() =>
  import('./components/PaymentAccountModal.vue')
)
```

### 2. Code Structure Improvements

#### A. Component Splitting

```
WalletView.vue (Main)
├── WalletBalance.vue (Balance card)
├── WalletStats.vue (Stats section)
├── WalletTabs.vue (Tab navigation)
├── TransactionList.vue (Transaction history)
├── TopupModal.vue (Topup flow)
│   ├── TopupAmountStep.vue
│   └── TopupPaymentStep.vue
└── WithdrawalModal.vue (Withdrawal flow)
```

#### B. Composable Separation

```typescript
// useWalletBalance.ts - Balance only
// useWalletTransactions.ts - Transactions only
// useWalletTopup.ts - Topup logic
// useWalletWithdrawal.ts - Withdrawal logic
```

### 3. State Management

#### A. Pinia Store

```typescript
// stores/wallet.ts
export const useWalletStore = defineStore("wallet", () => {
  // State
  const balance = ref<WalletBalance | null>(null);
  const transactions = shallowRef<WalletTransaction[]>([]);

  // Getters (cached)
  const formattedBalance = computed(() =>
    balance.value ? formatMoney(balance.value.balance) : "0.00"
  );

  // Actions (optimized)
  const fetchBalance = async () => {
    // Add request deduplication
    if (fetchBalancePromise) return fetchBalancePromise;
    fetchBalancePromise = _fetchBalance();
    return fetchBalancePromise;
  };

  return { balance, transactions, formattedBalance, fetchBalance };
});
```

### 4. Image Optimization

#### A. Web Worker for Resize

```typescript
// workers/imageResize.worker.ts
self.onmessage = async (e) => {
  const { file, maxWidth, maxHeight, quality } = e.data;
  const resized = await resizeImage(file, maxWidth, maxHeight, quality);
  self.postMessage({ resized });
};

// Usage
const worker = new Worker(
  new URL("./workers/imageResize.worker.ts", import.meta.url)
);
worker.postMessage({ file, maxWidth: 1200, maxHeight: 1600, quality: 0.85 });
worker.onmessage = (e) => {
  slipFile.value = e.data.resized;
};
```

#### B. Progressive Image Loading

```typescript
// Show thumbnail first, then full image
<img
  :src="thumbnailUrl"
  :data-src="fullUrl"
  @load="loadFullImage"
  class="progressive-image"
/>
```

### 5. API Optimization

#### A. Request Batching

```typescript
// Batch multiple requests
const [balance, transactions, topups] = await Promise.all([
  fetchBalance(),
  fetchTransactions(),
  fetchTopupRequests(),
]);
```

#### B. Incremental Loading

```typescript
// Load in chunks
const loadMore = async () => {
  const nextPage = await fetchTransactions(page.value + 1, 20);
  transactions.value.push(...nextPage);
  page.value++;
};
```

#### C. Optimistic Updates

```typescript
// Update UI immediately, sync later
const createTopup = async (amount: number) => {
  // Optimistic update
  const tempRequest = {
    id: "temp-" + Date.now(),
    amount,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  topupRequests.value.unshift(tempRequest);

  // Actual API call
  try {
    const result = await api.createTopup(amount);
    // Replace temp with real data
    const index = topupRequests.value.findIndex((r) => r.id === tempRequest.id);
    topupRequests.value[index] = result;
  } catch (err) {
    // Rollback on error
    topupRequests.value = topupRequests.value.filter(
      (r) => r.id !== tempRequest.id
    );
  }
};
```

### 6. Rendering Optimization

#### A. v-memo for Lists

```vue
<div
  v-for="txn in transactions"
  :key="txn.id"
  v-memo="[txn.amount, txn.status]"
>
  <!-- Only re-render if amount or status changes -->
</div>
```

#### B. Skeleton Loading

```vue
<template v-if="loading">
  <div class="skeleton-card" v-for="i in 5" :key="i" />
</template>
<template v-else>
  <TransactionCard
    v-for="txn in transactions"
    :key="txn.id"
    :transaction="txn"
  />
</template>
```

#### C. CSS Containment

```css
.transaction-item {
  contain: layout style paint;
  content-visibility: auto;
}
```

---

## 📁 New File Structure

```
src/
├── views/
│   ├── WalletView.vue (Orchestrator - 150 lines)
│   └── AdminTopupRequestsView.vue (Optimized - 200 lines)
├── components/
│   └── wallet/
│       ├── WalletBalance.vue
│       ├── WalletStats.vue
│       ├── WalletTabs.vue
│       ├── TransactionList.vue
│       ├── TransactionItem.vue
│       ├── TopupModal/
│       │   ├── TopupModal.vue
│       │   ├── TopupAmountStep.vue
│       │   └── TopupPaymentStep.vue
│       └── WithdrawalModal/
│           ├── WithdrawalModal.vue
│           └── BankAccountSelector.vue
├── composables/
│   ├── wallet/
│   │   ├── useWalletBalance.ts
│   │   ├── useWalletTransactions.ts
│   │   ├── useWalletTopup.ts
│   │   └── useWalletWithdrawal.ts
│   └── useImageResize.ts
├── stores/
│   └── wallet.ts (Centralized state)
├── workers/
│   └── imageResize.worker.ts
└── utils/
    ├── formatters.ts (Memoized formatters)
    └── validators.ts
```

---

## 🎨 UI/UX Improvements

### 1. Loading States

```vue
<!-- Skeleton instead of spinner -->
<div class="skeleton-balance" v-if="loading" />
<div class="balance-card" v-else>...</div>

<!-- Progressive disclosure -->
<Transition name="fade">
  <div v-if="dataLoaded">...</div>
</Transition>
```

### 2. Smooth Animations

```css
/* Use transform instead of position */
.modal-enter-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Use will-change for animations */
.transaction-item {
  will-change: transform;
}

/* GPU acceleration */
.balance-amount {
  transform: translateZ(0);
}
```

### 3. Responsive Design

```css
/* Mobile-first */
.wallet-page {
  padding: 1rem;
}

@media (min-width: 768px) {
  .wallet-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## 📊 Performance Metrics

### Before Optimization

- Initial Load: ~2.5s
- Time to Interactive: ~3.2s
- First Contentful Paint: ~1.8s
- Bundle Size: ~450KB
- Re-renders: ~15 per interaction

### After Optimization (Target)

- Initial Load: <800ms ⚡
- Time to Interactive: <1.2s ⚡
- First Contentful Paint: <600ms ⚡
- Bundle Size: <200KB ⚡
- Re-renders: <3 per interaction ⚡

---

## ✅ Implementation Checklist

### Phase 1: Critical Performance ✅ COMPLETED

- [x] Split WalletView into components
  - [x] WalletBalance.vue
  - [x] WalletStats.vue
  - [x] WalletTabs.vue
  - [x] PendingAlert.vue
  - [x] TransactionList.vue
  - [x] TopupRequestList.vue
  - [x] WithdrawalList.vue
- [x] Implement memoized formatters (in store & components)
- [x] Optimize image resize (Web Worker)
- [x] Add request deduplication (in store)
- [x] Create Pinia wallet store with shallowRef
- [x] Split composables
  - [x] useWalletBalance.ts
  - [x] useWalletTransactions.ts
  - [x] useWalletTopup.ts
  - [x] useWalletWithdrawal.ts
  - [x] useImageResize.ts
- [x] Refactor WalletView.vue to use store (reduced from 792 to ~400 lines)
- [x] Add v-memo directives to list items

### Phase 2: State Management ✅ COMPLETED

- [x] Create Pinia wallet store
- [x] Split composables
- [x] Implement caching (memoized formatters)
- [x] Add request deduplication

### Phase 3: Rendering (Partial)

- [x] Implement v-memo in list components
- [x] Add CSS containment (content-visibility: auto)
- [ ] Add virtual scrolling (optional - for 1000+ items)
- [ ] Add skeleton loading states
- [ ] Optimize CSS further

### Phase 4: Polish (Next)

- [ ] Add smooth animations
- [ ] Improve error handling
- [ ] Add loading states
- [ ] Performance testing
- [ ] Refactor AdminTopupRequestsView.vue

---

## 🔍 Monitoring

### Performance Tracking

```typescript
// Add performance marks
performance.mark("wallet-load-start");
await fetchBalance();
performance.mark("wallet-load-end");
performance.measure("wallet-load", "wallet-load-start", "wallet-load-end");

// Log to analytics
const measure = performance.getEntriesByName("wallet-load")[0];
analytics.track("wallet_load_time", { duration: measure.duration });
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from "@sentry/vue";

try {
  await createTopup(amount);
} catch (err) {
  Sentry.captureException(err, {
    tags: { feature: "wallet", action: "topup" },
    extra: { amount, userId },
  });
}
```

---

**Status:** 📋 Ready to Implement
**Priority:** 🔥 High
**Estimated Time:** 4 days
**Impact:** 🚀 Very High
