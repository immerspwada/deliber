---
inclusion: always
---

# Security Checklist

## Authentication & Authorization

### ✅ ต้องทำ

- ใช้ Supabase Auth สำหรับ authentication
- ตรวจสอบ session ก่อนทุก protected route
- ใช้ RLS policies ทุก table
- Validate user permissions ฝั่ง server

### ❌ ห้ามทำ

- เก็บ tokens ใน localStorage (ใช้ httpOnly cookies)
- Trust client-side validation เพียงอย่างเดียว
- Expose sensitive data ใน client bundle

## Data Validation

```typescript
// ✅ Validate ทุก input
function validateRideRequest(data: unknown): RideRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request data");
  }

  const { pickup, dropoff } = data as Record<string, unknown>;

  if (typeof pickup !== "string" || pickup.length < 3) {
    throw new Error("Invalid pickup location");
  }

  if (typeof dropoff !== "string" || dropoff.length < 3) {
    throw new Error("Invalid dropoff location");
  }

  return { pickup, dropoff } as RideRequest;
}
```

## Environment Variables

```bash
# .env.example - ต้องมีไฟล์นี้
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_maps_key

# ❌ ห้าม commit ไฟล์เหล่านี้
# .env
# .env.local
# .env.production
```

## API Security

- Rate limiting บน Edge Functions
- CORS configuration ที่เหมาะสม
- Input sanitization ก่อน database queries
- ใช้ parameterized queries (Supabase ทำให้อัตโนมัติ)

## XSS Prevention

```vue
<!-- ✅ Vue auto-escapes by default -->
<p>{{ userInput }}</p>

<!-- ❌ ระวังการใช้ v-html -->
<div v-html="sanitizedHtml"></div>

<!-- ใช้ DOMPurify ถ้าจำเป็น -->
<script setup>
import DOMPurify from "dompurify";
const sanitizedHtml = computed(() => DOMPurify.sanitize(rawHtml.value));
</script>
```

## Sensitive Data Handling

- ห้าม log sensitive data (passwords, tokens, PII)
- Mask sensitive fields ใน error messages
- ใช้ HTTPS เสมอ
- Encrypt sensitive data at rest
