# Production Environment Rules

## 🚨 สถานะ: PRODUCTION ONLY

**ระบบนี้เป็น Production Environment เท่านั้น - ห้ามใช้ข้อมูลทดสอบหรือ Demo Data**

---

## 🔴 กฎเหล็ก Production (CRITICAL)

### 1. ห้ามใช้ Demo/Mock/Fake Data

| ❌ ห้ามทำเด็ดขาด             | ✅ ต้องทำ                        |
| ---------------------------- | -------------------------------- |
| ใช้ demo credentials         | ใช้ real admin accounts เท่านั้น |
| สร้าง mock data ใน code      | Query จาก database จริงเท่านั้น  |
| ใช้ hardcoded test users     | ใช้ user จริงที่ลงทะเบียนแล้ว    |
| Seed demo data ใน production | ข้อมูลต้องมาจากการใช้งานจริง     |
| ใช้ fake phone numbers       | ใช้เบอร์โทรจริงที่ verify แล้ว   |
| ใช้ test payment methods     | ใช้ payment gateway จริง         |

### 2. Security Requirements

```
✅ MUST HAVE:
- RLS (Row Level Security) ทุกตาราง
- HTTPS เท่านั้น
- JWT token validation
- Rate limiting
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

❌ NEVER DO:
- Expose API keys ใน frontend
- Log sensitive data (passwords, tokens)
- Disable RLS policies
- Use service_role key ใน client
- Store passwords in plain text
- Allow SQL injection
```

### 3. Database Rules for Production

```sql
-- ❌ ห้ามทำใน Production
DROP TABLE ...;           -- ห้าม drop table
TRUNCATE TABLE ...;       -- ห้าม truncate
DELETE FROM ... WHERE 1=1; -- ห้าม delete all
ALTER TABLE ... DROP COLUMN ...; -- ระวังมาก

-- ✅ ต้องทำ
-- ใช้ migration files เสมอ
-- Backup ก่อนทำ DDL changes
-- Test ใน staging ก่อน
-- มี rollback plan
```

### 4. Migration Rules for Production

```
1. ทุก migration ต้องผ่าน staging ก่อน
2. ต้องมี rollback script
3. ห้าม DROP หรือ TRUNCATE โดยไม่มี backup
4. ต้อง test RLS policies หลัง migrate
5. Monitor performance หลัง deploy
```

---

## 🔐 Admin Access Control

### Production Admin Requirements

```
1. ห้ามใช้ demo credentials:
   ❌ admin@demo.com / admin1234
   ✅ ใช้ real admin accounts ที่สร้างอย่างถูกต้อง

2. Admin accounts ต้อง:
   - มี strong password (min 12 chars)
   - เปิด 2FA (ถ้ามี)
   - มี audit log ทุก action
   - มี session timeout

3. Admin actions ต้อง:
   - Log ทุก sensitive action
   - Double confirm สำหรับ destructive actions
   - มี permission check ก่อนทุก operation
```

### Admin Audit Requirements

```typescript
// ทุก admin action ต้อง log
interface AdminAuditLog {
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  old_value?: any;
  new_value?: any;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}
```

---

## 📊 Data Integrity Rules

### 1. ห้ามลบข้อมูลถาวร (Soft Delete Only)

```sql
-- ❌ ห้ามทำ
DELETE FROM users WHERE id = '...';

-- ✅ ต้องทำ (Soft Delete)
UPDATE users SET
  deleted_at = NOW(),
  status = 'deleted'
WHERE id = '...';
```

### 2. Financial Data Protection

```
- ห้ามแก้ไข transaction records โดยตรง
- ทุก financial change ต้องมี audit trail
- Wallet balance ต้อง reconcile ได้
- Payment records ต้อง immutable
```

### 3. User Data Protection

```
- PII (Personal Identifiable Information) ต้อง encrypt
- ห้าม log sensitive data
- ต้องมี data retention policy
- ต้อง comply กับ PDPA
```

---

## 🚀 Deployment Checklist

### Before Deploy to Production

```
□ Code reviewed และ approved
□ All tests passed
□ Migration tested ใน staging
□ Rollback plan ready
□ Performance tested
□ Security scan passed
□ RLS policies verified
□ Error handling complete
□ Logging configured
□ Monitoring setup
```

### After Deploy

```
□ Verify all services running
□ Check error rates
□ Monitor performance metrics
□ Verify RLS working
□ Test critical flows
□ Check audit logs
□ Notify team
```

---

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Production MUST have:
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[production-anon-key]
VITE_GOOGLE_MAPS_API_KEY=[production-maps-key]
VITE_VAPID_PUBLIC_KEY=[production-vapid-key]

# NEVER in production:
# - Demo/test API keys
# - Development URLs
# - Debug flags enabled
```

### Build Configuration

```typescript
// vite.config.ts - Production settings
export default defineConfig({
  build: {
    minify: "terser",
    sourcemap: false, // ห้าม sourcemap ใน production
    rollupOptions: {
      output: {
        manualChunks: {
          /* optimized chunks */
        },
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
```

---

## 📱 Production Monitoring

### Required Monitoring

```
1. Error Tracking (Sentry)
   - All unhandled errors
   - API failures
   - Performance issues

2. Performance Monitoring
   - Core Web Vitals
   - API response times
   - Database query times

3. Business Metrics
   - Active users
   - Order completion rate
   - Provider availability
   - Revenue tracking

4. Security Monitoring
   - Failed login attempts
   - Suspicious activities
   - Rate limit violations
```

### Alert Thresholds

```
🔴 Critical (Immediate):
- Error rate > 5%
- API latency > 5s
- Database down
- Payment failures

🟡 Warning:
- Error rate > 1%
- API latency > 2s
- High memory usage
- Unusual traffic patterns
```

---

## 🛡️ Incident Response

### Production Incident Protocol

```
1. DETECT: Monitor alerts หรือ user reports
2. ASSESS: ประเมินความรุนแรง (P1-P4)
3. COMMUNICATE: แจ้ง stakeholders
4. MITIGATE: แก้ไขเบื้องต้น
5. RESOLVE: แก้ไขถาวร
6. POSTMORTEM: วิเคราะห์และป้องกัน
```

### Severity Levels

```
P1 - Critical: ระบบล่มทั้งหมด, ข้อมูลสูญหาย
P2 - High: ฟีเจอร์หลักใช้ไม่ได้
P3 - Medium: ฟีเจอร์รองมีปัญหา
P4 - Low: UI bugs, minor issues
```

---

## 🎯 กฎการแนะนำฟีเจอร์ (MANDATORY)

### หลักการสำคัญ

**การแนะนำทั้งหมดต้องเป็นสภาพแวดล้อม Production เท่านั้น**

### กฎบังคับสำหรับการแนะนำ

| ❌ ห้ามแนะนำ                           | ✅ ต้องแนะนำ                              |
| -------------------------------------- | ----------------------------------------- |
| ฟีเจอร์สำหรับ testing/staging          | ฟีเจอร์ที่ใช้งานจริงใน production         |
| Demo features หรือ mock integrations   | Real integrations กับ production services |
| Development tools ที่ไม่ควรอยู่ใน prod | Production-ready tools และ monitoring     |
| Test data seeding scripts              | Data migration scripts ที่ปลอดภัย         |
| Debug endpoints หรือ verbose logging   | Production logging และ error tracking     |

### เมื่อแนะนำฟีเจอร์ใหม่ต้องตรวจสอบ

```
□ ฟีเจอร์พร้อมใช้งานจริงใน production หรือไม่?
□ มี security considerations ครบถ้วนหรือไม่?
□ มี RLS policies รองรับหรือไม่?
□ มี error handling ที่เหมาะสมหรือไม่?
□ มี monitoring/alerting รองรับหรือไม่?
□ ไม่มี demo/mock data หรือ test credentials หรือไม่?
```

### ตัวอย่างการแนะนำที่ถูกต้อง

```
✅ ถูกต้อง:
- "แนะนำเพิ่ม Auto-Refund System ที่เชื่อมต่อกับ Wallet จริง"
- "แนะนำเพิ่ม Payment Analytics Dashboard สำหรับ Admin"
- "แนะนำปรับปรุง Error Recovery ให้ robust ขึ้น"

❌ ผิด:
- "แนะนำเพิ่ม Demo Mode สำหรับทดสอบ"
- "แนะนำสร้าง Test Users สำหรับ QA"
- "แนะนำเพิ่ม Debug Panel ใน UI"
```

---

## ⚠️ ข้อห้ามเด็ดขาดใน Production

| หมวด          | ❌ ห้ามทำ                        |
| ------------- | -------------------------------- |
| **Data**      | ใช้ mock/demo data               |
| **Auth**      | ใช้ demo credentials             |
| **Database**  | DROP/TRUNCATE โดยไม่ backup      |
| **Security**  | Disable RLS policies             |
| **Logging**   | Log passwords/tokens             |
| **Deploy**    | Deploy โดยไม่ test               |
| **Code**      | Push โดยไม่ review               |
| **API**       | Expose service_role key          |
| **Recommend** | แนะนำฟีเจอร์ที่ไม่ใช่ production |

---

## 📋 Production Readiness Checklist

### ก่อนเปิดใช้งาน Production

```
Security:
□ RLS policies ครบทุกตาราง
□ API keys เป็น production keys
□ HTTPS enabled
□ Rate limiting configured
□ Input validation complete

Performance:
□ Database indexes optimized
□ Caching configured
□ CDN setup
□ Bundle size optimized
□ Lazy loading implemented

Monitoring:
□ Error tracking setup
□ Performance monitoring
□ Alerting configured
□ Logging structured

Operations:
□ Backup strategy
□ Disaster recovery plan
□ Incident response plan
□ On-call rotation
```

---

**Last Updated:** December 27, 2024
**Environment:** PRODUCTION
**Status:** ACTIVE
