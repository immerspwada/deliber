---
inclusion: always
---

# Vue Component Standards

## Component Template

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { PropType } from "vue";

// Props with TypeScript
interface Props {
  title: string;
  items?: string[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  loading: false,
});

// Emits with TypeScript
const emit = defineEmits<{
  submit: [data: FormData];
  cancel: [];
}>();

// Reactive state
const isOpen = ref(false);

// Computed
const hasItems = computed(() => props.items.length > 0);

// Methods
function handleSubmit(): void {
  emit("submit", new FormData());
}
</script>

<template>
  <div class="component-wrapper">
    <h2>{{ title }}</h2>
    <slot name="header" />
    <div v-if="loading" class="loading">Loading...</div>
    <ul v-else-if="hasItems">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
    <slot />
  </div>
</template>
```

## Accessibility Requirements

- ทุก `<img>` ต้องมี `alt`
- ทุก `<button>` ต้องมี accessible label
- ใช้ semantic HTML (`<nav>`, `<main>`, `<article>`)
- Focus management สำหรับ modals/dialogs
- Color contrast ratio ≥ 4.5:1

## Performance Guidelines

- ใช้ `v-once` สำหรับ static content
- ใช้ `v-memo` สำหรับ expensive renders
- Lazy load components: `defineAsyncComponent()`
- ใช้ `shallowRef` เมื่อไม่ต้องการ deep reactivity

## Tailwind CSS Patterns

```vue
<template>
  <!-- ใช้ utility classes -->
  <button
    class="px-4 py-2 bg-blue-600 text-white rounded-lg 
           hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-colors duration-200"
    :disabled="loading"
  >
    {{ loading ? "กำลังโหลด..." : "ยืนยัน" }}
  </button>
</template>
```
