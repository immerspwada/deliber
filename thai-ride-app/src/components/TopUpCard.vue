<script setup lang="ts">
/**
 * Feature: F181 - Top Up Card
 * Wallet top up amount selection
 */

interface Props {
  amounts?: number[]
  selectedAmount?: number
  customAmount?: number
  minAmount?: number
  maxAmount?: number
}

withDefaults(defineProps<Props>(), {
  amounts: () => [100, 200, 500, 1000, 2000, 5000],
  minAmount: 20,
  maxAmount: 50000
})

const emit = defineEmits<{
  select: [amount: number]
  custom: [amount: number]
  topup: []
}>()
</script>

<template>
  <div class="topup-card">
    <h3 class="topup-title">เติมเงิน</h3>
    
    <div class="amount-grid">
      <button
        v-for="amount in amounts"
        :key="amount"
        type="button"
        class="amount-btn"
        :class="{ selected: selectedAmount === amount }"
        @click="emit('select', amount)"
      >
        ฿{{ amount.toLocaleString() }}
      </button>
    </div>
    
    <div class="custom-amount">
      <label class="custom-label">หรือระบุจำนวนเอง</label>
      <div class="custom-input">
        <span class="currency">฿</span>
        <input
          type="number"
          :value="customAmount"
          :min="minAmount"
          :max="maxAmount"
          placeholder="0"
          @input="emit('custom', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <span class="amount-hint">ขั้นต่ำ ฿{{ minAmount }} - สูงสุด ฿{{ maxAmount.toLocaleString() }}</span>
    </div>
    
    <button 
      type="button" 
      class="topup-btn"
      :disabled="!selectedAmount && !customAmount"
      @click="emit('topup')"
    >
      เติมเงิน ฿{{ (selectedAmount || customAmount || 0).toLocaleString() }}
    </button>
  </div>
</template>

<style scoped>
.topup-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.topup-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0 0 16px;
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.amount-btn {
  padding: 14px 8px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;
}

.amount-btn:hover {
  border-color: #000;
}

.amount-btn.selected {
  background: #000;
  color: #fff;
  border-color: #000;
}

.custom-amount {
  margin-bottom: 20px;
}

.custom-label {
  display: block;
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.custom-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #f6f6f6;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.custom-input:focus-within {
  border-color: #000;
}

.currency {
  font-size: 18px;
  font-weight: 600;
  color: #6b6b6b;
}

.custom-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 18px;
  font-weight: 600;
  color: #000;
  outline: none;
}

.custom-input input::placeholder {
  color: #ccc;
}

.amount-hint {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 6px;
}

.topup-btn {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.topup-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.topup-btn:not(:disabled):hover {
  background: #333;
}
</style>