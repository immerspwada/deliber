---
inclusion: always
---

# 🚀 Production Deployment Checklist

## Pre-Deployment Requirements

### ✅ Code Quality Gates

- [ ] TypeScript strict mode - ไม่มี `any` types
- [ ] ESLint ผ่านทุก rules (0 errors, 0 warnings)
- [ ] Unit tests ผ่าน 100% (coverage > 80%)
- [ ] Integration tests ผ่านทุก critical flows
- [ ] No console.log statements (ใช้ structured logging แทน)
- [ ] No hardcoded values (ใช้ env variables)

### ✅ Security Checklist

- [ ] RLS policies enabled ทุก tables
- [ ] API rate limiting configured
- [ ] CORS whitelist production domains only
- [ ] Secrets ไม่อยู่ใน codebase
- [ ] Input validation ทุก endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection verified

### ✅ Performance Checklist

- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] API response time < 500ms
- [ ] Database queries optimized (no N+1)
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented

## Environment Configuration

### Production Environment Variables

```bash
# .env.production (ห้าม commit!)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_production_maps_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_APP_ENV=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Database Migration Process

### Migration Steps

```bash
# 1. Backup production database
supabase db dump -f backup_$(date +%Y%m%d).sql

# 2. Test migration on staging
supabase db push --db-url $STAGING_DB_URL

# 3. Verify staging
npm run test:integration -- --env=staging

# 4. Apply to production (during maintenance window)
supabase db push --db-url $PRODUCTION_DB_URL

# 5. Verify production
npm run test:smoke -- --env=production
```

### Rollback Plan

```sql
-- ทุก migration ต้องมี rollback script
-- migrations/xxx_feature.sql
-- migrations/xxx_feature_rollback.sql

-- Example rollback
BEGIN;
  DROP TABLE IF EXISTS new_feature_table;
  ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
COMMIT;
```

## Deployment Process

### 1. Pre-deployment

```bash
# Run all checks
npm run lint
npm run type-check
npm run test
npm run build

# Verify build
npm run preview
```

### 2. Staging Deployment

```bash
# Deploy to staging
vercel --env staging

# Run smoke tests
npm run test:smoke -- --env=staging

# Manual QA verification
```

### 3. Production Deployment

```bash
# Deploy to production
vercel --prod

# Verify deployment
curl -I https://your-app.vercel.app/health

# Monitor for 30 minutes
# Check error rates, response times
```

### 4. Post-deployment

- [ ] Verify all critical flows work
- [ ] Check error monitoring (Sentry)
- [ ] Check performance metrics
- [ ] Notify team of successful deployment

## Rollback Procedure

### Immediate Rollback (< 5 minutes)

```bash
# Vercel instant rollback
vercel rollback

# Or rollback to specific deployment
vercel rollback [deployment-url]
```

### Database Rollback

```bash
# Restore from backup
psql $PRODUCTION_DB_URL < backup_YYYYMMDD.sql

# Or run rollback migration
supabase db push migrations/xxx_rollback.sql
```

## Monitoring Setup

### Required Monitoring

1. **Error Tracking**: Sentry
2. **Performance**: Vercel Analytics
3. **Uptime**: UptimeRobot / Pingdom
4. **Database**: Supabase Dashboard

### Alert Thresholds

| Metric               | Warning | Critical |
| -------------------- | ------- | -------- |
| Error Rate           | > 1%    | > 5%     |
| Response Time        | > 1s    | > 3s     |
| CPU Usage            | > 70%   | > 90%    |
| Memory Usage         | > 70%   | > 90%    |
| Database Connections | > 80%   | > 95%    |

## Maintenance Windows

### Scheduled Maintenance

- **Time**: วันอาทิตย์ 02:00-04:00 ICT
- **Notification**: แจ้งล่วงหน้า 24 ชั่วโมง
- **Duration**: ไม่เกิน 2 ชั่วโมง

### Emergency Maintenance

- **Approval**: ต้องได้รับอนุมัติจาก Tech Lead
- **Communication**: แจ้งทันทีผ่าน Slack/Line
- **Post-mortem**: ต้องทำ incident report ภายใน 24 ชั่วโมง
