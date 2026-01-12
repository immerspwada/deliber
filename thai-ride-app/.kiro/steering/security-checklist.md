---
inclusion: always
---

# 🔐 Security Standards (Production)

## Authentication & Session

```typescript
// ✅ REQUIRED Configuration
const supabaseConfig = {
  auth: {
    flowType: "pkce", // ใช้ PKCE flow
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

// ✅ Session validation
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  await supabase.auth.signOut();
  router.push("/login");
}

// ❌ NEVER DO
localStorage.setItem("token", accessToken); // ห้าม store tokens manually
```

## Input Validation (Zod)

```typescript
import { z } from "zod";

// ✅ Define schemas
const RideRequestSchema = z.object({
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  dropoff: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(3).max(500),
  }),
  serviceType: z.enum(["ride", "delivery", "moving"]),
  notes: z.string().max(1000).optional(),
});

// ✅ Validate in Edge Functions
export async function handler(req: Request): Promise<Response> {
  const body = await req.json();
  const result = RideRequestSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        details: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  // Process result.data (validated)
}
```

## Rate Limiting

```typescript
// Edge Function rate limits
const RATE_LIMITS = {
  auth: { window: 60_000, max: 5 }, // 5/min
  api: { window: 60_000, max: 100 }, // 100/min
  upload: { window: 60_000, max: 10 }, // 10/min
  withdrawal: { window: 3600_000, max: 3 }, // 3/hour
} as const;
```

## XSS Prevention

```vue
<template>
  <!-- ✅ Vue auto-escapes -->
  <p>{{ userInput }}</p>

  <!-- ⚠️ v-html requires sanitization -->
  <div v-html="sanitizedHtml" />
</template>

<script setup lang="ts">
import DOMPurify from "dompurify";

const sanitizedHtml = computed(() =>
  DOMPurify.sanitize(rawHtml.value, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  })
);
</script>
```

## Environment Variables

```bash
# .env.example (commit this)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_VAPID_PUBLIC_KEY=
VITE_SENTRY_DSN=
VITE_APP_ENV=development

# ❌ NEVER commit
# .env, .env.local, .env.production
```

## Security Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(self), camera=(), microphone=()"
        }
      ]
    }
  ]
}
```

## PII Masking

```typescript
// ✅ Mask before logging
function maskPII(data: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ["phone", "email", "id_card", "bank_account"];
  const masked = { ...data };

  for (const field of sensitive) {
    if (typeof masked[field] === "string") {
      const val = masked[field] as string;
      masked[field] = val.slice(0, 2) + "***" + val.slice(-2);
    }
  }
  return masked;
}

// Usage
logger.info("User action", maskPII({ phone: "0812345678" }));
// Output: { phone: '08***78' }
```

## Pre-Deploy Security Checklist

- [ ] RLS enabled on ALL tables
- [ ] Rate limiting configured
- [ ] CORS whitelist production domains only
- [ ] No secrets in codebase (use env vars)
- [ ] Input validation on all endpoints
- [ ] Security headers configured
- [ ] Audit logging for sensitive operations
