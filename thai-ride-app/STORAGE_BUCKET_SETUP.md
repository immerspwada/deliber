# 🗄️ Storage Bucket Setup - ride-evidence

## ❌ ปัญหา

```
StorageApiError: Bucket not found
POST /storage/v1/object/ride-evidence/... 400 (Bad Request)
```

**สาเหตุ**: Storage bucket `ride-evidence` ยังไม่ได้สร้างใน Supabase

## ✅ วิธีแก้ (เลือก 1 วิธี)

### วิธีที่ 1: สร้างผ่าน Supabase Dashboard (แนะนำ - เร็วที่สุด)

1. เปิด Supabase Dashboard: https://supabase.com/dashboard
2. เลือก Project ของคุณ
3. ไปที่ **Storage** (เมนูซ้าย)
4. คลิก **New bucket**
5. กรอกข้อมูล:
   ```
   Name: ride-evidence
   Public bucket: ✅ (เปิด)
   File size limit: 5 MB
   Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
   ```
6. คลิก **Create bucket**
7. ไปที่ **Policies** tab
8. คลิก **New policy** และเพิ่ม policies ตามด้านล่าง

### วิธีที่ 2: Apply Migration (ต้องเปิด Docker)

```bash
# 1. เปิด Docker Desktop
# 2. Start Supabase local
npx supabase start

# 3. Apply migration
npx supabase db reset

# 4. หรือ push เฉพาะ migration ใหม่
npx supabase db push
```

### วิธีที่ 3: สร้างผ่าน SQL Editor (Supabase Dashboard)

1. เปิด Supabase Dashboard
2. ไปที่ **SQL Editor**
3. Copy SQL จาก `supabase/migrations/269_ride_evidence_storage.sql`
4. Paste และ Run

## 📋 Storage Policies ที่ต้องมี

### 1. Public Read (ทุกคนอ่านได้)

```sql
CREATE POLICY "public_read_ride_evidence" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ride-evidence');
```

### 2. Provider Upload (Provider อัพโหลดได้เฉพาะงานของตัวเอง)

```sql
CREATE POLICY "provider_upload_ride_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );
```

### 3. Provider Update

```sql
CREATE POLICY "provider_update_ride_evidence" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );
```

### 4. Admin Full Access

```sql
CREATE POLICY "admin_manage_ride_evidence" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

## 🔧 Bucket Configuration

| Setting                | Value                                                |
| ---------------------- | ---------------------------------------------------- |
| **Bucket ID**          | `ride-evidence`                                      |
| **Public**             | ✅ Yes (for customer to view)                        |
| **File Size Limit**    | 5 MB                                                 |
| **Allowed MIME Types** | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |

## 📁 File Structure

```
ride-evidence/
├── {ride_id}/
│   ├── pickup_{timestamp}.jpg
│   └── dropoff_{timestamp}.jpg
```

**ตัวอย่าง:**

```
ride-evidence/4293380d-b344-4ba0-9bc8-cd0fccbed263/pickup_1768451539279.jpg
ride-evidence/4293380d-b344-4ba0-9bc8-cd0fccbed263/dropoff_1768451612345.jpg
```

## 🧪 ทดสอบหลัง Setup

### 1. ตรวจสอบ Bucket ถูกสร้าง

```sql
SELECT * FROM storage.buckets WHERE id = 'ride-evidence';
```

**Expected:**

```
id: ride-evidence
name: ride-evidence
public: true
file_size_limit: 5242880
allowed_mime_types: {image/jpeg, image/jpg, image/png, image/webp}
```

### 2. ตรวจสอบ Policies

```sql
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%ride_evidence%';
```

**Expected:** 4-5 policies

### 3. ทดสอบ Upload

1. เปิด Provider Job Detail page
2. คลิกถ่ายรูปยืนยัน
3. เลือกรูป
4. ดู console - ควรเห็น:
   ```javascript
   [PhotoEvidence] Image resized: {...}
   // ไม่มี error "Bucket not found"
   ```

## 🚨 Troubleshooting

### Error: "Bucket not found"

- ✅ ตรวจสอบว่าสร้าง bucket แล้ว
- ✅ ตรวจสอบชื่อ bucket ถูกต้อง (`ride-evidence`)
- ✅ Refresh browser

### Error: "new row violates RLS policy"

- ✅ ตรวจสอบ policies ถูกสร้างครบ
- ✅ ตรวจสอบ provider_id ใน ride_requests ตรงกับ auth.uid()
- ✅ ตรวจสอบ user มี role ที่ถูกต้อง

### Error: "File size exceeds limit"

- ✅ ตรวจสอบ file_size_limit = 5242880 (5MB)
- ✅ รูปหลัง resize ควรเล็กกว่า 1MB

## 📊 Expected Results

### Before Setup:

```
❌ POST /storage/.../ride-evidence/... 400 (Bad Request)
❌ StorageApiError: Bucket not found
```

### After Setup:

```
✅ [PhotoEvidence] Image resized: {original: '1.0 MB', resized: '61.1 KB', ...}
✅ POST /storage/.../ride-evidence/... 200 (OK)
✅ รูปอัพโหลดสำเร็จ
```

## 🔗 Related Files

- Migration: `supabase/migrations/269_ride_evidence_storage.sql`
- Component: `src/components/provider/PhotoEvidence.vue`
- Utility: `src/utils/imageResize.ts`
- Table: `ride_requests` (columns: `pickup_photo`, `dropoff_photo`)

---

**Status**: ⚠️ Waiting for bucket creation
**Priority**: High - Blocking photo upload feature
**Estimated Time**: 2-5 minutes (Dashboard method)
