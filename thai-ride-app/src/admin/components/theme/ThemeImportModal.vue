<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">นำเข้าธีม</h2>
        <button
          type="button"
          class="close-button"
          @click="$emit('close')"
          aria-label="ปิด"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <p class="instruction-text">
          วางข้อมูล JSON ของธีมที่ต้องการนำเข้า หรืออัปโหลดไฟล์
        </p>

        <!-- File Upload -->
        <div class="upload-section">
          <label for="file-upload" class="upload-label">
            <div class="upload-icon">📁</div>
            <span>เลือกไฟล์ JSON</span>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              class="file-input"
              @change="handleFileUpload"
            />
          </label>
        </div>

        <div class="divider">
          <span>หรือ</span>
        </div>

        <!-- JSON Input -->
        <div class="json-input-section">
          <label for="json-input" class="json-label">
            วาง JSON ที่นี่
          </label>
          <textarea
            id="json-input"
            v-model="jsonData"
            class="json-textarea"
            rows="10"
            placeholder='{"version":"1.0","theme":{...}}'
          ></textarea>
          <p v-if="error" class="error-message">{{ error }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn-secondary"
          @click="$emit('close')"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          class="btn-primary"
          @click="handleImport"
          :disabled="!jsonData || importing"
        >
          {{ importing ? 'กำลังนำเข้า...' : 'นำเข้าธีม' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  close: []
  import: [data: string]
}>()

const jsonData = ref('')
const error = ref<string | null>(null)
const importing = ref(false)

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    jsonData.value = content
    error.value = null
  }
  reader.onerror = () => {
    error.value = 'ไม่สามารถอ่านไฟล์ได้'
  }
  reader.readAsText(file)
}

function handleImport() {
  error.value = null
  
  try {
    // Validate JSON
    JSON.parse(jsonData.value)
    
    importing.value = true
    emit('import', jsonData.value)
  } catch (e) {
    error.value = 'รูปแบบ JSON ไม่ถูกต้อง'
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  max-width: 42rem;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.close-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.5rem;
}

.close-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.instruction-text {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.upload-section {
  margin-bottom: 1.5rem;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
}

.upload-label:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.file-input {
  display: none;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e5e7eb;
}

.divider span {
  padding: 0 1rem;
}

.json-input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.json-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.json-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  resize: vertical;
  min-height: 200px;
}

.json-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: #3b82f6;
  ring-opacity: 0.2;
}

.error-message {
  font-size: 0.75rem;
  color: #dc2626;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.btn-primary {
  padding: 0.5rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
