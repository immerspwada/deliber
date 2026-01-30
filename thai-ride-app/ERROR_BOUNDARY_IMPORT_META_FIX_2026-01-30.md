# 🔧 ErrorBoundary import.meta.env Fix

**Date**: 2026-01-30  
**Status**: ✅ Fixed  
**Priority**: 🔥 Critical - Build Error

---

## 🐛 Problem

Build error in `ErrorBoundary.vue`:

```
Error parsing JavaScript expression: import.meta may appear only with 'sourceType: "module"'

<details v-if="import.meta.env.DEV" class="error-details">
                       ^
```

**Root Cause**: Vue's template compiler doesn't support `import.meta` directly in template expressions.

---

## ✅ Solution

Move `import.meta.env` checks from template to script section:

### Before (❌ Error):

```vue
<script setup lang="ts">
onErrorCaptured((err: Error) => {
  if (import.meta.env.DEV) {
    console.error("[ErrorBoundary] Caught error:", err);
  }

  if (import.meta.env.PROD && window.Sentry) {
    window.Sentry.captureException(err);
  }
});
</script>

<template>
  <details v-if="import.meta.env.DEV" class="error-details">
    <!-- Error details -->
  </details>
</template>
```

### After (✅ Fixed):

```vue
<script setup lang="ts">
// Move import.meta.env checks to script section
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

onErrorCaptured((err: Error) => {
  if (isDev) {
    console.error("[ErrorBoundary] Caught error:", err);
  }

  if (isProd && window.Sentry) {
    window.Sentry.captureException(err);
  }
});
</script>

<template>
  <details v-if="isDev" class="error-details">
    <!-- Error details -->
  </details>
</template>
```

---

## 📝 Changes Made

**File**: `src/components/ErrorBoundary.vue`

1. **Added constants in script section**:

   ```typescript
   const isDev = import.meta.env.DEV;
   const isProd = import.meta.env.PROD;
   ```

2. **Updated onErrorCaptured**:
   - Changed `import.meta.env.DEV` → `isDev`
   - Changed `import.meta.env.PROD` → `isProd`

3. **Updated template**:
   - Changed `v-if="import.meta.env.DEV"` → `v-if="isDev"`

---

## ✅ Verification

```bash
# Check diagnostics
✅ No TypeScript errors
✅ No Vue compiler errors
✅ Build successful
```

---

## 📚 Lesson Learned

**Rule**: Never use `import.meta` directly in Vue templates

**Reason**: Vue's template compiler runs in a different context and doesn't support ES module syntax like `import.meta`.

**Solution**: Always move `import.meta` checks to the script section and use reactive variables in templates.

---

## 🎯 Related Issues

This is a common pattern that should be applied to all components:

```vue
<!-- ❌ DON'T -->
<div v-if="import.meta.env.DEV">Debug info</div>

<!-- ✅ DO -->
<script setup>
const isDev = import.meta.env.DEV;
</script>
<template>
  <div v-if="isDev">Debug info</div>
</template>
```

---

**Status**: ✅ Fixed and verified  
**Build**: ✅ Passing  
**Ready**: ✅ For deployment
