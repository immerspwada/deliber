output identical)
r

- ✅ No 500 errors
- ✅ All components render correctly
- ✅ Styles match design tokens
- ✅ Responsive design works
- ✅ Accessibility features intact

---

## 📚 Related Documentation

- [Tailwind 4 Migration Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Vue SFC Style Guide](https://vuejs.org/style-guide/)
- `.kiro/specs/admin-settings-ux-redesign/SCRIPT-SETUP-EXPORT-FIX.md`

---

**Status**: ✅ Fixed  
**Method**: Replace `@apply` with regular CSS  
**Time**: ~5 minutes  
**Breaking Changes**: None (visualeractions ✅ 6. Verify no console errors ✅

### Expected Behavio. **Vite compilation error**: Look for Tailwind-related errors in terminal

3. **Component won't load**: Inspect network tab for 500 errors

### Quick Fix Checklist

- [ ] Search for `@apply` in component
- [ ] Replace with equivalent CSS properties
- [ ] Test component loads without errors
- [ ] Verify styles look correct

---

## ✅ Verification

### Test Steps

1. Navigate to `/admin/settings` ✅
2. Click "ทั่วไป" card ✅
3. Verify `/admin/settings/system` loads ✅
4. Check all form fields render ✅
5. Test form intg Tips

### How to Identify This Issue

1. **500 Error on .vue file**: Check for `@apply` directives
   2ates\*\* (✅ Recommended):

```vue
<template>
  <button class="px-4 py-2 bg-blue-600 text-white rounded-lg">Click me</button>
</template>
```

**In Global CSS** (✅ OK for shared styles):

```css
/* styles/global.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg;
  }
}
```

**In SFC Styles** (❌ Avoid):

```css
/* Component.vue <style scoped> */
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg; /* Don't do this */
}
```

---

## 🔍 Debuggintext-white rounded-lg;

}
</style>

```

### When to Use Tailwind Utilities

**In Templ;
}
</style>
```

### New Approach (Tailwind 4)

```css
/* ✅ Works in Tailwind 4 */
<style scoped>
.my-class {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
```

---

## 📝 Best Practices

### For Vue SFC Components

**DO**:

```css
/* ✅ Use regular CSS */
<style scoped>
.button {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.5rem;
}
</style>
```

**DON'T**:

````css
/* ❌ Don't use @apply in SFC */
<style scoped>
.button {
  @apply px-4 py-2 bg-blue-600 ed in Tailwind 3 */
<style scoped>
.my-class {
  @apply flex items-center gap-2ngsErrorState.vue`
6. `src/admin/components/settings/SettingsEmptyState.vue`

---

## 💡 Why This Happened

### Tailwind 4 Changes

Tailwind CSS 4 introduced breaking changes:

1. **No `@apply` in SFC**: The `@apply` directive is no longer supported in Vue Single File Components
2. **Vite Compilation**: Vite can't process `@apply` directives in `.vue` files, causing 500 errors
3. **Build-time Processing**: Tailwind 4 processes utilities at build time differently

### Previous Approach (Tailwind 3)

```css
/* ✅ WorkingsLoadingState.vue`
5. `src/admin/components/settings/Setti
**After (✅)**:
```css
.empty-icon {
  font-size: 3.75rem;
  margin-bottom: 1rem;
}
````

---

## 🎯 Impact

### Fixed Issues

- ✅ All settings components now compile without errors
- ✅ `/admin/settings/system` loads correctly
- ✅ No more 500 Internal Server Errors
- ✅ Tailwind 4 compatible

### Files Changed

1. `src/admin/components/settings/SettingsFormField.vue`
2. `src/admin/components/settings/SettingsSection.vue`
3. `src/admin/components/settings/SettingsActions.vue`
4. `src/admin/components/settings/Settflex-direction: row;
   }
   }

````

### 6. SettingsEmptyState.vue

**Before (❌)**:
```css
.empty-icon {
  @apply text-6xl mb-4;
}
````

:

```css
.skeleton-line {
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### 5. SettingsErrorState.vue

**Before (❌)**:

```css
.error-actions {
  @apply flex flex-col sm:flex-row gap-3 w-full;
}
```

**After (✅)**:

```css
.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

@media (min-width: 640px) {
  .error-actions {
      @apply bg-gray-200 rounded animate-pulse;
}
```

**After (✅)** 2rem;
}

.section-content > _ + _ {
margin-top: 1rem;
}

````

### 3. SettingsActions.vue

**Before (❌)**:
```css
.btn-primary {
  @apply bg-primary-600 text-white;
  @apply hover:bg-primary-700 active:scale-95;
}
````

**After (✅)**:

```css
.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.95);
}
```

### 4. SettingsLoadingState.vue

**Before (❌)**:

```css
.skeleton-line {
  splay: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
```

### 2. SettingsSection.vue

**Before (❌)**:

```css
.settings-section {
  @apply mb-8;
}

.section-content {
  @apply space-y-4;
}
```

**After (✅)**:

````css
.settings-section {
  margin-bottom:SS properties in all 6 settings components.

---

## 📊 Files Fixed

### 1. SettingsFormField.vue

**Before (❌)**:
```css
.form-field {
  @apply mb-4;
}

.field-header {
  @apply flex items-center justify-between mb-2;
}
````

**After (✅)**:

```css
.form-field {
  margin-bottom: 1rem;
}

.field-header {
  dice All `@apply` Directives with Regular CSS

Converted all Tailwind utility classes to standard Cutes

---

## 🚨 Problem

Error when navigating to `/admin/settings/system`:

```

GET http://localhost:5173/src/admin/components/settings/SettingsFormField.vue
net::ERR_ABORTED 500 (Internal Server Error)

```

### Root Cause

**Tailwind 4 Compatibility Issue**

All settings components were using `@apply` directives in their `<style scoped>` sections, which causes Vite to throw a 500 Internal Server Error during compilation. Tailwind 4 doesn't support `@apply` in Vue SFC files.

---

## ✅ Solution

### Repla
**Status**: ✅ Complete
**Time**: ~5 min# 🔧 Tailwind @apply Directive Fix

**Date**: 2026-01-19
```
