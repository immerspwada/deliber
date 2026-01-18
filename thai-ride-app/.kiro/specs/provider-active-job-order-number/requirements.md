# Provider Active Job Card - Order Number Display

## Overview

เพิ่มการแสดงหมายเลขออเดอร์ (Order Number) ใน Active Job Card บนหน้า Provider Home เพื่อให้ Provider สามารถอ้างอิงหมายเลขออเดอร์ได้ง่ายขึ้นเมื่อติดต่อกับลูกค้าหรือ Support

## User Stories

### 1. แสดงหมายเลขออเดอร์

**As a** Provider  
**I want to** เห็นหมายเลขออเดอร์ใน Active Job Card  
**So that** ฉันสามารถอ้างอิงหมายเลขนี้เมื่อติดต่อกับลูกค้าหรือ Support

**Acceptance Criteria:**

- 1.1 หมายเลขออเดอร์แสดงอยู่ใน Active Job Card ในตำแหน่งที่เห็นได้ชัดเจน
- 1.2 หมายเลขออเดอร์ใช้รูปแบบที่อ่านง่าย (เช่น #12345 หรือ ORD-12345)
- 1.3 หมายเลขออเดอร์แสดงสำหรับทุกสถานะของงาน (matched, pickup, in_progress)
- 1.4 UI ต้องไม่ดูรกหรือแออัดเกินไป

### 2. คัดลอกหมายเลขออเดอร์

**As a** Provider  
**I want to** คัดลอกหมายเลขออเดอร์ได้ง่าย  
**So that** ฉันสามารถนำไปใช้ในการติดต่อหรือรายงานปัญหา

**Acceptance Criteria:**

- 2.1 สามารถแตะที่หมายเลขออเดอร์เพื่อคัดลอกได้
- 2.2 แสดง Toast notification เมื่อคัดลอกสำเร็จ
- 2.3 ใช้ Clipboard API หรือ fallback method ที่รองรับทุก browser
- 2.4 มี visual feedback เมื่อแตะ (เช่น ripple effect หรือ color change)

### 3. รองรับ Mobile และ Desktop

**As a** Provider  
**I want to** เห็นหมายเลขออเดอร์ได้ชัดเจนทั้งบน Mobile และ Desktop  
**So that** ฉันสามารถใช้งานได้สะดวกบนทุกอุปกรณ์

**Acceptance Criteria:**

- 3.1 หมายเลขออเดอร์มีขนาดตัวอักษรที่เหมาะสมกับหน้าจอ
- 3.2 Touch target สำหรับการคัดลอกมีขนาดอย่างน้อย 44x44px (iOS guideline)
- 3.3 Layout responsive และไม่เสียรูปบนหน้าจอขนาดต่างๆ
- 3.4 ทดสอบบน iOS Safari, Android Chrome, และ Desktop browsers

## Technical Requirements

### Data Source

- หมายเลขออเดอร์มาจาก `ride_requests.id` (UUID)
- แปลง UUID เป็นรูปแบบที่อ่านง่าย (เช่น 8 ตัวอักษรแรก หรือ hash เป็นตัวเลข)

### UI/UX Requirements

- ตำแหน่ง: แสดงใน job-header ข้างๆ job-status-badge
- สไตล์: ใช้ monospace font สำหรับหมายเลข
- สี: ใช้สีที่ contrast ดีกับพื้นหลัง
- Icon: แสดง copy icon เมื่อ hover/focus

### Performance

- การคัดลอกต้องทำงานได้ภายใน 100ms
- ไม่ส่งผลกระทบต่อ rendering performance ของ Active Job Card

### Accessibility

- หมายเลขออเดอร์ต้องมี aria-label ที่อธิบายชัดเจน
- ปุ่มคัดลอกต้องมี aria-label="คัดลอกหมายเลขออเดอร์"
- รองรับ keyboard navigation (Tab, Enter)
- Screen reader ต้องอ่านหมายเลขออเดอร์ได้

## Out of Scope

- การแก้ไขหมายเลขออเดอร์
- การค้นหาออเดอร์จากหมายเลข (อยู่ในหน้าอื่น)
- การแสดงประวัติการคัดลอก
- QR Code สำหรับหมายเลขออเดอร์

## Success Metrics

- Provider สามารถคัดลอกหมายเลขออเดอร์ได้สำเร็จ 100% ของครั้งที่พยายาม
- เวลาในการค้นหาหมายเลขออเดอร์ลดลง (จากการ user testing)
- ไม่มี bug report เกี่ยวกับการแสดงหรือคัดลอกหมายเลข

## Dependencies

- `src/views/provider/ProviderHomeNew.vue` - Component หลักที่ต้องแก้ไข
- `src/composables/useCopyToClipboard.ts` - Composable สำหรับคัดลอก (มีอยู่แล้ว)
- `src/composables/useToast.ts` - Composable สำหรับแสดง notification (มีอยู่แล้ว)

## Risks and Mitigations

### Risk 1: UUID ยาวเกินไป

**Mitigation:** แปลง UUID เป็นรูปแบบสั้นกว่า เช่น:

- ใช้ 8 ตัวอักษรแรกของ UUID
- Hash UUID เป็นตัวเลข 6-8 หลัก
- ใช้ prefix + running number (ต้องมี sequence ใน database)

### Risk 2: Clipboard API ไม่รองรับบาง browser

**Mitigation:** ใช้ fallback method (document.execCommand) หรือแสดงหมายเลขใน modal ให้ user คัดลอกเอง

### Risk 3: Layout แออัดเกินไป

**Mitigation:** ใช้ responsive design และทดสอบบนหน้าจอขนาดต่างๆ ก่อน deploy
