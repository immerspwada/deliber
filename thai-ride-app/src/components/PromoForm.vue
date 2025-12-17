<script setup lang="ts">
/**
 * Feature: F201 - Promo Form
 * Admin form for creating/editing promo codes
 */
import { ref, computed } from 'vue'

type DiscountType = 'percentage' | 'fixed'

interface PromoData {
  code: string
  description: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount: number
  usage_limit: number
  per_user_limit: number
  valid_from: string
  valid_until: string
  is_active: boolean
}

const props = defineProps<{
  initialData?: Partial<PromoData>
  isEditing?: boolean
}>()

const emit = defineEmits<{
  submit: [data: PromoData]
  cancel: []
}>()

const form = ref<PromoData>({
  code: props.initialData?.code ?? '',
  description: props.initialData?.description ?? '',
  discount_type: (props.initialData?.discount_type ?? 'percentage') as DiscountType,
  discount_value: props.initialData?.discount_value ?? 10,
  min_order_amount: props.initialData?.min_order_amount ?? 0,
  max_discount: props.initialData?.max_discount ?? 100,
  usage_limit: props.initialData?.usage_limit ?? 100,
  per_user_limit: props.initialData?.per_user_limit ?? 1,
  valid_from: String(props.initialData?.valid_from ?? new Date().toISOString().split('T')[0]),
  valid_until: String(props.initialData?.valid_until ?? ''),
  is_active: props.initialData?.is_active ?? true
})

const isValid = computed(() => {
  return form.value.code.length >= 3 && 
         form.value.discount_value > 0 &&
         form.value.valid_until
})

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.value.code = code
}

const handleSubmit = () => {
  if (isValid.value) {
    emit('submit', form.value)
  }
}
</script>

<template>
  <form class="promo-form" @submit.prevent="handleSubmit">
    <div class="form-header">
      <h2 class="form-title">{{ isEditing ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่' }}</h2>
    </div>

    <div class="form-section">
      <label class="form-label">รหัสโปรโมชั่น</label>
      <div class="code-input-group">
        <input 
          v-model="form.code" 
          type="text" 
          class="form-input"
          placeholder="เช่น SAVE20"
          :disabled="isEditing"
        />
        <button type="button" class="generate-btn" @click="generateCode" :disabled="isEditing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          สุ่ม
        </button>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">รายละเอียด</label>
      <textarea 
        v-model="form.description" 
        class="form-textarea"
        placeholder="อธิบายโปรโมชั่น..."
        rows="2"
      />
    </div>

    <div class="form-row">
      <div class="form-section">
        <label class="form-label">ประเภทส่วนลด</label>
        <select v-model="form.discount_type" class="form-select">
          <option value="percentage">เปอร์เซ็นต์ (%)</option>
          <option value="fixed">จำนวนเงิน (฿)</option>
        </select>
      </div>
      <div class="form-section">
        <label class="form-label">มูลค่าส่วนลด</label>
        <input 
          v-model.number="form.discount_value" 
          type="number" 
          class="form-input"
          min="0"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-section">
        <label class="form-label">ยอดขั้นต่ำ (฿)</label>
        <input 
          v-model.number="form.min_order_amount" 
          type="number" 
          class="form-input"
          min="0"
        />
      </div>
      <div class="form-section">
        <label class="form-label">ส่วนลดสูงสุด (฿)</label>
        <input 
          v-model.number="form.max_discount" 
          type="number" 
          class="form-input"
          min="0"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-section">
        <label class="form-label">จำนวนครั้งที่ใช้ได้</label>
        <input 
          v-model.number="form.usage_limit" 
          type="number" 
          class="form-input"
          min="1"
        />
      </div>
      <div class="form-section">
        <label class="form-label">ต่อผู้ใช้ (ครั้ง)</label>
        <input 
          v-model.number="form.per_user_limit" 
          type="number" 
          class="form-input"
          min="1"
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-section">
        <label class="form-label">เริ่มใช้ได้</label>
        <input v-model="form.valid_from" type="date" class="form-input" />
      </div>
      <div class="form-section">
        <label class="form-label">หมดอายุ</label>
        <input v-model="form.valid_until" type="date" class="form-input" />
      </div>
    </div>

    <div class="form-section">
      <label class="toggle-row">
        <input v-model="form.is_active" type="checkbox" class="toggle-input" />
        <span class="toggle-switch" />
        <span class="toggle-label">เปิดใช้งาน</span>
      </label>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="emit('cancel')">ยกเลิก</button>
      <button type="submit" class="btn-primary" :disabled="!isValid">
        {{ isEditing ? 'บันทึก' : 'สร้างโปรโมชั่น' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.promo-form {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
}

.form-header {
  margin-bottom: 24px;
}

.form-title {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #000;
  margin-bottom: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #000;
}

.form-textarea {
  resize: vertical;
}

.code-input-group {
  display: flex;
  gap: 8px;
}

.code-input-group .form-input {
  flex: 1;
  text-transform: uppercase;
}

.generate-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  white-space: nowrap;
}

.generate-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: #e5e5e5;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-input:checked + .toggle-switch {
  background: #000;
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 14px;
  color: #000;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e5e5;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #000;
  color: #fff;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #333;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #000;
  border: 1px solid #e5e5e5;
}

.btn-secondary:hover {
  background: #f6f6f6;
}
</style>
