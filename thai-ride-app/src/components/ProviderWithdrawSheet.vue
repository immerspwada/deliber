<script setup lang="ts">
/**
 * Feature: F353 - Provider Withdraw Sheet
 * Withdrawal request sheet for providers
 */
import { ref, computed } from 'vue'

interface BankAccount { bankCode: string; accountNumber: string; accountName: string }

const props = defineProps<{
  visible: boolean
  balance: number
  bankAccount?: BankAccount
  minWithdraw?: number
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'withdraw', amount: number): void
  (e: 'addBank'): void
}>()

const amount = ref(0)
const minAmount = computed(() => props.minWithdraw || 100)

const quickAmounts = [500, 1000, 2000, 5000]
const setAmount = (val: number) => { amount.value = Math.min(val, props.balance) }
const setMax = () => { amount.value = props.balance }

const canWithdraw = computed(() => 
  amount.value >= minAmount.value && 
  amount.value <= props.balance && 
  props.bankAccount
)

const bankNames: Record<string, string> = {
  BBL: 'กรุงเทพ', KBANK: 'กสิกรไทย', KTB: 'กรุงไทย', SCB: 'ไทยพาณิชย์',
  BAY: 'กรุงศรี', TMB: 'ทหารไทยธนชาต', GSB: 'ออมสิน', BAAC: 'ธ.ก.ส.'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="sheet-overlay" @click.self="emit('close')">
        <div class="sheet-content">
          <div class="sheet-header">
            <h3 class="sheet-title">ถอนเงิน</h3>
            <button type="button" class="close-btn" @click="emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="balance-display">
            <span class="balance-label">ยอดเงินคงเหลือ</span>
            <span class="balance-amount">฿{{ balance.toLocaleString() }}</span>
          </div>

          <div class="amount-input-section">
            <label class="input-label">จำนวนเงินที่ต้องการถอน</label>
            <div class="amount-input-wrapper">
              <span class="currency">฿</span>
              <input v-model.number="amount" type="number" class="amount-input" :max="balance" :min="minAmount" placeholder="0" />
              <button type="button" class="max-btn" @click="setMax">ทั้งหมด</button>
            </div>
            <span class="min-hint">ขั้นต่ำ ฿{{ minAmount.toLocaleString() }}</span>
          </div>

          <div class="quick-amounts">
            <button v-for="qa in quickAmounts" :key="qa" type="button" class="quick-btn" :class="{ active: amount === qa }" :disabled="qa > balance" @click="setAmount(qa)">
              ฿{{ qa.toLocaleString() }}
            </button>
          </div>

          <div v-if="bankAccount" class="bank-info">
            <div class="bank-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
              </svg>
            </div>
            <div class="bank-details">
              <span class="bank-name">{{ bankNames[bankAccount.bankCode] || bankAccount.bankCode }}</span>
              <span class="account-number">{{ bankAccount.accountNumber }}</span>
            </div>
            <button type="button" class="change-btn" @click="emit('addBank')">เปลี่ยน</button>
          </div>
          <button v-else type="button" class="add-bank-btn" @click="emit('addBank')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
            </svg>
            เพิ่มบัญชีธนาคาร
          </button>

          <button type="button" class="withdraw-btn" :disabled="!canWithdraw || loading" @click="emit('withdraw', amount)">
            {{ loading ? 'กำลังดำเนินการ...' : `ถอนเงิน ฿${amount.toLocaleString()}` }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 1000; }
.sheet-content { width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 20px; max-height: 90vh; overflow-y: auto; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.sheet-title { font-size: 18px; font-weight: 600; color: #000; margin: 0; }
.close-btn { background: none; border: none; padding: 4px; cursor: pointer; color: #6b6b6b; }
.balance-display { text-align: center; padding: 20px; background: #f6f6f6; border-radius: 12px; margin-bottom: 20px; }
.balance-label { display: block; font-size: 13px; color: #6b6b6b; margin-bottom: 4px; }
.balance-amount { font-size: 32px; font-weight: 700; color: #000; }
.amount-input-section { margin-bottom: 16px; }
.input-label { display: block; font-size: 13px; font-weight: 500; color: #000; margin-bottom: 8px; }
.amount-input-wrapper { display: flex; align-items: center; border: 2px solid #e5e5e5; border-radius: 12px; padding: 12px 16px; }
.amount-input-wrapper:focus-within { border-color: #000; }
.currency { font-size: 20px; font-weight: 600; color: #000; margin-right: 8px; }
.amount-input { flex: 1; border: none; font-size: 24px; font-weight: 600; outline: none; }
.max-btn { background: #f6f6f6; border: none; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #000; cursor: pointer; }
.min-hint { font-size: 12px; color: #6b6b6b; margin-top: 6px; display: block; }
.quick-amounts { display: flex; gap: 8px; margin-bottom: 20px; }
.quick-btn { flex: 1; padding: 12px; background: #f6f6f6; border: 2px solid transparent; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.quick-btn:hover:not(:disabled) { background: #e5e5e5; }
.quick-btn.active { border-color: #000; }
.quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bank-info { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f6f6f6; border-radius: 12px; margin-bottom: 20px; }
.bank-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 8px; }
.bank-details { flex: 1; }
.bank-name { display: block; font-size: 14px; font-weight: 500; color: #000; }
.account-number { font-size: 13px; color: #6b6b6b; }
.change-btn { background: none; border: none; font-size: 13px; color: #276EF1; cursor: pointer; }
.add-bank-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px; background: #f6f6f6; border: 2px dashed #e5e5e5; border-radius: 12px; font-size: 14px; color: #6b6b6b; cursor: pointer; margin-bottom: 20px; }
.withdraw-btn { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }
.withdraw-btn:disabled { background: #ccc; }
.sheet-enter-active, .sheet-leave-active { transition: all 0.3s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-content, .sheet-leave-to .sheet-content { transform: translateY(100%); }
</style>
