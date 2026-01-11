---
inclusion: always
---

# 🔒 Production Security Hardening

## Authentication Security

### Session Management

```typescript
// ✅ Production session config
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce", // ใช้ PKCE flow สำหรับ security
    storage: {
      // ใช้ secure storage
      getItem: (key: string) => {
        // Production: ใช้ encrypted storage
        return secureStorage.get(key);
      },
      setItem: (key: string, value: string) => {
        secureStorage.set(key, value);
      },
      removeItem: (key: string) => {
        secureStorage.remove(key);
      },
    },
  },
};
```

### Token Security

```typescript
// ❌ ห้ามทำใน Production
localStorage.setItem("token", accessToken);
sessionStorage.setItem("refresh_token", refreshToken);

// ✅ ใช้ Supabase built-in session management
// Tokens จะถูกจัดการอัตโนมัติและ secure
const {
  data: { session },
} = await supabase.auth.getSession();
```

## API Security

### Rate Limiting (Edge Functions)

```typescript
// supabase/functions/_shared/rateLimiter.ts
import { createClient } from "@supabase/supabase-js";

interface RateLimitConfig {
  windowMs: number; // Time window in ms
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis key prefix
}

const PRODUCTION_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60000, maxRequests: 5, keyPrefix: "rl:auth" },
  api: { windowMs: 60000, maxRequests: 100, keyPrefix: "rl:api" },
  upload: { windowMs: 60000, maxRequests: 10, keyPrefix: "rl:upload" },
  withdrawal: { windowMs: 3600000, maxRequests: 3, keyPrefix: "rl:withdraw" },
};

export async function checkRateLimit(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = PRODUCTION_LIMITS[endpoint] || PRODUCTION_LIMITS["api"];
  // Implementation using Supabase or Redis
}
```

### Input Validation

```typescript
// ✅ Production-grade validation
import { z } from "zod";

const WithdrawalRequestSchema = z.object({
  amount: z
    .number()
    .positive("จำนวนเงินต้องมากกว่า 0")
    .max(100000, "จำนวนเงินเกินขีดจำกัด")
    .refine((val) => Number.isInteger(val), "จำนวนเงินต้องเป็นจำนวนเต็ม"),
  bank_account_id: z.string().uuid("รหัสบัญชีไม่ถูกต้อง"),
  note: z.string().max(500).optional(),
});

// ใช้ใน Edge Function
export async function handler(req: Request): Promise<Response> {
  const body = await req.json();

  const result = WithdrawalRequestSchema.safeParse(body);
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

## Database Security

### RLS Policies (Production)

```sql
-- ✅ Strict RLS for financial data
CREATE POLICY "Users can only view own wallet"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only system can modify wallet balance"
ON wallets FOR UPDATE
USING (false)  -- ห้าม direct update
WITH CHECK (false);

-- Wallet modifications ต้องผ่าน functions เท่านั้น
CREATE OR REPLACE FUNCTION safe_wallet_update(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_reference_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER  -- Run as function owner
SET search_path = public
AS $$
BEGIN
  -- Validation
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Atomic transaction
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Audit log
  INSERT INTO wallet_transactions (...)
  VALUES (...);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Audit Logging

```sql
-- Production audit table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id, action, table_name, record_id,
    old_data, new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_wallets
AFTER INSERT OR UPDATE OR DELETE ON wallets
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_withdrawals
AFTER INSERT OR UPDATE OR DELETE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## Content Security

### CSP Headers

```typescript
// vercel.json หรือ middleware
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=()",
};
```

## Sensitive Data Handling

### PII Protection

```typescript
// ✅ Mask sensitive data in logs
function maskSensitiveData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveFields = ["phone", "email", "id_card", "bank_account"];
  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = maskValue(String(masked[field]));
    }
  }

  return masked;
}

function maskValue(value: string): string {
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

// Usage in logging
logger.info(
  "User action",
  maskSensitiveData({
    userId: user.id,
    phone: user.phone, // จะถูก mask เป็น 08****90
    action: "withdrawal",
  })
);
```

### Encryption at Rest

```typescript
// สำหรับ sensitive data ที่ต้องเก็บ
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

## Security Incident Response

### Incident Levels

| Level | Description                    | Response Time | Escalation     |
| ----- | ------------------------------ | ------------- | -------------- |
| P1    | Data breach, system compromise | < 15 min      | Immediate      |
| P2    | Auth bypass, financial impact  | < 1 hour      | Tech Lead      |
| P3    | Vulnerability discovered       | < 24 hours    | Security Team  |
| P4    | Minor security issue           | < 1 week      | Normal process |

### Response Checklist

1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Alert relevant stakeholders
4. **Remediate**: Fix the vulnerability
5. **Document**: Create incident report
6. **Review**: Post-mortem and improvements
