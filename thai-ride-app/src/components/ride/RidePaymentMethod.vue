<script setup lang="ts">
/**
 * Component: RidePaymentMethod
 * เลือกวิธีชำระเงิน
 */
import { ref } from 'vue'

export type PaymentMethod = 'wallet' | 'cash' | 'card'

const props = defineProps<{
  selectedMethod: PaymentMethod
  walletBalance: number
  requiredAmount: number
}>()

const emit = defineEmits<{
  'update:selectedMethod': [method: PaymentMethod]
  topup: []
}>()

const isExpanded = ref(false)

const methods: Array<{
  id: PaymentMethod
  name: string
  icon: string
  description?: string
}> = [
  { id: 'wallet', name: 'กระเป๋าเงิน', icon: 'wallet', description: 'ชำระจากยอดเงินในแอป' },
  { id: 'cash', name: 'เงินสด', icon: 'cash', description: 'ชำระเงินสดกับคนขับ' }
]

function getIcon(type: string): string {
  if (type === 'wallet') {
    return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
  }
  if (type === 'cash') {
    return 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
  }
  return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
}

function selectMethod(method: PaymentMethod): void {
  emit('update:selectedMethod', method)
  isExpanded.value = false
}

const insufficientBalance = props.selectedMethod === 'wallet' && props.walletBalance < props.requiredAmount
</script>

<template>
  <div class="payment-section">
    <div class="section-label">วิธีชำระเงิน</div>
    
    <!-- Selected Method Display -->
    <button class="selected-method" @click="isExpanded = !isExpanded">
      <div class="method-icon" :class="selectedMethod">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="getIcon(selectedMethod)" />
        </svg>
      </div>
      <div class="method-info">
        <span class="method-name">
          {{ methods.find(m => m.id === selectedMethod)?.name }}
        </span>
        <span v-if="selectedMethod === 'wallet'" class="method-balance" :class="{ insufficient: insufficientBalance }">
          ยอดคงเหลือ ฿{{ walletBalance.toLocaleString() }}
        </span>
      </div>
      <svg 
        class="chevron" 
        :class="{ rotated: isExpanded }"
        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Insufficient Balance Warning -->
    <div v-if="insufficientBalance" class="balance-warning">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>ยอดเงินไม่เพียงพอ</span>
      <button class="topup-link" @click="emit('topup')">เติมเงิน</button>
    </div>

    <!-- Method Options -->
    <Transition name="expand">
      <div v-if="isExpanded" class="method-options">
        <button
          v-for="method in methods"
          :key="method.id"
          class="method-option"
          :class="{ selected: selectedMethod === method.id }"
          @click="selectMethod(method.id)"
        >
          <div class="method-icon" :class="method.id">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="getIcon(method.id)" />
            </svg>
          </div>
          <div class="option-info">
            <span class="option-name">{{ method.name }}</span>
            <span class="option-desc">{{ method.description }}</span>
            <span v-if="method.id === 'wallet'" class="option-balance">
              ฿{{ walletBalance.toLocaleString() }}
            </span>
          </div>
          <div v-if="selectedMethod === method.id" class="check-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.payment-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

/* Selected Method */
.selected-method {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.selected-method:active {
  background: #f5f5f5;
}

.method-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.method-icon.wallet {
  background: #e8f5ef;
  color: #00a86b;
}

.method-icon.cash {
  background: #fff3e0;
  color: #f57c00;
}

.method-icon.card {
  background: #e3f2fd;
  color: #1976d2;
}

.method-info {
  flex: 1;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.method-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.method-balance {
  font-size: 12px;
  color: #00a86b;
}

.method-balance.insufficient {
  color: #e53935;
}

.chevron {
  color: #999;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Balance Warning */
.balance-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #ffebee;
  border-radius: 8px;
  font-size: 13px;
  color: #e53935;
}

.balance-warning svg {
  flex-shrink: 0;
}

.topup-link {
  margin-left: auto;
  background: none;
  border: none;
  color: #00a86b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

/* Method Options */
.method-options {
  margin-top: 8px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.method-option:last-child {
  border-bottom: none;
}

.method-option:active {
  background: #f5f5f5;
}

.method-option.selected {
  background: #f8fff8;
}

.option-info {
  flex: 1;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.option-desc {
  font-size: 12px;
  color: #666;
}

.option-balance {
  font-size: 12px;
  color: #00a86b;
  font-weight: 500;
}

.check-icon {
  color: #00a86b;
}

/* Expand animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
