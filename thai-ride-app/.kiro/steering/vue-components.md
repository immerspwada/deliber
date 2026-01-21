---
inclusion: fileMatch
fileMatchPattern: "**/*.vue"
---

# Vue Component Standards

## Component Template

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, onMounted } from "vue";
import type { ComponentProps } from "@/types";

// 2. Props & Emits
interface Props {
  title: string;
  items?: string[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  loading: false,
});

const emit = defineEmits<{
  submit: [data: FormData];
  cancel: [];
}>();

// 3. Composables
const { isOnline } = useOfflineStatus();

// 4. Reactive State
const isOpen = ref(false);

// 5. Computed
const hasItems = computed(() => props.items.length > 0);

// 6. Methods
function handleSubmit(): void {
  emit("submit", new FormData());
}

// 7. Lifecycle
onMounted(() => {
  // initialization
});
</script>

<template>
  <div class="component-wrapper">
    <slot name="header" />
    <div v-if="loading" class="animate-pulse">Loading...</div>
    <ul v-else-if="hasItems">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
    <slot />
  </div>
</template>
```

## Accessibility (A11y) - REQUIRED

```vue
<template>
  <!-- ✅ Images: ต้องมี alt -->
  <img :src="url" :alt="description" />

  <!-- ✅ Buttons: ต้องมี accessible label -->
  <button type="button" aria-label="ปิด">
    <XIcon class="w-5 h-5" />
  </button>

  <!-- ✅ Forms: ต้องมี label -->
  <label for="email">อีเมล</label>
  <input id="email" type="email" autocomplete="email" />

  <!-- ✅ Semantic HTML -->
  <nav aria-label="Main navigation">...</nav>
  <main>...</main>
  <article>...</article>

  <!-- ✅ Focus management for modals -->
  <dialog ref="dialogRef" @keydown.esc="close">
    <div role="document">...</div>
  </dialog>
</template>
```

## Performance Patterns

```vue
<script setup lang="ts">
// ✅ Lazy load heavy components
const MapView = defineAsyncComponent(() => import("@/components/MapView.vue"));

// ✅ Use shallowRef for large objects
const largeData = shallowRef<BigObject | null>(null);

// ✅ Debounce expensive operations
const debouncedSearch = useDebounceFn(search, 300);
</script>

<template>
  <!-- ✅ v-once for static content -->
  <header v-once>{{ appName }}</header>

  <!-- ✅ v-memo for expensive renders -->
  <div v-memo="[item.id, item.status]">
    <ExpensiveComponent :item="item" />
  </div>

  <!-- ✅ Lazy load images -->
  <img :src="url" loading="lazy" decoding="async" />
</template>
```

## Tailwind CSS Patterns

```vue
<template>
  <!-- ✅ Button with states -->
  <button
    type="button"
    class="px-4 py-2 bg-primary-600 text-white rounded-xl
           hover:bg-primary-700 active:scale-95
           focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-all duration-200"
    :disabled="loading"
  >
    {{ loading ? "กำลังโหลด..." : "ยืนยัน" }}
  </button>

  <!-- ✅ Touch-friendly (min 44px) -->
  <button class="min-h-[44px] min-w-[44px] p-3">
    <Icon />
  </button>
</template>
```

## Component Checklist

- [ ] TypeScript props with defaults
- [ ] Emits properly typed
- [ ] Accessible (a11y compliant)
- [ ] Touch targets ≥ 44px
- [ ] Loading/Error states handled
- [ ] Mobile-first responsive
