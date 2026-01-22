# Customer Topup Management System - Requirements

**Date**: 2026-01-22  
**Status**: 📝 Draft  
**Priority**: 🔥 High

---

## 📋 Overview

ระบบจัดการการเติมเงินสำหรับลูกค้า (Customer Topup Management) ที่ให้ Admin สามารถตั้งค่าช่องทางการชำระเงิน อัพโหลด QR Code พร้อมเพย์ และจัดการข้อมูลบัญชีธนาคารสำหรับการรับเงินจากลูกค้า

---

## 🎯 Business Goals

### Primary Goals

1. **ลดภาระงาน Manual**: ลดการต้องส่ง QR Code ให้ลูกค้าทุกครั้ง
2. **เพิ่มความสะดวก**: ลูกค้าเห็น QR Code และข้อมูลการโอนทันทีในแอป
3. **ลดข้อผิดพลาด**: ข้อมูลบัญชีถูกต้องและเป็นปัจจุบันเสมอ
4. **เพิ่มความเร็ว**: ลูกค้าเติมเงินได้เร็วขึ้น
5. **Audit Trail**: บันทึกการเปลี่ยนแปลงการตั้งค่าทั้งหมด

### Secondary Goals

1. รองรับหลายช่องทางการชำระเงิน
2. รองรับหลายบัญชีธนาคาร
3. สามารถเปิด/ปิดช่องทางการชำระเงินได้
4. แสดงสถิติการเติมเงินแยกตามช่องทาง

---

## 👥 User Stories

### US-1: Admin ตั้งค่าพร้อมเพย์ QR Code

**As an** Admin  
**I want** อัพโหลดและจัดการ QR Code พร้อมเพย์  
**So that** ลูกค้าสามารถสแกน QR เพื่อเติมเงินได้ทันที

**Acceptance Criteria:**

- ✅ อัพโหลดรูป QR Code (PNG, JPG, max 2MB)
- ✅ แสดง Preview QR Code ที่อัพโหลด
- ✅ ระบุเบอร์พร้อมเพย์
- ✅ ระบุชื่อบัญชี
- ✅ เปิด/ปิดการใช้งานพร้อมเพย์
- ✅ บันทึกและแสดงผลทันที

### US-2: Admin ตั้งค่าบัญชีธนาคาร

**As an** Admin  
**I want** เพิ่มและจัดการข้อมูลบัญชีธนาคารสำหรับรับเงิน  
**So that** ลูกค้าสามารถโอนเงินผ่านธนาคารได้

**Acceptance Criteria:**

- ✅ เพิ่มบัญชีธนาคารได้หลายบัญชี
- ✅ ระบุชื่อธนาคาร
- ✅ ระบุเลขที่บัญชี
- ✅ ระบุชื่อบัญชี
- ✅ ระบุสาขา (optional)
- ✅ เปิด/ปิดการใช้งานแต่ละบัญชี
- ✅ ลบบัญชีที่ไม่ใช้แล้ว
- ✅ แก้ไขข้อมูลบัญชี

### US-3: Admin ตั้งค่าจำนวนเงินขั้นต่ำ/สูงสุด

**As an** Admin  
**I want** กำหนดจำนวนเงินขั้นต่ำและสูงสุดในการเติมเงิน  
**So that** ควบคุมการเติมเงินให้อยู่ในกรอบที่เหมาะสม

**Acceptance Criteria:**

- ✅ ตั้งค่าจำนวนเงินขั้นต่ำ (เช่น 100 บาท)
- ✅ ตั้งค่าจำนวนเงินสูงสุด (เช่น 50,000 บาท)
- ✅ ตั้งค่าจำนวนเงินแนะนำ (Quick Amount: 100, 500, 1000, 2000)
- ✅ Validate ว่าขั้นต่ำต้องน้อยกว่าสูงสุด
- ✅ แสดงข้อความแจ้งเตือนเมื่อลูกค้ากรอกเงินไม่ถูกต้อง

### US-4: Admin ดูสถิติการเติมเงิน

**As an** Admin  
**I want** ดูสถิติการเติมเงินแยกตามช่องทาง  
**So that** วิเคราะห์ว่าลูกค้าใช้ช่องทางไหนมากที่สุด

**Acceptance Criteria:**

- ✅ แสดงจำนวนการเติมเงินแยกตามช่องทาง
- ✅ แสดงยอดเงินรวมแยกตามช่องทาง
- ✅ แสดงเปอร์เซ็นต์การใช้งานแต่ละช่องทาง
- ✅ แสดงข้อมูลย้อนหลัง 7 วัน, 30 วัน, 90 วัน
- ✅ Export ข้อมูลเป็น CSV

### US-5: ลูกค้าเห็น QR Code และข้อมูลการโอน

**As a** Customer  
**I want** เห็น QR Code และข้อมูลบัญชีธนาคารในแอป  
**So that** สามารถเติมเงินได้สะดวกและรวดเร็ว

**Acceptance Criteria:**

- ✅ แสดง QR Code พร้อมเพย์ (ถ้าเปิดใช้งาน)
- ✅ แสดงเบอร์พร้อมเพย์พร้อมปุ่ม Copy
- ✅ แสดงรายการบัญชีธนาคารที่เปิดใช้งาน
- ✅ แสดงเลขที่บัญชีพร้อมปุ่ม Copy
- ✅ แสดงชื่อบัญชีและสาขา
- ✅ แสดงจำนวนเงินขั้นต่ำ/สูงสุด
- ✅ แสดงจำนวนเงินแนะนำ (Quick Amount)

---

## 🗄️ Database Schema

### Table: `topup_payment_settings`

```sql
CREATE TABLE topup_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- PromptPay Settings
  promptpay_enabled BOOLEAN DEFAULT false,
  promptpay_number TEXT,
  promptpay_name TEXT,
  promptpay_qr_url TEXT, -- URL to QR Code image in storage

  -- Amount Limits
  min_topup_amount DECIMAL(10,2) DEFAULT 100.00,
  max_topup_amount DECIMAL(10,2) DEFAULT 50000.00,
  quick_amounts JSONB DEFAULT '[100, 500, 1000, 2000, 5000]',

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT check_min_max CHECK (min_topup_amount < max_topup_amount)
);
```

### Table: `topup_bank_accounts`

```sql
CREATE TABLE topup_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Bank Details
  bank_name TEXT NOT NULL,
  bank_code TEXT, -- ธกส, กสิกร, ไทยพาณิชย์, etc.
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  branch_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  CONSTRAINT unique_account_number UNIQUE (account_number)
);
```

### Table: `topup_settings_audit_log`

```sql
CREATE TABLE topup_settings_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Audit Info
  action TEXT NOT NULL, -- 'update_promptpay', 'add_bank', 'update_bank', 'delete_bank', 'update_limits'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,

  -- User Info
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
```

---

## 🔌 API Endpoints (RPC Functions)

### 1. `get_topup_payment_settings()`

```sql
CREATE OR REPLACE FUNCTION get_topup_payment_settings()
RETURNS TABLE (
  id UUID,
  promptpay_enabled BOOLEAN,
  promptpay_number TEXT,
  promptpay_name TEXT,
  promptpay_qr_url TEXT,
  min_topup_amount DECIMAL(10,2),
  max_topup_amount DECIMAL(10,2),
  quick_amounts JSONB,
  bank_accounts JSONB -- Array of active bank accounts
)
```

**Security**: Public (no auth required) - ลูกค้าต้องเห็นได้

### 2. `update_topup_payment_settings()` (Admin Only)

```sql
CREATE OR REPLACE FUNCTION update_topup_payment_settings(
  p_promptpay_enabled BOOLEAN,
  p_promptpay_number TEXT,
  p_promptpay_name TEXT,
  p_promptpay_qr_url TEXT,
  p_min_topup_amount DECIMAL(10,2),
  p_max_topup_amount DECIMAL(10,2),
  p_quick_amounts JSONB
)
RETURNS TABLE (success BOOLEAN, message TEXT)
```

**Security**: Admin only

### 3. `add_topup_bank_account()` (Admin Only)

```sql
CREATE OR REPLACE FUNCTION add_topup_bank_account(
  p_bank_name TEXT,
  p_bank_code TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_branch_name TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT, account_id UUID)
```

### 4. `update_topup_bank_account()` (Admin Only)

```sql
CREATE OR REPLACE FUNCTION update_topup_bank_account(
  p_account_id UUID,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_branch_name TEXT,
  p_is_active BOOLEAN
)
RETURNS TABLE (success BOOLEAN, message TEXT)
```

### 5. `delete_topup_bank_account()` (Admin Only)

```sql
CREATE OR REPLACE FUNCTION delete_topup_bank_account(
  p_account_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT)
```

### 6. `get_topup_statistics()` (Admin Only)

```sql
CREATE OR REPLACE FUNCTION get_topup_statistics(
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS TABLE (
  total_topups INT,
  total_amount DECIMAL(12,2),
  by_payment_method JSONB,
  by_status JSONB
)
```

---

## 🎨 UI Components

### 1. Admin Settings View: `AdminTopupSettingsView.vue`

**Location**: `/admin/settings/topup`

**Sections**:

1. **PromptPay Settings Card**
   - Toggle เปิด/ปิด
   - Upload QR Code
   - เบอร์พร้อมเพย์
   - ชื่อบัญชี

2. **Bank Accounts Card**
   - รายการบัญชีธนาคาร (Table)
   - ปุ่มเพิ่มบัญชีใหม่
   - ปุ่มแก้ไข/ลบแต่ละบัญชี

3. **Amount Limits Card**
   - จำนวนเงินขั้นต่ำ
   - จำนวนเงินสูงสุด
   - จำนวนเงินแนะนำ (Quick Amounts)

4. **Statistics Card**
   - สถิติการเติมเงิน 7/30/90 วัน
   - แยกตามช่องทาง

### 2. Customer Topup View: `CustomerTopupView.vue`

**Location**: `/customer/wallet/topup`

**Sections**:

1. **Amount Input**
   - กรอกจำนวนเงิน
   - Quick Amount Buttons
   - แสดงขั้นต่ำ/สูงสุด

2. **Payment Method Selection**
   - พร้อมเพย์ (ถ้าเปิดใช้งาน)
   - โอนเงินธนาคาร

3. **Payment Details**
   - แสดง QR Code (ถ้าเลือกพร้อมเพย์)
   - แสดงข้อมูลบัญชี (ถ้าเลือกธนาคาร)
   - ปุ่ม Copy

4. **Upload Slip**
   - อัพโหลดสลิปการโอน
   - Preview รูป

5. **Submit Button**
   - ส่งคำขอเติมเงิน

---

## 🔒 Security & Validation

### Input Validation

- จำนวนเงิน: ต้องเป็นตัวเลข, มากกว่า 0, อยู่ในช่วงที่กำหนด
- เบอร์พร้อมเพย์: 10 หลัก, เริ่มต้นด้วย 0
- เลขที่บัญชี: ตัวเลขเท่านั้น, 10-15 หลัก
- QR Code: รูปภาพเท่านั้น (PNG, JPG), ไม่เกิน 2MB

### Authorization

- Admin เท่านั้นที่แก้ไขการตั้งค่าได้
- ลูกค้าเห็นเฉพาะข้อมูลที่เปิดใช้งาน
- Audit log บันทึกทุกการเปลี่ยนแปลง

### Storage

- QR Code เก็บใน Supabase Storage bucket: `topup-qr-codes`
- RLS Policy: Public read, Admin only write

---

## 📊 Success Metrics

### KPIs

1. **Adoption Rate**: % ลูกค้าที่ใช้ระบบเติมเงินใหม่
2. **Processing Time**: เวลาเฉลี่ยในการอนุมัติคำขอเติมเงิน
3. **Error Rate**: % คำขอที่ถูกปฏิเสธเพราะข้อมูลผิด
4. **Channel Usage**: % การใช้งานแต่ละช่องทาง

### Targets

- Adoption Rate > 80% ภายใน 1 เดือน
- Processing Time < 5 นาที
- Error Rate < 5%
- PromptPay Usage > 60%

---

## 🚀 Implementation Phases

### Phase 1: Database & Backend (Week 1)

- ✅ สร้าง database schema
- ✅ สร้าง RPC functions
- ✅ สร้าง storage bucket
- ✅ ทดสอบ API

### Phase 2: Admin UI (Week 2)

- ✅ สร้าง AdminTopupSettingsView
- ✅ PromptPay settings card
- ✅ Bank accounts management
- ✅ Amount limits settings
- ✅ Statistics dashboard

### Phase 3: Customer UI (Week 3)

- ✅ อัพเดท CustomerTopupView
- ✅ แสดง QR Code
- ✅ แสดงข้อมูลบัญชี
- ✅ Quick amount buttons
- ✅ Copy to clipboard

### Phase 4: Testing & Launch (Week 4)

- ✅ Unit tests
- ✅ Integration tests
- ✅ UAT with real users
- ✅ Production deployment

---

## 📝 Notes

### Technical Decisions

- ใช้ Supabase Storage สำหรับเก็บ QR Code
- ใช้ JSONB สำหรับ quick_amounts (flexibility)
- Audit log แยก table เพื่อ performance
- RPC functions แทน direct table access (security)

### Future Enhancements

- [ ] รองรับ Credit Card payment gateway
- [ ] Auto-approve ถ้าจำนวนเงินตรงกับ QR Code
- [ ] Notification เมื่อมีคำขอเติมเงินใหม่
- [ ] Dashboard analytics แบบ real-time
- [ ] Multi-currency support

---

**Created**: 2026-01-22  
**Last Updated**: 2026-01-22  
**Status**: 📝 Ready for Review
