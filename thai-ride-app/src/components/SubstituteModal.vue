<script setup lang="ts">
/**
 * Feature: F330 - Substitute Modal
 * Modal for approving item substitution
 */
import { computed } from 'vue'

interface SubstituteRequest {
  originalItem: string
  substituteItem: string
  reason: string
  priceDiff?: number
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  request: SubstituteRequest | null
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'approve': []
  'reject': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && request" class="modal-overlay" @click.self="isOpen = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">ขอเปลี่ยนสินค้า</h2>
            <button type="button" class="close-btn" @click="isOpen = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="item-compare">
              <div class="item-box original">
                <span class="item-label">สินค้าที่สั่ง</span>
                <span class="item-name">{{ request.originalItem }}</span>
              </div>
              
              <div class="arrow-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              
              <div class="item-box substitute">
                <span class="item-label">สินค้าทดแทน</span>
                <span class="item-name">{{ request.substituteItem }}</span>
              </div>
            </div>
            
            <div class="reason-box">
              <span class="reason-label">เหตุผล</span>
              <p class="reason-text">{{ request.reason }}</p>
            </div>
            
            <div v-if="request.priceDiff" class="price-diff">
              <span class="diff-label">ส่วนต่างราคา</span>
              <span class="diff-value" :class="{ positive: request.priceDiff > 0 }">
                {{ request.priceDiff > 0 ? '+' : '' }}฿{{ request.priceDiff }}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button 
              type="button" 
              class="reject-btn"
              :disabled="loading"
              @click="emit('reject')"
            >
              ไม่อนุมัติ
            </button>
            <button 
              type="button" 
              class="approve-btn"
              :disabled="loading"
              @click="emit('approve')"
            >
              <span v-if="loading" class="spinner" />
              <span v-else>อนุมัติ</span>
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
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b6b6b;
}

.modal-body {
  padding: 16px;
}

.item-compare {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.item-box {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.item-box.original {
  background: #ffeae6;
}

.item-box.substitute {
  background: #e8f5e9;
}

.item-label {
  font-size: 11px;
  color: #6b6b6b;
  display: block;
  margin-bottom: 4px;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.arrow-icon {
  color: #6b6b6b;
  flex-shrink: 0;
}

.reason-box {
  background: #f6f6f6;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.reason-label {
  font-size: 12px;
  color: #6b6b6b;
  display: block;
  margin-bottom: 4px;
}

.reason-text {
  font-size: 14px;
  color: #000;
  margin: 0;
}

.price-diff {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.diff-label {
  font-size: 14px;
  color: #6b6b6b;
}

.diff-value {
  font-size: 16px;
  font-weight: 600;
  color: #2e7d32;
}

.diff-value.positive {
  color: #e11900;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.reject-btn {
  flex: 1;
  padding: 14px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.approve-btn {
  flex: 1;
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

.approve-btn:disabled,
.reject-btn:disabled {
  opacity: 0.6;
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
