<script setup lang="ts">
/**
 * Feature: F323 - Delivery Proof Upload
 * Component for uploading delivery proof photos
 */
import { ref, computed } from 'vue'

interface ProofImage {
  id: string
  url: string
  type: 'pickup' | 'delivery'
}

const props = withDefaults(defineProps<{
  images?: ProofImage[]
  maxImages?: number
  loading?: boolean
}>(), {
  images: () => [],
  maxImages: 3,
  loading: false
})

const emit = defineEmits<{
  'upload': [file: File, type: 'pickup' | 'delivery']
  'remove': [id: string]
}>()

const activeTab = ref<'pickup' | 'delivery'>('pickup')

const filteredImages = computed(() => 
  props.images.filter(img => img.type === activeTab.value)
)

const canUpload = computed(() => 
  filteredImages.value.length < props.maxImages
)

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    emit('upload', input.files[0], activeTab.value)
    input.value = ''
  }
}
</script>

<template>
  <div class="proof-upload">
    <div class="tabs">
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'pickup' }"
        @click="activeTab = 'pickup'"
      >
        รูปรับพัสดุ
      </button>
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'delivery' }"
        @click="activeTab = 'delivery'"
      >
        รูปส่งพัสดุ
      </button>
    </div>

    <div class="images-grid">
      <div 
        v-for="img in filteredImages" 
        :key="img.id" 
        class="image-item"
      >
        <img :src="img.url" :alt="img.type" class="proof-image" />
        <button type="button" class="remove-btn" @click="emit('remove', img.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <label v-if="canUpload" class="upload-btn" :class="{ disabled: loading }">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          :disabled="loading"
          @change="handleFileSelect"
        />
        <div class="upload-content">
          <svg v-if="!loading" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <div v-else class="spinner" />
          <span>{{ loading ? 'กำลังอัพโหลด...' : 'ถ่ายรูป' }}</span>
        </div>
      </label>
    </div>
    
    <p class="upload-hint">
      อัพโหลดได้สูงสุด {{ maxImages }} รูป ({{ filteredImages.length }}/{{ maxImages }})
    </p>
  </div>
</template>

<style scoped>
.proof-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #000;
  color: #fff;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
}

.proof-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}

.upload-btn {
  aspect-ratio: 1;
  background: #f6f6f6;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover:not(.disabled) {
  border-color: #000;
  background: #e5e5e5;
}

.upload-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-btn input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #6b6b6b;
}

.upload-content span {
  font-size: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.upload-hint {
  font-size: 12px;
  color: #6b6b6b;
  text-align: center;
  margin: 0;
}
</style>
