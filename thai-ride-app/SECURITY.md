# Security Guidelines

## ⚠️ IMPORTANT: Rotate Exposed Keys

If Supabase credentials were previously committed to Git history, you **MUST** rotate them:

### Steps to Rotate Supabase Keys:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/api

2. **Regenerate API Keys**
   - Click "Regenerate" on the `anon` key
   - Click "Regenerate" on the `service_role` key (if exposed)

3. **Update Environment Variables**
   - Update `.env` file with new keys
   - Update production environment (Vercel, etc.)

4. **Verify Application Works**
   - Test login/signup functionality
   - Test database operations

---

## Pre-commit Hook

This project uses Husky to prevent accidental credential commits.

### What it checks:
- JWT tokens (eyJ...)
- API keys
- Secret keys
- Private keys
- AWS credentials
- Hardcoded passwords
- Supabase keys in source code

### Bypass (NOT RECOMMENDED):
```bash
git commit --no-verify
```

---

## Environment Variables

### Required:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional:
```env
VITE_APP_NAME=Thai Ride App
VITE_APP_VERSION=1.0.0
VITE_VAPID_PUBLIC_KEY=your-vapid-key
VITE_SENTRY_DSN=your-sentry-dsn
```

---

## Best Practices

1. **Never commit credentials** - Use environment variables
2. **Use `.env.example`** - Document required variables without values
3. **Rotate keys regularly** - Especially after any exposure
4. **Enable RLS** - Row Level Security on all Supabase tables
5. **Use service_role sparingly** - Only in secure server-side code
6. **Monitor Supabase logs** - Check for unauthorized access attempts

---

## Demo Mode

Demo mode is available for development/testing:
- Only works in development environment
- Or when Supabase is not configured
- Uses hardcoded demo users (not real credentials)

Demo accounts:
- `customer@demo.com` / `demo1234`
- `driver1@demo.com` / `demo1234`
- `admin@demo.com` / `admin1234`
