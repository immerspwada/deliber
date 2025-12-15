<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isOpen: boolean
  driverName?: string
  serviceType?: 'ride' | 'delivery' | 'shopping'
}

const props = withDefaults(defineProps<Props>(), {
  driverName: 'ผู้ให้บริการ',
  serviceType: 'ride'
})

const emit = defineEmits<{
  close: []
  submit: [rating: number, comment: string, tip: number]
}>()

const rating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const selectedTip = ref<number | null>(null)

const tipOptions = [0, 10, 20, 50]

const quickComments = [
  'บริการดีมาก',
  'ขับรถปลอดภัย',
  'มาตรงเวลา',
  'สุภาพเป็นกันเอง',
  'รถสะอาด'
]

const setRating = (value: number) => {
  rating.value = value
}

const addQuickComment = (text: string) => {
  if (comment.value) {
    comment.value += ', ' + text
  } else {
    comment.value = text
  }
}

const submitRating = () => {
  emit('submit', rating.value, comment.value, selectedTip.value || 0)
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>ให้คะแนนการบริการ</h2>
          <button @click="closeModal" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Driver Info -->
          <div class="driver-info">
            <div class="driver-avatar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <span class="driver-name">{{ driverName }}</span>
          </div>

          <!-- Star Rating -->
          <div class="rating-section">
            <div class="stars">
              <button
                v-for="i in 5"
                :key="i"
                @click="setRating(i)"
                @mouseenter="hoverRating = i"
                @mouseleave="hoverRating = 0"
                class="star-btn"
              >
                <svg
                  :class="['star', { filled: i <= (hoverRating || rating) }]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </button>
            </div>
            <span class="rating-label">
              {{ rating === 0 ? 'แตะเพื่อให้คะแนน' : rating === 5 ? 'ยอดเยี่ยม!' : rating >= 4 ? 'ดีมาก' : rating >= 3 ? 'ดี' : 'ปรับปรุง' }}
            </span>
          </div>

          <!-- Quick Comments -->
          <div v-if="rating > 0" class="quick-comments">
            <button
              v-for="text in quickComments"
              :key="text"
              @click="addQuickComment(text)"
              class="quick-comment-btn"
            >
              {{ text }}
            </button>
          </div>

          <!-- Comment Input -->
          <div v-if="rating > 0" class="comment-section">
            <textarea
              v-model="comment"
              placeholder="เพิ่มความคิดเห็น (ไม่บังคับ)"
              class="comment-input"
              rows="3"
            ></textarea>
          </div>

          <!-- Tip Section -->
          <div v-if="rating >= 4" class="tip-section">
            <h3 class="tip-title">ให้ทิปผู้ให้บริการ</h3>
            <div class="tip-options">
              <button
                v-for="amount in tipOptions"
                :key="amount"
                @click="selectedTip = amount"
                :class="['tip-btn', { active: selectedTip === amount }]"
              >
                {{ amount === 0 ? 'ไม่ให้ทิป' : `฿${amount}` }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="submitRating" :disabled="rating === 0" class="btn-primary">
            ส่งคะแนน
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.modal-body {
  padding: 24px 20px;
}

.driver-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.driver-avatar {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: 50%;
  margin-bottom: 8px;
}

.driver-avatar svg {
  width: 32px;
  height: 32px;
}

.driver-name {
  font-size: 16px;
  font-weight: 500;
}

.rating-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.stars {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.star {
  width: 40px;
  height: 40px;
  color: var(--color-border);
  transition: color 0.15s ease, transform 0.15s ease;
}

.star.filled {
  color: #F59E0B;
}

.star-btn:hover .star {
  transform: scale(1.1);
}

.rating-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.quick-comments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-comment-btn {
  padding: 8px 14px;
  background-color: var(--color-secondary);
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  cursor: pointer;
}

.quick-comment-btn:hover {
  background-color: var(--color-secondary-hover);
}

.comment-section {
  margin-bottom: 20px;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  resize: none;
}

.comment-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tip-section {
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.tip-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 12px;
  text-align: center;
}

.tip-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tip-btn {
  padding: 12px 8px;
  background-color: var(--color-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.tip-btn.active {
  border-color: var(--color-primary);
  background-color: rgba(0, 0, 0, 0.05);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  background-color: var(--color-disabled);
  cursor: not-allowed;
}
</style>
