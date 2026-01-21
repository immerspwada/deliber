---
inclusion: manual
---

# 📊 Production Monitoring

## Structured Logging

```typescript
// utils/logger.ts
interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private log(
    level: LogEntry["level"],
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      metadata: this.sanitize(meta),
    };

    if (import.meta.env.PROD) {
      // Send to logging service
      sendToLoggingService(entry);
    } else {
      console[level](JSON.stringify(entry));
    }
  }

  private sanitize(
    data?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;

    const sensitive = ["password", "token", "phone", "email", "id_card"];
    const result = { ...data };

    for (const key of Object.keys(result)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        result[key] = "[REDACTED]";
      }
    }
    return result;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log("error", message, {
      ...meta,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  }
}

export const logger = new Logger("thai-ride-app");
```

## Error Tracking (Sentry)

```typescript
// utils/sentry.ts
import * as Sentry from "@sentry/vue";

export function initSentry(app: App): void {
  if (!import.meta.env.PROD) return;

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV,
    tracesSampleRate: 0.1,

    beforeSend(event) {
      // Remove PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },

    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      /Loading chunk \d+ failed/,
    ],
  });
}
```

## Web Vitals

```typescript
// utils/webVitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

export function initWebVitals(): void {
  const sendMetric = (metric: { name: string; value: number }) => {
    if (import.meta.env.PROD) {
      fetch("/api/analytics/vitals", {
        method: "POST",
        body: JSON.stringify(metric),
        keepalive: true,
      });
    }
  };

  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}
```

## Health Check Endpoint

```typescript
// Edge Function: health-check
export default async function handler(req: Request): Promise<Response> {
  const checks = await Promise.allSettled([checkDatabase(), checkAuth()]);

  const status = checks.every((c) => c.status === "fulfilled")
    ? "healthy"
    : "degraded";

  return Response.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION,
    },
    { status: status === "healthy" ? 200 : 503 }
  );
}
```

## Alert Thresholds

| Metric         | Warning | Critical | Action       |
| -------------- | ------- | -------- | ------------ |
| Error Rate     | > 1%    | > 5%     | Page on-call |
| P95 Latency    | > 1s    | > 3s     | Investigate  |
| DB Connections | > 80%   | > 95%    | Scale up     |
| Memory         | > 70%   | > 90%    | Restart pods |
