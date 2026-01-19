# 🚀 Apply Migration 310 - Admin Settings System

## ⚡ Quick Apply (When Supabase is Running)

```bash
# 1. Start Supabase (if not running)
npx supabase start

# 2. Apply migration
npx supabase db push --local

# 3. Generate types
npx supabase gen types --local > src/types/database.ts

# 4. Verify installation
npx supabase db execute --local -f .kiro/specs/admin-settings-system/verify-installation.sql
```

## ✅ Expected Output

After applying migration 310, you should see:

```
✅ Tables created: system_settings, settings_audit_log
✅ 50 default settings inserted
✅ 9 categories configured
✅ 3 RPC functions created
✅ RLS policies active
✅ Indexes created
```

## 🔍 Verification Queries

### Check Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('system_settings', 'settings_audit_log');
```

### Check Settings Count

```sql
SELECT category, COUNT(*) as count
FROM system_settings
GROUP BY category
ORDER BY category;
```

Expected:

- analytics: 3
- features: 8
- general: 6
- map: 3
- notification: 4
- payment: 8
- provider: 5
- ride: 8
- security: 5
  **Total: 50 settings**

### Check RLS Policies

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY tablename, policyname;
```

Expected policies:

- `admin_full_access_settings` on system_settings
- `public_settings_read` on system_settings
- `admin_view_audit_log` on settings_audit_log

### Check Functions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%setting%'
ORDER BY routine_name;
```

Expected functions:

- `get_settings_by_category`
- `get_settings_categories`
- `update_setting`

## 🧪 Test Functions

### Test as Admin

```sql
-- Get all categories
SELECT * FROM get_settings_categories();

-- Get settings by category
SELECT setting_key, setting_value, data_type
FROM get_settings_by_category('general');

-- Update a setting
SELECT update_setting('base_fare', '40', 'ride');

-- Verify update
SELECT setting_value
FROM system_settings
WHERE setting_key = 'base_fare' AND category = 'ride';
-- Should return: 40

-- Check audit log
SELECT * FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 5;
```

## 🎯 Access UI

After migration is applied:

1. **Start dev server:**

   ```bash
   npm run dev
   ```

2. **Navigate to:**

   ```
   http://localhost:5173/admin/settings
   ```

3. **Login as admin** (ensure your user has admin role)

4. **Verify UI:**
   - ✅ See 9 categories in sidebar
   - ✅ Click each category, see settings load
   - ✅ Search works
   - ✅ Can edit and save settings
   - ✅ Audit log button works

## 🔧 Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Migration 310 uses `IF NOT EXISTS` so it's safe to re-run. If you see this error, check if tables were partially created:

```sql
-- Check what exists
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%setting%';

-- If needed, drop and recreate
DROP TABLE IF EXISTS settings_audit_log CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- Then re-apply
npx supabase db push --local
```

### Issue: "Access denied. Admin privileges required"

**Solution:** Ensure your user has admin role:

```sql
-- Check your role
SELECT id, email, role
FROM profiles
WHERE id = auth.uid();

-- Update to admin (as superuser)
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Issue: Settings not loading in UI

**Solution:**

1. Check browser console for errors
2. Verify RLS policies are active:

   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'system_settings';
   -- rowsecurity should be true
   ```

3. Check if you're logged in as admin:
   ```sql
   SELECT role FROM profiles WHERE id = auth.uid();
   -- Should return 'admin'
   ```

## 📊 Post-Migration Checklist

- [ ] Migration 310 applied successfully
- [ ] 50 settings created
- [ ] 9 categories exist
- [ ] 3 RPC functions working
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Types generated
- [ ] UI accessible at /admin/settings
- [ ] Can view settings by category
- [ ] Can search settings
- [ ] Can edit and save settings
- [ ] Audit log displays changes

## 🔄 Rollback (If Needed)

If you need to rollback migration 310:

```sql
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

## 📝 Next Steps After Migration

1. **Review Default Settings:**

   ```sql
   SELECT category, setting_key, setting_value, description
   FROM system_settings
   WHERE setting_key IN (
     'maintenance_mode',
     'commission_rate',
     'base_fare',
     'approval_required'
   )
   ORDER BY category;
   ```

2. **Adjust for Your Environment:**
   - Update support contact info (phone, email, LINE)
   - Set appropriate fare rates
   - Configure commission rate
   - Set payment limits

3. **Test in UI:**
   - Navigate to /admin/settings
   - Try editing a few settings
   - Verify changes are saved
   - Check audit log

4. **Document Custom Settings:**
   - Note any settings you change from defaults
   - Document business rules
   - Share with team

## 🎉 Success Indicators

You'll know migration 310 is successful when:

✅ No errors during `npx supabase db push --local`
✅ All verification queries return expected results
✅ UI loads at /admin/settings
✅ Can view and edit settings
✅ Changes are logged in audit trail
✅ Types are generated without errors

---

**Migration File:** `supabase/migrations/310_comprehensive_admin_settings_system.sql`
**Status:** Ready to Apply
**Estimated Time:** 2-3 minutes
