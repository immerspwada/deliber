# 🚀 Quick Deploy Reference - Migrations 297-305

## ⚡ One-Command Deploy

```bash
# Run automated deployment script
./.kiro/specs/admin-panel-complete-verification/deploy-all.sh
```

## 📋 Manual Step-by-Step

### 1. Start Services

```bash
# Start Docker
open -a Docker

# Start Supabase (wait for Docker to be ready)
npx supabase start
```

### 2. Deploy Migrations

```bash
# Apply all migrations at once
npx supabase db push --local
```

### 3. Generate Types

```bash
# Generate TypeScript types
npx supabase gen types --local > src/types/database.ts
```

### 4. Verify Deployment

```bash
# Run verification SQL
npx supabase db execute --local -f .kiro/specs/admin-panel-complete-verification/verify-deployment.sql
```

### 5. Run Tests

```bash
# Run admin tests
npm run test -- src/tests/admin-*.test.ts
```

## 🔍 Quick Verification Commands

### Check Functions

```bash
npx supabase db execute --local "
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'admin_%'
ORDER BY routine_name;
"
```

### Check Policies

```bash
npx supabase db execute --local "
SELECT tablename, policyname
FROM pg_policies
WHERE policyname LIKE 'admin_%'
ORDER BY tablename;
"
```

### Test Key Functions

```bash
# Test customers
npx supabase db execute --local "SELECT COUNT(*) FROM admin_get_customers(10, 0);"

# Test providers
npx supabase db execute --local "SELECT COUNT(*) FROM admin_get_providers(10, 0);"

# Test orders
npx supabase db execute --local "SELECT COUNT(*) FROM admin_get_orders(10, 0);"

# Test topup requests
npx supabase db execute --local "SELECT COUNT(*) FROM admin_get_topup_requests(10, 0);"
```

## 📊 Migration Overview

| Migration | Purpose          | Key Changes                                                                      |
| --------- | ---------------- | -------------------------------------------------------------------------------- |
| 297       | Priority 1 RPC   | `admin_get_customers`, `admin_get_providers`                                     |
| 298       | Priority 2 RPC   | `admin_get_orders`, `admin_get_payments`, `admin_get_revenue_stats`              |
| 299       | Priority 3 RPC   | `admin_get_scheduled_rides`, `admin_get_withdrawals`, `admin_get_topup_requests` |
| 300       | RLS Policies     | Comprehensive admin RLS policies                                                 |
| 301       | Role Check Fix   | Fix admin role verification                                                      |
| 302       | Ambiguous ID Fix | Fix providers query column references                                            |
| 303       | Wallets Fix      | Fix wallet table references                                                      |
| 304       | Missing Columns  | Add missing provider columns                                                     |
| 305       | Topup Fix        | Fix topup requests columns                                                       |

## ✅ Success Checklist

- [ ] Docker running
- [ ] Supabase started
- [ ] Migrations applied (297-305)
- [ ] Types generated
- [ ] 10+ admin functions created
- [ ] 15+ admin policies active
- [ ] All test queries pass
- [ ] No errors in logs

## 🚨 Troubleshooting

### Docker not running

```bash
open -a Docker
sleep 30
docker ps
```

### Supabase not started

```bash
npx supabase start
npx supabase status
```

### Migration errors

```bash
# Check migration status
npx supabase migration list --local

# Reset if needed
npx supabase db reset --local
```

### Function errors

```bash
# Check logs
npx supabase db execute --local "
SELECT * FROM pg_stat_statements
WHERE query LIKE '%admin_%'
ORDER BY total_exec_time DESC;
"
```

## 📚 Documentation

- **Full Guide**: `DEPLOY-MIGRATIONS-297-305.md`
- **Verification SQL**: `verify-deployment.sql`
- **RPC Functions**: `../../docs/admin-rpc-functions.md`
- **Deployment Script**: `deploy-all.sh`

## 🎯 Next Steps After Deployment

1. **Run Tests**

   ```bash
   npm run test -- src/tests/admin-*.test.ts
   ```

2. **Start Dev Server**

   ```bash
   npm run dev
   ```

3. **Test Admin Panel**
   - Navigate to: `http://localhost:5173/admin`
   - Login with admin credentials
   - Test each view (Customers, Providers, Orders, etc.)

4. **Deploy to Production**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   npx supabase gen types --project-ref YOUR_PROJECT_REF > src/types/database.ts
   ```

## 💡 Tips

- Always verify locally before production
- Keep types in sync after schema changes
- Run tests after each deployment
- Check logs for any warnings
- Monitor performance with advisors

## 🎉 Expected Results

After successful deployment:

- ✅ 15+ admin RPC functions
- ✅ 20+ admin RLS policies
- ✅ All admin views functional
- ✅ Types up-to-date
- ✅ All tests passing
- ✅ Zero errors in logs
