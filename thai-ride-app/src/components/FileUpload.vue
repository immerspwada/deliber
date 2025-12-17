<script setup lang="ts">
/**
 * Feature: F101 - File Upload
 * Drag and drop file upload component
 */
import { ref, computed } from 'vue'

interface Props {
  accept?: string
  multiple?: boolean
  maxSize?: number // in MB
  maxFiles?: number
  disabled?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  accept: 'image/*',
  multiple: false,
  maxSize: 5,
  maxFiles: 10,
  disabled: false,
  label: 'อัพโหลดไฟล์'
})

const emit = defineEmits<{
  upload: [files: File[]]
  error: [message: string]
}>()

const isDragging = ref(false)
const files = ref<File[]>([])
const inputRef = ref<HTMLInputElement | null>(null)

const maxSizeBytes = computed(() => props.maxSize * 1024 * 1024)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!props.disabled) {
    isDragging.value = true
  }
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (props.disabled) return
  
  const droppedFiles = Array.from(e.dataTransfer?.files || [])
  processFiles(droppedFiles)
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const selectedFiles = Array.from(target.files || [])
  processFiles(selectedFiles)
  target.value = ''
}

const processFiles = (newFiles: File[]) => {
  // Filter by accept type
  const acceptTypes = props.accept.split(',').map(t => t.trim())
  const validFiles = newFiles.filter(file => {
    return acceptTypes.some(type => {
      if (type === '*/*') return true
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'))
      }
      return file.type === type
    })
  })

  // Check file size
  const oversizedFiles = validFiles.filter(f => f.size > maxSizeBytes.value)
  if (oversizedFiles.length > 0) {
    emit('error', `ไฟล์ต้องมีขนาดไม่เกิน ${props.maxSize}MB`)
    return
  }

  // Check max files
  const totalFiles = props.multiple 
    ? [...files.value, ...validFiles].slice(0, props.maxFiles)
    : validFiles.slice(0, 1)

  files.value = totalFiles
  emit('upload', totalFiles)
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
  emit('upload', files.value)
}

const openFilePicker = () => {
  if (!props.disabled) {
    inputRef.value?.click()
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="file-upload" :class="{ disabled }">
    <div
      class="upload-zone"
      :class="{ dragging: isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFilePicker"
    >
      <input
        ref="inputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        class="file-input"
        @change="handleFileSelect"
      />
      
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      
      <p class="upload-label">{{ label }}</p>
      <p class="upload-hint">
        ลากไฟล์มาวางหรือคลิกเพื่อเลือก
        <br />
        <span>สูงสุด {{ maxSize }}MB{{ multiple ? `, ${maxFiles} ไฟล์` : '' }}</span>
      </p>
    </div>

    <div v-if="files.length > 0" class="file-list">
      <div v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="file-info">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>
        <button type="button" class="remove-btn" @click.stop="removeFile(index)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  color: #6b6b6b;
}

.upload-zone:hover {
  border-color: #000;
  background: #f6f6f6;
}

.upload-zone.dragging {
  border-color: #000;
  background: #f0f0f0;
}

.file-input {
  display: none;
}

.upload-label {
  font-size: 16px;
  font-weight: 500;
  color: #000;
  margin: 16px 0 8px;
}

.upload-hint {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.5;
}

.upload-hint span {
  color: #999;
}

.file-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 8px;
}

.file-icon {
  color: #6b6b6b;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 12px;
  color: #6b6b6b;
}

.remove-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #e5e5e5;
  color: #e11900;
}
</style>
