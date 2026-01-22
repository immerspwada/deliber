# 🔧 Script Setup Export Fix

**Date**: 2026-01-19  
**Status**: ✅ Complete  
**Time**: < 2 minutes

---

## 🚨 Problem

Error when navigating to `/admin/settings/system`:

```
SyntaxError: The requested module '/src/admin/components/settings/index.ts' 
does not provide an export named 'SettingsActions'
```

### Root Cause

**Vue SFC `<script setup>` Export Issue**

Components using `<script setup>` syntax don't have traditional named exports. The `index.ts` file was trying to re-export them using `export { default as ... }` pattern, but this doesn't work with `<script setup>` components.

---

## ✅ Solution

### Change Import Strategy

Instead of using barrel exports from `index.ts`, import components directly:

**Before (❌ Broken)**:
```typescript
import {
  SettingsSection,
  SettingsFormField,
  SettingsActions,
  SettingsLoadingState,
  SettingsErrorState
} from '@/admin/components/settings'
```

**After (✅ Working)**:
```typescript
import SettingsSection from '@/admin/components/settings/SettingsSection.vue'
import SettingsFormField from '@/admin/components/settings/SettingsFormField.vue'
import SettingsActions from '@/admin/components/settings/SettingsActions.vue'
import SettingsLoadingState from '@/admin/components/settings/SettingsLoadingState.vue'
import SettingsErrorState from '@/admin/components/settings/SettingsErrorState.vue'
```

---

## 📊 Technical Details

### Vue SFC `<script setup>` Behavior

Components with `<script setup>`:
```vue
<script setup lang="ts">
// No export default needed
// Component is automatically exported
</script>
```

Are **automatically exported as default**, but:
- ❌ Cannot be re-exported with named exports in `index.ts`
- ❌ Barrel exports don't work properly
- ✅ Must be imported directly from `.vue` file

### Why Barrel Exports Failed

```typescript
// index.ts (❌ Doesn't work with <script setup>)
export { default as SettingsSection } from './SettingsSection.vue'

// This tries to access a 'default' export that doesn't exist
// in the traditional sense for <script setup> components
```

---

## 🎯 Impact

### Fixed Issues

- ✅ `/admin/settings/system` now loads correctly
- ✅ All settings components are accessible
- ✅ No more export errors

### Files Changed

1. `src/admin/views/SystemSettingsView.vue` - Changed import statements
2. `src/admin/components/settings/index.ts` - Updated (but not used anymore)

---

## 💡 Best Practices

### For `<script setup>` Components

**DO**:
```typescript
// ✅ Direct import
import MyComponent from '@/components/MyComponent.vue'
```

**DON'T**:
```typescript
// ❌ Barrel export with <script setup>
export { default as MyComponent } from './MyComponent.vue'
```

### When to Use Barrel Exports

Barrel exports (`index.ts`) work well with:
- ✅ Components using `<script>` + `export default`
- ✅ TypeScript utilities and functions
- ✅ Type definitions
- ❌ **NOT** with `<script setup>` components

### Alternative Solutions

If you want barrel exports with `<script setup>`:

**Option 1**: Use traditional `<script>` syntax
```vue
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MyComponent',
  setup() {
    // ...
  }
})
</script>
```

**Option 2**: Accept direct imports (recommended)
```typescript
// Just import directly - simpler and clearer
import MyComponent from '@/components/MyComponent.vue'
```

---

## 🔍 Related Issues

### Vite Module Resolution

This issue is related to how Vite resolves Vue SFC modules:

1. **SFC Compilation**: Vite compiles `.vue` files to JavaScript
2. **Default Export**: `<script setup>` creates implicit default export
3. **Re-export Problem**: Re-exporting doesn't preserve the implicit export correctly
4. **Solution**: Import directly from source file

### TypeScript Considerations

For TypeScript type checking:
```typescript
// Types work fine with direct imports
import type { ComponentProps } from '@/components/MyComponent.vue'
```

---

## 📝 Recommendations

### For This Project

1. **Use direct imports** for all `<script setup>` components
2. **Keep `index.ts`** for type exports only
3. **Document** this pattern in component guidelines

### Updated `index.ts` Purpose

```typescript
// src/admin/components/settings/index.ts
// NOTE: These components use <script setup> and should be imported directly
// This file is kept for type exports only

export type { Props as SettingsSectionProps } from './SettingsSection.vue'
export type { Props as SettingsFormFieldProps } from './SettingsFormField.vue'
// ... etc
```

---

## ✅ Verification

### Test Steps

1. Navigate to `/admin/settings` ✅
2. Click "ทั่วไป" card ✅
3. Verify `/admin/settings/system` loads ✅
4. Check all form fields render ✅
5. Test form submission ✅

### Expected Behavior

- ✅ No console errors
- ✅ All components render correctly
- ✅ Form is interactive
- ✅ Loading/error states work

---

**Status**: ✅ Fixed  
**Method**: Direct component imports  
**Time**: < 2 minutes  
**Breaking Changes**: None (internal change only)
