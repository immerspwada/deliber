<script setup lang="ts">
/**
 * Provider Commission Modal
 * =========================
 * Modal สำหรับตั้งค่าคอมมิชชั่นของ Provider
 * รองรับทั้งแบบ % และแบบบาทคงที่
 */
import { ref, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { supabase } from '@/lib/supabase'

interface Props {
  provider: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone_number?: string
    commission_type?: 'percentage' | 'fixed'
    commission_value?: number
    commission_notes?: string
  }
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  updated: []
}>()

const toast = useToast()
const errorHandler = useErrorHandler()

// Form state
const commissionType = ref<'percentage' | 'fixed'>('percentage')
const commissionValue = ref<number>(20)
const commissionNotes = ref<string>('')
const isProcessing = ref(false)

// Computed
const isPercentage = computed(() => commissionType.value === 'percentage')
const isFixed = computed(() => commissionType.value === 'fixed')

const maxValue = computed(() => {
  return isPercentage.value ? 100 : 999999
})

const minValue = computed(() => 0)

const displayValue = computed(() => {
  if (isPercentage.value) {
    return `${commissionValue.value}%`
  }
  return `${commissionValue.value.toLocaleString()} บาท`
})

const exampleCalculation = computed(() => {
  const fareAmount = 100
  let commission = 0
  let providerEarnings = 0

  if (isPercentage.value) {
    commission = fareAmount * (commissionValue.value / 100)
    providerEarnings = fareAmount - commission
  } else {
    commission = commissionValue.value
    providerEarnings = fareAmount - commission
  }

  return {
    fareAmount,
    commission: commission.toFixed(2),
    providerEarnings: providerEarnings.toFixed(2)
  }
})

// Watch for prop changes
watch(() => props.show, (newVal) => {
  if (newVal && props.provider) {
    // Load current values
    commissionType.value = props.provider.commission_type || 'percentage'
    commissionValue.value = props.provider.commission_value || 20
    commissionNotes.value = props.provider.commission_notes || ''
  }
})

// Methods
function handleClose() {
  emit('close')
}

function validateForm(): boolean {
  if (commissionValue.value < minValue.value) {
    toast.error(`ค่าคอมมิชชั่นต้องไม่ต่ำกว่า ${minValue.value}`)
    return false
  }

  if (commissionValue.value > maxValue.value) {
    toast.error(`ค่าคอมมิชชั่นต้องไม่เกิน ${maxValue.value}${isPercentage.value ? '%' : ' บาท'}`)
    return false
  }

  if (isPercentage.value && commissionValue.value > 100) {
    toast.error('เปอร์เซ็นต์ต้องไม่เกิน 100%')
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  isProcessing.value = true
  try {
    const { data, error } = await supabase.rpc('admin_update_provider_commission', {
      p_provider_id: props.provider.id,
      p_commission_type: commissionType.value,
      p_commission_value: commissionValue.value,
      p_commission_notes: commissionNotes.value || null
    })

    if (error) throw error

    toast.success('อัพเดทค่าคอมมิชชั่นเรียบร้อยแล้ว')
    emit('updated')
    emit('close')
  } catch (e) {
    errorHandler.handle(e, 'updateProviderCommission')
  } finally {
    isProcessing.value = false
  }
}

function handleTypeChange(type: 'percentage' | 'fixed') {
  commissionType.value = type
  // Reset to default values
  if (type === 'percentage') {
    commissionValue.value = 20
  } else {
    commissionValue.value = 20
  }
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal">
      <div class="modal-header">
        <div class="header-content">
          <h2>⚙️ ตั้งค่าคอมมิชชั่น</h2>
          <p class="provider-name">{{ provider.first_name }} {{ provider.last_name }}</p>
        </div>
        <button 
          class="close-btn" 
          :disabled="isProcessing"
          aria-label="ปิด"
          @click="handleClose"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Commission Type Selection -->
        <div class="form-group">
          <label class="form-label">ประเภทคอมมิชชั่น</label>
          <div class="type-selector">
            <button
              type="button"
              class="type-btn"
              :class="{ active: isPercentage }"
              :disabled="isProcessing"
              @click="handleTypeChange('percentage')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="5" x2="5" y2="19"/>
                <circle cx="6.5" cy="6.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
              <div class="type-info">
                <span class="type-title">เปอร์เซ็นต์ (%)</span>
                <span class="type-desc">หักตามสัดส่วนของค่าบริการ</span>
              </div>
            </button>

            <button
              type="button"
              class="type-btn"
              :class="{ active: isFixed }"
              :disabled="isProcessing"
              @click="handleTypeChange('fixed')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div class="type-info">
                <span class="type-title">จำนวนคงที่ (บาท)</span>
                <span class="type-desc">หักจำนวนเงินคงที่ทุกครั้ง</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Commission Value Input -->
        <div class="form-group">
          <label for="commission-value" class="form-label">
            ค่าคอมมิชชั่น
            <span class="required">*</span>
          </label>
          <div class="value-input-wrapper">
            <input
              id="commission-value"
              v-model.number="commissionValue"
              type="number"
              :min="minValue"
              :max="maxValue"
              step="0.01"
              class="value-input"
              :disabled="isProcessing"
              placeholder="กรอกค่าคอมมิชชั่น"
            />
            <span class="value-suffix">{{ isPercentage ? '%' : 'บาท' }}</span>
          </div>
          <div class="input-hint">
            <span v-if="isPercentage">ค่าระหว่าง 0-100%</span>
            <span v-else>ค่าคงที่ต่อรายการ (บาท)</span>
          </div>
        </div>

        <!-- Example Calculation -->
        <div class="example-box">
          <div class="example-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <span>ตัวอย่างการคำนวณ (ค่าบริการ 100 บาท)</span>
          </div>
          <div class="example-grid">
            <div class="example-item">
              <span class="example-label">ค่าบริการ</span>
              <span class="example-value">{{ exampleCalculation.fareAmount }} บาท</span>
            </div>
            <div class="example-item highlight">
              <span class="example-label">คอมมิชชั่น ({{ displayValue }})</span>
              <span class="example-value commission">-{{ exampleCalculation.commission }} บาท</span>
            </div>
            <div class="example-item success">
              <span class="example-label">รายได้ Provider</span>
              <span class="example-value earnings">{{ exampleCalculation.providerEarnings }} บาท</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="commission-notes" class="form-label">หมายเหตุ (ถ้ามี)</label>
          <textarea
            id="commission-notes"
            v-model="commissionNotes"
            rows="3"
            class="notes-input"
            :disabled="isProcessing"
            placeholder="เช่น: ลดค่าคอมมิชชั่นเนื่องจากเป็น Top Provider"
          ></textarea>
        </div>

        <!-- Warning Box -->
        <div class="warning-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>การเปลี่ยนแปลงจะมีผลกับรายการใหม่ทั้งหมด ไม่ส่งผลกับรายการที่ดำเนินการแล้ว</span>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          class="btn btn-secondary" 
          :disabled="isProcessing"
          @click="handleClose"
        >
          ยกเลิก
        </button>
        <button 
          class="btn btn-primary" 
          :disabled="isProcessing"
          @click="handleSubmit"
        >
          <svg v-if="isProcessing" class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          {{ isProcessing ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #E5E7EB;
}

.header-content h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 4px 0;
}

.provider-name {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.15s;
  flex-shrink: 0;
}

.close-btn:hover:not(:disabled) {
  background: #F3F4F6;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.required {
  color: #EF4444;
}

.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F9FAFB;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.type-btn:hover:not(:disabled) {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.type-btn.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-btn svg {
  flex-shrink: 0;
  color: #6B7280;
}

.type-btn.active svg {
  color: #00A86B;
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-title {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

.type-desc {
  font-size: 12px;
  color: #6B7280;
}

.value-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.value-input {
  flex: 1;
  padding: 12px 60px 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.15s;
  box-sizing: border-box;
}

.value-input:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.value-input:disabled {
  background: #F9FAFB;
  cursor: not-allowed;
}

.value-suffix {
  position: absolute;
  right: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  pointer-events: none;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6B7280;
}

.example-box {
  padding: 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  margin-bottom: 24px;
}

.example-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.example-header svg {
  color: #6B7280;
}

.example-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
}

.example-item.highlight {
  background: #FEF3C7;
}

.example-item.success {
  background: #D1FAE5;
}

.example-label {
  font-size: 13px;
  color: #6B7280;
}

.example-value {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
}

.example-value.commission {
  color: #D97706;
}

.example-value.earnings {
  color: #059669;
}

.notes-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  transition: all 0.15s;
}

.notes-input:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.notes-input:disabled {
  background: #F9FAFB;
  cursor: not-allowed;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #FEF3C7;
  border: 1px solid #FDE68A;
  border-radius: 10px;
  font-size: 13px;
  color: #92400E;
}

.warning-box svg {
  flex-shrink: 0;
  color: #F59E0B;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #E5E7EB;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #00A86B;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #008C5A;
}

.btn-secondary {
  background: #F3F4F6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #E5E7EB;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Remove number input arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
