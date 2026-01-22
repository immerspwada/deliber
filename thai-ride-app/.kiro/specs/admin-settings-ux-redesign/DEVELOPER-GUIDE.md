# 👨‍💻 System Settings - Developer Guide

**Date**: 2026-01-19  
**Status**: Production Ready  
**Tech Stack**: Vue 3 + TypeScript + Supabase + MCP

---

## 🎯 Quick Start

### 1. Run Development Server

```bash
npm run dev
```

### 2. Access System Settings

```
URL: http://localhost:5173/admin/settings/system
Login: admin@gobear.app
```

### 3. Check Database

```sql
-- Via MCP (Recommended)
SELECT * FROM system_settings;

-- Or via Supabase Dashboard
https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
```

---

## 📁 Project Structure

```
src/admin/
├── views/
│   └── SystemSettingsView.vue          # Main settings page
├── composables/
│   └── useSystemSettings.ts            # Settings logic
├── components/
│   └── settings/
│       ├── SettingsSection.vue         # Section wrapper
│       ├── SettingsFormField.vue       # Form field
│       ├── SettingsActions.vue         # Action buttons
│       ├── SettingsLoadingState.vue    # Loading UI
│       ├── SettingsErrorState.vue      # Error UI
│       └── SettingsEmptyState.vue      # Empty UI
└── styles/
    └── design-tokens.ts                # Design system

src/types/
└── financial-settings.ts               # Type definitions

.kiro/specs/admin-settings-ux-redesign/
├── PRODUCTION-IMPLEMENTATION-COMPLETE.md
├── TESTING-INSTRUCTIONS-PRODUCTION.md
└── DEVELOPER-GUIDE.md                  # This file
```

---

## 🔧 Core Components

### 1. SystemSettingsView.vue

**Purpose**: Main settings page with form

**Key Features**:

- Load settings from Production DB
- Form validation
- Save changes with audit logging
- Error handling
- Toast notifications

**Usage**:

```vue
<template>
  <div class="system-settings-view">
    <form @submit.prevent="handleSubmit">
      <SettingsSection title="General">
        <SettingsFormField label="Site Name">
          <input v-model="form.siteName" />
        </SettingsFormField>
      </SettingsSection>

      <SettingsActions
        :loading="saving"
        :has-changes="hasChanges"
        @cancel="handleCancel"
      />
    </form>
  </div>
</template>
```

---

### 2. useSystemSettings.ts

**Purpose**: Composable for settings management

**API**:

```typescript
const {
  // State
  settings, // ref<SystemSetting[]>
  categories, // ref<SettingCategory[]>
  auditLog, // ref<AuditLogEntry[]>
  isLoading, // ref<boolean>
  error, // ref<string | null>

  // Computed
  settingsByCategory, // Record<string, SystemSetting[]>

  // Methods
  fetchCategories, // () => Promise<void>
  fetchAllSettings, // () => Promise<void>
  fetchSettingsByCategory, // (category: string) => Promise<void>
  updateSetting, // (key, value, category?) => Promise<Result>
  fetchAuditLog, // (limit?) => Promise<void>
  getSettingValue, // (key, category?) => string | null
  getTypedValue, // <T>(key, category?) => T | null
  getCategoryDisplayName, // (category) => string
  getCategoryIcon, // (category) => string
  validateSettingValue, // (setting, value) => ValidationResult
} = useSystemSettings();
```

**Example**:

```typescript
// Load all settings
await fetchAllSettings();

// Get specific value
const siteName = getSettingValue("site_name", "general");

// Get typed value
const maintenanceMode = getTypedValue<boolean>("maintenance_mode", "general");

// Update setting
const result = await updateSetting("site_name", "New Name", "general");
if (result.success) {
  toast.success("Updated!");
}
```

---

## 🗄️ Database Schema

### system_settings Table

```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  display_name TEXT NOT NULL,
  display_name_th TEXT,
  description TEXT,
  description_th TEXT,
  is_public BOOLEAN DEFAULT false,
  is_editable BOOLEAN DEFAULT true,
  validation_rules JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, setting_key)
);
```

### settings_audit_log Table

```sql
CREATE TABLE settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL,
  category TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔒 RPC Functions

### 1. get_system_settings()

```sql
-- Returns all settings (Admin only)
SELECT * FROM get_system_settings();
```

### 2. get_settings_categories()

```sql
-- Returns categories with counts (Admin only)
SELECT * FROM get_settings_categories();
```

### 3. get_settings_by_category(p_category)

```sql
-- Returns settings for specific category (Admin only)
SELECT * FROM get_settings_by_category('general');
```

### 4. update_setting(p_setting_key, p_new_value, p_category)

```sql
-- Updates setting and logs change (Admin only)
SELECT update_setting('site_name', 'New Name', 'general');
```

---

## 🔐 Security

### RLS Policies

```sql
-- Admin can manage all settings
CREATE POLICY "Admin can manage system settings" ON system_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Public settings readable by all
CREATE POLICY "Public settings are readable by all" ON system_settings
  FOR SELECT TO authenticated
  USING (is_public = true);
```

### Function Security

All RPC functions check admin role:

```sql
IF NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid() AND role = 'admin'
) THEN
  RAISE EXCEPTION 'Unauthorized: Admin access required';
END IF;
```

---

## 📝 Type Definitions

### SystemSetting

```typescript
interface SystemSetting {
  id: string;
  category: string;
  setting_key: string;
  setting_value: string;
  data_type: "string" | "number" | "boolean" | "json";
  display_name: string;
  display_name_th?: string;
  description?: string;
  description_th?: string;
  is_public: boolean;
  is_editable: boolean;
  validation_rules?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  display_order: number;
}
```

### SettingCategory

```typescript
interface SettingCategory {
  category: string;
  setting_count: number;
}
```

### AuditLogEntry

```typescript
interface AuditLogEntry {
  id: string;
  setting_key: string;
  category: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}
```

---

## 🎨 Design Tokens

```typescript
// src/admin/styles/design-tokens.ts
export const typography = {
  h1: "text-3xl font-bold",
  h2: "text-2xl font-semibold",
  h3: "text-xl font-semibold",
  body: "text-base",
  small: "text-sm",
};

export const colors = {
  primary: "#3b82f6",
  error: "#dc2626",
  success: "#10b981",
  warning: "#f59e0b",
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
};
```

---

## 🧪 Testing

### Unit Tests

```typescript
// Example test
import { describe, it, expect } from "vitest";
import { useSystemSettings } from "@/admin/composables/useSystemSettings";

describe("useSystemSettings", () => {
  it("should validate email format", () => {
    const { validateSettingValue } = useSystemSettings();

    const setting = {
      data_type: "string",
      validation_rules: {
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      },
    };

    const result = validateSettingValue(setting, "invalid-email");
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Test with real database
describe("SystemSettings Integration", () => {
  it("should load settings from database", async () => {
    const { fetchAllSettings, settings } = useSystemSettings();
    await fetchAllSettings();
    expect(settings.value.length).toBeGreaterThan(0);
  });
});
```

---

## 🚀 Deployment

### Production Checklist

- [x] Database functions created
- [x] RLS policies enabled
- [x] Initial data inserted
- [x] Frontend integrated
- [x] Error handling complete
- [x] Accessibility verified
- [x] Performance optimized

### Deploy Command

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🐛 Debugging

### Common Issues

#### 1. "Unauthorized: Admin access required"

**Cause**: User doesn't have admin role  
**Fix**: Check `users.role = 'admin'`

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

#### 2. "Function does not exist"

**Cause**: RPC functions not created  
**Fix**: Run MCP commands to create functions

#### 3. Settings not loading

**Cause**: Network error or RLS policy issue  
**Fix**: Check browser console and network tab

### Debug Queries

```sql
-- Check admin users
SELECT id, email, role FROM users WHERE role = 'admin';

-- Check settings
SELECT * FROM system_settings ORDER BY category, display_order;

-- Check audit log
SELECT * FROM settings_audit_log ORDER BY changed_at DESC LIMIT 10;

-- Test RPC functions
SELECT * FROM get_system_settings();
```

---

## 📊 Performance Tips

### 1. Caching

```typescript
// Cache settings in memory
const settingsCache = new Map<string, SystemSetting>();

function getCachedSetting(key: string): SystemSetting | null {
  return settingsCache.get(key) || null;
}
```

### 2. Debounce Updates

```typescript
import { useDebounceFn } from "@vueuse/core";

const debouncedUpdate = useDebounceFn(async (key, value) => {
  await updateSetting(key, value);
}, 500);
```

### 3. Lazy Loading

```typescript
// Load settings only when needed
const SettingsView = defineAsyncComponent(
  () => import("@/admin/views/SystemSettingsView.vue"),
);
```

---

## 🔄 Adding New Settings

### Step 1: Add to Database

```sql
INSERT INTO system_settings (
  category,
  setting_key,
  setting_value,
  data_type,
  display_name,
  display_name_th,
  description,
  is_public,
  is_editable,
  display_order
) VALUES (
  'general',
  'new_setting',
  'default_value',
  'string',
  'New Setting',
  'การตั้งค่าใหม่',
  'Description of new setting',
  false,
  true,
  10
);
```

### Step 2: Add to Form

```vue
<SettingsFormField id="new-setting" label="New Setting" help-text="Description">
  <input
    id="new-setting"
    v-model="form.newSetting"
    type="text"
    class="form-input"
  />
</SettingsFormField>
```

### Step 3: Add to Form State

```typescript
const form = ref({
  // ... existing fields
  newSetting: "",
});
```

### Step 4: Add to Load/Save Logic

```typescript
// Load
form.value.newSetting = getSettingValue("new_setting", "general") || "";

// Save
await updateSetting("new_setting", form.value.newSetting, "general");
```

---

## 📚 Resources

### Documentation

- [Vue 3 Docs](https://vuejs.org/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)

### Internal Docs

- `PRODUCTION-IMPLEMENTATION-COMPLETE.md` - Implementation details
- `TESTING-INSTRUCTIONS-PRODUCTION.md` - Testing guide
- `src/admin/composables/useSystemSettings.ts` - API reference

---

## 🤝 Contributing

### Code Style

- Use TypeScript strict mode
- Follow Vue 3 Composition API
- Use Tailwind CSS for styling
- Add JSDoc comments for functions
- Write unit tests for logic

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-new-setting

# Make changes
git add .
git commit -m "feat: add new setting"

# Push and create PR
git push origin feature/add-new-setting
```

---

## 📞 Support

### Questions?

- Check this guide first
- Review implementation docs
- Check database schema
- Test with SQL queries

### Issues?

- Check browser console
- Check network tab
- Check database logs
- Contact dev team

---

**Created**: 2026-01-19  
**Last Updated**: 2026-01-19  
**Maintainer**: Dev Team
