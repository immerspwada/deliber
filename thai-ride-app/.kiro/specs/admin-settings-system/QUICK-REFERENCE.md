# Admin Settings System - Quick Reference

## 🎯 Quick Access

**URL:** `/admin/settings`  
**Role Required:** Admin  
**Migration:** 310_comprehensive_admin_settings_system.sql

## 📊 Settings Categories

| Category     | Icon | Count | Description                                      |
| ------------ | ---- | ----- | ------------------------------------------------ |
| General      | ⚙️   | 6     | App name, version, maintenance, support contacts |
| Ride         | 🚗   | 8     | Fares, rates, fees, surge pricing                |
| Payment      | 💳   | 8     | Commission, limits, fees, VAT                    |
| Provider     | 👤   | 5     | Approval, limits, age requirements               |
| Notification | 🔔   | 4     | Push, SMS, email toggles                         |
| Security     | 🔒   | 5     | Login attempts, timeouts, verification           |
| Features     | 🎯   | 8     | Service toggles, programs                        |
| Map          | 🗺️   | 3     | Zoom, radius, update intervals                   |
| Analytics    | 📊   | 3     | Tracking, reporting, monitoring                  |

**Total:** 50 settings

## 🔑 Key Settings

### Critical Settings (Review First)

```typescript
// Maintenance Mode
maintenance_mode: boolean = false;

// Commission Rate
commission_rate: number = 15; // %

// Base Fare
base_fare: number = 35; // THB

// Provider Approval
approval_required: boolean = true;

// Max Login Attempts
max_login_attempts: number = 5;
```

### Most Used Settings

```typescript
// Ride Settings
base_fare: 35;
per_km_rate: 8;
per_minute_rate: 2;
booking_fee: 5;
cancellation_fee: 20;

// Payment Settings
min_topup_amount: 50;
max_topup_amount: 10000;
min_withdrawal_amount: 100;
max_withdrawal_amount: 50000;
withdrawal_fee: 10;

// Provider Settings
max_active_jobs: 3;
auto_offline_minutes: 30;
min_age: 20;
```

## 💻 Code Examples

### Get Setting Value

```typescript
import { useSystemSettings } from "@/admin/composables/useSystemSettings";

const { getTypedValue } = useSystemSettings();

// Boolean
const maintenanceMode = getTypedValue<boolean>("maintenance_mode", "general");

// Number
const baseFare = getTypedValue<number>("base_fare", "ride");

// String
const appName = getTypedValue<string>("app_name", "general");
```

### Update Setting

```typescript
const { updateSetting } = useSystemSettings();

const result = await updateSetting("base_fare", "40", "ride");

if (result.success) {
  console.log("✅ Updated successfully");
} else {
  console.error("❌ Error:", result.message);
}
```

### Fetch Settings by Category

```typescript
const { fetchSettingsByCategory, settings } = useSystemSettings();

await fetchSettingsByCategory("payment");

// settings.value now contains all payment settings
settings.value.forEach((setting) => {
  console.log(`${setting.setting_key}: ${setting.setting_value}`);
});
```

### Get All Categories

```typescript
const { fetchCategories, categories } = useSystemSettings();

await fetchCategories();

categories.value.forEach((cat) => {
  console.log(`${cat.category}: ${cat.setting_count} settings`);
});
```

## 🗄️ Database Queries

### Get Setting Value

```sql
-- Get single setting
SELECT setting_value
FROM system_settings
WHERE setting_key = 'base_fare'
AND category = 'ride';

-- Get all settings in category
SELECT setting_key, setting_value, data_type
FROM system_settings
WHERE category = 'payment'
ORDER BY display_order;
```

### Update Setting (as Admin)

```sql
-- Using RPC function (recommended)
SELECT update_setting('base_fare', '40', 'ride');

-- Direct update (not recommended - no audit log)
UPDATE system_settings
SET setting_value = '40', updated_at = NOW()
WHERE setting_key = 'base_fare' AND category = 'ride';
```

### View Audit Log

```sql
-- Recent changes
SELECT
  setting_key,
  old_value,
  new_value,
  changed_at,
  changed_by
FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 20;

-- Changes for specific setting
SELECT *
FROM settings_audit_log
WHERE setting_key = 'base_fare'
ORDER BY changed_at DESC;
```

### Get Public Settings

```sql
-- Settings visible to all users
SELECT category, setting_key, setting_value
FROM system_settings
WHERE is_public = true
ORDER BY category, display_order;
```

## 🎨 UI Features

### Navigation

- **Sidebar:** Category list with icons and counts
- **Search:** Real-time search across all settings
- **Active State:** Highlighted selected category

### Editing

- **Boolean:** Toggle switch
- **Number:** Number input with min/max validation
- **String:** Text input with pattern validation
- **Save:** Individual save buttons per setting
- **Bulk Save:** Save all changes button
- **Reset:** Revert all changes button

### Visual Indicators

- **Yellow Border:** Setting has unsaved changes
- **Loading Spinner:** Save in progress
- **Success Message:** Green toast notification
- **Error Message:** Red toast notification

### Audit Log

- **Modal View:** Click "Audit Log" button
- **Change History:** Old → New values
- **Timestamps:** When changes occurred
- **User Tracking:** Who made changes

## 🔒 Security

### RLS Policies

```sql
-- Admin full access
CREATE POLICY "admin_full_access_settings" ON system_settings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Public settings readable
CREATE POLICY "public_settings_read" ON system_settings
  FOR SELECT TO authenticated
  USING (is_public = true);
```

### Validation Rules

```typescript
// Number validation
{
  min: 0,
  max: 100
}

// String pattern
{
  pattern: "^[0-9]{10}$" // Phone number
}

// Enum options
{
  options: ["option1", "option2", "option3"]
}
```

## 📱 Responsive Design

- **Desktop:** Sidebar + main panel layout
- **Tablet:** Stacked layout, collapsible sidebar
- **Mobile:** Full-width, category dropdown

## 🔧 Common Tasks

### Add New Setting

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
  'ride',
  'night_surcharge',
  '10',
  'number',
  'Night Surcharge',
  'ค่าบริการกลางคืน',
  'Additional charge for night rides',
  true,
  true,
  20
);
```

### Make Setting Read-Only

```sql
UPDATE system_settings
SET is_editable = false
WHERE setting_key = 'commission_rate';
```

### Make Setting Public

```sql
UPDATE system_settings
SET is_public = true
WHERE setting_key = 'base_fare';
```

### Add Validation Rules

```sql
UPDATE system_settings
SET validation_rules = '{"min": 10, "max": 100}'::jsonb
WHERE setting_key = 'base_fare';
```

## 🐛 Troubleshooting

### Cannot Access Settings Page

```sql
-- Check your role
SELECT role FROM profiles WHERE id = auth.uid();
-- Should return 'admin'
```

### Settings Not Loading

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'system_settings';
-- rowsecurity should be true
```

### Cannot Update Setting

```sql
-- Check if editable
SELECT is_editable
FROM system_settings
WHERE setting_key = 'your_key';
-- Should return true
```

### Validation Error

```sql
-- Check validation rules
SELECT validation_rules
FROM system_settings
WHERE setting_key = 'your_key';
```

## 📞 Support

**Documentation:** `.kiro/specs/admin-settings-system/`

- `IMPLEMENTATION-SUMMARY.md` - Complete overview
- `DEPLOYMENT-GUIDE.md` - Deployment instructions
- `QUICK-REFERENCE.md` - This file

**Migration:** `supabase/migrations/310_comprehensive_admin_settings_system.sql`

**Files:**

- Composable: `src/admin/composables/useSystemSettings.ts`
- View: `src/admin/views/AdminSettingsView.vue`

---

**Last Updated:** 2026-01-18  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
