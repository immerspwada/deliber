# Problem Diagram - Admin Customers Access

## 🔴 Current Problem

```
┌─────────────────────────────────────────────────────────────┐
│                    User Login Flow                          │
└─────────────────────────────────────────────────────────────┘

1. Admin logs in
   ↓
2. Auth Store updates USERS table
   ┌──────────────────┐
   │  users table     │
   │  ─────────────   │
   │  id: abc-123     │
   │  email: admin@   │
   │  role: admin  ✅ │  ← Role set here
   └──────────────────┘

3. Admin visits /admin/customers
   ↓
4. RPC function admin_get_customers() runs
   ↓
5. Checks PROFILES table for admin role
   ┌──────────────────┐
   │ profiles table   │
   │  ─────────────   │
   │  id: abc-123     │
   │  email: admin@   │
   │  role: customer ❌│  ← Wrong role!
   └──────────────────┘
   ↓
6. ❌ EXCEPTION: "Unauthorized: Admin access required"
```

## ✅ After Fix

```
┌─────────────────────────────────────────────────────────────┐
│                    Fixed Flow                               │
└─────────────────────────────────────────────────────────────┘

1. Run sync SQL
   ↓
2. Data synced from users → profiles

   ┌──────────────────┐      ┌──────────────────┐
   │  users table     │      │ profiles table   │
   │  ─────────────   │ ───→ │  ─────────────   │
   │  id: abc-123     │      │  id: abc-123     │
   │  email: admin@   │      │  email: admin@   │
   │  role: admin  ✅ │      │  role: admin  ✅ │
   └──────────────────┘      └──────────────────┘
                                      ↑
                                      │
3. Trigger keeps them in sync ────────┘
   (automatic on every update)

4. Admin visits /admin/customers
   ↓
5. RPC function checks profiles table
   ↓
6. ✅ Admin role found → Access granted!
   ↓
7. Customer list loads successfully
```

## 🔄 Automatic Sync (After Migration 314)

```
┌─────────────────────────────────────────────────────────────┐
│              Trigger: sync_user_to_profile                  │
└─────────────────────────────────────────────────────────────┘

Event: INSERT or UPDATE on users table
  ↓
Trigger fires automatically
  ↓
Copies data to profiles table
  ↓
Both tables always in sync ✅

Example:
  UPDATE users SET role = 'admin' WHERE id = 'abc-123';
  ↓ (trigger fires)
  UPDATE profiles SET role = 'admin' WHERE id = 'abc-123';
  ↓
  ✅ Done automatically!
```

## 🔍 RPC Function Logic (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│         admin_get_customers() Authorization Flow            │
└─────────────────────────────────────────────────────────────┘

1. Get current user ID
   v_user_id := auth.uid();
   ↓
2. Check profiles table first
   SELECT EXISTS (
     SELECT 1 FROM profiles
     WHERE id = v_user_id AND role = 'admin'
   ) INTO v_is_admin;
   ↓
3. If not found, check users table (fallback)
   IF NOT v_is_admin THEN
     SELECT EXISTS (
       SELECT 1 FROM users
       WHERE id = v_user_id AND role = 'admin'
     ) INTO v_is_admin;
   END IF;
   ↓
4. If admin found in either table → ✅ Allow access
   If not found in both → ❌ Raise exception
```

## 📊 Data Flow Comparison

### Before Fix

```
Login → users table updated → profiles table NOT updated
                                      ↓
                              RPC checks profiles
                                      ↓
                              ❌ Role mismatch
                                      ↓
                              403 Unauthorized
```

### After Fix

```
Login → users table updated → Trigger fires → profiles table updated
                                                      ↓
                                              RPC checks profiles
                                                      ↓
                                              ✅ Role matches
                                                      ↓
                                              200 OK + Data
```

## 🎯 Key Takeaway

**Problem:** Two tables, one source of truth
**Solution:** Sync them automatically with trigger
**Result:** Consistent data, no more 403 errors

---

## 📝 Technical Details

### Tables Structure

```sql
-- users table (full data)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  role TEXT,  ← Source of truth
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- profiles table (for RLS)
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  role TEXT,  ← Must match users.role
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Sync Trigger

```sql
CREATE TRIGGER sync_user_to_profile_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_profile();
```

This ensures:

- ✅ Every user insert → profile created
- ✅ Every user update → profile updated
- ✅ Role always consistent
- ✅ No manual intervention needed
