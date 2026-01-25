<script setup lang="ts">
/**
 * PromoCodeInput - Reusable Promo Code Input Component
 * Feature: F10 - Promo Codes
 *
 * Usage in booking flows (Ride, Delivery, Shopping, etc.)
 */
import { ref, computed, watch } from "vue";
import { usePromoSystem } from "../../composables/usePromoSystem";

const props = defineProps<{
  serviceType:
    | "ride"
    | "delivery"
    | "shopping"
    | "queue"
    | "moving"
    | "laundry";
  orderAmount: number;
  modelValue?: {
    code: string;
    promoId: string;
    discountAmount: number;
  } | null;
}>();

const emit = defineEmits<{
  (
    e: "update:modelValue",
    value: { code: string; promoId: string; discountAmount: number } | null
  ): void;
  (e: "discount-applied", amount: number): void;
}>();

const promoSystem = usePromoSystem();

const promoInput = ref("");
const isValidating = ref(false);
const validationError = ref("");
const appliedPromo = ref<{
  code: string;
  promoId: string;
  discountAmount: number;
  discountType: string;
  discountValue: number;
} | null>(null);

const hasAppliedPromo = computed(() => appliedPromo.value !== null);

async function validateAndApply() {
  if (!promoInput.value.trim()) return;

  isValidating.value = true;
  validationError.value = "";

  try {
    const result = await promoSystem.validatePromoCode(
      promoInput.value.trim(),
      props.orderAmount,
      props.serviceType
    );

    if (result.is_valid) {
      appliedPromo.value = {
        code: promoInput.value.trim().toUpperCase(),
        promoId: result.promo_id!,
        discountAmount: result.discount_amount,
        discountType: result.discount_type!,
        discountValue: result.discount_value!,
      };

      emit("update:modelValue", {
        code: appliedPromo.value.code,
        promoId: appliedPromo.value.promoId,
        discountAmount: appliedPromo.value.discountAmount,
      });
      emit("discount-applied", result.discount_amount);

      promoInput.value = "";
    } else {
      validationError.value = result.message || "โค้ดไม่ถูกต้อง";
    }
  } catch (err) {
    validationError.value = "เกิดข้อผิดพลาด กรุณาลองใหม่";
    console.error("[PromoCodeInput] validate error:", err);
  } finally {
    isValidating.value = false;
  }
}

function removePromo() {
  appliedPromo.value = null;
  emit("update:modelValue", null);
  emit("discount-applied", 0);
}

// Re-validate when order amount changes
watch(
  () => props.orderAmount,
  async (newAmount) => {
    if (appliedPromo.value && newAmount > 0) {
      const result = await promoSystem.validatePromoCode(
        appliedPromo.value.code,
        newAmount,
        props.serviceType
      );

      if (
        result.is_valid &&
        result.discount_amount !== appliedPromo.value.discountAmount
      ) {
        appliedPromo.value.discountAmount = result.discount_amount;
        emit("update:modelValue", {
          code: appliedPromo.value.code,
          promoId: appliedPromo.value.promoId,
          discountAmount: result.discount_amount,
        });
        emit("discount-applied", result.discount_amount);
      }
    }
  }
);

// Sync with modelValue
watch(
  () => props.modelValue,
  (val) => {
    if (!val && appliedPromo.value) {
      appliedPromo.value = null;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="promo-input-container">
    <!-- Applied Promo Display -->
    <div v-if="hasAppliedPromo" class="applied-promo">
      <div class="promo-info">
        <div class="promo-badge">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <code>{{ appliedPromo!.code }}</code>
        </div>
        <span class="discount-amount">-฿{{ appliedPromo!.discountAmount.toLocaleString() }}</span>
      </div>
      <button class="remove-btn" type="button" @click="removePromo">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Promo Input -->
    <div v-else class="promo-input-wrapper">
      <div class="input-row">
        <div class="input-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </div>
        <input
          v-model="promoInput"
          type="text"
          placeholder="ใส่โค้ดส่วนลด"
          class="promo-input"
          :disabled="isValidating"
          @keyup.enter="validateAndApply"
        />
        <button
          class="apply-btn"
          :disabled="!promoInput.trim() || isValidating"
          type="button"
          @click="validateAndApply"
        >
          <span v-if="isValidating" class="spinner"></span>
          <span v-else>ใช้</span>
        </button>
      </div>
      <p v-if="validationError" class="error-text">{{ validationError }}</p>
    </div>
  </div>
</template>

<style scoped>
.promo-input-container {
  margin: 12px 0;
}

.applied-promo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #e8f5ef;
  border: 1px solid #00a86b;
  border-radius: 12px;
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.promo-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #00a86b;
}

.promo-badge code {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}

.discount-amount {
  font-size: 15px;
  font-weight: 600;
  color: #00a86b;
}

.remove-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #e53935;
}

.promo-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  transition: border-color 0.2s;
}

.input-row:focus-within {
  border-color: #00a86b;
}

.input-icon {
  color: #999;
}

.promo-input {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1a1a1a;
  outline: none;
}

.promo-input::placeholder {
  color: #999;
}

.apply-btn {
  padding: 10px 16px;
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

.apply-btn:hover:not(:disabled) {
  background: #008f5b;
}

.apply-btn:disabled {
  background: #e8e8e8;
  color: #999;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-text {
  font-size: 13px;
  color: #e53935;
  margin: 0;
  padding-left: 4px;
}
</style>
