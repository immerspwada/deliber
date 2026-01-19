# Admin Settings System - Deployment Guide

## 🚀 Quick Start

### 1. Apply Migration

**Local Development:**

```bash
# Start Supabase (if not running)
npx supabase start

# Apply migration
npx supabase db push --local

# Generate types
npx supabase gen types --local > src/types/database.ts
```

**Production:**

```bash
# Apply to production
npx supabase db push

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/310_comprehensive_admin_settings_system.sql
# 3. Execute
```

### 2. Verify Installation

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('system_settings', 'settings_audit_log');

-- Check settings count
SELECT category, COUNT(*) as count
FROM system_settings
GROUP BY category
ORDER BY category;

-- Expected output:
-- analytics    | 3
-- features     | 8
-- general      | 6
-- map          | 3
-- notification | 4
-- payment      | 8
-- provider     | 5
-- ride         | 8
-- security     | 5
-- TOTAL: 50 settings

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%setting%'
ORDER BY routine_name;
```

### 3. Test Functions

```sql
-- Test get_settings_categories (as admin)
SELECT * FROM get_settings_categories();

-- Test get_settings_by_category
SELECT setting_key, setting_value, data_type, display_name
FROM get_settings_by_category('general');

-- Test update_setting (as admin)
SELECT update_setting('base_fare', '40', 'ride');

-- Verify update
SELECT setting_value
FROM system_settings
WHERE setting_key = 'base_fare' AND category = 'ride';

-- Check audit log
SELECT * FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 5;
```

## 🔧 Configuration

### Environment Variables

No additional environment variables required. The system uses existing Supabase configuration.

### Admin Role Setup

Ensure your admin user has the correct role:

```sql
-- Check your role
SELECT id, email, role
FROM profiles
WHERE id = auth.uid();

-- If not admin, update (as superuser):
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

## 📊 Default Settings Overview

### Critical Settings (Review Before Production)

```sql
-- Review critical settings
SELECT category, setting_key, setting_value, description
FROM system_settings
WHERE setting_key IN (
  'maintenance_mode',
  'commission_rate',
  'base_fare',
  'approval_required',
  'max_login_attempts'
)
ORDER BY category, setting_key;
```

### Recommended Production Values

```sql
-- Update for production
SELECT update_setting('maintenance_mode', 'false', 'general');
SELECT update_setting('commission_rate', '15', 'payment');
SELECT update_setting('base_fare', '35', 'ride');
SELECT update_setting('approval_required', 'true', 'provider');
SELECT update_setting('max_login_attempts', '5', 'security');
```

## 🎯 Access the UI

### Development

```
http://localhost:5173/admin/settings
```

### Production

```
https://your-domain.com/admin/settings
```

**Requirements:**

- Must be logged in
- Must have admin role
- Route is protected by admin middleware

## 🧪 Testing Checklist

### Database Tests

```sql
-- ✅ Test 1: Settings exist
SELECT COUNT(*) FROM system_settings; -- Should be 50

-- ✅ Test 2: Categories exist
SELECT COUNT(DISTINCT category) FROM system_settings; -- Should be 9

-- ✅ Test 3: RLS works (as non-admin)
-- Should fail with permission denied
UPDATE system_settings SET setting_value = 'test' WHERE id = (SELECT id FROM system_settings LIMIT 1);

-- ✅ Test 4: Public settings readable
SELECT COUNT(*) FROM system_settings WHERE is_public = true; -- Should be > 0

-- ✅ Test 5: Audit log works
SELECT update_setting('app_name', 'Test App', 'general');
SELECT COUNT(*) FROM settings_audit_log; -- Should be > 0
```

### UI Tests

- [ ] Navigate to /admin/settings
- [ ] See all 9 categories in sidebar
- [ ] Click each category, see settings load
- [ ] Search for "fare", see relevant results
- [ ] Toggle a boolean setting
- [ ] Edit a number setting
- [ ] Click save button, see success message
- [ ] Click "Save All Changes", see bulk update
- [ ] Click "Reset", see values revert
- [ ] Click "Audit Log", see modal with changes
- [ ] Test on mobile device (responsive)

### Integration Tests

```typescript
// Test in your app
import { useSystemSettings } from "@/admin/composables/useSystemSettings";

const { getTypedValue } = useSystemSettings();

// Get maintenance mode
const maintenanceMode = getTypedValue<boolean>("maintenance_mode", "general");
if (maintenanceMode) {
  // Show maintenance page
}

// Get base fare
const baseFare = getTypedValue<number>("base_fare", "ride");
console.log("Base fare:", baseFare); // 35
```

## 🔄 Migration from Legacy Settings

If you have existing settings in other tables:

```sql
-- Example: Migrate from old app_settings table
INSERT INTO system_settings (
  category,
  setting_key,
  setting_value,
  data_type,
  display_name,
  description,
  is_public,
  display_order
)
SELECT
  'legacy' as category,
  key as setting_key,
  value::text as setting_value,
  'string' as data_type,
  key as display_name,
  description,
  false as is_public,
  0 as display_order
FROM app_settings
ON CONFLICT (category, setting_key) DO NOTHING;
```

## 🐛 Troubleshooting

### Issue: "Access denied. Admin privileges required"

**Solution:**

```sql
-- Check your role
SELECT role FROM profiles WHERE id = auth.uid();

-- Update to admin (as superuser)
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
```

### Issue: Settings not loading in UI

**Solution:**

1. Check browser console for errors
2. Verify RLS policies are active
3. Confirm admin role is set
4. Check network tab for failed requests

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'system_settings';
-- rowsecurity should be true
```

### Issue: Cannot update settings

**Solution:**

```sql
-- Check if setting is editable
SELECT setting_key, is_editable
FROM system_settings
WHERE setting_key = 'your_setting_key';

-- Make editable if needed (as superuser)
UPDATE system_settings
SET is_editable = true
WHERE setting_key = 'your_setting_key';
```

### Issue: Validation errors

**Solution:**

```sql
-- Check validation rules
SELECT setting_key, data_type, validation_rules
FROM system_settings
WHERE setting_key = 'your_setting_key';

-- Update validation rules if needed
UPDATE system_settings
SET validation_rules = '{"min": 0, "max": 100}'::jsonb
WHERE setting_key = 'your_setting_key';
```

## 📈 Performance Optimization

### Indexes

All necessary indexes are created by the migration:

- `idx_system_settings_category` - Fast category lookups
- `idx_system_settings_key` - Fast key lookups
- `idx_system_settings_public` - Fast public settings queries
- `idx_settings_audit_log_setting` - Fast audit log queries
- `idx_settings_audit_log_changed_at` - Fast time-based queries

### Caching

Consider caching frequently accessed settings:

```typescript
// Example: Cache in Pinia store
import { defineStore } from "pinia";

export const useSettingsCache = defineStore("settingsCache", {
  state: () => ({
    cache: new Map<string, { value: any; expires: number }>(),
  }),

  actions: {
    get(key: string) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      return null;
    },

    set(key: string, value: any, ttl = 5 * 60 * 1000) {
      this.cache.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },
  },
});
```

## 🔐 Security Best Practices

1. **Audit Log Retention:**

```sql
-- Create cleanup job (optional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM settings_audit_log
  WHERE changed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
SELECT cron.schedule('cleanup-audit-logs', '0 0 * * 0', 'SELECT cleanup_old_audit_logs()');
```

2. **Sensitive Settings:**

```sql
-- Mark sensitive settings as non-public
UPDATE system_settings
SET is_public = false
WHERE setting_key IN (
  'commission_rate',
  'max_login_attempts',
  'session_timeout_hours'
);
```

3. **Change Notifications:**

```sql
-- Create trigger to notify on critical changes
CREATE OR REPLACE FUNCTION notify_critical_setting_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.setting_key IN ('maintenance_mode', 'commission_rate') THEN
    -- Send notification to admins
    INSERT INTO admin_notifications (
      title,
      message,
      severity,
      data
    ) VALUES (
      'Critical Setting Changed',
      'Setting ' || NEW.setting_key || ' changed from ' || OLD.setting_value || ' to ' || NEW.setting_value,
      'high',
      jsonb_build_object('setting_key', NEW.setting_key, 'old_value', OLD.setting_value, 'new_value', NEW.setting_value)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER critical_setting_change
AFTER UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION notify_critical_setting_change();
```

## ✅ Post-Deployment Verification

Run this complete verification script:

```sql
-- Verification Script
DO $$
DECLARE
  v_settings_count INT;
  v_categories_count INT;
  v_policies_count INT;
  v_functions_count INT;
BEGIN
  -- Check settings
  SELECT COUNT(*) INTO v_settings_count FROM system_settings;
  RAISE NOTICE 'Settings count: %', v_settings_count;

  -- Check categories
  SELECT COUNT(DISTINCT category) INTO v_categories_count FROM system_settings;
  RAISE NOTICE 'Categories count: %', v_categories_count;

  -- Check policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'system_settings';
  RAISE NOTICE 'RLS policies count: %', v_policies_count;

  -- Check functions
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name LIKE '%setting%';
  RAISE NOTICE 'Functions count: %', v_functions_count;

  -- Verify expected counts
  IF v_settings_count = 50 AND
     v_categories_count = 9 AND
     v_policies_count >= 2 AND
     v_functions_count >= 3 THEN
    RAISE NOTICE '✅ All checks passed!';
  ELSE
    RAISE WARNING '⚠️ Some checks failed. Review counts above.';
  END IF;
END $$;
```

---

**Deployment Status:** Ready for Production
**Migration File:** `supabase/migrations/310_comprehensive_admin_settings_system.sql`
**Estimated Time:** 5-10 minutes
**Rollback:** Available (see rollback script below)

## 🔄 Rollback Script

If you need to rollback:

```sql
-- Rollback Migration 310
BEGIN;

-- Drop functions
DROP FUNCTION IF EXISTS get_settings_by_category(TEXT);
DROP FUNCTION IF EXISTS update_setting(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_settings_categories();

-- Drop tables
DROP TABLE IF EXISTS settings_audit_log CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

COMMIT;
```
