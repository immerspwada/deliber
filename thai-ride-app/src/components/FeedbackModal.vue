<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCustomerFeedback, type FeedbackType, type FeedbackCategory } from '../composables/useCustomerFeedback'

const props = defineProps<{
  show: boolean
  type: FeedbackType
  referenceId?: string
  serviceName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted'): void
}>()

const { submitFeedback, loading } = useCustomerFeedback()

// Form state
const rating = ref(0)
const hoverRating = ref(0)
const npsScore = ref<number | null>(null)
const selectedCategories = ref<FeedbackCategory[]>([])
const comment = ref('')
const step = ref<'rating' | 'nps' | 'details' | 'success'>('rating')

const categories: { value: FeedbackCategory; label: string }[] = [
  { value: 'driver', label: 'คนขับ' },
  { value: 'vehicle', label: 'รถ' },
  { value: 'timing', label: 'เวลา' },
  { value: 'pricing', label: 'ราคา' },
  { value: 'app', label: 'แอพ' },
  { value: 'safety', label: 'ความปลอดภัย' },
  { value: 'other', label: 'อื่นๆ' }
]

const displayRating = computed(() => hoverRating.value || rating.value)

const ratingLabels = ['', 'แย่มาก', 'ไม่ดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม']

const toggleCategory = (cat: FeedbackCategory) => {
  const idx = selectedCategories.value.indexOf(cat)
  if (idx === -1) {
    selectedCategories.value.push(cat)
  } else {
    selectedCategories.value.splice(idx, 1)
  }
}

const setRating = (value: number) => {
  rating.value = value
  // Auto advance after short delay
  setTimeout(() => {
    if (rating.value > 0) {
      step.value = 'nps'
    }
  }, 300)
}

const setNps = (value: number) => {
  npsScore.value = value
  setTimeout(() => {
    step.value = 'details'
  }, 300)
}

const handleSubmit = async () => {
  if (rating.value === 0) return

  const result = await submitFeedback({
    type: props.type,
    reference_id: props.referenceId,
    rating: rating.value,
    nps_score: npsScore.value ?? undefined,
    categories: selectedCategories.value,
    comment: comment.value || undefined
  })

  if (result.success) {
    step.value = 'success'
    setTimeout(() => {
      emit('submitted')
      resetForm()
    }, 2000)
  }
}

const resetForm = () => {
  rating.value = 0
  hoverRating.value = 0
  npsScore.value = null
  selectedCategories.value = []
  comment.value = ''
  step.value = 'rating'
}

const handleClose = () => {
  emit('close')
  resetForm()
}

const skipNps = () => {
  step.value = 'details'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <!-- Close button -->
        <button class="close-btn" @click="handleClose">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Step 1: Rating -->
        <div v-if="step === 'rating'" class="step-content">
          <div class="step-header">
            <h2>ให้คะแนนบริการ</h2>
            <p v-if="serviceName">{{ serviceName }}</p>
          </div>

          <div class="rating-stars">
            <button
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ active: star <= displayRating }"
              @click="setRating(star)"
              @mouseenter="hoverRating = star"
              @mouseleave="hoverRating = 0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>

          <p class="rating-label">{{ ratingLabels[displayRating] || 'แตะเพื่อให้คะแนน' }}</p>
        </div>

        <!-- Step 2: NPS -->
        <div v-else-if="step === 'nps'" class="step-content">
          <div class="step-header">
            <h2>คุณจะแนะนำเราให้เพื่อนไหม?</h2>
            <p>0 = ไม่แนะนำเลย, 10 = แนะนำอย่างยิ่ง</p>
          </div>

          <div class="nps-scale">
            <button
              v-for="n in 11"
              :key="n - 1"
              class="nps-btn"
              :class="{ 
                active: npsScore === n - 1,
                detractor: n - 1 <= 6,
                passive: n - 1 >= 7 && n - 1 <= 8,
                promoter: n - 1 >= 9
              }"
              @click="setNps(n - 1)"
            >
              {{ n - 1 }}
            </button>
          </div>

          <div class="nps-labels">
            <span>ไม่แนะนำ</span>
            <span>แนะนำอย่างยิ่ง</span>
          </div>

          <button class="skip-btn" @click="skipNps">ข้าม</button>
        </div>

        <!-- Step 3: Details -->
        <div v-else-if="step === 'details'" class="step-content">
          <div class="step-header">
            <h2>บอกเราเพิ่มเติม</h2>
            <p>เลือกหัวข้อที่เกี่ยวข้อง (ไม่บังคับ)</p>
          </div>

          <div class="categories">
            <button
              v-for="cat in categories"
              :key="cat.value"
              class="category-btn"
              :class="{ active: selectedCategories.includes(cat.value) }"
              @click="toggleCategory(cat.value)"
            >
              {{ cat.label }}
            </button>
          </div>

          <div class="comment-section">
            <textarea
              v-model="comment"
              placeholder="แชร์ประสบการณ์ของคุณ... (ไม่บังคับ)"
              rows="3"
            ></textarea>
          </div>

          <button 
            class="submit-btn" 
            :disabled="loading"
            @click="handleSubmit"
          >
            {{ loading ? 'กำลังส่ง...' : 'ส่ง Feedback' }}
          </button>
        </div>

        <!-- Step 4: Success -->
        <div v-else-if="step === 'success'" class="step-content success">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2>ขอบคุณสำหรับ Feedback!</h2>
          <p>ความคิดเห็นของคุณช่วยให้เราพัฒนาบริการได้ดียิ่งขึ้น</p>
        </div>

        <!-- Progress dots -->
        <div v-if="step !== 'success'" class="progress-dots">
          <span :class="{ active: step === 'rating' }"></span>
          <span :class="{ active: step === 'nps' }"></span>
          <span :class="{ active: step === 'details' }"></span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 0;
}

.modal {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6B6B6B;
}

.step-content {
  text-align: center;
  padding: 20px 0;
}

.step-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px 0;
}

.step-header p {
  font-size: 14px;
  color: #6B6B6B;
  margin: 0;
}

/* Rating Stars */
.rating-stars {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 32px 0 16px;
}

.star-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #E5E5E5;
  transition: all 0.2s ease;
}

.star-btn svg {
  width: 48px;
  height: 48px;
}

.star-btn.active {
  color: #f59e0b;
  transform: scale(1.1);
}

.rating-label {
  font-size: 16px;
  font-weight: 500;
  color: #000;
  min-height: 24px;
}

/* NPS Scale */
.nps-scale {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 24px 0 8px;
  flex-wrap: wrap;
}

.nps-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nps-btn.active {
  border-color: #000;
  background: #000;
  color: #fff;
}

.nps-btn.detractor:hover { border-color: #ef4444; }
.nps-btn.passive:hover { border-color: #f59e0b; }
.nps-btn.promoter:hover { border-color: #22c55e; }

.nps-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6B6B6B;
  padding: 0 8px;
}

.skip-btn {
  margin-top: 16px;
  background: none;
  border: none;
  color: #6B6B6B;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}

/* Categories */
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin: 20px 0;
}

.category-btn {
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid #E5E5E5;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-btn.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

/* Comment */
.comment-section {
  margin: 20px 0;
}

.comment-section textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.comment-section textarea:focus {
  outline: none;
  border-color: #000;
}

/* Submit */
.submit-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Success */
.step-content.success {
  padding: 40px 0;
}

.success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.success-icon svg {
  width: 40px;
  height: 40px;
  color: #22c55e;
}

/* Progress dots */
.progress-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

.progress-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E5E5E5;
  transition: all 0.2s ease;
}

.progress-dots span.active {
  background: #000;
  width: 24px;
  border-radius: 4px;
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
    padding: 20px;
  }

  .modal {
    border-radius: 24px;
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style>
