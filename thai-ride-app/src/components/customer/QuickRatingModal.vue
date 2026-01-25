<script setup lang="ts">
/**
 * QuickRatingModal - Modal สำหรับให้คะแนนอย่างรวดเร็ว
 * MUNEEF Style: สีเขียว #00A86B
 * แสดงเมื่อมี unrated orders และเข้าหน้า History
 */
import { ref, computed } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface UnratedOrder {
  id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  typeName: string
  from: string
  to: string
  date: string
  fare: number
  driverName?: string
}

interface Props {
  show: boolean
  orders: UnratedOrder[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  rate: [orderId: string, orderType: string, rating: number, comment: string]
  skip: [orderId: string, orderType: string]
}>()

const { vibrate } = useHapticFeedback()

// Current order index
const currentIndex = ref(0)
const selectedRating = ref(0)
const hoverRating = ref(0)
const comment = ref('')
const isSubmitting = ref(false)

const currentOrder = computed(() => props.orders[currentIndex.value])
const hasMore = computed(() => currentIndex.value < props.orders.length - 1)
const progress = computed(() => ((currentIndex.value + 1) / props.orders.length) * 100)

const ratingLabels = ['', 'แย่มาก', 'ไม่ดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม']

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    ride: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.5 3.5 0 002 12v4c0 .6.4 1 1 1h2',
    delivery: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'
  }
  return icons[type] || icons.ride
}

const selectRating = (rating: number) => {
  vibrate('light')
  selectedRating.value = rating
}

const submitRating = async () => {
  if (!currentOrder.value || selectedRating.value === 0) return
  
  isSubmitting.value = true
  vibrate('medium')
  
  emit('rate', currentOrder.value.id, currentOrder.value.type, selectedRating.value, comment.value)
  
  // Reset and move to next
  await new Promise(resolve => setTimeout(resolve, 500))
  
  if (hasMore.value) {
    currentIndex.value++
    selectedRating.value = 0
    comment.value = ''
  } else {
    emit('close')
  }
  
  isSubmitting.value = false
}

const skipRating = () => {
  if (!currentOrder.value) return
  
  vibrate('light')
  emit('skip', currentOrder.value.id, currentOrder.value.type)
  
  if (hasMore.value) {
    currentIndex.value++
    selectedRating.value = 0
    comment.value = ''
  } else {
    emit('close')
  }
}

const closeModal = () => {
  vibrate('light')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && currentOrder" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <!-- Progress Bar -->
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
          </div>
          
          <!-- Header -->
          <div class="modal-header">
            <div class="order-count">{{ currentIndex + 1 }} / {{ orders.length }}</div>
            <button class="close-btn" @click="closeModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- Order Info -->
          <div class="order-info">
            <div class="order-icon" :class="currentOrder.type">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="getTypeIcon(currentOrder.type)"/>
              </svg>
            </div>
            <div class="order-details">
              <span class="order-type">{{ currentOrder.typeName }}</span>
              <span class="order-date">{{ currentOrder.date }}</span>
            </div>
          </div>
          
          <!-- Route -->
          <div class="route-info">
            <div class="route-point">
              <div class="point-dot pickup"></div>
              <span>{{ currentOrder.from }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="point-dot destination"></div>
              <span>{{ currentOrder.to }}</span>
            </div>
          </div>
          
          <!-- Driver Info -->
          <div v-if="currentOrder.driverName" class="driver-info">
            <div class="driver-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 10-16 0"/>
              </svg>
            </div>
            <span>{{ currentOrder.driverName }}</span>
          </div>
          
          <!-- Rating Title -->
          <h3 class="rating-title">ให้คะแนนบริการ</h3>
          
          <!-- Star Rating -->
          <div class="star-rating">
            <button
              v-for="star in 5"
              :key="star"
              class="star-btn"
              :class="{ 
                active: star <= selectedRating,
                hover: star <= hoverRating && hoverRating > selectedRating
              }"
              @click="selectRating(star)"
              @mouseenter="hoverRating = star"
              @mouseleave="hoverRating = 0"
            >
              <svg viewBox="0 0 24 24" :fill="star <= selectedRating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
          
          <!-- Rating Label -->
          <div class="rating-label" :class="{ visible: selectedRating > 0 }">
            {{ ratingLabels[selectedRating] }}
          </div>
          
          <!-- Comment Input -->
          <div v-if="selectedRating > 0" class="comment-section">
            <textarea
              v-model="comment"
              placeholder="แสดงความคิดเห็น (ไม่บังคับ)"
              rows="2"
            ></textarea>
          </div>
          
          <!-- Actions -->
          <div class="modal-actions">
            <button class="skip-btn" :disabled="isSubmitting" @click="skipRating">
              ข้ามไปก่อน
            </button>
            <button 
              class="submit-btn" 
              :disabled="selectedRating === 0 || isSubmitting"
              @click="submitRating"
            >
              <span v-if="isSubmitting" class="spinner"></span>
              <span v-else>{{ hasMore ? 'ถัดไป' : 'เสร็จสิ้น' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-container {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0 24px 24px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Progress Bar */
.progress-bar {
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 16px 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.order-count {
  font-size: 14px;
  color: #666666;
  font-weight: 500;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

/* Order Info */
.order-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.order-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 12px;
}

.order-icon svg {
  width: 24px;
  height: 24px;
  color: #00A86B;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-type {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.order-date {
  font-size: 13px;
  color: #666666;
}

/* Route Info */
.route-info {
  background: #F9F9F9;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.pickup {
  background: #00A86B;
}

.point-dot.destination {
  background: #E53935;
}

.route-point span {
  font-size: 14px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #E8E8E8;
  margin-left: 4px;
  margin: 4px 0 4px 4px;
}

/* Driver Info */
.driver-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.driver-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0F0F0;
  border-radius: 50%;
}

.driver-avatar svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.driver-info span {
  font-size: 14px;
  color: #666666;
}

/* Rating Title */
.rating-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
  margin-bottom: 16px;
}

/* Star Rating */
.star-rating {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.star-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.star-btn:active {
  transform: scale(0.9);
}

.star-btn svg {
  width: 36px;
  height: 36px;
  color: #E8E8E8;
  transition: all 0.2s ease;
}

.star-btn.active svg,
.star-btn.hover svg {
  color: #FFB800;
}

/* Rating Label */
.rating-label {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #00A86B;
  height: 20px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.rating-label.visible {
  opacity: 1;
}

/* Comment Section */
.comment-section {
  margin-top: 16px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.comment-section textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s ease;
}

.comment-section textarea:focus {
  outline: none;
  border-color: #00A86B;
}

.comment-section textarea::placeholder {
  color: #999999;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.skip-btn {
  flex: 1;
  padding: 14px;
  background: #F5F5F5;
  color: #666666;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skip-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: #E8E8E8;
}

.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn {
  flex: 2;
  padding: 14px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: #008F5B;
}

.submit-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: translateY(100%);
}
</style>
