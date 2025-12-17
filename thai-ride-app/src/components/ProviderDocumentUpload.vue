<script setup lang="ts">
/**
 * Feature: F350 - Provider Document Upload
 * Document upload component for provider verification
 */
import { ref } from 'vue'

interface Document {
  type: 'id_card' | 'driving_license' | 'vehicle_registration' | 'insurance'
  status: 'pending' | 'approved' | 'rejected' | 'not_uploaded'
  url?: string
  rejectionReason?: string
}

const props = defineProps<{ document: Document; title: string; description: string }>()
const emit = defineEmits<{ (e: 'upload', file: File): void; (e: 'view'): void }>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

const statusConfig = {
  pending: { label: 'รอตรวจสอบ', color: '#f59e0b', bg: '#fef3c7' },
  approved: { label: 'อนุมัติแล้ว', color: '#22c55e', bg: '#dcfce7' },
  rejected: { label: 'ไม่อนุมัติ', color: '#e11900', bg: '#fee2e2' },
  not_uploaded: { label: 'ยังไม่อัพโหลด', color: '#6b6b6b', bg: '#f6f6f6' }
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) emit('upload', file)
}

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('upload', file)
}
</script>

<template>
  <div class="provider-document-upload">
    <div class="doc-header">
      <div class="doc-info">
        <h4 class="doc-title">{{ title }}</h4>
        <p class="doc-desc">{{ description }}</p>
      </div>
      <span class="status-badge" :style="{ color: statusConfig[document.status].color, background: statusConfig[document.status].bg }">
        {{ statusConfig[document.status].label }}
      </span>
    </div>

    <div v-if="document.status === 'rejected' && document.rejectionReason" class="rejection-reason">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11900" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
      </svg>
      <span>{{ document.rejectionReason }}</span>
    </div>

    <div v-if="document.url && document.status !== 'not_uploaded'" class="preview-area" @click="emit('view')">
      <img :src="document.url" alt="Document preview" class="preview-img" />
      <div class="preview-overlay">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span>ดูเอกสาร</span>
      </div>
    </div>

    <div
      v-else
      class="upload-area"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p class="upload-text">คลิกหรือลากไฟล์มาวาง</p>
      <span class="upload-hint">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</span>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFileSelect" />
    </div>

    <button v-if="document.status === 'rejected' || document.status === 'approved'" type="button" class="reupload-btn" @click="fileInput?.click()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      อัพโหลดใหม่
    </button>
  </div>
</template>

<style scoped>
.provider-document-upload { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; }
.doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.doc-title { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 4px; }
.doc-desc { font-size: 13px; color: #6b6b6b; margin: 0; }
.status-badge { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; }
.rejection-reason { display: flex; align-items: center; gap: 8px; padding: 10px; background: #fee2e2; border-radius: 8px; margin-bottom: 12px; font-size: 13px; color: #e11900; }
.preview-area { position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; }
.preview-img { width: 100%; height: 160px; object-fit: cover; }
.preview-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #fff; font-size: 13px; opacity: 0; transition: opacity 0.2s; }
.preview-area:hover .preview-overlay { opacity: 1; }
.upload-area { border: 2px dashed #e5e5e5; border-radius: 8px; padding: 32px; text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-area:hover, .upload-area.dragging { border-color: #000; background: #f6f6f6; }
.upload-text { font-size: 14px; color: #000; margin: 12px 0 4px; }
.upload-hint { font-size: 12px; color: #6b6b6b; }
.reupload-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; margin-top: 12px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 14px; color: #000; cursor: pointer; }
.reupload-btn:hover { background: #e5e5e5; }
</style>
