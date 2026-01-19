# ⚡ Admin Settings System - Quick Commands

## 🚀 Installation Commands

```bash
# 1. Start Supabase (if not running)
npx supabase start

# 2. Check status
npx supabase status

# 3. Apply migration 310
npx supabase db push --local

# 4. Generate types
npx supabase gen types --local > src/types/database.ts

# 5. Verify installation
npx supabase db execute --local -f .kiro/specs/admin-settings-system/verify-installation.sql
```

## 🔍 Verification Commands

### Check Tables

```bash
npx supabase db execute --local -c "
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('system_settings', 'settings_audit_log')
"
```

### Check Settings Count

```bash
npx supabase db execute --local -c "
SELECT category, COUNT(*) as count
FROM system_settings
GROUP BY category
ORDER BY category
"
```

### Check RLS Policies

```bash
npx supabase db execute --local -c "
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
"
```

### Check Functions

```bash
npx supabase db execute --local -c "
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%setting%'
"
```

## 🧪 Test Commands

### Test Get Categories

```bash
npx supabase db execute --local -c "
SELECT * FROM get_settings_categories()
"
```

### Test Get Settings by Category

```bash
npx supabase db execute --local -c "
SELECT setting_key, setting_value, data_type
FROM get_settings_by_category('general')
"
```

### Test Update Setting (as admin)

```bash
npx supabase db execute --local -c "
SELECT update_setting('base_fare', '40', 'ride')
"
```

### Check Audit Log

```bash
npx supabase db execute --local -c "
SELECT * FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 10
"
```

## 🔧 Maintenance Commands

### View All Settings

```bash
npx supabase db execute --local -c "
SELECT category, setting_key, setting_value, data_type
FROM system_settings
ORDER BY category, display_order
"
```

### View Public Settings

```bash
npx supabase db execute --local -c "
SELECT category, setting_key, setting_value
FROM system_settings
WHERE is_public = true
ORDER BY category
"
```

### View Editable Settings

```bash
npx supabase db execute --local -c "
SELECT category, setting_key, is_editable
FROM system_settings
WHERE is_editable = false
"
```

### View Recent Changes

```bash
npx supabase db execute --local -c "
SELECT
  setting_key,
  old_value,
  new_value,
  changed_at
FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 20
"
```

## 🗄️ Database Management

### Backup Settings

```bash
npx supabase db execute --local -c "
COPY (
  SELECT * FROM system_settings
) TO STDOUT WITH CSV HEADER
" > settings_backup.csv
```

### Export Audit Log

```bash
npx supabase db execute --local -c "
COPY (
  SELECT * FROM settings_audit_log
  ORDER BY changed_at DESC
) TO STDOUT WITH CSV HEADER
" > audit_log_backup.csv
```

### Reset to Defaults (DANGEROUS!)

```bash
# This will delete all settings and re-insert defaults
npx supabase db execute --local -c "
DELETE FROM system_settings;
" && npx supabase db push --local
```

## 🔄 Migration Management

### List Migrations

```bash
npx supabase migration list --local
```

### Check Migration Status

```bash
npx supabase db diff --local
```

### Create New Migration

```bash
npx supabase migration new your_migration_name
```

### Rollback Migration 310

```bash
npx supabase db execute --local -c "
BEGIN;
DROP FUNCTION IF EXISTS get_settings_by_category(TEXT);
DROP FUNCTION IF EXISTS update_setting(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_settings_categories();
DROP TABLE IF EXISTS settings_audit_log CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
COMMIT;
"
```

## 🎯 Development Commands

### Start Dev Server

```bash
npm run dev
```

### Run Type Check

```bash
npm run type-check
```

### Run Linter

```bash
npm run lint
```

### Run Tests

```bash
npm run test
```

### Build for Production

```bash
npm run build
```

## 📊 Monitoring Commands

### Check Database Size

```bash
npx supabase db execute --local -c "
SELECT
  pg_size_pretty(pg_total_relation_size('system_settings')) as settings_size,
  pg_size_pretty(pg_total_relation_size('settings_audit_log')) as audit_log_size
"
```

### Check Index Usage

```bash
npx supabase db execute --local -c "
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY idx_scan DESC
"
```

### Check Table Stats

```bash
npx supabase db execute --local -c "
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE tablename IN ('system_settings', 'settings_audit_log')
"
```

## 🔐 Security Commands

### Check RLS Status

```bash
npx supabase db execute --local -c "
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('system_settings', 'settings_audit_log')
"
```

### List All Policies

```bash
npx supabase db execute --local -c "
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
"
```

### Check Admin Users

```bash
npx supabase db execute --local -c "
SELECT
  id,
  email,
  role
FROM profiles
WHERE role = 'admin'
"
```

## 🐛 Troubleshooting Commands

### Check Supabase Status

```bash
npx supabase status
```

### View Logs

```bash
# API logs
npx supabase logs api --local

# Postgres logs
npx supabase logs db --local

# All logs
npx supabase logs --local
```

### Restart Supabase

```bash
npx supabase stop
npx supabase start
```

### Reset Database (DANGEROUS!)

```bash
npx supabase db reset --local
```

### Check Docker Status

```bash
docker ps | grep supabase
```

## 📝 Quick SQL Queries

### Get Setting Value

```sql
SELECT setting_value
FROM system_settings
WHERE setting_key = 'base_fare' AND category = 'ride';
```

### Update Setting (Direct - No Audit)

```sql
UPDATE system_settings
SET setting_value = '40', updated_at = NOW()
WHERE setting_key = 'base_fare' AND category = 'ride';
```

### Add New Setting

```sql
INSERT INTO system_settings (
  category, setting_key, setting_value, data_type,
  display_name, description, is_public, display_order
) VALUES (
  'ride', 'night_surcharge', '10', 'number',
  'Night Surcharge', 'Additional charge for night rides',
  true, 20
);
```

### Delete Setting

```sql
DELETE FROM system_settings
WHERE setting_key = 'your_setting_key';
```

### View Audit Trail for Setting

```sql
SELECT
  old_value,
  new_value,
  changed_at,
  changed_by
FROM settings_audit_log
WHERE setting_key = 'base_fare'
ORDER BY changed_at DESC;
```

## 🎯 One-Liner Commands

```bash
# Complete installation
npx supabase start && npx supabase db push --local && npx supabase gen types --local > src/types/database.ts

# Verify everything
npx supabase db execute --local -f .kiro/specs/admin-settings-system/verify-installation.sql

# Quick check
npx supabase db execute --local -c "SELECT COUNT(*) FROM system_settings"

# View all categories
npx supabase db execute --local -c "SELECT * FROM get_settings_categories()"

# Check recent changes
npx supabase db execute --local -c "SELECT * FROM settings_audit_log ORDER BY changed_at DESC LIMIT 5"
```

## 📚 Documentation Commands

```bash
# View README
cat .kiro/specs/admin-settings-system/README.md

# View Quick Reference
cat .kiro/specs/admin-settings-system/QUICK-REFERENCE.md

# View Deployment Guide
cat .kiro/specs/admin-settings-system/DEPLOYMENT-GUIDE.md

# View Complete Summary
cat .kiro/specs/admin-settings-system/COMPLETE-SUMMARY.md
```

## 🔗 Useful Links

- **UI:** http://localhost:5173/admin/settings
- **Supabase Studio:** http://localhost:54323
- **API Docs:** http://localhost:54321/rest/v1/
- **Database:** postgresql://postgres:postgres@localhost:54322/postgres

---

**Quick Help:**

```bash
# Show this file
cat .kiro/specs/admin-settings-system/COMMANDS.md

# Show all available commands
npx supabase --help

# Show database commands
npx supabase db --help
```
