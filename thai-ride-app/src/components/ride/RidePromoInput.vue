<script setup lang="ts">
/**
 * Component: RidePromoInput
 * ช่องใส่โค้ดส่วนลด
 */
import { ref } from 'vue'

defineProps<{
  appliedCode?: string
  discount?: number
  isValidating?: boolean
}>()

const emit = defineEmits<{
  apply: [code: string]
  remove: []
}>()

const promoCode = ref('')
const isExpanded = ref(false)

function handleApply(): void {
  if (promoCode.value.trim()) {
    emit('apply', promoCode.value.trim().toUpperCase())
  }
}

function handleRemove(): void {
  promoCode.value = ''
  emit('remove')
}
</script>

<template>
  <div class="promo-section">
    <!-- Applied Promo -->
    <div v-if="appliedCode" class="applied-promo">
      <div class="promo-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <div class="promo-details">
          <span class="promo-code">{{ appliedCode }}</span>
          <span class="promo-discount">ลด ฿{{ discount?.toLocaleString() }}</span>
        </div>
      </div>
      <button class="remove-btn" aria-label="ลบโค้ด" @click="handleRemove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Promo Input -->
    <div v-else class="promo-input-wrapper">
      <button 
        v-if="!isExpanded" 
        class="promo-toggle"
        @click="isExpanded = true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <span>มีโค้ดส่วนลด?</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <Transition name="slide">
        <div v-if="isExpanded" class="promo-form">
          <div class="input-group">
            <input
              v-model="promoCode"
              type="text"
              placeholder="ใส่โค้ดส่วนลด"
              class="promo-input"
              maxlength="20"
              @keyup.enter="handleApply"
            />
            <button 
              class="apply-btn"
              :disabled="!promoCode.trim() || isValidating"
              @click="handleApply"
            >
              <template v-if="isValidating">
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              </template>
              <template v-else>ใช้</template>
            </button>
          </div>
          <button class="cancel-btn" @click="isExpanded = false">ยกเลิก</button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.promo-section {
  margin-bottom: 16px;
}

/* Applied Promo */
.applied-promo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border: 1px solid #00a86b;
  border-radius: 12px;
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.promo-info svg {
  color: #00a86b;
}

.promo-details {
  display: flex;
  flex-direction: column;
}

.promo-code {
  font-size: 14px;
  font-weight: 600;
  color: #00a86b;
}

.promo-discount {
  font-size: 12px;
  color: #666;
}

.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 168, 107, 0.1);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:active {
  background: rgba(0, 168, 107, 0.2);
  transform: scale(0.95);
}

/* Promo Toggle */
.promo-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.promo-toggle:active {
  background: #e8e8e8;
}

.promo-toggle svg:first-child {
  color: #00a86b;
}

.promo-toggle span {
  flex: 1;
  text-align: left;
}

/* Promo Form */
.promo-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.promo-input {
  flex: 1;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  text-transform: uppercase;
  transition: border-color 0.2s;
}

.promo-input:focus {
  outline: none;
  border-color: #00a86b;
}

.promo-input::placeholder {
  text-transform: none;
  color: #999;
}

.apply-btn {
  padding: 12px 20px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apply-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.apply-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.cancel-btn {
  padding: 8px;
  background: none;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
