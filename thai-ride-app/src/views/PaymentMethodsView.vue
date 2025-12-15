<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePaymentMethods } from '../composables/usePaymentMethods'

const { 
  paymentMethods, 
  fetchPaymentMethods, 
  addPaymentMethod, 
  setDefaultMethod, 
  removePaymentMethod 
} = usePaymentMethods()

const showAddModal = ref(false)
const newMethodType = ref<'promptpay' | 'card'>('promptpay')
const newPhone = ref('')
const newCardNumber = ref('')
const newCardExpiry = ref('')
const newCardCvv = ref('')

const setDefault = async (id: string) => {
  await setDefaultMethod(id)
}

const removeMethod = async (id: string) => {
  if (confirm('ต้องการลบวิธีการชำระเงินนี้?')) {
    await removePaymentMethod(id)
  }
}

const addMethod = async () => {
  if (newMethodType.value === 'promptpay' && newPhone.value) {
    await addPaymentMethod({
      type: 'promptpay',
      name: 'พร้อมเพย์',
      detail: newPhone.value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-xxx-x$3').slice(-3),
      is_default: paymentMethods.value.length === 0
    })
  } else if (newMethodType.value === 'card' && newCardNumber.value) {
    await addPaymentMethod({
      type: 'card',
      name: 'บัตรเครดิต',
      detail: '**** **** **** ' + newCardNumber.value.slice(-4),
      card_last4: newCardNumber.value.slice(-4),
      is_default: paymentMethods.value.length === 0
    })
  }
  
  showAddModal.value = false
  newPhone.value = ''
  newCardNumber.value = ''
  newCardExpiry.value = ''
  newCardCvv.value = ''
}

onMounted(() => {
  fetchPaymentMethods()
})
</script>

<template>
  <div class="payment-page">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">วิธีการชำระเงิน</h1>
      </div>

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
            <button v-if="!method.is_default" @click="setDefault(method.id)" class="action-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </button>
            <button v-if="method.type !== 'cash'" @click="removeMethod(method.id)" class="action-btn delete">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
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

          <div v-if="newMethodType === 'promptpay'" class="form-group">
            <label class="label">หมายเลขโทรศัพท์</label>
            <input type="tel" placeholder="0812345678" class="input-field" />
          </div>

          <div v-else class="card-form">
            <div class="form-group">
              <label class="label">หมายเลขบัตร</label>
              <input type="text" placeholder="1234 5678 9012 3456" class="input-field" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="label">วันหมดอายุ</label>
                <input type="text" placeholder="MM/YY" class="input-field" />
              </div>
              <div class="form-group">
                <label class="label">CVV</label>
                <input type="text" placeholder="123" class="input-field" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="addMethod" class="btn-primary">เพิ่ม</button>
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
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
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

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--color-border);
}
</style>
