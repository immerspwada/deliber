# 🐛 แก้ไข Error: Vue SFC Parse Error

**Error**: `At least one <template> or <script> is required in a single file component`

**ไฟล์**: `src/admin/views/AdminSettingsView.vue`

---

## 🔍 สาเหตุ

Error นี้เกิดจาก Vite HMR (Hot Module Replacement) cache ที่ยังคงอ้างอิงไฟล์เก่า

---

## ✅ วิธีแก้ไข

### วิธีที่ 1: Restart Dev Server (แนะนำ)

```bash
# 1. หยุด dev server (Ctrl+C)
# 2. ลบ cache
rm -rf node_modules/.vite

# 3. รัน dev server ใหม่
npm run dev
```

### วิธีที่ 2: Hard Refresh Browser

```
1. เปิด DevTools (F12)
2. คลิกขวาที่ปุ่ม Refresh
3. เลือก "Empty Cache and Hard Reload"
```

### วิธีที่ 3: ตรวจสอบไฟล์

```bash
# ตรวจสอบว่าไฟล์มีเนื้อหาถูกต้อง
cat src/admin/views/AdminSettingsView.vue | head -20

# ควรเห็น <template> และ <script setup>
```

---

## 🧪 ทดสอบหลังแก้ไข

```bash
# 1. รัน dev server
npm run dev

# 2. เปิดเบราว์เซอร์
http://localhost:5173/admin/settings

# 3. ควรเห็น Settings Hub โดยไม่มี error
```

---

## 📝 หมายเหตุ

ไฟล์ `AdminSettingsView.vue` มีเนื้อหาถูกต้องแล้ว:

- ✅ มี `<template>`
- ✅ มี `<script setup>`
- ✅ มี `<style scoped>`

Error เกิดจาก cache เท่านั้น

---

**แก้ไขเมื่อ**: 2026-01-19
