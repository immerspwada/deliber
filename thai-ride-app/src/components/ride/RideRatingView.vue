<script setup lang="ts">
/**
 * Component: RideRatingView
 * แสดงหน้าจอให้คะแนนคนขับ + ให้ทิป
 * 
 * Role Impact:
 * - Customer: ให้คะแนนและทิปหลังจบงาน
 * - Provider: รับคะแนนและทิป
 * - Admin: ดูสถิติ
 */
import { ref, computed, onMounted } from 'vue'
import TipModal from '@/components/customer/TipModal.vue'
import { useTip } from '@/composables/useTip'

const props = defineProps<{
  isSubmitting: boolean
  rideId?: string
  providerName?: string
}>()

const rating = defineModel<number>('rating', { default: 0 })

const emit = defineEmits<{
  submit: []
  skip: []
}>()

// Tip state
const showTipModal = ref(false)
const tipGiven = ref(false)
const tipAmount = ref(0)
const { checkCanTip, canTip } = useTip()

// Check if can tip on mount
onMounted(async () => {
  if (props.rideId) {
    await checkCanTip(props.rideId)
  }
})

// Show tip button only if can tip
const showTipButton = computed(() => canTip.value && !tipGiven.value)

const hoveredStar = ref(0)

function handleStarClick(star: number): void {
  rating.value = star
}

function handleStarHover(star: number): void {
  hoveredStar.value = star
}

function handleStarLeave(): void {
  hoveredStar.value = 0
}

function getStarState(star: number): 'active' | 'hover' | 'inactive' {
  if (rating.value >= star) return 'active'
  if (hoveredStar.value >= star) return 'hover'
  return 'inactive'
}

function handleTipSuccess(amount: number): void {
  tipGiven.value = true
  tipAmount.value = amount
  showTipModal.value = false
}
</script>

<template>
  <div class="rating-view">
    <div class="rating-content">
      <!-- Success Icon -->
      <div class="success-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00a86b" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </svg>
      </div>
      
      <h2 class="rating-title">ถึงแล้ว!</h2>
      <p class="rating-subtitle">ให้คะแนนคนขับของคุณ</p>

      <!-- Stars -->
      <div 
        class="stars-container" 
        @mouseleave="handleStarLeave"
      >
        <button
          v-for="star in 5"
          :key="star"
          class="star-btn"
          :class="getStarState(star)"
          @click="handleStarClick(star)"
          @mouseenter="handleStarHover(star)"
          :aria-label="`ให้ ${star} ดาว`"
          type="button"
        >
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24"
            :fill="getStarState(star) !== 'inactive' ? '#FFD700' : 'none'"
            :stroke="getStarState(star) !== 'inactive' ? '#FFD700' : '#ccc'"
            stroke-width="2"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      </div>

      <!-- Rating Labels -->
      <Transition name="fade" mode="out-in">
        <p v-if="rating > 0" :key="rating" class="rating-label">
          {{ ['', 'แย่มาก', 'ไม่ดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม!'][rating] }}
        </p>
      </Transition>

      <!-- Tip Section -->
      <div v-if="showTipButton" class="tip-section">
        <button 
          class="tip-btn"
          type="button"
          @click="showTipModal = true"
        >
          <span class="tip-icon">💰</span>
          <span>ให้ทิปคนขับ</span>
        </button>
      </div>

      <!-- Tip Given Badge -->
      <div v-else-if="tipGiven" class="tip-given-badge">
        <span class="tip-icon">🎉</span>
        <span>ให้ทิป ฿{{ tipAmount.toLocaleString() }} แล้ว</span>
      </div>

      <!-- Actions -->
      <div class="rating-actions">
        <button
          class="submit-btn"
          :disabled="rating === 0 || isSubmitting"
          type="button"
          @click="emit('submit')"
        >
          <template v-if="isSubmitting">
            <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            กำลังส่ง...
          </template>
          <template v-else>
            ส่งคะแนน
          </template>
        </button>
        <button class="skip-btn" type="button" @click="emit('skip')">
          ข้าม
        </button>
      </div>
    </div>

    <!-- Tip Modal -->
    <TipModal
      v-if="rideId"
      :ride-id="rideId"
      :provider-name="providerName"
      :is-open="showTipModal"
      @close="showTipModal = false"
      @success="handleTipSuccess"
    />
  </div>
</template>

<style scoped>
.rating-view {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 20px;
}

.rating-content {
  text-align: center;
  max-width: 320px;
  width: 100%;
}

/* Success Icon */
.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #e8f5ef;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop-in 0.4s ease-out;
}

@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* Title */
.rating-title {
  font-size: 28px;
  font-weight: 700;
  color: #00a86b;
  margin-bottom: 8px;
}

.rating-subtitle {
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
}

/* Stars */
.stars-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.star-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.star-btn:hover {
  transform: scale(1.15);
}

.star-btn:active {
  transform: scale(1.25);
}

.star-btn.active svg,
.star-btn.hover svg {
  filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4));
}

/* Rating Label */
.rating-label {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32px;
  min-height: 27px;
}

/* Actions */
.rating-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.submit-btn:disabled {
  background: #ccc;
  box-shadow: none;
  cursor: not-allowed;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.skip-btn {
  padding: 12px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.skip-btn:active {
  color: #333;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Tip Section */
.tip-section {
  margin-bottom: 24px;
}

.tip-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1a1a1a;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.tip-btn:active {
  transform: scale(0.98);
}

.tip-icon {
  font-size: 20px;
}

.tip-given-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #e8f5ef;
  color: #00875a;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 24px;
  animation: pop-in 0.3s ease-out;
}
</style>
