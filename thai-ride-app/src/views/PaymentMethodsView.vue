<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePaymentMethods } from '../composables/usePaymentMethods'

const router = useRouter()
const { 
  paymentMethods, 
  loading,
  error,
  fetchPaymentMethods, 
  addPaymentMethod, 
  setDefaultMethod, 
  removePaymentMethod,
  validatePhone,
  validateCardNumber
} = usePaymentMethods()

const showAddModal = ref(false)
const newMethodType = ref<'promptpay' | 'card'>('promptpay')
const newPhone = ref('')
const newCardNumber = ref('')
const newCardExpiry = ref('')
const newCardCvv = ref('')
const isSubmitting = ref(false)
const formError = ref('')
const successMessage = ref('')

// Validation states
const phoneError = computed(() => {
  if (!newPhone.value) return ''
  if (!validatePhone(newPhone.value)) return 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก'
  return ''
})

const cardError = computed(() => {
  if (!newCardNumber.value) return ''
  const cleaned = newCardNumber.value.replace(/\D/g, '')
  if (cleaned.length < 13) return 'กรุณากรอกหมายเลขบัตรให้ครบ'
  if (!validateCardNumber(newCardNumber.value)) return 'หมายเลขบัตรไม่ถูกต้อง'
  return ''
})

const canSubmit = computed(() => {
  if (newMethodType.value === 'promptpay') {
    return newPhone.value && !phoneError.value
  }
  return newCardNumber.value && !cardError.value && newCardExpiry.value && newCardCvv.value
})

// Format card number with spaces
const formatCardNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  const groups = cleaned.match(/.{1,4}/g)
  return groups ? groups.join(' ') : cleaned
}

// Watch and format card number
watch(newCardNumber, (val) => {
  const formatted = formatCardNumber(val)
  if (formatted !== val) {
    newCardNumber.value = formatted
  }
})

const setDefault = async (id: string) => {
  const result = await setDefaultMethod(id)
  if (result) {
    showSuccess('ตั้งค่าเริ่มต้นเรียบร้อย')
  }
}

const removeMethod = async (id: string) => {
  if (confirm('ต้องการลบวิธีการชำระเงินนี้?')) {
    const result = await removePaymentMethod(id)
    if (result) {
      showSuccess('ลบเรียบร้อยแล้ว')
    }
  }
}

const showSuccess = (msg: string) => {
  successMessage.value = msg
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const addMethod = async () => {
  formError.value = ''
  
  // Validate
  if (newMethodType.value === 'promptpay') {
    if (!newPhone.value) {
      formError.value = 'กรุณากรอกเบอร์โทรศัพท์'
      return
    }
    if (phoneError.value) {
      formError.value = phoneError.value
      return
    }
  } else {
    if (!newCardNumber.value || !newCardExpiry.value || !newCardCvv.value) {
      formError.value = 'กรุณากรอกข้อมูลบัตรให้ครบ'
      return
    }
    if (cardError.value) {
      formError.value = cardError.value
      return
    }
  }

  isSubmitting.value = true
  
  try {
    let result = null
    
    if (newMethodType.value === 'promptpay') {
      result = await addPaymentMethod({
        type: 'promptpay',
        name: 'พร้อมเพย์',
        detail: newPhone.value.replace(/\D/g, ''),
        is_default: paymentMethods.value.length === 0 || paymentMethods.value.every(m => m.type === 'cash')
      })
    } else {
      const cleanedCard = newCardNumber.value.replace(/\D/g, '')
      result = await addPaymentMethod({
        type: 'card',
        name: 'บัตรเครดิต',
        detail: '**** **** **** ' + cleanedCard.slice(-4),
        card_last4: cleanedCard.slice(-4),
        is_default: paymentMethods.value.length === 0 || paymentMethods.value.every(m => m.type === 'cash')
      })
    }
    
    if (result) {
      showAddModal.value = false
      resetForm()
      showSuccess('เพิ่มวิธีการชำระเงินเรียบร้อย')
    } else if (error.value) {
      formError.value = error.value
    }
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  newPhone.value = ''
  newCardNumber.value = ''
  newCardExpiry.value = ''
  newCardCvv.value = ''
  newMethodType.value = 'promptpay'
  formError.value = ''
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchPaymentMethods()
})
</script>

<template>
  <div class="payment-page">
    <div class="content-container">
      <!-- Header with back button -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="page-title">วิธีการชำระเงิน</h1>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-toast">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ successMessage }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error && paymentMethods.length === 0" class="error-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p>{{ error }}</p>
        <button @click="fetchPaymentMethods" class="retry-btn">ลองใหม่</button>
      </div>

      <template v-else>
        <!-- Payment Methods List -->
        <div class="methods-list">
          <div
            v-for="method in paymentMethods"
            :key="method.id"
            class="method-card"
          >
            <div class="method-icon">
              <svg v-if="method.type === 'promptpay'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              <svg v-else-if="method.type === 'cash'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <div class="method-info">
              <div class="method-header">
                <span class="method-name">{{ method.name }}</span>
                <span v-if="method.is_default" class="default-badge">ค่าเริ่มต้น</span>
              </div>
              <span class="method-detail">{{ method.detail }}</span>
            </div>
            <div class="method-actions">
              <button v-if="!method.is_default" @click="setDefault(method.id)" class="action-btn" title="ตั้งเป็นค่าเริ่มต้น">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
              <button v-if="method.type !== 'cash'" @click="removeMethod(method.id)" class="action-btn delete" title="ลบ">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="paymentMethods.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          <p>ยังไม่มีวิธีการชำระเงิน</p>
        </div>

        <!-- Add New Method -->
        <button @click="showAddModal = true" class="add-method-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>เพิ่มวิธีการชำระเงิน</span>
        </button>

        <!-- Info Section -->
        <div class="info-section">
          <h3 class="info-title">วิธีการชำระเงินที่รองรับ</h3>
          <div class="info-list">
            <div class="info-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              <span>พร้อมเพย์</span>
            </div>
            <div class="info-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <span>บัตรเครดิต/เดบิต</span>
            </div>
            <div class="info-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <span>Mobile Banking</span>
            </div>
            <div class="info-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span>เงินสด</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>เพิ่มวิธีการชำระเงิน</h2>
          <button @click="showAddModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="method-options">
            <button
              @click="newMethodType = 'promptpay'"
              :class="['option-btn', { active: newMethodType === 'promptpay' }]"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              <span>พร้อมเพย์</span>
            </button>
            <button
              @click="newMethodType = 'card'"
              :class="['option-btn', { active: newMethodType === 'card' }]"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <span>บัตรเครดิต</span>
            </button>
          </div>

          <!-- Form Error Display -->
          <div v-if="formError" class="form-error">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ formError }}</span>
          </div>

          <div v-if="newMethodType === 'promptpay'" class="form-group">
            <label class="label">หมายเลขโทรศัพท์</label>
            <input 
              v-model="newPhone" 
              type="tel" 
              placeholder="0812345678" 
              :class="['input-field', { 'input-error': phoneError }]" 
              maxlength="10" 
            />
            <span v-if="phoneError" class="field-error">{{ phoneError }}</span>
          </div>

          <div v-else class="card-form">
            <div class="form-group">
              <label class="label">หมายเลขบัตร</label>
              <input 
                v-model="newCardNumber" 
                type="text" 
                placeholder="1234 5678 9012 3456" 
                :class="['input-field', { 'input-error': cardError }]" 
                maxlength="19" 
              />
              <span v-if="cardError" class="field-error">{{ cardError }}</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="label">วันหมดอายุ</label>
                <input v-model="newCardExpiry" type="text" placeholder="MM/YY" class="input-field" maxlength="5" />
              </div>
              <div class="form-group">
                <label class="label">CVV</label>
                <input v-model="newCardCvv" type="password" placeholder="123" class="input-field" maxlength="4" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAddModal = false; resetForm()" class="btn-secondary">ยกเลิก</button>
          <button @click="addMethod" class="btn-primary" :disabled="isSubmitting || !canSubmit">
            <span v-if="isSubmitting">กำลังเพิ่ม...</span>
            <span v-else>เพิ่ม</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment-page {
  min-height: 100vh;
  background-color: var(--color-background);
  padding-bottom: 100px;
}

.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0 16px;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  flex-shrink: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

/* Success Toast */
.success-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #E8F5EF;
  color: #00A86B;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.success-toast svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.method-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
}

.method-icon svg {
  width: 22px;
  height: 22px;
}

.method-info {
  flex: 1;
}

.method-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.method-name {
  font-size: 15px;
  font-weight: 500;
}

.default-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  background-color: var(--color-primary);
  color: white;
  border-radius: var(--radius-full);
}

.method-detail {
  font-size: 13px;
  color: var(--color-text-muted);
}

.method-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.action-btn.delete {
  color: var(--color-error);
}

.add-method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background-color: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 24px;
}

.add-method-btn svg {
  width: 20px;
  height: 20px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--color-text-muted);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}

.error-state svg {
  width: 48px;
  height: 48px;
  color: var(--color-error);
  margin-bottom: 12px;
}

.error-state p {
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.retry-btn {
  padding: 10px 20px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--color-text-muted);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.info-section {
  padding: 20px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.info-item svg {
  width: 20px;
  height: 20px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.modal-body {
  padding: 20px;
}

.method-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: var(--color-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.option-btn.active {
  border-color: var(--color-primary);
}

.option-btn svg {
  width: 28px;
  height: 28px;
}

.form-group {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* Input Field */
.input-field {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
}

.input-field.input-error {
  border-color: var(--color-error);
}

.input-field::placeholder {
  color: var(--color-text-muted);
}

/* Form Error */
.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 14px;
}

.form-error svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Field Error */
.field-error {
  display: block;
  color: var(--color-error);
  font-size: 12px;
  margin-top: 4px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

/* Buttons */
.btn-primary {
  flex: 1;
  padding: 14px 24px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  padding: 14px 24px;
  background-color: var(--color-secondary);
  color: var(--color-text);
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: var(--color-border);
}
</style>
