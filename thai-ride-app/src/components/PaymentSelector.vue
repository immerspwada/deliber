<script setup lang="ts">
import { ref, watch } from 'vue'
import { PAYMENT_METHODS, type PaymentMethod } from '../stores/payment'

const props = defineProps<{
  modelValue: PaymentMethod
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: PaymentMethod): void
}>()

const selected = ref<PaymentMethod>(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  selected.value = newValue
})

const selectMethod = (method: PaymentMethod) => {
  selected.value = method
  emit('update:modelValue', method)
}
</script>

<template>
  <div class="payment-selector">
    <h3 class="selector-title">วิธีการชำระเงิน</h3>
    <div class="payment-methods">
      <button
        v-for="method in PAYMENT_METHODS"
        :key="method.id"
        :class="['payment-method', { active: selected === method.id, disabled: !method.enabled }]"
        :disabled="!method.enabled"
        @click="selectMethod(method.id)"
      >
        <div class="method-icon">
          <svg v-if="method.icon === 'qr'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
          </svg>
          <svg v-else-if="method.icon === 'phone'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <svg v-else-if="method.icon === 'card'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <div class="method-info">
          <span class="method-name">{{ method.name }}</span>
          <span class="method-desc">{{ method.description }}</span>
        </div>
        <div v-if="selected === method.id" class="method-check">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-selector {
  margin-bottom: 20px;
}

.selector-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.payment-method:hover:not(.disabled) {
  border-color: var(--color-text-muted);
}

.payment-method.active {
  border-color: var(--color-primary);
  background-color: var(--color-secondary);
}

.payment-method.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.method-icon svg {
  width: 24px;
  height: 24px;
}

.method-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.method-name {
  font-size: 14px;
  font-weight: 500;
}

.method-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.method-check {
  width: 24px;
  height: 24px;
  background-color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.method-check svg {
  width: 14px;
  height: 14px;
  color: white;
}
</style>
