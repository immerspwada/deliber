<!--
  TipModal Component - Customer gives tip to provider
  
  Features:
  - Preset amounts (20, 50, 100, 200)
  - Custom amount input
  - Optional thank you message
  - Wallet balance check
  - 24-hour window countdown
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTip } from '../../composables/useTip'
import { TIP_PRESETS, MAX_TIP_AMOUNT } from '../../types/tip'

interface Props {
  rideId: string
  providerName?: string
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'success', amount: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {
  loading,
  error,
  canTipStatus,
  canTip,
  walletBalance,
  checkCanTip,
  giveTip,
  formatTipAmount,
  getTimeRemaining
} = useTip()

// Local state
const selectedAmount = ref<number>(50)
const customAmount = ref<string>('')
const isCustom = ref(false)
const message = ref('')
const showSuccess = ref(false)

// Computed
const finalAmount = computed(() => {
  if (isCustom.value) {
    const parsed = parseFloat(customAmount.value)
    return isNaN(parsed) ? 0 : parsed
  }
  return selectedAmount.value
})

const canSubmit = computed(() => {
  return canTip.value && 
         finalAmount.value > 0 && 
         finalAmount.value <= MAX_TIP_AMOUNT &&
         finalAmount.value <= walletBalance.value &&
         !loading.value
})

const insufficientBalance = computed(() => {
  return finalAmount.value > walletBalance.value
})

// Methods
function selectPreset(amount: number): void {
  selectedAmount.value = amount
  isCustom.value = false
  customAmount.value = ''
}

function enableCustom(): void {
  isCustom.value = true
  selectedAmount.value = 0
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) return

  const result = await giveTip({
    ride_id: props.rideId,
    amount: finalAmount.value,
    message: message.value || undefined
  })

  if (result.success) {
    showSuccess.value = true
    setTimeout(() => {
      emit('success', finalAmount.value)
      emit('close')
    }, 2000)
  }
}

// Lifecycle
onMounted(async () => {
  await checkCanTip(props.rideId)
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="modal-overlay"
      @click.self="emit('close')"
    >
      <div class="modal-content">
        <!-- Success State -->
        <div v-if="showSuccess" class="success-state">
          <div class="success-icon">🎉</div>
          <h2>ขอบคุณสำหรับทิป!</h2>
          <p class="success-amount">{{ formatTipAmount(finalAmount) }}</p>
          <p class="success-message">ทิปของคุณถูกส่งให้คนขับแล้ว</p>
        </div>

        <!-- Main Content -->
        <template v-else>
          <!-- Header -->
          <div class="modal-header">
            <h2>ให้ทิปคนขับ</h2>
            <button class="btn-close" @click="emit('close')" type="button" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Loading -->
          <div v-if="loading && !canTipStatus" class="loading-state">
            <div class="spinner"></div>
            <p>กำลังโหลด...</p>
          </div>

          <!-- Cannot Tip -->
          <div v-else-if="!canTip" class="cannot-tip">
            <div class="cannot-icon">⏰</div>
            <p v-if="canTipStatus?.reason === 'ALREADY_TIPPED'">
              คุณได้ให้ทิป {{ formatTipAmount(canTipStatus.tip_amount || 0) }} ไปแล้ว
            </p>
            <p v-else-if="canTipStatus?.reason === 'TIP_WINDOW_EXPIRED'">
              หมดเวลาให้ทิป (ภายใน 24 ชม. หลังจบงาน)
            </p>
            <p v-else-if="canTipStatus?.reason === 'RIDE_NOT_COMPLETED'">
              การเดินทางยังไม่เสร็จสิ้น
            </p>
            <p v-else>
              ไม่สามารถให้ทิปได้ในขณะนี้
            </p>
            <button class="btn-secondary" @click="emit('close')" type="button">
              ปิด
            </button>
          </div>

          <!-- Tip Form -->
          <template v-else>
            <!-- Provider Info -->
            <div class="provider-info">
              <div class="provider-avatar">🚗</div>
              <div class="provider-name">{{ providerName || 'คนขับ' }}</div>
            </div>

            <!-- Time Remaining -->
            <div v-if="canTipStatus?.expires_at" class="time-remaining">
              <span class="time-icon">⏱️</span>
              <span>{{ getTimeRemaining(canTipStatus.expires_at) }}</span>
            </div>

            <!-- Preset Amounts -->
            <div class="preset-amounts">
              <button
                v-for="amount in TIP_PRESETS"
                :key="amount"
                class="preset-btn"
                :class="{ active: selectedAmount === amount && !isCustom }"
                @click="selectPreset(amount)"
                type="button"
              >
                ฿{{ amount }}
              </button>
              <button
                class="preset-btn"
                :class="{ active: isCustom }"
                @click="enableCustom"
                type="button"
              >
                อื่นๆ
              </button>
            </div>

            <!-- Custom Amount -->
            <div v-if="isCustom" class="custom-amount">
              <label for="custom-tip">จำนวนเงิน (บาท)</label>
              <div class="input-wrapper">
                <span class="currency">฿</span>
                <input
                  id="custom-tip"
                  v-model="customAmount"
                  type="number"
                  min="1"
                  :max="MAX_TIP_AMOUNT"
                  placeholder="0"
                  inputmode="numeric"
                />
              </div>
            </div>

            <!-- Message -->
            <div class="message-input">
              <label for="tip-message">ข้อความขอบคุณ (ไม่บังคับ)</label>
              <textarea
                id="tip-message"
                v-model="message"
                placeholder="ขอบคุณสำหรับบริการดีๆ..."
                rows="2"
                maxlength="200"
              ></textarea>
            </div>

            <!-- Wallet Balance -->
            <div class="wallet-info">
              <span>ยอดเงินในกระเป๋า:</span>
              <span class="balance" :class="{ insufficient: insufficientBalance }">
                {{ formatTipAmount(walletBalance) }}
              </span>
            </div>

            <!-- Error -->
            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <!-- Submit -->
            <button
              class="btn-submit"
              :disabled="!canSubmit"
              @click="handleSubmit"
              type="button"
            >
              <span v-if="loading" class="spinner-small"></span>
              <template v-else>
                ให้ทิป {{ formatTipAmount(finalAmount) }}
              </template>
            </button>

            <!-- Insufficient Balance Warning -->
            <p v-if="insufficientBalance" class="warning-text">
              ยอดเงินไม่เพียงพอ กรุณาเติมเงิน
            </p>
          </template>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  animation: slideUp 0.3s ease-out;
  max-height: 90vh;
  overflow-y: auto;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.btn-close {
  width: 36px;
  height: 36px;
  padding: 8px;
  background: #F3F4F6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close svg {
  width: 20px;
  height: 20px;
  color: #6B7280;
}

/* Provider Info */
.provider-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.provider-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.provider-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

/* Time Remaining */
.time-remaining {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 20px;
}

/* Preset Amounts */
.preset-amounts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.preset-btn {
  padding: 12px 8px;
  background: #F3F4F6;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
}

.preset-btn:active {
  transform: scale(0.95);
}

/* Custom Amount */
.custom-amount {
  margin-bottom: 16px;
}

.custom-amount label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.currency {
  padding: 12px 16px;
  font-size: 18px;
  font-weight: 600;
  color: #6B7280;
  background: #F3F4F6;
}

.input-wrapper input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  font-size: 18px;
  font-weight: 600;
  background: transparent;
}

.input-wrapper input:focus {
  outline: none;
}

/* Message Input */
.message-input {
  margin-bottom: 16px;
}

.message-input label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.message-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.message-input textarea:focus {
  outline: none;
  border-color: #00A86B;
}

/* Wallet Info */
.wallet-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #F9FAFB;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.wallet-info .balance {
  font-weight: 700;
  color: #00A86B;
}

.wallet-info .balance.insufficient {
  color: #DC2626;
}

/* Error */
.error-message {
  padding: 12px;
  background: #FEF2F2;
  color: #DC2626;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
}

/* Submit Button */
.btn-submit {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 52px;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-submit:active:not(:disabled) {
  transform: scale(0.98);
}

.warning-text {
  text-align: center;
  font-size: 13px;
  color: #DC2626;
  margin-top: 8px;
}

/* Loading & States */
.loading-state,
.cannot-tip,
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cannot-icon,
.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-state h2 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.success-amount {
  font-size: 32px;
  font-weight: 700;
  color: #00A86B;
  margin: 0 0 8px 0;
}

.success-message {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.btn-secondary {
  padding: 12px 24px;
  background: #F3F4F6;
  color: #374151;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
}
</style>
