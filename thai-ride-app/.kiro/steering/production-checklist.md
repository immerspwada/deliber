---
inclusion: manual
---

# 🚀 Production Deployment

## Pre-Deploy Checklist

### Code Quality

- [ ] `npm run lint` - 0 errors, 0 warnings
- [ ] `npm run type-check` - No TypeScript errors
- [ ] `npm run test -- --run` - All tests pass
- [ ] `npm run build` - Build successful
- [ ] No `console.log` statements
- [ ] No hardcoded values

### Security

- [ ] RLS enabled on ALL tables
- [ ] Rate limiting configured
- [ ] CORS whitelist production only
- [ ] No secrets in codebase
- [ ] Input validation on all endpoints
- [ ] Security headers configured

### Performance

- [ ] Bundle size < 500KB gzipped
- [ ] Lighthouse score ≥ 90
- [ ] Images optimized
- [ ] Code splitting implemented

## Environment Variables

```bash
# Production (.env.production)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_VAPID_PUBLIC_KEY=xxx
VITE_SENTRY_DSN=xxx
VITE_APP_ENV=production
```

## Deployment Steps

```bash
# 1. Run all checks
npm run lint && npm run type-check && npm run test -- --run

# 2. Build
npm run build

# 3. Deploy to staging
vercel --env staging

# 4. Smoke test staging
npm run test:smoke -- --env=staging

# 5. Deploy to production
vercel --prod

# 6. Verify
curl -I https://app.thairide.com/health
```

## Database Migration

```bash
# 1. Backup
supabase db dump -f backup_$(date +%Y%m%d).sql

# 2. Test on staging
supabase db push --db-url $STAGING_DB_URL

# 3. Apply to production
supabase db push --db-url $PRODUCTION_DB_URL
```

## Rollback

```bash
# Instant rollback (Vercel)
vercel rollback

# Database rollback
psql $PRODUCTION_DB_URL < backup_YYYYMMDD.sql
```

## Monitoring Alerts

| Metric         | Warning | Critical |
| -------------- | ------- | -------- |
| Error Rate     | > 1%    | > 5%     |
| Response Time  | > 1s    | > 3s     |
| CPU Usage      | > 70%   | > 90%    |
| DB Connections | > 80%   | > 95%    |

## Maintenance Window

- **Time**: Sunday 02:00-04:00 ICT
- **Notice**: 24 hours advance
- **Duration**: Max 2 hours
