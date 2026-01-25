<script setup lang="ts">
/**
 * Rating Modal Component
 * ให้คะแนนหลังเสร็จงาน
 */
import { ref, computed } from 'vue'
import { useRating, PROVIDER_TAGS, CUSTOMER_TAGS } from '../composables/useRating'

interface Props {
  rideId: string
  rateeId: string
  rateeName: string
  raterRole: 'customer' | 'provider'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submitted: []
}>()

const { loading, error, submitRating } = useRating()

// State
const rating = ref(0)
const hoverRating = ref(0)
const selectedTags = ref<string[]>([])
const comment = ref('')

// Computed
const displayRating = computed(() => hoverRating.value || rating.value)

const tags = computed(() => 
  props.raterRole === 'customer' ? PROVIDER_TAGS : CUSTOMER_TAGS
)

const ratingLabels = ['', 'แย่มาก', 'ไม่ดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม']

const canSubmit = computed(() => rating.value > 0 && !loading.value)

// Methods
function setRating(value: number): void {
  rating.value = value
}

function toggleTag(tag: string): void {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return

  const result = await submitRating({
    rideId: props.rideId,
    rateeId: props.rateeId,
    raterRole: props.raterRole,
    rating: rating.value,
    comment: comment.value || undefined,
    tags: selectedTags.value.length > 0 ? selectedTags.value : undefined
  })

  if (result) {
    emit('submitted')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="rating-title">
      <!-- Header -->
      <div class="modal-header">
        <h2 id="rating-title">ให้คะแนน</h2>
        <button class="close-btn" type="button" aria-label="ปิด" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Ratee Info -->
      <div class="ratee-info">
        <div class="ratee-avatar">👤</div>
        <span class="ratee-name">{{ rateeName }}</span>
      </div>

      <!-- Star Rating -->
      <div class="rating-section">
        <div class="stars" role="radiogroup" aria-label="คะแนน">
          <button
            v-for="star in 5"
            :key="star"
            class="star-btn"
            :class="{ active: star <= displayRating }"
            type="button"
            :aria-label="`${star} ดาว`"
            :aria-checked="star === rating"
            role="radio"
            @click="setRating(star)"
            @mouseenter="hoverRating = star"
            @mouseleave="hoverRating = 0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
        <span v-if="displayRating > 0" class="rating-label">
          {{ ratingLabels[displayRating] }}
        </span>
      </div>

      <!-- Tags -->
      <div v-if="rating >= 4" class="tags-section">
        <p class="tags-label">อะไรที่ดี? (เลือกได้หลายข้อ)</p>
        <div class="tags-grid">
          <button
            v-for="tag in tags"
            :key="tag.key"
            class="tag-btn"
            :class="{ selected: selectedTags.includes(tag.key) }"
            type="button"
            @click="toggleTag(tag.key)"
          >
            <span class="tag-icon">{{ tag.icon }}</span>
            <span class="tag-label">{{ tag.label }}</span>
          </button>
        </div>
      </div>

      <!-- Comment -->
      <div class="comment-section">
        <label for="rating-comment">ความคิดเห็นเพิ่มเติม (ไม่บังคับ)</label>
        <textarea
          id="rating-comment"
          v-model="comment"
          placeholder="แชร์ประสบการณ์ของคุณ..."
          rows="3"
          maxlength="500"
        ></textarea>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-message" role="alert">
        {{ error }}
      </div>

      <!-- Submit Button -->
      <button
        class="submit-btn"
        :disabled="!canSubmit"
        type="button"
        @click="handleSubmit"
      >
        <span v-if="loading" class="btn-loader" aria-hidden="true"></span>
        <span v-else>ส่งคะแนน</span>
      </button>

      <!-- Skip Button -->
      <button
        class="skip-btn"
        type="button"
        @click="emit('close')"
      >
        ข้ามไปก่อน
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

/* Ratee Info */
.ratee-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.ratee-avatar {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.ratee-name {
  font-size: 16px;
  font-weight: 600;
  color: #111;
}

/* Stars */
.rating-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.stars {
  display: flex;
  gap: 8px;
}

.star-btn {
  width: 48px;
  height: 48px;
  background: none;
  border: none;
  cursor: pointer;
  color: #e5e7eb;
  transition: all 0.2s;
  padding: 0;
}

.star-btn.active {
  color: #fbbf24;
  transform: scale(1.1);
}

.star-btn svg {
  width: 100%;
  height: 100%;
}

.rating-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Tags */
.tags-section {
  margin-bottom: 20px;
}

.tags-label {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  text-align: center;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.tag-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn.selected {
  background: #dcfce7;
  border-color: #10b981;
}

.tag-icon {
  font-size: 16px;
}

.tag-label {
  color: #374151;
}

/* Comment */
.comment-section {
  margin-bottom: 20px;
}

.comment-section label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.comment-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.comment-section textarea:focus {
  outline: none;
  border-color: #000;
}

/* Error */
.error-message {
  padding: 12px;
  background: #fef2f2;
  border-radius: 8px;
  color: #b91c1c;
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
}

/* Buttons */
.submit-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.skip-btn {
  width: 100%;
  padding: 14px;
  background: none;
  color: #6b7280;
  border: none;
  font-size: 14px;
  cursor: pointer;
}
</style>
