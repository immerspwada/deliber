<script setup lang="ts">
/**
 * Feature: F351 - Provider Vehicle Form
 * Vehicle information form for providers
 */
import { ref, watch } from 'vue'

interface Vehicle {
  type: 'car' | 'motorcycle' | 'van'
  brand: string
  model: string
  year: number
  color: string
  licensePlate: string
  seats?: number
}

const props = defineProps<{ vehicle?: Vehicle; loading?: boolean }>()
const emit = defineEmits<{ (e: 'save', vehicle: Vehicle): void }>()

const form = ref<Vehicle>({
  type: props.vehicle?.type || 'car',
  brand: props.vehicle?.brand || '',
  model: props.vehicle?.model || '',
  year: props.vehicle?.year || new Date().getFullYear(),
  color: props.vehicle?.color || '',
  licensePlate: props.vehicle?.licensePlate || '',
  seats: props.vehicle?.seats || 4
})

watch(() => props.vehicle, (v) => { if (v) form.value = { ...v } }, { deep: true })

const vehicleTypes = [
  { value: 'car', label: 'รถยนต์', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2"/><path d="M10 17V7"/></svg>' },
  { value: 'motorcycle', label: 'มอเตอร์ไซค์', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17h4l3-6-4-4h-4l-3 4"/></svg>' },
  { value: 'van', label: 'รถตู้', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>' }
]

const colors = ['ขาว', 'ดำ', 'เงิน', 'แดง', 'น้ำเงิน', 'เขียว', 'เหลือง', 'ส้ม', 'ม่วง', 'ชมพู']
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 30 }, (_, i) => currentYear - i)
</script>

<template>
  <div class="provider-vehicle-form">
    <h3 class="form-title">ข้อมูลยานพาหนะ</h3>
    
    <div class="vehicle-types">
      <button v-for="vt in vehicleTypes" :key="vt.value" type="button" class="type-btn" :class="{ active: form.type === vt.value }" @click="form.type = vt.value as Vehicle['type']">
        <span v-html="vt.icon"></span>
        <span>{{ vt.label }}</span>
      </button>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">ยี่ห้อ</label>
        <input v-model="form.brand" type="text" class="form-input" placeholder="เช่น Toyota, Honda" />
      </div>
      <div class="form-group">
        <label class="form-label">รุ่น</label>
        <input v-model="form.model" type="text" class="form-input" placeholder="เช่น Camry, Civic" />
      </div>
      <div class="form-group">
        <label class="form-label">ปี</label>
        <select v-model="form.year" class="form-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">สี</label>
        <select v-model="form.color" class="form-select">
          <option value="">เลือกสี</option>
          <option v-for="c in colors" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">ทะเบียนรถ</label>
        <input v-model="form.licensePlate" type="text" class="form-input" placeholder="เช่น กข 1234" />
      </div>
      <div v-if="form.type !== 'motorcycle'" class="form-group">
        <label class="form-label">จำนวนที่นั่ง</label>
        <input v-model.number="form.seats" type="number" class="form-input" min="2" max="15" />
      </div>
    </div>

    <button type="button" class="save-btn" :disabled="loading || !form.brand || !form.model || !form.licensePlate" @click="emit('save', form)">
      {{ loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
    </button>
  </div>
</template>

<style scoped>
.provider-vehicle-form { background: #fff; border-radius: 12px; padding: 20px; }
.form-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 16px; }
.vehicle-types { display: flex; gap: 12px; margin-bottom: 20px; }
.type-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 12px; background: #f6f6f6; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-size: 13px; color: #6b6b6b; }
.type-btn:hover { background: #e5e5e5; }
.type-btn.active { border-color: #000; background: #fff; color: #000; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-label { font-size: 13px; font-weight: 500; color: #000; }
.form-input, .form-select { padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
.form-input:focus, .form-select:focus { outline: none; border-color: #000; }
.save-btn { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; }
.save-btn:disabled { background: #ccc; cursor: not-allowed; }
</style>
