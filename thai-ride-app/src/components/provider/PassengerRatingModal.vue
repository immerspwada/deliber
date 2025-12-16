<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
  passengerName: string
  fare: number
  rideId: string
}>()

const emit = defineEmits<{
  'close': []
  'submit': [rating: number, comment: string]
}>()

const rating = ref(5)
const comment = ref('')
const isSubmitting = ref(false)

const setRating = (value: number) => {
  rating.value = value
}

const handleSubmit = async () => {
  isSubmitting.value = true
  emit('submit', rating.value, comment.value)
  
  // Reset
  setTimeout(() => {
    rating.value = 5
    comment.value = ''
    isSubmitting.value = false
  }, 500)
}

const handleSkip = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="handleSkip">
      <div class="modal-content">
        <!-- Success Header -->
        <div class="success-header">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="40" height="40">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2>เสร็จสิ้นการเดินทาง</h2>
          <div class="fare-earned">
            <span class="fare-label">รายได้</span>
            <span class="fare-amount">฿{{ fare.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Rating Section -->
        <div class="rating-section">
          <p class="rating-prompt">ให้คะแนน {{ passengerName }}</p>
          
          <div class="stars-row">
            <button 
              v-for="star in 5" 
              :key="star"
              @click="setRating(star)"
              class="star-btn"
            >
              <svg 
                :class="['star-icon', { filled: star <= rating }]"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>

          <div class="rating-labels">
            <span v-if="rating === 1">แย่มาก</span>
            <span v-else-if="rating === 2">ไม่ดี</span>
            <span v-else-if="rating === 3">พอใช้</span>
            <span v-else-if="rating === 4">ดี</span>
            <span v-else>ดีมาก</span>
          </div>
        </div>

        <!-- Comment -->
        <div class="comment-section">
          <textarea
            v-model="comment"
            placeholder="เพิ่มความคิดเห็น (ไม่บังคับ)"
            rows="3"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button @click="handleSkip" class="btn-skip">
            ข้าม
          </button>
          <button 
            @click="handleSubmit" 
            class="btn-submit"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'กำลังส่ง...' : 'ส่งคะแนน' }}
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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 360px;
  background-color: #FFFFFF;
  border-radius: 20px;
  overflow: hidden;
}

/* Success Header */
.success-header {
  background-color: #000000;
  color: #FFFFFF;
  padding: 32px 24px;
  text-align: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  background-color: #22C55E;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.success-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.fare-earned {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fare-label {
  font-size: 13px;
  opacity: 0.7;
}

.fare-amount {
  font-size: 36px;
  font-weight: 700;
}

/* Rating Section */
.rating-section {
  padding: 24px;
  text-align: center;
}

.rating-prompt {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
}

.stars-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.star-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.star-icon {
  width: 40px;
  height: 40px;
  fill: #E5E5E5;
  stroke: none;
  transition: all 0.2s;
}

.star-icon.filled {
  fill: #F59E0B;
}

.rating-labels {
  font-size: 14px;
  color: #6B6B6B;
}

/* Comment Section */
.comment-section {
  padding: 0 24px;
}

.comment-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.comment-section textarea:focus {
  outline: none;
  border-color: #000000;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 24px;
}

.btn-skip {
  flex: 1;
  padding: 14px;
  background-color: #F6F6F6;
  color: #6B6B6B;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit {
  flex: 2;
  padding: 14px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  background-color: #CCCCCC;
}
</style>
