# Auto Image Resize & Upload System - Requirements

## 📋 Overview

ระบบอัพโหลดรูปภาพอัตโนมัติที่รองรับไฟล์ทุกขนาดและ format โดย resize ให้เหมาะสมก่อนอัพโหลดไปยัง Supabase Storage

## 🎯 Business Goals

1. **ลดข้อจำกัดการใช้งาน** - ผู้ใช้ไม่ต้องกังวลเรื่องขนาดไฟล์
2. **ประหยัด Storage Cost** - ลดขนาดไฟล์ก่อนเก็บ
3. **เพิ่มความเร็ว** - Upload เร็วขึ้นเพราะไฟล์เล็กลง
4. **รองรับ Modern Formats** - HEIC, HEIF, WebP

## 👥 User Stories

### US-1: Provider อัพโหลดรูปหลักฐาน (Ride Evidence)

**As a** Provider  
**I want to** อัพโหลดรูปถ่ายจากมือถือโดยไม่ต้องกังวลเรื่องขนาด  
**So that** ฉันสามารถบันทึกหลักฐานการทำงานได้ง่ายและรวดเร็ว

**Acceptance Criteria:**

- [ ] รองรับรูปขนาด 1MB - 50MB
- [ ] รองรับ format: JPEG, PNG, HEIC, HEIF, WebP
- [ ] Resize อัตโนมัติเป็น max 1920x1080 (Full HD)
- [ ] คุณภาพ 85% (balance ระหว่างขนาดและคุณภาพ)
- [ ] แสดง progress ขณะ resize และ upload
- [ ] แสดงขนาดไฟล์ก่อน-หลัง resize

### US-2: Provider เห็น Preview ก่อนอัพโหลด

**As a** Provider  
**I want to** เห็น preview รูปที่จะอัพโหลด  
**So that** ฉันมั่นใจว่าเลือกรูปถูกต้อง

**Acceptance Criteria:**

- [ ] แสดง preview ทันทีหลังเลือกรูป
- [ ] แสดงข้อมูล: ขนาดไฟล์, dimensions, format
- [ ] แสดงขนาดโดยประมาณหลัง resize
- [ ] มีปุ่ม "เปลี่ยนรูป" และ "อัพโหลด"

### US-3: System จัดการ Error อัตโนมัติ

**As a** System  
**I want to** จัดการ error cases ทั้งหมด  
**So that** ผู้ใช้ได้รับ feedback ที่ชัดเจน

**Acceptance Criteria:**

- [ ] ตรวจสอบ file type ก่อน resize
- [ ] จัดการ HEIC conversion error
- [ ] จัดการ network timeout
- [ ] จัดการ storage quota exceeded
- [ ] แสดง error message ที่เข้าใจง่าย
- [ ] มี retry mechanism

## 🔧 Technical Requirements

### TR-1: Client-Side Image Processing

- ใช้ `browser-image-compression` library
- Resize ที่ client ก่อนส่งไปยัง server
- รองรับ HEIC → JPEG conversion
- ใช้ Web Worker เพื่อไม่ block UI

### TR-2: Storage Configuration

- Bucket: `ride-evidence`
- Public read access
- Max file size: 5MB (หลัง resize)
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### TR-3: RLS Policies

- Provider อัพโหลดได้เฉพาะงานที่ assigned
- Public read access
- Admin full access
- File naming: `{ride_id}/{timestamp}_{random}.jpg`

### TR-4: Performance Targets

- Resize time: < 2s สำหรับรูป 10MB
- Upload time: < 5s สำหรับรูป 5MB
- Total time: < 10s จากเลือกรูปถึงอัพโหลดเสร็จ

## 📊 Success Metrics

| Metric                      | Target  | Current |
| --------------------------- | ------- | ------- |
| Upload Success Rate         | > 95%   | TBD     |
| Average File Size Reduction | > 80%   | TBD     |
| Average Upload Time         | < 10s   | TBD     |
| User Satisfaction           | > 4.5/5 | TBD     |

## 🚫 Out of Scope (Phase 1)

- ❌ Batch upload (หลายรูปพร้อมกัน)
- ❌ Image editing (crop, rotate, filter)
- ❌ Video upload
- ❌ Thumbnail generation
- ❌ Image watermark

## 🔐 Security Requirements

- ✅ Validate file type ที่ client และ server
- ✅ Scan for malicious content
- ✅ RLS policies ครบถ้วน
- ✅ Rate limiting: 10 uploads/minute
- ✅ ไม่เก็บ EXIF location data

## 📱 Platform Support

| Platform        | Support |
| --------------- | ------- |
| iOS Safari      | ✅ Full |
| Android Chrome  | ✅ Full |
| Desktop Chrome  | ✅ Full |
| Desktop Safari  | ✅ Full |
| Desktop Firefox | ✅ Full |

## 🎨 UX Requirements

### Loading States

1. **Selecting** - "กำลังโหลดรูป..."
2. **Resizing** - "กำลังปรับขนาด... 45%"
3. **Uploading** - "กำลังอัพโหลด... 78%"
4. **Success** - "อัพโหลดสำเร็จ! ✓"

### Error Messages

- "ไฟล์ไม่ใช่รูปภาพ กรุณาเลือกไฟล์ .jpg, .png, .heic"
- "ไฟล์ใหญ่เกินไป (max 50MB)"
- "เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่"
- "อินเทอร์เน็ตขาดหาย กรุณาตรวจสอบการเชื่อมต่อ"

## 🔄 Integration Points

### Components

- `PhotoEvidence.vue` - Main upload component
- `ImagePreview.vue` - Preview component (future)

### Composables

- `useImageResize.ts` - Resize logic
- `useStorageUpload.ts` - Upload logic (future)

### Services

- `imageResize.ts` - Core resize utility
- `storageService.ts` - Storage operations (future)

## 📝 Dependencies

```json
{
  "browser-image-compression": "^2.0.2",
  "heic2any": "^0.0.4"
}
```

## 🧪 Testing Requirements

### Unit Tests

- [ ] imageResize.ts - resize logic
- [ ] HEIC conversion
- [ ] Error handling

### Integration Tests

- [ ] PhotoEvidence.vue - full upload flow
- [ ] RLS policies
- [ ] Storage bucket configuration

### E2E Tests

- [ ] Upload flow จาก Provider Job Detail
- [ ] Error scenarios
- [ ] Network offline/online

## 📅 Implementation Phases

### ✅ Phase 1: Core Resize (DONE)

- [x] imageResize.ts utility
- [x] PhotoEvidence.vue component
- [x] Storage bucket setup
- [x] RLS policies

### 🚧 Phase 2: Enhanced UX (NEXT)

- [ ] Progress indicator
- [ ] Image preview
- [ ] Better error messages
- [ ] Retry mechanism

### 📋 Phase 3: Advanced Features (FUTURE)

- [ ] Batch upload
- [ ] Thumbnail generation
- [ ] Image compression settings
- [ ] Upload history

## 🔗 Related Specs

- `provider-profile-system` - Provider job management
- `map-enhancements` - Offline capabilities

## 📚 References

- [browser-image-compression docs](https://github.com/Donaldcwl/browser-image-compression)
- [Supabase Storage docs](https://supabase.com/docs/guides/storage)
- [Web Image Optimization](https://web.dev/fast/#optimize-your-images)
