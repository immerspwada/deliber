<script setup lang="ts">
/**
 * Feature: F125 - Payment Method Card
 * Display payment method with selection
 */

interface Props {
  type: 'cash' | 'card' | 'wallet' | 'promptpay' | 'truemoney'
  label: string
  sublabel?: string
  selected?: boolean
  disabled?: boolean
  balance?: number
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false
})

const emit = defineEmits<{
  select: []
}>()

const handleClick = () => {
  if (!props.disabled) {
    emit('select')
  }
}
</script>

<template>
  <button
    type="button"
    class="payment-card"
    :class="{ selected, disabled }"
    :disabled="disabled"
    @click="handleClick"
  >
    <div class="payment-icon">
      <!-- Cash -->
      <svg v-if="type === 'cash'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>
      </svg>
      <!-- Card -->
      <svg v-else-if="type === 'card'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
      </svg>
      <!-- Wallet -->
      <svg v-else-if="type === 'wallet'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z"/><path d="M16 12h5v4h-5a2 2 0 010-4z"/>
      </svg>
      <!-- PromptPay -->
      <svg v-else-if="type === 'promptpay'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z"/><path d="M14 14h3v3"/>
      </svg>
      <!-- TrueMoney -->
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v12M8 10l4-4 4 4"/>
      </svg>
    </div>
    
    <div class="payment-info">
      <span class="payment-label">{{ label }}</span>
      <span v-if="sublabel" class="payment-sublabel">{{ sublabel }}</span>
      <span v-if="type === 'wallet' && balance !== undefined" class="payment-balance">
        ฿{{ balance.toLocaleString() }}
      </span>
    </div>
    
    <div class="payment-check">
      <div class="check-circle">
        <svg v-if="selected" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      </div>
    </div>
  </button>
</template>

<style scoped>
.payment-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.payment-card:hover:not(.disabled) {
  background: #f6f6f6;
}

.payment-card.selected {
  border-color: #000;
  background: #f9f9f9;
}

.payment-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
  flex-shrink: 0;
}

.payment-card.selected .payment-icon {
  background: #000;
  color: #fff;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-label {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.payment-sublabel {
  font-size: 13px;
  color: #6b6b6b;
}

.payment-balance {
  font-size: 14px;
  font-weight: 600;
  color: #276ef1;
  margin-top: 2px;
}

.payment-check {
  flex-shrink: 0;
}

.check-circle {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.payment-card.selected .check-circle {
  background: #000;
  border-color: #000;
  color: #fff;
}
</style>
