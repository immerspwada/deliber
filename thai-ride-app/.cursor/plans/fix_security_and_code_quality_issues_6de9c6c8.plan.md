---
name: Fix Security and Code Quality Issues
overview: "แก้ไขปัญหาความปลอดภัยและคุณภาพโค้ดที่พบจากการ review: ลบ hardcoded credentials, แก้ไข hardcoded project references, และสร้าง .env.example"
todos:
  - id: fix-auth-hardcoded
    content: แก้ไข hardcoded project ref ใน src/stores/auth.ts:74 ให้ใช้ getSupabaseProjectRef() จาก env.ts
    status: pending
  - id: fix-performance-hardcoded
    content: แก้ไข hardcoded Supabase URL ใน src/composables/usePerformance.ts:1735 ให้ใช้ env.supabaseUrl
    status: pending
  - id: create-env-example
    content: สร้าง .env.example file ที่ root directory พร้อม template สำหรับ environment variables
    status: pending
  - id: verify-no-hardcoded
    content: ตรวจสอบว่าไม่มี hardcoded credentials หรือ project references เหลืออยู่
    status: pending
    dependencies:
      - fix-auth-hardcoded
      - fix-performance-hardcoded
  - id: update-review-doc
    content: อัปเดต CODE_REVIEW.md เพื่อสะท้อนสถานะปัจจุบันและ mark resolved issues
    status: pending
    dependencies:
      - verify-no-hardcoded
---

# Plan: Fix Security and Code Quality Issues

## Overview

แก้ไขปัญหาความปลอดภัยและคุณภาพโค้ดที่พบจากการ code review เพื่อให้พร้อมสำหรับ production deployment

## Issues to Fix

### 1. Remove Hardcoded Project References

**Files to update:**

- `src/stores/auth.ts:74` - Hardcoded project ref `'onsflqhkgqhydeupiqyt'`
- `src/composables/usePerformance.ts:1735` - Hardcoded Supabase URL in preconnect

**Solution:**

- ใช้ `getSupabaseProjectRef()` จาก `src/lib/env.ts` แทน hardcoded value
- ใช้ `env.supabaseUrl` สำหรับ preconnect URL

### 2. Create .env.example File

**Action:**

- สร้างไฟล์ `.env.example` ที่ root directory
- ใส่ template สำหรับ environment variables ทั้งหมดที่จำเป็น
- ระบุว่า Required vs Optional

**Note:** ไฟล์อาจถูก block โดย globalignore แต่ควรสร้างด้วยวิธีอื่น (เช่น manual หรือผ่าน terminal)

### 3. Verify Environment Variable Usage

**Check:**

- ตรวจสอบว่าไม่มี hardcoded credentials เหลืออยู่
- ตรวจสอบว่า `src/lib/supabase.ts` ใช้ `env` utility ถูกต้องแล้ว
- ตรวจสอบว่า logger ถูกใช้แทน console.log แล้ว

### 4. Update Code Review Document

**Action:**

- อัปเดต `CODE_REVIEW.md` เพื่อสะท้อนสถานะปัจจุบัน
- Mark issues ที่แก้ไขแล้วเป็น resolved
- ระบุ issues ที่ยังเหลืออยู่

## Implementation Steps

1. **Fix auth.ts** - แทนที่ hardcoded project ref ด้วย `getSupabaseProjectRef()`
2. **Fix usePerformance.ts** - ใช้ `env.supabaseUrl` แทน hardcoded URL
3. **Create .env.example** - สร้าง template file (อาจต้องทำ manual)
4. **Verify** - ตรวจสอบว่าไม่มี hardcoded values เหลืออยู่
5. **Update Documentation** - อัปเดต CODE_REVIEW.md

## Expected Outcome

- ไม่มี hardcoded credentials หรือ project references
- มี .env.example สำหรับ reference
- Code ใช้ environment variables อย่างถูกต้อง
- Documentation ถูกอัปเดต