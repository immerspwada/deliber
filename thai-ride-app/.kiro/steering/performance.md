---
inclusion: always
---

# ⚡ Performance Standards

## Core Web Vitals Targets

| Metric                          | Target  | Poor    |
| ------------------------------- | ------- | ------- |
| LCP (Largest Contentful Paint)  | < 2.5s  | > 4s    |
| INP (Interaction to Next Paint) | < 200ms | > 500ms |
| CLS (Cumulative Layout Shift)   | < 0.1   | > 0.25  |
| FCP (First Contentful Paint)    | < 1.8s  | > 3s    |
| TTFB (Time to First Byte)       | < 800ms | > 1.8s  |

## Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-core": ["vue", "vue-router", "pinia"],
          supabase: ["@supabase/supabase-js"],
          maps: ["leaflet"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false,
  },
});
```

## Code Splitting

```typescript
// ✅ Route-based splitting
const routes = [
  {
    path: "/customer",
    component: () => import("@/layouts/CustomerLayout.vue"),
    children: [
      {
        path: "ride",
        component: () => import("@/views/customer/RideView.vue"),
      },
    ],
  },
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: { requiresAdmin: true },
  },
];

// ✅ Component lazy loading
const HeavyChart = defineAsyncComponent({
  loader: () => import("@/components/HeavyChart.vue"),
  loadingComponent: ChartSkeleton,
  delay: 200,
});
```

## Image Optimization

```vue
<template>
  <!-- ✅ Lazy loading + responsive -->
  <img
    :src="imageUrl"
    :srcset="`${imageUrl}?w=400 400w, ${imageUrl}?w=800 800w`"
    sizes="(max-width: 640px) 400px, 800px"
    loading="lazy"
    decoding="async"
    :alt="altText"
  />

  <!-- ✅ Placeholder for CLS prevention -->
  <div class="aspect-video bg-gray-100">
    <img class="w-full h-full object-cover" ... />
  </div>
</template>
```

## Caching Strategy

```typescript
// utils/cache.ts
const cache = new Map<string, { data: unknown; expires: number }>();

export function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 5 * 60 * 1000
): Promise<T> {
  const entry = cache.get(key);

  if (entry && entry.expires > Date.now()) {
    return Promise.resolve(entry.data as T);
  }

  return fetcher().then((data) => {
    cache.set(key, { data, expires: Date.now() + ttl });
    return data;
  });
}
```

## Vue Performance Patterns

```vue
<script setup lang="ts">
// ✅ shallowRef for large objects
const bigData = shallowRef<LargeObject | null>(null);

// ✅ Computed with cache
const expensiveResult = computed(() => {
  return heavyCalculation(props.items);
});

// ✅ Debounce user input
const debouncedSearch = useDebounceFn(search, 300);
</script>

<template>
  <!-- ✅ v-once for static content -->
  <header v-once>{{ appTitle }}</header>

  <!-- ✅ v-memo for list items -->
  <div v-for="item in items" :key="item.id" v-memo="[item.id, item.updated]">
    <ExpensiveItem :item="item" />
  </div>

  <!-- ✅ Conditional rendering -->
  <HeavyComponent v-if="showHeavy" />
</template>
```

## Database Query Performance

```typescript
// ✅ Select specific columns
const { data } = await supabase
  .from("rides")
  .select("id, status, fare") // NOT select('*')
  .limit(20);

// ✅ Use indexes
// CREATE INDEX idx_rides_status ON rides(status);
// CREATE INDEX idx_rides_customer ON rides(customer_id, created_at DESC);

// ✅ Pagination
const { data } = await supabase
  .from("rides")
  .select("*")
  .range(offset, offset + limit - 1);
```

## Performance Monitoring

```typescript
// utils/perf.ts
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  return fn().finally(() => {
    const duration = performance.now() - start;

    if (duration > 1000) {
      console.warn(`[Perf] ${name}: ${duration.toFixed(0)}ms`);
    }

    // Send to analytics in production
    if (import.meta.env.PROD) {
      sendMetric(name, duration);
    }
  });
}
```

## Performance Checklist

- [ ] Bundle size < 500KB gzipped
- [ ] Lighthouse score ≥ 90
- [ ] API response < 500ms
- [ ] Database queries < 100ms
- [ ] Images lazy loaded
- [ ] Code splitting implemented
