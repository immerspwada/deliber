<script setup lang="ts">
/**
 * Photo Evidence Component
 * ให้ Provider ถ่ายรูปยืนยันการรับ-ส่ง
 * รองรับรูปทุกขนาด + Auto resize เพื่อประหยัด storage
 */
import { ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'
import { resizeImage, validateImageFile, RESIZE_PRESETS, getFileSizeInfo } from '../../utils/imageResize'

interface Props {
  rideId: string
  type: 'pickup' | 'dropoff'
  existingPhoto?: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  existingPhoto: null,
  disabled: false
})

const emit = defineEmits<{
  uploaded: [url: string]
  error: [message: string]
}>()

// State
const uploading = ref(false)
const previewUrl = ref<string | null>(props.existingPhoto)
const fileInput = ref<HTMLInputElement | null>(null)
const resizing = ref(false)
const uploadProgress = ref<string>('')

// Computed
const label = computed(() => props.type === 'pickup' ? 'รูปจุดรับ' : 'รูปจุดส่ง')
const hasPhoto = computed(() => !!previewUrl.value)

// Methods
function triggerFileInput(): void {
  if (props.disabled || uploading.value || resizing.value) return
  fileInput.value?.click()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // Validate file
  const validation = validateImageFile(file)
  if (!validation.valid) {
    emit('error', validation.error || 'ไฟล์ไม่ถูกต้อง')
    input.value = ''
    return
  }
  
  // Show original preview immediately
  previewUrl.value = URL.createObjectURL(file)
  uploadProgress.value = 'กำลังปรับขนาดรูป...'
  resizing.value = true
  
  try {
    // Resize image automatically
    const originalSize = file.size
    const resizedBlob = await resizeImage(file, RESIZE_PRESETS.evidence)
    const resizedSize = resizedBlob.size
    
    // Log size reduction
    const sizeInfo = getFileSizeInfo(originalSize, resizedSize)
    console.log('[PhotoEvidence] Image resized:', {
      original: sizeInfo.original,
      resized: sizeInfo.resized,
      saved: sizeInfo.saved,
      percentage: `${sizeInfo.percentage}%`
    })
    
    resizing.value = false
    uploadProgress.value = 'กำลังอัพโหลด...'
    
    // Upload resized image
    await uploadPhoto(resizedBlob, file.name)
    
  } catch (error) {
    console.error('[PhotoEvidence] Resize error:', error)
    emit('error', 'ไม่สามารถปรับขนาดรูปได้')
    previewUrl.value = props.existingPhoto
    resizing.value = false
  } finally {
    uploadProgress.value = ''
    input.value = ''
  }
}

async function uploadPhoto(blob: Blob, originalName: string): Promise<void> {
  uploading.value = true
  
  try {
    // Always use .jpg extension for resized images
    const fileName = `${props.rideId}/${props.type}_${Date.now()}.jpg`
    
    const { data, error: uploadError } = await supabase.storage
      .from('ride-evidence')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg'
      })
    
    if (uploadError) {
      console.error('[PhotoEvidence] Upload error:', uploadError)
      emit('error', 'ไม่สามารถอัพโหลดรูปได้')
      previewUrl.value = props.existingPhoto
      return
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ride-evidence')
      .getPublicUrl(data.path)
    
    const photoUrl = urlData.publicUrl
    
    // Update ride_requests with photo URL
    // Note: pickup_photo/dropoff_photo columns added in migration 248
    const updateData = props.type === 'pickup' 
      ? { pickup_photo: photoUrl, pickup_photo_at: new Date().toISOString() }
      : { dropoff_photo: photoUrl, dropoff_photo_at: new Date().toISOString() }
    
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update(updateData as Record<string, unknown>)
      .eq('id', props.rideId)
    
    if (updateError) {
      console.error('[PhotoEvidence] Update error:', updateError)
      emit('error', 'ไม่สามารถบันทึกรูปได้')
      return
    }
    
    previewUrl.value = photoUrl
    emit('uploaded', photoUrl)
    
  } catch (err) {
    console.error('[PhotoEvidence] Exception:', err)
    emit('error', 'เกิดข้อผิดพลาด')
    previewUrl.value = props.existingPhoto
  } finally {
    uploading.value = false
  }
}

function removePhoto(): void {
  previewUrl.value = null
}
</script>

<template>
  <div class="photo-evidence">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden-input"
      @change="handleFileChange"
      :disabled="disabled || uploading || resizing"
    />
    
    <!-- Has Photo -->
    <div v-if="hasPhoto" class="photo-preview">
      <img 
        :src="previewUrl!" 
        :alt="label"
        loading="lazy"
        decoding="async"
      />
      <div class="photo-overlay">
        <span class="photo-label">{{ label }}</span>
        <button 
          v-if="!disabled"
          class="retake-btn"
          @click="triggerFileInput"
          type="button"
          :disabled="uploading || resizing"
        >
          <span v-if="uploading || resizing" class="btn-loader" aria-hidden="true"></span>
          <span v-else>ถ่ายใหม่</span>
        </button>
      </div>
    </div>
    
    <!-- No Photo -->
    <button 
      v-else
      class="capture-btn"
      @click="triggerFileInput"
      type="button"
      :disabled="disabled || uploading || resizing"
      :aria-label="`ถ่าย${label}`"
    >
      <div class="capture-icon">
        <svg v-if="!uploading && !resizing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <div v-else class="btn-loader"></div>
      </div>
      <span class="capture-label">{{ label }}</span>
      <span v-if="uploadProgress" class="capture-hint">{{ uploadProgress }}</span>
      <span v-else class="capture-hint">แตะเพื่อถ่ายรูป (รับทุกขนาด)</span>
    </button>
  </div>
</template>

<style scoped>
.photo-evidence {
  width: 100%;
}

.hidden-input {
  display: none;
}

/* Capture Button */
.capture-btn {
  width: 100%;
  padding: 20px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
}

.capture-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.capture-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.capture-icon {
  width: 48px;
  height: 48px;
  background: #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.capture-icon svg {
  width: 24px;
  height: 24px;
  color: #6b7280;
}

.capture-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.capture-hint {
  font-size: 12px;
  color: #9ca3af;
}

/* Photo Preview */
.photo-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 16px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.photo-label {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.retake-btn {
  padding: 8px 16px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retake-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
}

.retake-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loader */
.btn-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.capture-icon .btn-loader {
  border-color: rgba(0,0,0,0.1);
  border-top-color: #6b7280;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
