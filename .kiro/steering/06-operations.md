# Operations & Deployment - Thai Ride App

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Developer                                                              │
│      │                                                                  │
│      ▼                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐             │
│  │  Code   │───▶│  Build  │───▶│  Test   │───▶│ Deploy  │             │
│  │ Change  │    │  Check  │    │  Suite  │    │ Vercel  │             │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘             │
│                                                     │                   │
│                                                     ▼                   │
│                                              ┌─────────────┐            │
│                                              │  Production │            │
│                                              │   Vercel    │            │
│                                              └──────┬──────┘            │
│                                                     │                   │
│                                                     ▼                   │
│                                              ┌─────────────┐            │
│                                              │  Supabase   │            │
│                                              │  (Backend)  │            │
│                                              └─────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Build & Deploy

### Build Configuration

```typescript
// vite.config.ts - Production Build
export default defineConfig({
  build: {
    target: "es2020",
    minify: "terser",
    sourcemap: false, // No sourcemaps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
          supabase: ["@supabase/supabase-js"],
          maps: ["@googlemaps/js-api-loader"],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log
        drop_debugger: true,
      },
    },
  },
});
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Environment Variables

```bash
# Production Environment (.env.production)
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[production-anon-key]
VITE_GOOGLE_MAPS_API_KEY=[production-maps-key]
VITE_VAPID_PUBLIC_KEY=[production-vapid-key]
VITE_SENTRY_DSN=[sentry-dsn]
VITE_APP_VERSION=$npm_package_version

# NEVER include in production:
# - SERVICE_ROLE_KEY
# - Debug flags
# - Test credentials
```

---

## 🗄️ Database Operations

### Migration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   MIGRATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Create Migration File                                   │
│     └── supabase/migrations/XXX_feature_name.sql            │
│                                                             │
│  2. Execute via MCP (MANDATORY)                             │
│     └── kiroPowers → supabase-hosted → execute_sql          │
│                                                             │
│  3. Verify Execution                                        │
│     └── Check for errors, verify tables/functions           │
│                                                             │
│  4. Update Documentation                                    │
│     └── Update database-features.md                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Migration Naming Convention

```
Format: NNN_descriptive_name.sql

Examples:
├── 001_initial_schema.sql
├── 027_user_member_uid.sql
├── 079_wallet_topup_system.sql
├── 122_dual_role_user_provider_system.sql
└── 167_service_bundles.sql

Rules:
├── Sequential numbering (001, 002, ...)
├── Lowercase with underscores
├── Descriptive name
└── .sql extension
```

### Migration Template

```sql
-- ============================================
-- Migration: XXX_feature_name.sql
-- Feature: F## - Feature Name
-- Date: YYYY-MM-DD
-- ============================================
-- Description: What this migration does
-- Tables: table1, table2
-- RLS: Yes
-- Realtime: Yes
-- ============================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS feature_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_feature_table_user_id
  ON feature_table(user_id);

-- 3. Enable RLS
ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "admin_full_access" ON feature_table
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "customer_own_data" ON feature_table
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Enable Realtime (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE feature_table;

-- 6. Create Functions (if needed)
CREATE OR REPLACE FUNCTION feature_function()
RETURNS ... AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create Triggers (if needed)
CREATE TRIGGER trigger_name
  BEFORE UPDATE ON feature_table
  FOR EACH ROW
  EXECUTE FUNCTION trigger_function();
```

### Rollback Strategy

```sql
-- Always include rollback comments
-- ROLLBACK:
-- DROP TABLE IF EXISTS feature_table CASCADE;
-- DROP FUNCTION IF EXISTS feature_function();
-- DROP TRIGGER IF EXISTS trigger_name ON feature_table;
```

---

## 📊 Monitoring & Observability

### Error Tracking (Sentry)

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/vue";

export function initSentry(app: App) {
  if (import.meta.env.PROD) {
    Sentry.init({
      app,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: "production",
      release: import.meta.env.VITE_APP_VERSION,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: [
            "localhost",
            /^https:\/\/[^/]*\.supabase\.co/,
          ],
        }),
      ],
      tracesSampleRate: 0.1, // 10% of transactions
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

// Error boundary
export function captureError(error: Error, context?: Record<string, any>) {
  console.error("[Error]", error);
  if (import.meta.env.PROD) {
    Sentry.captureException(error, { extra: context });
  }
}
```

### Performance Monitoring

```typescript
// Core Web Vitals tracking
export function trackWebVitals() {
  if ("web-vital" in window) {
    import("web-vitals").then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(sendToAnalytics);
      getFID(sendToAnalytics);
      getFCP(sendToAnalytics);
      getLCP(sendToAnalytics);
      getTTFB(sendToAnalytics);
    });
  }
}

function sendToAnalytics(metric: Metric) {
  // Send to analytics service
  console.log("[WebVital]", metric.name, metric.value);
}
```

### Health Check Endpoints

```typescript
// Health check composable
export function useHealthCheck() {
  async function checkSupabaseHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.from("users").select("count").limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async function checkRealtimeHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = supabase.channel("health-check");
      const timeout = setTimeout(() => {
        channel.unsubscribe();
        resolve(false);
      }, 5000);

      channel.subscribe((status) => {
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve(status === "SUBSCRIBED");
      });
    });
  }

  return { checkSupabaseHealth, checkRealtimeHealth };
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_GOOGLE_MAPS_API_KEY: ${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run type-check
npm run lint
npm run test -- --run
```

---

## 🚨 Incident Response

### Severity Levels

```
┌─────────────────────────────────────────────────────────────┐
│                    SEVERITY LEVELS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  P1 - CRITICAL (Response: < 15 min)                         │
│  ├── Complete system outage                                 │
│  ├── Data breach or security incident                       │
│  ├── Payment system failure                                 │
│  └── Authentication bypass                                  │
│                                                             │
│  P2 - HIGH (Response: < 1 hour)                             │
│  ├── Major feature broken                                   │
│  ├── Performance degradation > 50%                          │
│  └── Partial data access issues                             │
│                                                             │
│  P3 - MEDIUM (Response: < 4 hours)                          │
│  ├── Minor feature issues                                   │
│  ├── UI bugs affecting UX                                   │
│  └── Non-critical errors                                    │
│                                                             │
│  P4 - LOW (Response: < 24 hours)                            │
│  ├── Cosmetic issues                                        │
│  ├── Documentation errors                                   │
│  └── Minor improvements                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Incident Response Protocol

```
1. DETECT
   ├── Monitor alerts (Sentry, Vercel, Supabase)
   ├── User reports
   └── Automated health checks

2. ASSESS
   ├── Determine severity (P1-P4)
   ├── Identify affected systems
   └── Estimate impact scope

3. CONTAIN
   ├── Isolate affected components
   ├── Enable maintenance mode (if needed)
   └── Prevent further damage

4. COMMUNICATE
   ├── Notify stakeholders
   ├── Update status page
   └── Inform affected users

5. RESOLVE
   ├── Implement fix
   ├── Test thoroughly
   └── Deploy to production

6. POSTMORTEM
   ├── Document incident timeline
   ├── Identify root cause
   ├── Implement preventive measures
   └── Update runbooks
```

### Rollback Procedures

```bash
# Vercel Rollback
# 1. Go to Vercel Dashboard
# 2. Select deployment to rollback to
# 3. Click "Promote to Production"

# Database Rollback (CAUTION)
# 1. Identify migration to rollback
# 2. Execute rollback SQL
# 3. Verify data integrity
# 4. Update application if needed

# Emergency Contacts
# - On-call Engineer: [contact]
# - Database Admin: [contact]
# - Security Team: [contact]
```

---

## 📈 Performance Optimization

### Bundle Size Targets

```
Target Bundle Sizes:
├── Initial JS: < 200KB (gzipped)
├── Initial CSS: < 50KB (gzipped)
├── Vendor chunk: < 150KB (gzipped)
├── Route chunks: < 50KB each (gzipped)
└── Total initial load: < 500KB (gzipped)
```

### Optimization Strategies

```typescript
// 1. Route-based code splitting
const CustomerHomeView = () => import('@/views/CustomerHomeView.vue');
const AdminDashboard = () => import('@/admin/views/DashboardView.vue');

// 2. Component lazy loading
const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
);

// 3. Image optimization
<OptimizedImage
  src="/images/hero.jpg"
  :width="800"
  :height="600"
  loading="lazy"
  format="webp"
/>

// 4. Virtual scrolling for large lists
<VirtualScroll
  :items="largeList"
  :item-height="80"
  :buffer="5"
/>
```

### Caching Strategy

```typescript
// Service Worker caching
const CACHE_NAME = "thai-ride-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// Cache-first for static assets
// Network-first for API calls
// Stale-while-revalidate for images
```

---

## 🔐 Security Operations

### Secret Management

```
Secret Storage:
├── Vercel Environment Variables (frontend)
├── Supabase Vault (backend secrets)
└── GitHub Secrets (CI/CD)

Rotation Schedule:
├── API Keys: Every 90 days
├── JWT Secrets: Every 180 days
└── Service Accounts: Every 365 days
```

### Security Checklist

```
Pre-Deploy Security Check:
□ No secrets in code
□ RLS policies verified
□ Input validation complete
□ HTTPS enforced
□ Security headers configured
□ Dependencies updated
□ No console.log in production
□ Error messages sanitized
```

### Audit Logging

```sql
-- Admin actions are logged
SELECT * FROM admin_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Monitor for suspicious activity
SELECT admin_id, action, COUNT(*)
FROM admin_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY admin_id, action
HAVING COUNT(*) > 100;
```

---

## 📋 Operational Checklists

### Daily Operations

```
□ Check error rates in Sentry
□ Review Vercel deployment status
□ Monitor Supabase metrics
□ Check realtime connection health
□ Review support tickets
```

### Weekly Operations

```
□ Review performance metrics
□ Check bundle size trends
□ Review security alerts
□ Update dependencies (minor)
□ Review audit logs
```

### Monthly Operations

```
□ Security audit
□ Performance review
□ Dependency updates (major)
□ Backup verification
□ Disaster recovery test
□ Documentation review
```

### Pre-Release Checklist

```
□ All tests passing
□ Type check passing
□ Lint check passing
□ Bundle size within limits
□ Security scan passed
□ RLS policies verified
□ Cross-role testing complete
□ Performance benchmarks met
□ Documentation updated
□ Rollback plan ready
```

---

## 🛠️ Useful Commands

### Development

```bash
# Start development server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database

```bash
# Push migrations (via CLI)
cd thai-ride-app && npx supabase db push --linked

# Generate types
npm run generate-types

# Reset database (CAUTION)
npx supabase db reset
```

### Deployment

```bash
# Deploy to Vercel
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]
```

---

## 📚 Runbooks

### Runbook: High Error Rate

```
Trigger: Error rate > 5% for 5 minutes

Steps:
1. Check Sentry for error patterns
2. Identify affected endpoints/components
3. Check recent deployments
4. If deployment-related: rollback
5. If data-related: check Supabase
6. Notify stakeholders
7. Document incident
```

### Runbook: Database Connection Issues

```
Trigger: Database connection failures

Steps:
1. Check Supabase status page
2. Verify connection pooling settings
3. Check for long-running queries
4. Review RLS policy performance
5. Scale connection pool if needed
6. Contact Supabase support if persistent
```

### Runbook: Realtime Disconnections

```
Trigger: Realtime subscription failures

Steps:
1. Check Supabase Realtime status
2. Verify channel subscriptions
3. Check for rate limiting
4. Review client reconnection logic
5. Clear stale channels
6. Restart affected services
```

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
