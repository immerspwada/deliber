<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  show: boolean
  driverName: string
  finalPrice: number
}>()

const emit = defineEmits<{
  'close': []
  'submit': [rating: number, tip: number]
}>()

const userRating = ref(0)
const tipAmount = ref(0)
const submitting = ref(false)

const tipOptions = [0, 20, 50, 100]

const totalAmount = computed(() => props.finalPrice + tipAmount.value)

const handleSubmit = async () => {
  submitting.value = true
  emit('submit', userRating.value, tipAmount.value)
  // Reset state
  userRating.value = 0
  tipAmount.value = 0
  submitting.value = false
}
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="rating-modal">
      <h3 class="rating-title">ให้คะแนนการเดินทาง</h3>
      <p class="rating-subtitle">คุณพอใจกับบริการของ {{ driverName }} หรือไม่?</p>
      
      <div class="star-rating">
        <button 
          v-for="star in 5" 
          :key="star"
          @click="userRating = star"
          :class="['star-btn', { active: star <= userRating }]"
        >
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      </div>

      <div class="tip-section">
        <p class="tip-label">ให้ทิปคนขับ</p>
        <div class="tip-options">
          <button 
            v-for="tip in tipOptions" 
            :key="tip"
            @click="tipAmount = tip"
            :class="['tip-btn', { active: tipAmount === tip }]"
          >
            {{ tip === 0 ? 'ไม่ให้' : `฿${tip}` }}
          </button>
        </div>
      </div>

      <div class="rating-summary">
        <span>ค่าโดยสาร</span>
        <span>฿{{ finalPrice }}</span>
      </div>
      <div v-if="tipAmount > 0" class="rating-summary">
        <span>ทิป</span>
        <span>฿{{ tipAmount }}</span>
      </div>
      <div class="rating-summary total">
        <span>รวมทั้งหมด</span>
        <span>฿{{ totalAmount }}</span>
      </div>

      <button @click="handleSubmit" :disabled="submitting" class="btn-primary">
        {{ submitting ? 'กำลังบันทึก...' : 'เสร็จสิ้น' }}
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
  z-index: 1000;
}

.rating-modal {
  background: white;
  width: 100%;
  max-width: 400px;
  margin: auto 16px;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.rating-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.rating-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.star-rating {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.star-btn {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.star-btn:hover {
  transform: scale(1.1);
}

.star-btn:active {
  transform: scale(0.95);
}

.star-btn.active {
  color: #F59E0B;
  transform: scale(1.15);
}

.star-btn svg {
  width: 100%;
  height: 100%;
}

.tip-section {
  margin-bottom: 20px;
}

.tip-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.tip-options {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.tip-btn {
  padding: 10px 20px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.tip-btn.active {
  border-color: #000;
  background: white;
}

.rating-summary {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.rating-summary.total {
  border-top: 1px solid #E5E5E5;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.btn-primary {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>
