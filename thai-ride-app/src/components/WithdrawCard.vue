<script setup lang="ts">
/**
 * Feature: F182 - Withdraw Card
 * Provider earnings withdrawal
 */

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
}

interface Props {
  balance: number
  minWithdraw?: number
  bankAccounts: BankAccount[]
  selectedAccountId?: string
}

withDefaults(defineProps<Props>(), {
  minWithdraw: 100
})

const emit = defineEmits<{
  selectAccount: [id: string]
  addAccount: []
  withdraw: [amount: number]
}>()

const withdrawAmount = defineModel<number>('amount', { default: 0 })
</script>

<template>
  <div class="withdraw-card">
    <div class="balance-section">
      <span class="balance-label">ยอดเงินที่ถอนได้</span>
      <span class="balance-amount">฿{{ balance.toLocaleString() }}</span>
    </div>
    
    <div class="amount-section">
      <label class="section-label">จำนวนที่ต้องการถอน</label>
      <div class="amount-input">
        <span class="currency">฿</span>
        <input
          v-model.number="withdrawAmount"
          type="number"
          :max="balance"
          :min="minWithdraw"
          placeholder="0"
        />
        <button type="button" class="max-btn" @click="withdrawAmount = balance">ทั้งหมด</button>
      </div>
      <span class="amount-hint">ขั้นต่ำ ฿{{ minWithdraw }}</span>
    </div>
    
    <div class="account-section">
      <div class="section-header">
        <label class="section-label">บัญชีปลายทาง</label>
        <button type="button" class="add-btn" @click="emit('addAccount')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มบัญชี
        </button>
      </div>
</template>

      <div v-if="bankAccounts.length === 0" class="no-accounts">
        <p>ยังไม่มีบัญชีธนาคาร</p>
      </div>
      <div v-else class="account-list">
        <button
          v-for="account in bankAccounts"
          :key="account.id"
          type="button"
          class="account-item"
          :class="{ selected: selectedAccountId === account.id }"
          @click="emit('selectAccount', account.id)"
        >
          <div class="account-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M1 10h22"/>
            </svg>
          </div>
          <div class="account-info">
            <span class="bank-name">{{ account.bankName }}</span>
            <span class="account-number">{{ account.accountNumber }}</span>
          </div>
          <div v-if="selectedAccountId === account.id" class="check-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
    
    <button 
      type="button" 
      class="withdraw-btn"
      :disabled="!withdrawAmount || withdrawAmount < minWithdraw || withdrawAmount > balance || !selectedAccountId"
      @click="emit('withdraw', withdrawAmount)"
    >
      ถอนเงิน ฿{{ withdrawAmount.toLocaleString() }}
    </button>
  </div>
</template>

<style scoped>
.withdraw-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.balance-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #000;
  border-radius: 12px;
  margin-bottom: 20px;
}

.balance-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.balance-amount {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.section-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.amount-section {
  margin-bottom: 20px;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #f6f6f6;
  border-radius: 10px;
  border: 2px solid transparent;
}

.amount-input:focus-within {
  border-color: #000;
}

.currency {
  font-size: 18px;
  font-weight: 600;
  color: #6b6b6b;
}

.amount-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 18px;
  font-weight: 600;
  color: #000;
  outline: none;
}

.max-btn {
  padding: 6px 12px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.amount-hint {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 6px;
}

.account-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #276ef1;
  background: none;
  border: none;
  cursor: pointer;
}

.no-accounts {
  padding: 24px;
  text-align: center;
  color: #6b6b6b;
  background: #f6f6f6;
  border-radius: 10px;
}

.no-accounts p {
  margin: 0;
  font-size: 13px;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.account-item:hover {
  border-color: #000;
}

.account-item.selected {
  border-color: #000;
  background: #fff;
}

.account-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  color: #6b6b6b;
}

.account-item.selected .account-icon {
  background: #000;
  color: #fff;
}

.account-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-name {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.account-number {
  font-size: 12px;
  color: #6b6b6b;
}

.check-icon {
  color: #000;
}

.withdraw-btn {
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

.withdraw-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.withdraw-btn:not(:disabled):hover {
  background: #333;
}
</style>