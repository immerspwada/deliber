# Provider Job Detail - System Requirements

## 📋 Overview

หน้ารายละเอียดงานสำหรับ Provider ที่ออกแบบให้ใช้งานง่าย สะอาด และมืออาชีพ โดยเน้นการแสดงข้อมูลที่จำเป็น การนำทางที่ชัดเจน และ UX ที่ลื่นไหล

**URL Pattern**: `/provider/job/{id}?step={status}`

## 🎯 Business Goals

1. **ลดเวลาในการทำงาน**: Provider สามารถดูข้อมูลและดำเนินการได้รวดเร็ว
2. **ลดข้อผิดพลาด**: UI ชัดเจน ป้องกันการกดผิด
3. **เพิ่มความพึงพอใจ**: UX ที่ดี ทำให้ Provider อยากใช้งานต่อ
4. **รองรับการใช้งานจริง**: ทำงานได้ดีในสภาพแวดล้อมจริง (แสงแดด, ขับรถ, มือเปียก)

## 👥 User Personas

### Primary: Provider (คนขับ/ผู้ให้บริการ)

- **อายุ**: 25-50 ปี
- **ทักษะ**: ใช้สมาร์ทโฟนได้ระดับกลาง
- **สภาพแวดล้อม**: ขับรถ, แสงแดดจ้า, มือเปียก, เสียงดัง
- **ความต้องการ**:
  - เห็นข้อมูลสำคัญได้ทันที (ที่อยู่, ค่าโดยสาร, ETA)
  - กดปุ่มได้ง่าย แม้ขณะขับรถ
  - นำทางไปหาลูกค้าได้เลย
  - ติดต่อลูกค้าได้สะดวก

## 🎨 Design Principles

### 1. Mobile-First

- ออกแบบสำหรับหน้าจอมือถือก่อน
- Touch targets ≥ 44px
- ใช้งานได้ด้วยมือเดียว

### 2. High Contrast

- ตัวอักษรชัดเจน อ่านง่ายในแสงแดด
- สีตัดกันชัด (Black & White base)
- ไอคอนใหญ่ เห็นชัด

### 3. Progressive Disclosure

- แสดงข้อมูลสำคัญก่อน
- ซ่อนรายละเอียดที่ไม่จำเป็น
- ขยายดูเพิ่มเติมได้

### 4. Error Prevention

- ยืนยันก่อนทำงานสำคัญ (ยกเลิกงาน)
- Disable ปุ่มที่ใช้ไม่ได้
- แสดงสถานะชัดเจน

## 📱 Core Features

### F1: Job Status Flow

**Priority**: P0 (Critical)

**Description**: แสดงสถานะงานแบบ step-by-step พร้อม progress indicator

**Status Flow**:

```
1. Matched (รับงานแล้ว)
   ↓ [ถึงจุดรับแล้ว]
2. Pickup (ถึงจุดรับแล้ว)
   ↓ [รับลูกค้าแล้ว]
3. In Progress (กำลังเดินทาง)
   ↓ [ส่งลูกค้าสำเร็จ]
4. Completed (เสร็จสิ้น)
```

**Acceptance Criteria**:

- [ ] แสดง progress bar ด้านบน
- [ ] Highlight step ปัจจุบัน
- [ ] แสดงไอคอนแต่ละ step
- [ ] อัพเดท URL เมื่อเปลี่ยน step

### F2: Customer Information

**Priority**: P0 (Critical)

**Description**: แสดงข้อมูลลูกค้าและช่องทางติดต่อ

**Information**:

- ชื่อลูกค้า
- รูปโปรไฟล์
- เบอร์โทรศัพท์
- ระยะห่างจากจุดรับ

**Actions**:

- โทรหาลูกค้า (tel: link)
- แชทกับลูกค้า (drawer)

**Acceptance Criteria**:

- [ ] แสดงข้อมูลลูกค้าครบถ้วน
- [ ] ปุ่มโทรทำงานได้
- [ ] ปุ่มแชทเปิด drawer
- [ ] แสดง fallback เมื่อไม่มีข้อมูล

### F3: Route Information

**Priority**: P0 (Critical)

**Description**: แสดงจุดรับและจุดส่งพร้อมที่อยู่

**Information**:

- จุดรับ (Pickup): ที่อยู่ + พิกัด
- จุดส่ง (Dropoff): ที่อยู่ + พิกัด
- ระยะทาง
- เวลาโดยประมาณ (ETA)

**Visual Design**:

- ใช้ไอคอน circle สำหรับจุดรับ
- ใช้ไอคอน square สำหรับจุดส่ง
- เส้นเชื่อมระหว่างจุด

**Acceptance Criteria**:

- [ ] แสดงที่อยู่ครบถ้วน
- [ ] ไอคอนชัดเจน แยกแยะได้ง่าย
- [ ] ที่อยู่ยาวแสดงได้หมด (wrap)

### F4: ETA Display

**Priority**: P0 (Critical)

**Description**: แสดงเวลาโดยประมาณถึงจุดหมาย

**Information**:

- เวลาที่เหลือ (นาที)
- ระยะทาง (กม.)
- เวลาถึงโดยประมาณ (HH:MM)
- ปลายทางปัจจุบัน (จุดรับ/จุดส่ง)

**Behavior**:

- อัพเดทแบบ realtime ตาม GPS
- แสดงจุดรับเมื่อ status = matched/pickup
- แสดงจุดส่งเมื่อ status = in_progress

**Acceptance Criteria**:

- [ ] แสดง ETA ถูกต้อง
- [ ] อัพเดทตาม location
- [ ] แสดงปลายทางที่ถูกต้อง
- [ ] Format เวลาอ่านง่าย

### F5: Navigation Integration

**Priority**: P0 (Critical)

**Description**: เปิด Google Maps เพื่อนำทาง

**Behavior**:

- Status = matched/pickup → นำทางไปจุดรับ
- Status = in_progress → นำทางไปจุดส่ง
- เปิด Google Maps app (iOS/Android)
- Fallback เป็น web version

**Acceptance Criteria**:

- [ ] ปุ่มนำทางใหญ่ชัดเจน
- [ ] เปิด Google Maps ได้
- [ ] ส่งพิกัดถูกต้อง
- [ ] ทำงานทั้ง iOS และ Android

### F6: Status Update Actions

**Priority**: P0 (Critical)

**Description**: ปุ่มอัพเดทสถานะงาน

**Actions**:

- "ถึงจุดรับแล้ว" (matched → pickup)
- "รับลูกค้าแล้ว" (pickup → in_progress)
- "ส่งลูกค้าสำเร็จ" (in_progress → completed)

**Behavior**:

- แสดงปุ่มเฉพาะ action ที่ทำได้
- Disable ขณะ updating
- แสดง loading state
- อัพเดท URL หลังสำเร็จ
- Vibrate + beep feedback

**Acceptance Criteria**:

- [ ] ปุ่มใหญ่ ≥ 56px
- [ ] แสดง loading state
- [ ] อัพเดท database
- [ ] อัพเดท UI realtime
- [ ] ให้ feedback (haptic + sound)

### F7: Job Cancellation

**Priority**: P1 (High)

**Description**: ยกเลิกงานพร้อมระบุเหตุผล

**Flow**:

1. กดปุ่ม "ยกเลิกงาน"
2. แสดง modal ยืนยัน
3. กรอกเหตุผล (optional)
4. ยืนยันยกเลิก
5. กลับหน้า My Jobs

**Validation**:

- เหตุผล max 500 ตัวอักษร
- ยืนยันก่อนยกเลิก

**Acceptance Criteria**:

- [ ] แสดง modal ยืนยัน
- [ ] กรอกเหตุผลได้
- [ ] Validate input
- [ ] อัพเดท database
- [ ] Redirect หลังยกเลิก

### F8: Photo Evidence

**Priority**: P1 (High)

**Description**: ถ่ายรูปยืนยันการรับ/ส่งลูกค้า

**Photos**:

- Pickup Photo: ถ่ายเมื่อถึงจุดรับ
- Dropoff Photo: ถ่ายเมื่อส่งลูกค้าแล้ว

**Behavior**:

- แสดงเมื่อถึง step ที่เหมาะสม
- อัพโหลดไป Supabase Storage
- Resize ก่อนอัพโหลด (max 1920px)
- แสดง preview หลังถ่าย

**Acceptance Criteria**:

- [ ] ถ่ายรูปได้
- [ ] อัพโหลดสำเร็จ
- [ ] แสดง preview
- [ ] จัดการ error

### F9: Realtime Updates

**Priority**: P1 (High)

**Description**: อัพเดทข้อมูลแบบ realtime

**Updates**:

- Status changes
- Fare updates
- Customer info changes

**Behavior**:

- Subscribe เมื่อเปิดหน้า
- Unsubscribe เมื่อออกจากหน้า
- แสดงการเปลี่ยนแปลงทันที
- ป้องกัน race condition

**Acceptance Criteria**:

- [ ] Subscribe realtime channel
- [ ] อัพเดท UI เมื่อมีการเปลี่ยนแปลง
- [ ] Cleanup เมื่อ unmount
- [ ] จัดการ version conflict

### F10: Offline Support

**Priority**: P2 (Medium)

**Description**: ทำงานได้แม้ offline บางส่วน

**Offline Capabilities**:

- แสดงข้อมูลที่โหลดไว้แล้ว
- Cache ข้อมูลงาน (5 นาที)
- แสดง offline indicator
- Queue actions เมื่อ offline

**Acceptance Criteria**:

- [ ] แสดงข้อมูล cache
- [ ] แสดง offline indicator
- [ ] ป้องกัน action เมื่อ offline

## 🔒 Security Requirements

### S1: Authentication

- ต้อง login เป็น Provider
- ตรวจสอบ role ก่อนเข้าหน้า
- Redirect ถ้าไม่มีสิทธิ์

### S2: Authorization

- Provider เห็นเฉพาะงานของตัวเอง
- RLS policies ป้องกันการเข้าถึงข้อมูลผู้อื่น
- Verify provider_id ก่อนทุก action

### S3: Input Validation

- Validate job ID (UUID format)
- Validate cancel reason (max 500 chars)
- Sanitize user input

### S4: Data Privacy

- ไม่แสดงข้อมูลส่วนตัวลูกค้าเกินจำเป็น
- Mask เบอร์โทรบางส่วน (optional)
- ไม่ log sensitive data

## ⚡ Performance Requirements

### P1: Load Time

- Initial load < 2s
- Time to Interactive < 3s
- LCP < 2.5s

### P2: Bundle Size

- Component < 50KB gzipped
- Lazy load heavy dependencies
- Code splitting by route

### P3: Runtime Performance

- 60 FPS animations
- No jank on scroll
- Smooth transitions

### P4: Network Efficiency

- Cache job data (5 min)
- Debounce location updates (5s)
- Optimize image uploads

## 📊 Analytics & Monitoring

### Events to Track

- `provider_job_viewed`: เปิดหน้า job detail
- `provider_status_updated`: อัพเดทสถานะ
- `provider_job_cancelled`: ยกเลิกงาน
- `provider_navigation_opened`: เปิด navigation
- `provider_customer_called`: โทรหาลูกค้า
- `provider_photo_uploaded`: อัพโหลดรูป

### Metrics to Monitor

- Average time per status
- Cancellation rate
- Photo upload success rate
- Navigation usage rate
- Error rate by type

## 🧪 Testing Requirements

### Unit Tests

- Status flow logic
- ETA calculations
- Input validation
- Error handling

### Integration Tests

- Database queries
- Realtime subscriptions
- Photo uploads
- Navigation integration

### E2E Tests

- Complete job flow
- Cancel job flow
- Photo evidence flow
- Error scenarios

### Accessibility Tests

- Screen reader compatibility
- Keyboard navigation
- Color contrast
- Touch target sizes

## 📱 Device Support

### Minimum Requirements

- iOS 14+
- Android 8+
- Chrome 90+
- Safari 14+

### Screen Sizes

- Mobile: 320px - 428px
- Tablet: 768px - 1024px (optional)

### Network Conditions

- 3G: Basic functionality
- 4G/5G: Full functionality
- Offline: View cached data

## 🌐 Localization

### Language Support

- Thai (primary)
- English (future)

### Formats

- Date/Time: Thai Buddhist calendar
- Numbers: Thai numerals (optional)
- Currency: ฿ (Baht)

## 🔄 Migration & Rollout

### Phase 1: Beta (Week 1-2)

- Deploy to 10% providers
- Monitor metrics
- Collect feedback

### Phase 2: Gradual Rollout (Week 3-4)

- 25% → 50% → 100%
- Monitor error rates
- Fix critical issues

### Phase 3: Optimization (Week 5+)

- Performance tuning
- UX improvements
- Feature enhancements

## 📋 Success Metrics

### Primary KPIs

- **Job Completion Rate**: > 95%
- **Average Time per Job**: < 30 min
- **Cancellation Rate**: < 5%
- **Error Rate**: < 1%

### Secondary KPIs

- **Navigation Usage**: > 80%
- **Photo Upload Rate**: > 90%
- **Customer Call Rate**: > 30%
- **User Satisfaction**: > 4.5/5

## 🚫 Out of Scope (v1)

- Map integration ในหน้า (ใช้ Google Maps แทน)
- Chat history (แสดงเฉพาะ drawer)
- Multiple photos per step
- Voice commands
- AR navigation
- Offline maps

## 📚 References

- [Existing Implementation](../../../src/views/provider/ProviderJobDetailMinimal.vue)
- [Status Flow Composable](../../../src/composables/useJobStatusFlow.ts)
- [Job Detail Composable](../../../src/composables/useProviderJobDetail.ts)
- [Design System](../../steering/vue-components.md)
