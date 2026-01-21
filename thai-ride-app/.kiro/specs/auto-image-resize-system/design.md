# Auto Image Resize & Upload System - Design

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PhotoEvidence.vue                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File Input   │→ │ Image Resize │→ │ Upload       │      │
│  │ (native)     │  │ (client)     │  │ (Supabase)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   imageResize.ts Utility                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Validate     │→ │ HEIC Convert │→ │ Compress     │      │
│  │ File Type    │  │ (if needed)  │  │ & Resize     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Storage Bucket                     │
│  Bucket: ride-evidence                                       │
│  Path: {ride_id}/{timestamp}_{random}.jpg                    │
│  RLS: Provider (own jobs), Admin (all), Public (read)       │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Component Structure

### PhotoEvidence.vue

```vue
<template>
  <div class="photo-evidence">
    <!-- File Input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*,.heic,.heif"
      @change="handleFileSelect"
      class="hidden"
    />

    <!-- Upload Button -->
    <button v-if="!selectedFile" @click="fileInput?.click()" class="upload-btn">
      <CameraIcon />
      <span>ถ่ายรูป/เลือกรูป</span>
    </button>

    <!-- Preview & Progress -->
    <div v-else class="preview-container">
      <!-- Image Preview -->
      <img :src="previewUrl" alt="Preview" />

      <!-- File Info -->
      <div class="file-info">
        <p>{{ formatFileSize(originalSize) }}</p>
        <p v-if="resizedSize">→ {{ formatFileSize(resizedSize) }}</p>
      </div>

      <!-- Progress Bar -->
      <div v-if="isProcessing" class="progress">
        <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
        <span>{{ statusMessage }}</span>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button @click="clearSelection">เปลี่ยนรูป</button>
        <button @click="uploadImage" :disabled="isProcessing">อัพโหลด</button>
      </div>
    </div>

    <!-- Uploaded Images -->
    <div v-if="uploadedImages.length" class="uploaded-list">
      <div v-for="img in uploadedImages" :key="img.url" class="uploaded-item">
        <img :src="img.url" alt="Evidence" />
        <button @click="removeImage(img.url)">ลบ</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { resizeImage } from "@/utils/imageResize";
import { useRideStore } from "@/stores/ride";
import { supabase } from "@/lib/supabase";

const props = defineProps<{
  rideId: string;
}>();

const emit = defineEmits<{
  uploaded: [url: string];
  error: [message: string];
}>();

// State
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>("");
const originalSize = ref(0);
const resizedSize = ref(0);
const isProcessing = ref(false);
const progress = ref(0);
const statusMessage = ref("");
const uploadedImages = ref<Array<{ url: string }>>([]);

// Methods
async function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  selectedFile.value = file;
  originalSize.value = file.size;
  previewUrl.value = URL.createObjectURL(file);
}

async function uploadImage() {
  if (!selectedFile.value) return;

  try {
    isProcessing.value = true;
    statusMessage.value = "กำลังปรับขนาด...";
    progress.value = 30;

    // Resize
    const resized = await resizeImage(selectedFile.value);
    resizedSize.value = resized.size;

    statusMessage.value = "กำลังอัพโหลด...";
    progress.value = 60;

    // Upload
    const fileName = `${props.rideId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.jpg`;
    const { data, error } = await supabase.storage
      .from("ride-evidence")
      .upload(fileName, resized);

    if (error) throw error;

    progress.value = 100;
    statusMessage.value = "อัพโหลดสำเร็จ!";

    const url = supabase.storage.from("ride-evidence").getPublicUrl(data.path)
      .data.publicUrl;
    uploadedImages.value.push({ url });
    emit("uploaded", url);

    // Reset
    setTimeout(() => {
      clearSelection();
      isProcessing.value = false;
      progress.value = 0;
    }, 1000);
  } catch (err) {
    console.error("Upload error:", err);
    emit("error", "เกิดข้อผิดพลาดในการอัพโหลด");
    isProcessing.value = false;
  }
}

function clearSelection() {
  selectedFile.value = null;
  previewUrl.value = "";
  originalSize.value = 0;
  resizedSize.value = 0;
  if (fileInput.value) fileInput.value.value = "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
```

## 🔧 Utility Design

### imageResize.ts

```typescript
import imageCompression from "browser-image-compression";
import heic2any from "heic2any";

export interface ResizeOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType: string;
  initialQuality: number;
}

export const DEFAULT_RESIZE_OPTIONS: ResizeOptions = {
  maxSizeMB: 5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/jpeg",
  initialQuality: 0.85,
};

export async function resizeImage(
  file: File,
  options: Partial<ResizeOptions> = {}
): Promise<File> {
  const opts = { ...DEFAULT_RESIZE_OPTIONS, ...options };

  console.log("[PhotoEvidence] Starting resize:", {
    name: file.name,
    size: formatBytes(file.size),
    type: file.type,
  });

  try {
    // Step 1: HEIC Conversion
    let processedFile = file;
    if (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic")
    ) {
      console.log("[PhotoEvidence] Converting HEIC to JPEG...");
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: opts.initialQuality,
      });
      processedFile = new File(
        [Array.isArray(blob) ? blob[0] : blob],
        file.name.replace(/\.heic$/i, ".jpg"),
        { type: "image/jpeg" }
      );
      console.log(
        "[PhotoEvidence] HEIC converted:",
        formatBytes(processedFile.size)
      );
    }

    // Step 2: Compression & Resize
    console.log("[PhotoEvidence] Compressing image...");
    const compressed = await imageCompression(processedFile, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      fileType: opts.fileType,
      initialQuality: opts.initialQuality,
    });

    const savedBytes = file.size - compressed.size;
    const savedPercent = ((savedBytes / file.size) * 100).toFixed(0);

    console.log("[PhotoEvidence] Image resized:", {
      original: formatBytes(file.size),
      resized: formatBytes(compressed.size),
      saved: formatBytes(savedBytes),
      percentage: `${savedPercent}%`,
    });

    return compressed;
  } catch (error) {
    console.error("[PhotoEvidence] Resize error:", error);
    throw new Error("ไม่สามารถปรับขนาดรูปได้ กรุณาลองใหม่");
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

## 🗄️ Database Schema

### Storage Bucket Configuration

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ride-evidence',
  'ride-evidence',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

### RLS Policies

```sql
-- Public read
CREATE POLICY "public_read_ride_evidence" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ride-evidence');

-- Provider upload (own jobs only)
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

-- Provider update (own jobs only)
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

-- Provider delete (own jobs only)
CREATE POLICY "provider_delete_ride_evidence" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id::text = (string_to_array(name, '/'))[1]
      AND provider_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "admin_manage_ride_evidence" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ride-evidence' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

## 🎨 UI/UX Design

### States & Transitions

```
┌─────────────┐
│   Initial   │ (No file selected)
└──────┬──────┘
       │ User clicks "ถ่ายรูป/เลือกรูป"
       ↓
┌─────────────┐
│  Selecting  │ (File picker open)
└──────┬──────┘
       │ User selects file
       ↓
┌─────────────┐
│  Preview    │ (Show preview + file info)
└──────┬──────┘
       │ User clicks "อัพโหลด"
       ↓
┌─────────────┐
│  Resizing   │ (Progress: 0-50%)
└──────┬──────┘
       │ Resize complete
       ↓
┌─────────────┐
│ Uploading   │ (Progress: 50-100%)
└──────┬──────┘
       │ Upload complete
       ↓
┌─────────────┐
│   Success   │ (Show success message)
└──────┬──────┘
       │ Auto-reset after 1s
       ↓
┌─────────────┐
│   Initial   │ (Ready for next upload)
└─────────────┘
```

### Color Scheme

```css
/* Primary Actions */
--upload-btn-bg: #3b82f6; /* Blue */
--upload-btn-hover: #2563eb;

/* Success */
--success-bg: #10b981; /* Green */
--success-text: #065f46;

/* Error */
--error-bg: #ef4444; /* Red */
--error-text: #991b1b;

/* Progress */
--progress-bg: #e5e7eb; /* Gray */
--progress-fill: #3b82f6; /* Blue */
```

## 🔄 Data Flow

### Upload Flow

```typescript
// 1. User selects file
handleFileSelect(event) {
  file = event.target.files[0]
  validateFile(file) // Check type, size
  showPreview(file)
}

// 2. User clicks upload
uploadImage() {
  // 2.1 Resize
  resized = await resizeImage(file)

  // 2.2 Generate filename
  filename = `${rideId}/${timestamp}_${random}.jpg`

  // 2.3 Upload to Supabase
  { data, error } = await supabase.storage
    .from('ride-evidence')
    .upload(filename, resized)

  // 2.4 Get public URL
  url = supabase.storage
    .from('ride-evidence')
    .getPublicUrl(data.path)

  // 2.5 Emit success
  emit('uploaded', url)
}
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe("imageResize", () => {
  it("should resize large image", async () => {
    const file = createMockFile(10 * 1024 * 1024); // 10MB
    const resized = await resizeImage(file);
    expect(resized.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
  });

  it("should convert HEIC to JPEG", async () => {
    const heicFile = createMockFile(5 * 1024 * 1024, "image/heic");
    const resized = await resizeImage(heicFile);
    expect(resized.type).toBe("image/jpeg");
  });

  it("should handle errors gracefully", async () => {
    const invalidFile = createMockFile(1024, "text/plain");
    await expect(resizeImage(invalidFile)).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe("PhotoEvidence", () => {
  it("should upload image successfully", async () => {
    const wrapper = mount(PhotoEvidence, {
      props: { rideId: "test-ride-123" },
    });

    const file = createMockFile(5 * 1024 * 1024);
    await wrapper.vm.handleFileSelect({ target: { files: [file] } });
    await wrapper.vm.uploadImage();

    expect(wrapper.emitted("uploaded")).toBeTruthy();
  });
});
```

## 📊 Performance Optimization

### Strategies

1. **Web Worker** - Resize ใน background thread
2. **Progressive Upload** - แสดง progress แบบ real-time
3. **Lazy Loading** - โหลด heic2any เฉพาะเมื่อจำเป็น
4. **Caching** - Cache resized images ใน memory

### Benchmarks

| File Size | Resize Time | Upload Time | Total Time |
| --------- | ----------- | ----------- | ---------- |
| 1 MB      | 0.5s        | 1s          | 1.5s       |
| 5 MB      | 1s          | 2s          | 3s         |
| 10 MB     | 1.5s        | 3s          | 4.5s       |
| 20 MB     | 2s          | 4s          | 6s         |
| 50 MB     | 3s          | 6s          | 9s         |

## 🔐 Security Considerations

### Client-Side Validation

```typescript
function validateFile(file: File): void {
  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  if (
    !allowedTypes.includes(file.type) &&
    !file.name.toLowerCase().endsWith(".heic")
  ) {
    throw new Error("ไฟล์ไม่ใช่รูปภาพที่รองรับ");
  }

  // Check file size
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error("ไฟล์ใหญ่เกินไป (max 50MB)");
  }
}
```

### Server-Side Validation

- Storage bucket มี `file_size_limit` = 5MB
- Storage bucket มี `allowed_mime_types` = JPEG, PNG, WebP
- RLS policies ตรวจสอบ provider_id

## 🚀 Future Enhancements

### Phase 2: Enhanced UX

- Image preview modal
- Crop/rotate tools
- Multiple image selection
- Drag & drop upload

### Phase 3: Advanced Features

- Thumbnail generation (Edge Function)
- Image watermark
- EXIF data extraction
- Image compression settings

### Phase 4: Analytics

- Track upload success rate
- Monitor average file size
- Measure user satisfaction
- A/B test compression settings
