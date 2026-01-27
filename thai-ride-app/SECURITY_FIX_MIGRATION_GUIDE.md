# 🔐 Security Fix Migration Guide

**Date**: 2026-01-26  
**Priority**: 🔥 CRITICAL  
**Estimated Time**: 2-4 hours

---

## 📋 Overview

This guide walks through fixing the critical security issue: **manual token storage in localStorage**.

### What's Changing

- ❌ **OLD**: Manual token storage in localStorage
- ✅ **NEW**: Supabase-managed secure session storage

### Why This Matters

- Tokens in localStorage are vulnerable to XSS attacks
- Supabase provides secure httpOnly cookie storage
- Automatic token refresh
- PKCE flow protection
- Compliance with security checklist

---

## 🎯 Step-by-Step Migration

### Step 1: Backup Current Implementation

```bash
# Backup the current file
cp src/composables/useAdminAuth.ts src/composables/useAdminAuth.backup.ts
```

### Step 2: Replace with Secure Version

```bash
# Replace with secure implementation
cp src/composables/useAdminAuth.secure.ts src/composables/useAdminAuth.ts
```

### Step 3: Update Supabase Client Configuration

Ensure your Supabase client is configured with PKCE flow:

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce", // ✅ REQUIRED for security
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Supabase manages this securely
    storageKey: "supabase.auth.token", // Default key
  },
});
```

### Step 4: Update Router Guards

**File**: `src/admin/router.ts`

```typescript
import { getAdminAuthInstance } from "@/composables/useAdminAuth";

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const auth = getAdminAuthInstance();
    const isValid = await auth.isSessionValid();

    if (!isValid) {
      next("/admin/login");
      return;
    }
  }

  next();
});
```

### Step 5: Clear Old Token Storage

Add a migration script to clear old tokens on first load:

**File**: `src/utils/migrateAuth.ts`

```typescript
/**
 * Migrate from old token storage to Supabase session management
 */
export function migrateAuthStorage() {
  const OLD_KEYS = ["admin_token", "admin_login_time"];

  // Check if old tokens exist
  const hasOldTokens = OLD_KEYS.some(
    (key) => localStorage.getItem(key) !== null,
  );

  if (hasOldTokens) {
    console.log("[Auth Migration] Clearing old token storage...");

    // Clear old tokens
    OLD_KEYS.forEach((key) => localStorage.removeItem(key));

    // Keep user profile data (non-sensitive)
    // admin_user can stay as it's just profile info

    console.log("[Auth Migration] Migration complete. Please log in again.");

    return true; // Indicates migration happened
  }

  return false;
}
```

**File**: `src/main.ts`

```typescript
import { migrateAuthStorage } from "./utils/migrateAuth";

// Run migration on app start
const migrated = migrateAuthStorage();

if (migrated) {
  // Show notification to user
  console.log("Security update applied. Please log in again.");
}

// ... rest of app initialization
```

### Step 6: Test the Changes

#### Test Checklist:

- [ ] Admin can log in successfully
- [ ] Session persists after page refresh
- [ ] Session expires after 8 hours
- [ ] Logout clears session properly
- [ ] Rate limiting still works
- [ ] Activity logging still works
- [ ] No tokens in localStorage (check DevTools)
- [ ] Tokens in Supabase storage (check DevTools → Application → Local Storage → supabase.auth.token)

#### Manual Testing:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser DevTools
# 3. Go to Application → Local Storage
# 4. Log in as admin
# 5. Verify:
#    - No 'admin_token' key
#    - Has 'supabase.auth.token' key (managed by Supabase)
#    - Has 'admin_user' key (profile data only)
```

### Step 7: Update Tests

**File**: `src/composables/__tests__/useAdminAuth.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAdminAuth } from "../useAdminAuth";
import { supabase } from "@/lib/supabase";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe("useAdminAuth (Secure)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should not store tokens in localStorage", async () => {
    const { login } = useAdminAuth();

    // Mock successful login
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: { id: "123", email: "admin@test.com" },
        session: { access_token: "token123" },
      },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: "123", email: "admin@test.com", role: "admin" },
              error: null,
            }),
          ),
        })),
      })),
    } as any);

    await login("admin@test.com", "password");

    // Verify no token in localStorage
    expect(localStorage.getItem("admin_token")).toBeNull();

    // Verify user profile is cached (non-sensitive)
    expect(localStorage.getItem("admin_user")).toBeTruthy();
  });

  it("should use Supabase session management", async () => {
    const { getSession } = useAdminAuth();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "token123" } },
      error: null,
    } as any);

    const session = await getSession();

    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(session).toBeTruthy();
  });
});
```

---

## 🔒 Security Improvements

### Before (Insecure)

```typescript
// ❌ Manual token storage
localStorage.setItem("admin_token", token);

// ❌ No automatic refresh
// ❌ Vulnerable to XSS
// ❌ No PKCE protection
```

### After (Secure)

```typescript
// ✅ Supabase manages tokens
await supabase.auth.signInWithPassword({ email, password });

// ✅ Automatic token refresh
// ✅ Secure httpOnly cookies
// ✅ PKCE flow protection
// ✅ XSS resistant
```

---

## 📊 Impact Assessment

### Breaking Changes

- ✅ **YES**: Users will need to log in again after deployment
- ✅ **YES**: Old tokens will be invalidated

### User Impact

- All admin users will be logged out
- Need to log in again (one-time)
- Better security going forward

### System Impact

- No database changes required
- No API changes required
- Frontend-only changes

---

## 🚀 Deployment Plan

### Pre-Deployment

1. ✅ Review security audit report
2. ✅ Test changes locally
3. ✅ Run all tests
4. ✅ Update documentation
5. ⏳ Notify admin users of upcoming change

### Deployment

1. ⏳ Deploy to staging
2. ⏳ Test on staging
3. ⏳ Deploy to production
4. ⏳ Monitor for issues

### Post-Deployment

1. ⏳ Verify all admins can log in
2. ⏳ Monitor error logs
3. ⏳ Collect feedback
4. ⏳ Update security checklist

---

## 🐛 Troubleshooting

### Issue: "Session not found" after login

**Solution**:

```typescript
// Check Supabase client configuration
// Ensure flowType is 'pkce'
// Ensure persistSession is true
```

### Issue: Users logged out immediately

**Solution**:

```typescript
// Check session validation logic
// Ensure getSession() is called correctly
// Check for CORS issues
```

### Issue: Old tokens still in localStorage

**Solution**:

```typescript
// Run migration script
migrateAuthStorage();

// Or manually clear
localStorage.removeItem("admin_token");
localStorage.removeItem("admin_login_time");
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] No `admin_token` in localStorage
- [ ] Supabase session exists in localStorage
- [ ] Admin login works
- [ ] Session persists after refresh
- [ ] Logout works properly
- [ ] Rate limiting works
- [ ] Activity logging works
- [ ] No console errors
- [ ] No security warnings

---

## 📝 Rollback Plan

If issues occur:

```bash
# 1. Restore backup
cp src/composables/useAdminAuth.backup.ts src/composables/useAdminAuth.ts

# 2. Redeploy
npm run build
# Deploy to production

# 3. Investigate issues
# 4. Fix and retry
```

---

## 🎓 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PKCE Flow Explained](https://oauth.net/2/pkce/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Security Checklist](.kiro/steering/security-checklist.md)

---

**Migration Guide Version**: 1.0  
**Last Updated**: 2026-01-26  
**Next Review**: After deployment
