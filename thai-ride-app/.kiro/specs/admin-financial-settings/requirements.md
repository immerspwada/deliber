# 💰 Admin Financial Settings - Requirements

**Date**: 2026-01-19  
**Status**: 🚧 In Progress  
**Priority**: 🔥 CRITICAL - Core Business Configuration

---

## 🎯 Overview

ระบบตั้งค่าทางการเงินสำหรับ Admin ที่ครอบคลุมทุกด้านของการจัดการเงินในแพลตฟอร์ม

---

## 📋 Functional Requirements

### 1. Commission Settings (ตั้งค่าคอมมิชชั่น)

#### 1.1 Service Type Commission

- ✅ ตั้งค่าอัตราคอมมิชชั่นแยกตามประเภทบริการ
  - Ride (รถรับส่ง)
  - Delivery (ส่งของ)
  - Shopping (ช้อปปิ้ง)
  - Moving (ขนของ)
  - Queue (จองคิว)
  - Laundry (ซักรีด)
- ✅ รองรับค่าเป็น % (0-100)
- ✅ Validation: ต้องไม่เกิน 50% (ป้องกันการตั้งค่าผิดพลาด)
- ✅ Default values จาก business model

#### 1.2 Surge Pricing Multipliers

- ✅ ตั้งค่าตัวคูณราคาตามความต้องการ
  - Low demand (1.0x)
  - Medium demand (1.3x)
  - High demand (1.5x)
  - Peak demand (2.0x)
- ✅ Validation: 1.0 - 3.0x
- ✅ Real-time preview calculation

#### 1.3 Subscription Tier Discounts

- ✅ ตั้งค่าส่วนลดคอมมิชชั่นสำหรับ Provider แบบ subscription
  - Basic (0% discount)
  - Premium (25% discount)
  - Pro (50% discount)
- ✅ Validation: 0-100%

### 2. Withdrawal Settings (ตั้งค่าการถอนเงิน)

#### 2.1 Amount Limits

- ✅ Minimum withdrawal amount (default: 100 THB)
- ✅ Maximum per transaction (default: 50,000 THB)
- ✅ Daily limit per provider (default: 100,000 THB)
- ✅ Validation: min < max

#### 2.2 Withdrawal Fees

- ✅ Bank transfer fee (default: 10 THB)
- ✅ PromptPay fee (default: 5 THB)
- ✅ Validation: 0-100 THB

#### 2.3 Processing Rules

- ✅ Auto-approval threshold (default: 5,000 THB)
  - ถ้าจำนวนน้อยกว่า → อนุมัติอัตโนมัติ
  - ถ้าจำนวนมากกว่า → ต้องอนุมัติด้วยตนเอง
- ✅ Maximum pending withdrawals (default: 3)
- ✅ Processing time estimate (default: 1-3 days)

#### 2.4 Provider Restrictions

- ✅ Minimum account age (default: 7 days)
- ✅ Minimum completed trips (default: 5 trips)
- ✅ Minimum rating (default: 4.0)

### 3. Top-up Settings (ตั้งค่าการเติมเงิน)

#### 3.1 Payment Method Fees

- ✅ Credit card fee (default: 2.5%)
- ✅ Bank transfer fee (default: 0%)
- ✅ PromptPay fee (default: 1%)
- ✅ TrueMoney fee (default: 2%)
- ✅ Validation: 0-10%

#### 3.2 Amount Limits

- ✅ Minimum top-up (default: 50 THB)
- ✅ Maximum per transaction (default: 50,000 THB)
- ✅ Daily limit per customer (default: 100,000 THB)

#### 3.3 Processing Rules

- ✅ Auto-approval threshold (default: 10,000 THB)
- ✅ Expiry duration (default: 24 hours)
- ✅ Require slip for amounts > threshold

#### 3.4 Payment Receiving Accounts

- ✅ จัดการบัญชีรับเงิน (PromptPay QR, Bank accounts)
- ✅ เปิด/ปิดการใช้งานแต่ละช่องทาง
- ✅ อัพโหลด QR Code

---

## 🔒 Non-Functional Requirements

### Security

- ✅ Admin-only access (role check)
- ✅ Audit logging ทุกการเปลี่ยนแปลง
- ✅ Validation ทุก input
- ✅ Rate limiting (prevent spam)

### Performance

- ✅ Settings cached in memory
- ✅ Lazy loading for heavy components
- ✅ Optimistic updates

### Reliability

- ✅ Atomic updates (all or nothing)
- ✅ Rollback on error
- ✅ Default values fallback
- ✅ Validation before save

### Usability

- ✅ Real-time preview
- ✅ Clear error messages (Thai)
- ✅ Confirmation dialogs for critical changes
- ✅ Undo capability (audit log)

---

## 📊 Data Model

### Settings Table Structure

```sql
CREATE TABLE financial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- 'commission', 'withdrawal', 'topup'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Example data
{
  category: 'commission',
  key: 'service_rates',
  value: {
    ride: 0.20,
    delivery: 0.25,
    shopping: 0.15,
    moving: 0.18,
    queue: 0.15,
    laundry: 0.20
  }
}
```

### Audit Log

```sql
CREATE TABLE financial_settings_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_id UUID REFERENCES financial_settings(id),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);
```

---

## 🎯 User Stories

### As an Admin

1. **ตั้งค่าคอมมิชชั่น**
   - ฉันต้องการปรับอัตราคอมมิชชั่นของแต่ละบริการ
   - เพื่อให้สอดคล้องกับกลยุทธ์ทางธุรกิจ
   - และเห็นผลกระทบต่อรายได้ทันที

2. **ตั้งค่าการถอนเงิน**
   - ฉันต้องการกำหนดขีดจำกัดการถอนเงิน
   - เพื่อควบคุมความเสี่ยงทางการเงิน
   - และป้องกันการฉ้อโกง

3. **ตั้งค่าการเติมเงิน**
   - ฉันต้องการกำหนดค่าธรรมเนียมแต่ละช่องทาง
   - เพื่อครอบคลุมต้นทุนการดำเนินงาน
   - และสร้างรายได้เพิ่มเติม

4. **ดูประวัติการเปลี่ยนแปลง**
   - ฉันต้องการเห็นว่าใครเปลี่ยนอะไรเมื่อไหร่
   - เพื่อตรวจสอบและ audit
   - และสามารถ rollback ได้ถ้าจำเป็น

---

## ✅ Acceptance Criteria

### Commission Settings

- [ ] สามารถตั้งค่าอัตราคอมมิชชั่นแต่ละบริการได้
- [ ] แสดง preview รายได้ที่คาดว่าจะได้รับ
- [ ] Validation ป้องกันค่าที่ไม่สมเหตุสมผล
- [ ] บันทึก audit log ทุกการเปลี่ยนแปลง

### Withdrawal Settings

- [ ] ตั้งค่าขีดจำกัดและค่าธรรมเนียมได้
- [ ] กำหนดเงื่อนไข auto-approval ได้
- [ ] แสดงผลกระทบต่อ provider
- [ ] Validation ครบถ้วน

### Top-up Settings

- [ ] ตั้งค่าค่าธรรมเนียมแต่ละช่องทางได้
- [ ] จัดการบัญชีรับเงินได้
- [ ] อัพโหลด QR Code ได้
- [ ] แสดง preview ค่าธรรมเนียม

### General

- [ ] UI responsive (mobile + desktop)
- [ ] Error handling ครบถ้วน
- [ ] Loading states ชัดเจน
- [ ] Confirmation dialogs สำหรับการเปลี่ยนแปลงสำคัญ

---

## 🚫 Out of Scope (Phase 1)

- ❌ Dynamic pricing algorithm (AI-based)
- ❌ Multi-currency support
- ❌ Scheduled rate changes
- ❌ A/B testing different rates
- ❌ Provider-specific commission rates
- ❌ Loyalty program integration

---

## 📈 Success Metrics

### Business Metrics

- Commission revenue per service type
- Average withdrawal amount
- Top-up conversion rate
- Fee revenue from top-ups

### Operational Metrics

- Settings change frequency
- Auto-approval rate
- Manual review time
- Error rate

### User Metrics

- Admin satisfaction
- Time to change settings
- Audit log usage

---

## 🔄 Future Enhancements (Phase 2)

- [ ] Scheduled rate changes
- [ ] Provider tier-based commission
- [ ] Dynamic surge pricing (AI)
- [ ] Multi-currency support
- [ ] Bulk settings import/export
- [ ] Settings templates
- [ ] Rollback to previous version
- [ ] Settings comparison tool

---

**Created**: 2026-01-19  
**Last Updated**: 2026-01-19  
**Owner**: Development Team
