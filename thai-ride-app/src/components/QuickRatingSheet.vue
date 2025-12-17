<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  show: boolean
  driverName?: string
  driverPhoto?: string
  tripType?: 'ride' | 'delivery' | 'shopping'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'rated', data: { rating: number; tip?: number }): void
  (e: 'openFeedback'): void
}>()

const rating = ref(0)
const selectedTip = ref<number | null>(null)
const customTip = ref('')
const showTipInput = ref(false)

const tipOptions = [20, 50, 100]

const tripTypeLabel = computed(() => {
  switch (props.tripType) {
    case 'delivery': return 'การส่งของ'
    case 'shopping': return 'การซื้อของ'
    default: return 'การเดินทาง'
  }
})

const setRating = (value: number) => {
  rating.value = value
}

const selectTip = (amount: number) => {
  selectedTip.value = amount
  showTipInput.value = false
  customTip.value = ''
}

const setCustomTip = () => {
  const amount = parseInt(customTip.value)
  if (amount > 0) {
    selectedTip.value = amount
  }
}

const handleSubmit = () => {
  if (rating.value === 0) return
  
  emit('rated', {
    rating: rating.value,
    tip: selectedTip.value || undefined
  })
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-overlay" @click.self="handleClose">
        <div class="sheet">
          <!-- Handle bar -->
          <div class="sheet-handle"></div>

          <!-- Driver info -->
          <div class="driver-section">
            <div class="driver-avatar">
              <img v-if="driverPhoto" :src="driverPhoto" alt="Driver" />
              <div v-else class="avatar-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
            </div>
            <div class="driver-info">
              <h3>{{ tripTypeLabel }}เสร็จสิ้น!</h3>
              <p v-if="driverName">{{ driverName }}</p>
            </div>
          </div>

          <!-- Rating -->
          <div class="rating-section">
            <p class="rating-prompt">ให้คะแนนบริการ</p>
            <div class="rating-stars">
              <button
                v-for="star in 5"
                :key="star"
                class="star-btn"
                :class="{ active: star <= rating }"
                @click="setRating(star)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Tip section -->
          <div class="tip-section" v-if="rating > 0">
            <p class="tip-prompt">ให้ทิปคนขับ?</p>
            <div class="tip-options">
              <button
                v-for="amount in tipOptions"
                :key="amount"
                class="tip-btn"
                :class="{ active: selectedTip === amount }"
                @click="selectTip(amount)"
              >
                ฿{{ amount }}
              </button>
              <button
                class="tip-btn custom"
                :class="{ active: showTipInput }"
                @click="showTipInput = !showTipInput"
              >
                อื่นๆ
              </button>
            </div>

            <div v-if="showTipInput" class="custom-tip-input">
              <span class="currency">฿</span>
              <input
                v-model="customTip"
                type="number"
                placeholder="0"
                @blur="setCustomTip"
                @keyup.enter="setCustomTip"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="actions">
            <button 
              class="submit-btn" 
              :disabled="rating === 0"
              @click="handleSubmit"
            >
              {{ selectedTip ? `ส่งคะแนน + ทิป ฿${selectedTip}` : 'ส่งคะแนน' }}
            </button>

            <button class="feedback-link" @click="emit('openFeedback')">
              ให้ feedback เพิ่มเติม
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
}

.sheet {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  padding: 12px 24px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #E5E5E5;
  border-radius: 2px;
  margin: 0 auto 20px;
}

/* Driver section */
.driver-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: #F6F6F6;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder svg {
  width: 28px;
  height: 28px;
  color: #6B6B6B;
}

.driver-info h3 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.driver-info p {
  font-size: 14px;
  color: #6B6B6B;
  margin: 0;
}

/* Rating */
.rating-section {
  text-align: center;
  margin-bottom: 24px;
}

.rating-prompt {
  font-size: 14px;
  color: #6B6B6B;
  margin: 0 0 12px 0;
}

.rating-stars {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.star-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #E5E5E5;
  transition: all 0.15s ease;
}

.star-btn svg {
  width: 40px;
  height: 40px;
}

.star-btn.active {
  color: #f59e0b;
  transform: scale(1.1);
}

/* Tip section */
.tip-section {
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tip-prompt {
  font-size: 14px;
  color: #6B6B6B;
  margin: 0 0 12px 0;
  text-align: center;
}

.tip-options {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.tip-btn {
  padding: 12px 20px;
  border-radius: 24px;
  border: 1px solid #E5E5E5;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tip-btn.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

.tip-btn.custom {
  padding: 12px 16px;
}

.custom-tip-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
}

.custom-tip-input .currency {
  font-size: 18px;
  color: #6B6B6B;
}

.custom-tip-input input {
  width: 100px;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 18px;
  text-align: center;
}

.custom-tip-input input:focus {
  outline: none;
  border-color: #000;
}

/* Actions */
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

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
  opacity: 0.3;
  cursor: not-allowed;
}

.feedback-link {
  background: none;
  border: none;
  color: #6B6B6B;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}

/* Transitions */
.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .sheet-overlay {
    align-items: center;
  }

  .sheet {
    border-radius: 24px;
    margin: 20px;
  }
}
</style>
