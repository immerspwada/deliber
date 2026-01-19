# 🚀 Fix Admin Customers - DO THIS NOW

## ⚡ 3-Minute Fix

### 1. Open Supabase Dashboard

Go to: https://supabase.com/dashboard

- Select your project
- Click "SQL Editor" in left sidebar

### 2. Copy & Paste This SQL

```sql
INSERT INTO profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
SELECT
  u.id,
  u.email,
  u.name as full_name,
  u.phone as phone_number,
  COALESCE(u.role, 'customer') as role,
  'active' as status,
  u.created_at,
  u.updated_at
FROM users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### 3. Click "Run" Button

### 4. Verify Success

You should see: "Success. No rows returned"

### 5. Check Admin Users

Run this to verify:

```sql
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

You should see your admin user(s) listed.

### 6. Test the Fix

1. Go to your app: `http://localhost:5173/admin/customers`
2. If still showing error:
   - Logout (top right)
   - Clear browser cache (Ctrl+Shift+Delete)
   - Login again
   - Try `/admin/customers` again

### 7. Done! ✅

The page should now load with customer list.

---

## 🔧 If Still Not Working

### Check Your User Role

```sql
-- Find your email
SELECT id, email, role FROM users WHERE email = 'YOUR_EMAIL@example.com';
```

### Make Yourself Admin

```sql
-- Replace with your email
UPDATE users SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
```

### Clear Everything and Retry

1. Logout completely
2. Close all browser tabs
3. Clear cache (Ctrl+Shift+Delete → All time)
4. Open new tab
5. Login again
6. Go to `/admin/customers`

---

## 📁 Files to Reference

- **Quick SQL:** `RUN-THIS-NOW.sql`
- **Full Guide:** `FIX-ADMIN-ACCESS-GUIDE.md`
- **Complete Summary:** `ADMIN-CUSTOMERS-FIX-SUMMARY.md`
- **Full Migration:** `supabase/migrations/314_fix_admin_customers_access.sql`

---

## ✅ Success Checklist

- [ ] Ran SQL in Supabase Dashboard
- [ ] Verified admin user in profiles table
- [ ] Cleared browser cache
- [ ] Logged out and back in
- [ ] `/admin/customers` loads successfully
- [ ] Can see customer list
- [ ] No errors in console (F12)

---

**Need help?** Check `FIX-ADMIN-ACCESS-GUIDE.md` for detailed troubleshooting.
