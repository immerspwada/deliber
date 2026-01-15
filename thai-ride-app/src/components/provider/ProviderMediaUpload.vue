<script setup lang="ts">
/**
 * Component: ProviderMediaUpload
 * อัพโหลดรูปโปรไฟล์และรูปรถของ Provider
 * 
 * Role: Provider only
 */
import { ref, onMounted } from 'vue'
import { useProviderMedia } from '../../composables/useProviderMedia'
import { useRoleAccess } from '../../composables/useRoleAccess'

const { isProvider } = useRoleAccess()
const {
  avatarUrl,
  vehiclePhotoUrl,
  isUploading,
  uploadProgress,
  error,
  fetchProviderMedia,
  uploadAvatar,
  uploadVehiclePhoto,
  deleteAvatar,
  deleteVehiclePhoto
} = useProviderMedia()

const avatarInput = ref<HTMLInputElement | null>(null)
const vehicleInput = ref<HTMLInputElement | null>(null)
const showDeleteConfirm = ref<'avatar' | 'vehicle' | null>(null)

// Handle avatar file selection
async function handleAvatarSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const result = await uploadAvatar(file)
  if (result.success) {
    // Clear input
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

// Handle vehicle photo file selection
async function handleVehicleSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const result = await uploadVehiclePhoto(file)
  if (result.success) {
    // Clear input
    if (vehicleInput.value) vehicleInput.value.value = ''
  }
}

// Confirm delete
async function confirmDelete(): Promise<void> {
  if (showDeleteConfirm.value === 'avatar') {
    await deleteAvatar()
  } else if (showDeleteConfirm.value === 'vehicle') {
    await deleteVehiclePhoto()
  }
  showDeleteConfirm.value = null
}

onMounted(() => {
  if (isProvider.value) {
    fetchProviderMedia()
  }
})
</script>

<template>
  <div class="media-upload-container">
    <!-- Access denied for non-providers -->
    <div v-if="!isProvider" class="access-denied">
      <p>เฉพาะ Provider เท่านั้นที่สามารถอัพโหลดรูปได้</p>
    </div>

    <template v-else>
      <!-- Avatar Upload Section -->
      <div class="upload-section">
        <h3 class="section-title">รูปโปรไฟล์</h3>
        
        <div class="preview-container">
          <div class="avatar-preview" :class="{ 'has-image': avatarUrl }">
            <img v-if="avatarUrl" :src="avatarUrl" alt="รูปโปรไฟล์" />
            <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          
          <div class="upload-actions">
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="handleAvatarSelect"
            />
            <button
              type="button"
              class="upload-btn"
              :disabled="isUploading"
              @click="avatarInput?.click()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {{ avatarUrl ? 'เปลี่ยนรูป' : 'อัพโหลด' }}
            </button>
            <button
              v-if="avatarUrl"
              type="button"
              class="delete-btn"
              :disabled="isUploading"
              @click="showDeleteConfirm = 'avatar'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              ลบ
            </button>
          </div>
        </div>
        <p class="hint">รูปขนาดไม่เกิน 2MB (JPG, PNG, WebP)</p>
      </div>

      <!-- Vehicle Photo Upload Section -->
      <div class="upload-section">
        <h3 class="section-title">รูปรถ</h3>
        
        <div class="preview-container vehicle">
          <div class="vehicle-preview" :class="{ 'has-image': vehiclePhotoUrl }">
            <img v-if="vehiclePhotoUrl" :src="vehiclePhotoUrl" alt="รูปรถ" />
            <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          
          <div class="upload-actions">
            <input
              ref="vehicleInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="handleVehicleSelect"
            />
            <button
              type="button"
              class="upload-btn"
              :disabled="isUploading"
              @click="vehicleInput?.click()"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {{ vehiclePhotoUrl ? 'เปลี่ยนรูป' : 'อัพโหลด' }}
            </button>
            <button
              v-if="vehiclePhotoUrl"
              type="button"
              class="delete-btn"
              :disabled="isUploading"
              @click="showDeleteConfirm = 'vehicle'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              ลบ
            </button>
          </div>
        </div>
        <p class="hint">รูปขนาดไม่เกิน 5MB (JPG, PNG, WebP)</p>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="progress-overlay">
        <div class="progress-content">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <span class="progress-text">กำลังอัพโหลด {{ uploadProgress }}%</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ error }}
      </div>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = null">
          <div class="modal-content">
            <h4>ยืนยันการลบ</h4>
            <p>คุณต้องการลบ{{ showDeleteConfirm === 'avatar' ? 'รูปโปรไฟล์' : 'รูปรถ' }}หรือไม่?</p>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showDeleteConfirm = null">ยกเลิก</button>
              <button type="button" class="btn-confirm" @click="confirmDelete">ลบ</button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.media-upload-container {
  padding: 16px;
}

.access-denied {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.upload-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.preview-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.preview-container.vehicle {
  flex-direction: column;
  align-items: stretch;
}

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-preview.has-image {
  border: 3px solid #00a86b;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vehicle-preview {
  width: 100%;
  height: 160px;
  border-radius: 12px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  overflow: hidden;
  margin-bottom: 12px;
}

.vehicle-preview.has-image {
  border: 3px solid #00a86b;
}

.vehicle-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hidden-input {
  display: none;
}

.upload-btn,
.delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.upload-btn {
  background: #00a86b;
  color: #fff;
}

.upload-btn:hover:not(:disabled) {
  background: #00875a;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn {
  background: #ffebee;
  color: #e53935;
}

.delete-btn:hover:not(:disabled) {
  background: #ffcdd2;
}

.hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}

/* Progress Overlay */
.progress-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.progress-content {
  background: #fff;
  padding: 24px 32px;
  border-radius: 12px;
  text-align: center;
  min-width: 200px;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #00a86b;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #666;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #ffebee;
  color: #e53935;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  max-width: 320px;
  width: 90%;
  text-align: center;
}

.modal-content h4 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.modal-content p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e8e8e8;
}

.btn-confirm {
  background: #e53935;
  color: #fff;
}

.btn-confirm:hover {
  background: #c62828;
}
</style>
