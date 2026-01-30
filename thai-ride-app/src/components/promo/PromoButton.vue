<script setup lang="ts">
/**
 * PromoButton - Simple Promo Button Component
 * Shows applied promo or button to select promo
 */
import { computed } from 'vue';

const props = defineProps<{
  appliedPromo?: {
    code: string;
    discountAmount: number;
  } | null;
}>();

const emit = defineEmits<{
  (e: 'open-promo-modal'): void;
  (e: 'remove-promo'): void;
}>();

const hasPromo = computed(() => props.appliedPromo !== null);

function openModal() {
  emit('open-promo-modal');
}

function removePromo() {
  emit('remove-promo');
}
</script>

<template>
  <div class="promo-button-container">
    <!-- Applied Promo Display -->
    <div v-if="hasPromo" class="applied-promo-display" @click="openModal">
      <div class="promo-content">
        <div class="promo-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div class="promo-text">
          <span class="promo-label">ใช้โค้ด</span>
          <code class="promo-code">{{ appliedPromo!.code }}</code>
        </div>
        <div class="promo-discount">
          -฿{{ appliedPromo!.discountAmount.toLocaleString() }}
        </div>
      </div>
      <button
        class="remove-promo-btn"
        type="button"
        aria-label="ลบโค้ด"
        @click.stop="removePromo"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Select Promo Button -->
    <button
      v-else
      class="select-promo-btn"
      type="button"
      @click="openModal"
    >
      <div class="btn-icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
      <span class="btn-text">ใช้โค้ดส่วนลด</span>
      <svg
        class="btn-arrow"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.promo-button-container {
  margin: 12px 0;
}

/* Applied Promo Display */
.applied-promo-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border: 2px solid #00a86b;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.applied-promo-display:hover {
  border-color: #008f5b;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.15);
}

.applied-promo-display:active {
  transform: scale(0.98);
}

.promo-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.promo-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00a86b;
  border-radius: 10px;
  color: #fff;
}

.promo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.promo-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.promo-code {
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #00a86b;
  letter-spacing: 1px;
}

.promo-discount {
  font-size: 16px;
  font-weight: 700;
  color: #00a86b;
  margin-left: auto;
}

.remove-promo-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-promo-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #e53935;
}

/* Select Promo Button */
.select-promo-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 2px dashed #d0d0d0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-promo-btn:hover {
  border-color: #00a86b;
  background: #f8fffe;
}

.select-promo-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 10px;
  color: #666;
  transition: all 0.2s;
}

.select-promo-btn:hover .btn-icon {
  background: #e8f5ef;
  color: #00a86b;
}

.btn-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  text-align: left;
}

.btn-arrow {
  color: #999;
  transition: transform 0.2s;
}

.select-promo-btn:hover .btn-arrow {
  transform: translateX(2px);
  color: #00a86b;
}

/* Touch-friendly */
@media (hover: none) {
  .applied-promo-display,
  .select-promo-btn {
    min-height: 56px;
  }
}
</style>
