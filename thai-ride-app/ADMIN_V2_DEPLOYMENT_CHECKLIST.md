# Admin Dashboard V2 - Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Database Migration
- [ ] Review migration file: `supabase/migrations/145_admin_v2_system.sql`
- [ ] Backup production database
- [ ] Run migration in staging environment
- [ ] Verify tables created:
  - [ ] `admin_roles`
  - [ ] `admin_permissions`
  - [ ] `admin_sessions`
- [ ] Verify functions created:
  - [ ] `has_admin_permission()`
  - [ ] `get_admin_role_level()`
  - [ ] `clean_expired_admin_sessions()`
- [ ] Verify RLS policies enabled
- [ ] Verify default data seeded

### 2. Admin User Setup
- [ ] Create at least one admin user in production
- [ ] Test login with production credentials
- [ ] Verify role assignment
- [ ] Test permissions

### 3. Code Review
- [ ] TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] No console.log in production code
- [ ] Security review completed
- [ ] Performance review completed

### 4. Testing
- [ ] Login/logout flow
- [ ] Session management
- [ ] Rate limiting
- [ ] Permission checks
- [ ] Navigation
- [ ] Dashboard data loading
- [ ] Toast notifications
- [ ] Responsive design (mobile/tablet/desktop)

### 5. Documentation
- [ ] Architecture documentation complete
- [ ] API documentation updated
- [ ] User guide created
- [ ] Developer guide created

---

## 🚀 Deployment Steps

### Step 1: Database Migration

```bash
# Staging
npx supabase db push --db-url "postgresql://..."

# Production
npx supabase db push --db-url "postgresql://..."
```

### Step 2: Create Admin Users

```sql
-- Update existing user to admin
UPDATE users
SET role = 'admin'
WHERE email = 'admin@yourcompany.com';

-- Verify
SELECT id, email, role FROM users WHERE role IN ('admin', 'super_admin');
```

### Step 3: Deploy Frontend

```bash
# Build
npm run build

# Deploy (example with Vercel)
vercel --prod

# Or deploy to your hosting provider
```

### Step 4: Verify Deployment

- [ ] Access admin login page
- [ ] Login with admin credentials
- [ ] Check dashboard loads
- [ ] Test navigation
- [ ] Check browser console for errors
- [ ] Test on different browsers

---

## 🔍 Post-Deployment Verification

### 1. Functional Tests

```
✓ Login Page
  ✓ Can access /admin/login
  ✓ Can login with valid credentials
  ✓ Cannot login with invalid credentials
  ✓ Rate limiting works after 5 failed attempts
  ✓ Redirects to dashboard after successful login

✓ Dashboard
  ✓ Stats cards display correct data
  ✓ Recent orders table loads
  ✓ Pending providers list loads
  ✓ Quick actions work

✓ Navigation
  ✓ Sidebar menu works
  ✓ Breadcrumbs update correctly
  ✓ User menu works
  ✓ Logout works

✓ Session Management
  ✓ Session persists on page reload
  ✓ Session expires after 8 hours
  ✓ Auto-logout on expiry

✓ Permissions
  ✓ Super admin can access all modules
  ✓ Admin can access most modules
  ✓ Manager has limited access
  ✓ Support has read-only access
  ✓ Viewer has read-only access
```

### 2. Performance Tests

- [ ] Page load time < 2 seconds
- [ ] Dashboard data loads < 1 second
- [ ] Navigation is instant
- [ ] No memory leaks
- [ ] No excessive API calls

### 3. Security Tests

- [ ] Cannot access admin routes without login
- [ ] Session token is secure
- [ ] Rate limiting prevents brute force
- [ ] RLS policies prevent unauthorized access
- [ ] Audit log records all actions

---

## 🐛 Troubleshooting Guide

### Issue: Migration Fails

**Symptoms**: Error when running migration

**Solutions**:
1. Check if tables already exist
2. Check for conflicting migrations
3. Review migration SQL syntax
4. Check database permissions

### Issue: Cannot Login

**Symptoms**: Login fails with valid credentials

**Solutions**:
1. Check if user exists in database
2. Verify user role is 'admin' or 'super_admin'
3. Check Supabase auth configuration
4. Review browser console for errors
5. Check network tab for API errors

### Issue: Dashboard Not Loading

**Symptoms**: Dashboard shows loading state forever

**Solutions**:
1. Check API endpoints are accessible
2. Verify RLS policies allow data access
3. Check browser console for errors
4. Verify Supabase connection

### Issue: Permission Denied

**Symptoms**: Cannot access certain modules

**Solutions**:
1. Check user role in database
2. Verify permissions in `admin_permissions` table
3. Check `hasPermission()` logic
4. Review RLS policies

---

## 📊 Monitoring

### Key Metrics to Monitor

1. **Login Success Rate**
   - Target: > 95%
   - Alert if < 90%

2. **Session Duration**
   - Average: 2-4 hours
   - Alert if < 30 minutes

3. **Page Load Time**
   - Target: < 2 seconds
   - Alert if > 5 seconds

4. **Error Rate**
   - Target: < 1%
   - Alert if > 5%

### Monitoring Queries

```sql
-- Active sessions
SELECT COUNT(*) as active_sessions
FROM admin_sessions
WHERE expires_at > NOW();

-- Login attempts (last 24 hours)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as attempts
FROM admin_audit_log
WHERE action = 'login'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Failed logins (last 24 hours)
SELECT 
  COUNT(*) as failed_logins
FROM admin_audit_log
WHERE action = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Most active admins (last 7 days)
SELECT 
  u.email,
  COUNT(*) as actions
FROM admin_audit_log al
JOIN users u ON u.id = al.admin_id
WHERE al.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.email
ORDER BY actions DESC
LIMIT 10;
```

---

## 🔄 Rollback Plan

### If Issues Occur

1. **Immediate Actions**
   - Disable admin routes in router
   - Redirect to legacy admin
   - Notify team

2. **Database Rollback**
   ```sql
   -- Drop new tables (if needed)
   DROP TABLE IF EXISTS admin_sessions CASCADE;
   DROP TABLE IF EXISTS admin_permissions CASCADE;
   DROP TABLE IF EXISTS admin_roles CASCADE;
   
   -- Drop functions
   DROP FUNCTION IF EXISTS has_admin_permission CASCADE;
   DROP FUNCTION IF EXISTS get_admin_role_level CASCADE;
   DROP FUNCTION IF EXISTS clean_expired_admin_sessions CASCADE;
   ```

3. **Code Rollback**
   ```bash
   git revert <commit-hash>
   npm run build
   vercel --prod
   ```

---

## 📞 Support Contacts

### Development Team
- Lead Developer: [Name]
- Backend Developer: [Name]
- Frontend Developer: [Name]

### Infrastructure
- DevOps: [Name]
- Database Admin: [Name]

### Emergency Contacts
- On-call Engineer: [Phone]
- Team Lead: [Phone]

---

## ✅ Sign-off

### Deployment Approval

- [ ] Development Team Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Product Manager: _________________ Date: _______
- [ ] CTO/Tech Lead: _________________ Date: _______

### Post-Deployment Verification

- [ ] Functional Tests Passed: _________________ Date: _______
- [ ] Performance Tests Passed: _________________ Date: _______
- [ ] Security Tests Passed: _________________ Date: _______
- [ ] Monitoring Setup Complete: _________________ Date: _______

---

**Deployment Date**: _________________

**Deployed By**: _________________

**Version**: Admin Dashboard V2 - Phase 1

**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
