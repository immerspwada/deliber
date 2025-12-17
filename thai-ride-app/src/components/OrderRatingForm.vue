<script setup lang="ts">
/**
 * Feature: F336 - Order Rating Form
 * Form for rating completed orders
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  orderType: 'delivery' | 'shopping'
  providerName: string
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  'submit': [data: { rating: number; feedback: string; tags: string[] }]
  'skip': []
}>()

const rating = ref(0)
const feedback = ref('')
const selectedTags = ref<string[]>([])

const deliveryTags = ['รวดเร็ว', 'พัสดุปลอดภัย', 'สุภาพ', 'ตรงเวลา', 'บริการดี']
const shoppingTags = ['สินค้าครบ', 'เลือกของดี', 'รวดเร็ว', 'สุภาพ', 'บริการดี']

const tags = computed(() => props.orderType === 'delivery' ? deliveryTags : shoppingTags)

const canSubmit = computed(() => rating.value > 0)

const setRating = (value: number) => {
  rating.value = value
}

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    rating: rating.value,
    feedback: feedback.value,
    tags: selectedTags.value
  })
}
</script>

<template>
  <div class="rating-form">
    <div class="form-header">
      <h3 class="form-title">ให้คะแนน{{ orderType === 'delivery' ? 'ผู้จัดส่ง' : 'ผู้ซื้อ' }}</h3>
      <p class="form-subtitle">{{ providerName }}</p>
    </div>
    
    <div class="stars-section">
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        class="star-btn"
        :class="{ active: star <= rating }"
        @click="setRating(star)"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" :fill="star <= rating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
    
    <div v-if="rating > 0" class="tags-section">
      <p class="tags-label">อะไรที่ดี?</p>
      <div class="tags-list">
        <button
          v-for="tag in tags"
          :key="tag"
          type="button"
          class="tag-btn"
          :class="{ active: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>
    
    <div v-if="rating > 0" class="feedback-section">
      <textarea
        v-model="feedback"
        class="feedback-input"
        placeholder="เพิ่มความคิดเห็น (ไม่บังคับ)"
        rows="3"
      />
    </div>
    
    <div class="form-actions">
      <button type="button" class="skip-btn" @click="emit('skip')">ข้าม</button>
      <button 
        type="button" 
        class="submit-btn"
        :disabled="!canSubmit || loading"
        @click="handleSubmit"
      >
        <span v-if="loading" class="spinner" />
        <span v-else>ส่งคะแนน</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rating-form {
  padding: 24px 16px;
  text-align: center;
}

.form-header {
  margin-bottom: 24px;
}

.form-title {
  font-size: 20px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.form-subtitle {
  font-size: 15px;
  color: #6b6b6b;
  margin: 0;
}

.stars-section {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #e5e5e5;
  padding: 4px;
  transition: transform 0.2s, color 0.2s;
}

.star-btn:hover {
  transform: scale(1.1);
}

.star-btn.active {
  color: #ffc107;
}

.tags-section {
  margin-bottom: 16px;
}

.tags-label {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 12px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.tag-btn {
  padding: 8px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn:hover {
  background: #e5e5e5;
}

.tag-btn.active {
  background: #000;
  color: #fff;
}

.feedback-section {
  margin-bottom: 24px;
}

.feedback-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  outline: none;
}

.feedback-input:focus {
  border-color: #000;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.skip-btn {
  flex: 1;
  padding: 14px;
  background: #f6f6f6;
  color: #6b6b6b;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.submit-btn {
  flex: 2;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
