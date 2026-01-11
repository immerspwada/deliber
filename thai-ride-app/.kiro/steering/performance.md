---
inclusion: always
---

# Performance Optimization

## Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "vue-router", "pinia"],
          supabase: ["@supabase/supabase-js"],
          maps: ["leaflet", "@googlemaps/js-api-loader"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

## Lazy Loading

```typescript
// router/index.ts - Route-based code splitting
const routes = [
  {
    path: "/",
    component: () => import("@/views/HomeView.vue"),
  },
  {
    path: "/ride/:id",
    component: () => import("@/views/RideDetailView.vue"),
  },
  {
    path: "/admin",
    component: () => import("@/views/AdminView.vue"),
    meta: { requiresAdmin: true },
  },
];
```

## Component Lazy Loading

```vue
<script setup lang="ts">
import { defineAsyncComponent } from "vue";

// Lazy load heavy components
const MapView = defineAsyncComponent({
  loader: () => import("@/components/MapView.vue"),
  loadingComponent: LoadingSpinner,
  delay: 200,
  timeout: 10000,
});
</script>
```

## Image Optimization

```vue
<template>
  <!-- ใช้ lazy loading -->
  <img :src="imageUrl" loading="lazy" decoding="async" :alt="altText" />

  <!-- Responsive images -->
  <picture>
    <source media="(max-width: 640px)" :srcset="`${imageUrl}?w=640`" />
    <source media="(max-width: 1024px)" :srcset="`${imageUrl}?w=1024`" />
    <img :src="imageUrl" :alt="altText" />
  </picture>
</template>
```

## Caching Strategies

```typescript
// services/cache.ts
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}
```

## Performance Metrics

```typescript
// utils/performance.ts
export function measurePerformance(name: string): () => void {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);

    // Send to analytics
    if (duration > 1000) {
      console.warn(`[Perf Warning] ${name} took ${duration}ms`);
    }
  };
}
```

## Core Web Vitals Targets

- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
