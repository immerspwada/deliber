---
inclusion: always
---

# 🔐 Security Checklist (Production-Ready)

## Authentication & Authorization

### ✅ ต้องทำ

- ใช้ Supabase Auth สำหรับ authentication
- ตรวจสอบ session ก่อนทุก protected route
- ใช้ RLS policies ทุก table
- Validate user permissions ฝั่ง server
- ใช้ PKCE flow สำหรับ OAuth
- Implement session timeout (30 นาที inactive)
- Force re-authentication สำหรับ sensitive actions

### ❌ ห้ามทำ

- เก็บ tokens ใน localStorage (ใช้ Supabase session management)
- Trust client-side validation เพียงอย่างเดียว
- Expose sensitive data ใน client bundle
- ใช้ predictable session IDs

## Data Validation (Production)

```typescript
// ✅ ใช้ Zod สำหรับ runtime validation
import { z } from "zod";

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

// Edge Function validation
export async function handler(req: Request): Promise<Response> {
  const body = await req.json();
  const result = RideRequestSchema.safeParse(body);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        details: result.error.flatten(),
      }),
      { status: 400 }
    );
  }

  // Process validated data
  const validatedData = result.data;
}
```

## Environment Variables

```bash
# .env.example - ต้องมีไฟล์นี้
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_VAPID_PUBLIC_KEY=your_vapid_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_APP_ENV=development

# ❌ ห้าม commit ไฟล์เหล่านี้
# .env
# .env.local
# .env.production
```

## API Security (Production)

### Rate Limiting

```typescript
// ทุก Edge Function ต้องมี rate limiting
const RATE_LIMITS = {
  auth: { windowMs: 60000, max: 5 }, // 5 requests/min
  api: { windowMs: 60000, max: 100 }, // 100 requests/min
  upload: { windowMs: 60000, max: 10 }, // 10 uploads/min
  withdrawal: { windowMs: 3600000, max: 3 }, // 3/hour
};
```

### CORS Configuration

```typescript
// Production CORS - whitelist only
const ALLOWED_ORIGINS = [
  "https://app.thairide.com",
  "https://admin.thairide.com",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
```

## XSS Prevention

```vue
<!-- ✅ Vue auto-escapes by default -->
<p>{{ userInput }}</p>

<!-- ❌ ระวังการใช้ v-html -->
<div v-html="sanitizedHtml"></div>

<!-- ใช้ DOMPurify ถ้าจำเป็น -->
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

## Sensitive Data Handling

### PII Protection

```typescript
// ✅ Mask sensitive data ก่อน log
function maskPII(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["phone", "email", "id_card", "bank_account"];
  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      const value = String(masked[field]);
      masked[field] =
        value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
    }
  }

  return masked;
}
```

### Security Headers (Production)

```typescript
// vercel.json หรือ middleware
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=()",
};
```

## Security Audit Checklist

### Before Production Deploy

- [ ] RLS enabled ทุก tables
- [ ] Rate limiting configured
- [ ] CORS whitelist production domains only
- [ ] No secrets in codebase
- [ ] Input validation ทุก endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Audit logging enabled for sensitive operations
