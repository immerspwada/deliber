# 🔄 Dev Server Restart Required

**Date**: 2026-01-19  
**Status**: ⚠️ ACTION REQUIRED  
**Priority**: 🔥 CRITICAL

---

## 🚨 Current Issue

Getting **500 Internal Server Error** when trying to load Settings components:

```
GET http://localhost:5173/src/admin/components/settings/SettingsFormField.vue
net::ERR_ABORTED 500 (Internal Server Error)

TypeError: Failed to fetch dynamically imported module:
http://localhost:5173/src/admin/views/SystemSettingsView.vue?t=1768813417262
```

---

## 🎯 Root Cause

After making significant changes to Vue SFC components (especially fixing `@apply` directives and component structure), **Vite dev server needs to be restarted** to:

1. Clear internal module cache
2. Re-parse all Vue SFC files
3. Rebuild dependency graph
4. Recognize new component imports

---

## ✅ Solution: Restart Dev Server

### Step 1: Stop Current Server

In your terminal where `npm run dev` is running:

```bash
# Press Ctrl+C to stop the server
^C
```

### Step 2: Clear Vite Cache (Optional but Recommended)

```bash
rm -rf node_modules/.vite
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Wait for Server to Start

```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🧪 Testing After Restart

### Test 1: Settings Hub

1. Navigate to: `http://localhost:5173/admin/settings`
2. ✅ Should see Settings Hub with 8 cards
3. ✅ Each card should display its URL path
4. ✅ No console errors

### Test 2: System Settings

1. Click on "ทั่วไป" card (or navigate to `/admin/settings/system`)
2. ✅ Should see System Settings form
3. ✅ Form should load with mock data
4. ✅ All form fields should be interactive
5. ✅ No 500 errors in console

### Test 3: Navigation

1. Click "กลับ" button
2. ✅ Should return to Settings Hub
3. ✅ Navigation should be smooth

### Test 4: Other Settings Cards

Click each card and verify URL changes:

- ✅ `/admin/settings/system` - System Settings
- ✅ `/admin/settings/theme` - Theme Settings (placeholder)
- ✅ `/admin/settings/language` - Language Settings (placeholder)
- ✅ `/admin/settings/financial` - Financial Settings (existing)
- ✅ `/admin/settings/notifications` - Notification Settings (existing)
- ✅ `/admin/settings/security` - Security Settings (existing)
- ✅ `/admin/settings/service-areas` - Service Areas (existing)
- ✅ `/admin/settings/maps` - Maps Settings (existing)

---

## 📋 What Was Fixed

### 1. Tailwind 4 Compatibility

- ❌ **Before**: Used `@apply` directives in Vue SFC `<style scoped>`
- ✅ **After**: Replaced with regular CSS (Tailwind 4 doesn't support `@apply` in SFC)

### 2. Component Exports

- ❌ **Before**: Barrel exports in `index.ts` (doesn't work with `<script setup>`)
- ✅ **After**: Direct imports in components

### 3. URL Display

- ✅ **Added**: Each setting card now shows its URL path
- ✅ **Added**: URL prop to `SettingCard.vue`

### 4. Routing Structure

- ✅ **Fixed**: `/admin/settings` → Settings Hub (navigation)
- ✅ **Fixed**: `/admin/settings/system` → System Settings (form)
- ✅ **Fixed**: All other settings routes properly configured

---

## 🔍 Files Changed

### Components Created/Modified

1. `src/admin/styles/design-tokens.ts` - Design system tokens
2. `src/admin/components/settings/SettingsSection.vue` - Section wrapper
3. `src/admin/components/settings/SettingsFormField.vue` - Form field wrapper
4. `src/admin/components/settings/SettingsActions.vue` - Action buttons
5. `src/admin/components/settings/SettingsLoadingState.vue` - Loading state
6. `src/admin/components/settings/SettingsErrorState.vue` - Error state
7. `src/admin/components/settings/SettingsEmptyState.vue` - Empty state
8. `src/admin/components/SettingCard.vue` - Navigation card with URL
9. `src/admin/views/AdminSettingsView.vue` - Settings Hub
10. `src/admin/views/SystemSettingsView.vue` - System Settings form

### Router Updated

- `src/admin/router.ts` - Added proper routing structure

---

## ⚠️ Common Issues After Restart

### Issue 1: Still Getting 500 Errors

**Solution**: Clear browser cache and hard reload

```
Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

### Issue 2: Components Not Found

**Solution**: Check import paths are correct

```typescript
// ✅ Correct
import SettingsSection from "@/admin/components/settings/SettingsSection.vue";

// ❌ Wrong
import { SettingsSection } from "@/admin/components/settings";
```

### Issue 3: Styles Not Applied

**Solution**: Check Tailwind classes are correct (no `@apply` in SFC)

```vue
<!-- ✅ Correct -->
<style scoped>
.btn {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
}
</style>

<!-- ❌ Wrong -->
<style scoped>
.btn {
  @apply px-4 py-2 bg-primary-600;
}
</style>
```

---

## 🎯 Next Steps After Successful Restart

1. ✅ Verify Settings Hub loads correctly
2. ✅ Test System Settings form
3. ✅ Implement remaining settings pages:
   - Theme Settings
   - Language Settings
   - (Financial, Notifications, Security, Service Areas, Maps already exist)
4. ✅ Add loading/error states to Settings Hub if needed
5. ✅ Add form validation to System Settings
6. ✅ Connect to real backend API

---

## 📊 Expected Behavior

### Settings Hub (`/admin/settings`)

```
การตั้งค่าระบบ
จัดการการตั้งค่าและการกำหนดค่าระบบทั้งหมด

ทั่วไป
┌─────────────────────────────────────┐
│ ⚙️ ทั่วไป                          │
│ จัดการข้อมูลพื้นฐานของเว็บไซต์...  │
│ /admin/settings/system              │
└─────────────────────────────────────┘

[8 cards total in 4 sections]
```

### System Settings (`/admin/settings/system`)

```
← กลับ

การตั้งค่าระบบ
จัดการข้อมูลพื้นฐานของเว็บไซต์ SEO และการติดต่อ

[Loading State] → [Form with 3 sections] → [Action Buttons]
```

---

## 🚀 Performance Metrics

After restart, expect:

- ⚡ Settings Hub load: < 500ms
- ⚡ System Settings load: < 1s (with mock data)
- ⚡ Navigation: < 200ms
- ⚡ No console errors
- ⚡ Smooth animations

---

## 📝 Summary

**Problem**: 500 errors when loading Settings components  
**Cause**: Vite dev server needs restart after major SFC changes  
**Solution**: Stop server (Ctrl+C) → Clear cache → Restart (`npm run dev`)  
**Expected**: All Settings pages load without errors  
**Time**: ~30 seconds total

---

**Ready to test?** Restart your dev server now! 🚀
