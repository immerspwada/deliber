---
inclusion: always
---

# 📊 Production Monitoring & Observability

## Logging Standards

### Structured Logging Format

```typescript
// utils/logger.ts
interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  service: string;
  metadata?: Record<string, unknown>;
}

class ProductionLogger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private log(
    level: LogEntry["level"],
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      requestId: getCurrentRequestId(),
      userId: getCurrentUserId(),
      metadata: this.sanitize(metadata),
    };

    // Production: ส่งไป logging service
    if (import.meta.env.PROD) {
      this.sendToLoggingService(entry);
    }

    // Development: console output
    console[level](JSON.stringify(entry));
  }

  private sanitize(
    data?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "phone",
      "email",
      "id_card",
    ];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    this.log("error", message, {
      ...metadata,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }
}

export const logger = new ProductionLogger("thai-ride-app");
```

### Log Levels Usage

```typescript
// ✅ ใช้ log level ที่เหมาะสม
logger.debug("Cache hit", { key: "user:123" }); // Development only
logger.info("User logged in", { userId: "xxx" }); // Normal operations
logger.warn("Rate limit approaching", { remaining: 5 }); // Potential issues
logger.error("Payment failed", error, { orderId: "xxx" }); // Errors

// ❌ ห้ามทำใน Production
console.log("Debug:", data);
console.error("Error:", error);
```

## Error Tracking (Sentry)

### Sentry Configuration

```typescript
// utils/sentry.ts
import * as Sentry from "@sentry/vue";

export function initSentry(app: App): void {
  if (!import.meta.env.PROD) return;

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV,
    release: import.meta.env.VITE_APP_VERSION,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Session replay (optional)
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 0.1,

    // Filter sensitive data
    beforeSend(event) {
      // Remove PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      /Loading chunk \d+ failed/,
    ],
  });
}

// Usage
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context?.component as string,
    },
  });
}
```

### Error Boundaries

```typescript
// composables/useErrorBoundary.ts
export function useErrorBoundary(componentName: string) {
  const error = ref<Error | null>(null);

  onErrorCaptured((err, instance, info) => {
    error.value = err;

    captureError(err, {
      component: componentName,
      info,
      props: instance?.$props,
    });

    return false; // Prevent propagation
  });

  function reset(): void {
    error.value = null;
  }

  return { error, reset };
}
```

## Performance Monitoring

### Core Web Vitals

```typescript
// utils/webVitals.ts
import { onCLS, onFID, onLCP, onFCP, onTTFB } from "web-vitals";

interface VitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

function sendToAnalytics(metric: VitalMetric): void {
  // ส่งไป analytics service
  fetch("/api/analytics/vitals", {
    method: "POST",
    body: JSON.stringify(metric),
    keepalive: true,
  });
}

export function initWebVitals(): void {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Targets
const VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};
```

### API Performance Tracking

```typescript
// utils/apiMetrics.ts
interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: string;
}

const apiMetrics: ApiMetric[] = [];

export function trackApiCall(metric: ApiMetric): void {
  apiMetrics.push(metric);

  // Alert if slow
  if (metric.duration > 1000) {
    logger.warn("Slow API call", {
      endpoint: metric.endpoint,
      duration: metric.duration,
    });
  }

  // Alert if error
  if (metric.status >= 500) {
    logger.error("API error", undefined, {
      endpoint: metric.endpoint,
      status: metric.status,
    });
  }
}

// Axios interceptor
api.interceptors.response.use(
  (response) => {
    trackApiCall({
      endpoint: response.config.url!,
      method: response.config.method!.toUpperCase(),
      duration: Date.now() - (response.config as any).startTime,
      status: response.status,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  (error) => {
    trackApiCall({
      endpoint: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      duration: Date.now() - (error.config as any)?.startTime,
      status: error.response?.status || 0,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
);
```

## Health Checks

### Application Health Endpoint

```typescript
// Edge Function: health-check
export default async function handler(req: Request): Promise<Response> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkSupabaseAuth(),
    checkExternalServices(),
  ]);

  const results = {
    status: checks.every((c) => c.status === "fulfilled")
      ? "healthy"
      : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {
      database: checks[0].status === "fulfilled" ? "ok" : "error",
      auth: checks[1].status === "fulfilled" ? "ok" : "error",
      external: checks[2].status === "fulfilled" ? "ok" : "error",
    },
  };

  return new Response(JSON.stringify(results), {
    status: results.status === "healthy" ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
}

async function checkDatabase(): Promise<void> {
  const { error } = await supabase.from("health_check").select("id").limit(1);
  if (error) throw error;
}
```

### Uptime Monitoring

```typescript
// External monitoring endpoints
const MONITORING_ENDPOINTS = [
  { name: "Main App", url: "https://app.thairide.com/health" },
  { name: "API", url: "https://api.thairide.com/health" },
  { name: "Supabase", url: "https://xxx.supabase.co/rest/v1/" },
];

// Alert channels
const ALERT_CHANNELS = {
  slack: "https://hooks.slack.com/services/xxx",
  line: "https://notify-api.line.me/api/notify",
  email: ["admin@thairide.com", "oncall@thairide.com"],
};
```

## Dashboard Metrics

### Key Metrics to Track

```typescript
interface DashboardMetrics {
  // Business Metrics
  activeUsers: number;
  ridesCompleted: number;
  revenue: number;

  // Technical Metrics
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;

  // Infrastructure
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
}

// Supabase query for metrics
const metricsQuery = `
  SELECT 
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) FILTER (WHERE status = 'completed') as rides_completed,
    SUM(fare) FILTER (WHERE status = 'completed') as revenue,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration
  FROM rides
  WHERE created_at > NOW() - INTERVAL '24 hours'
`;
```

## Alerting Rules

### Alert Configuration

```yaml
# alerting-rules.yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    channels: [slack, line, email]

  - name: slow_response
    condition: p95_response_time > 3000ms
    duration: 10m
    severity: warning
    channels: [slack]

  - name: database_connections_high
    condition: db_connections > 90%
    duration: 5m
    severity: critical
    channels: [slack, line]

  - name: payment_failures
    condition: payment_failure_rate > 1%
    duration: 5m
    severity: critical
    channels: [slack, line, email]
```

### On-Call Rotation

```typescript
// On-call schedule
const ON_CALL_SCHEDULE = {
  primary: {
    weekday: ["dev1@thairide.com", "dev2@thairide.com"],
    weekend: ["dev3@thairide.com"],
  },
  escalation: {
    level1: "tech-lead@thairide.com",
    level2: "cto@thairide.com",
  },
  escalationTime: {
    level1: 15, // minutes
    level2: 30,
  },
};
```
