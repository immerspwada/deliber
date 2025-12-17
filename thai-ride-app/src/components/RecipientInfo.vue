<script setup lang="ts">
/**
 * Feature: F314 - Recipient Info
 * Recipient information form/display
 */
import { ref } from 'vue'

const props = defineProps<{
  mode?: 'view' | 'edit'
  name?: string
  phone?: string
  address?: string
}>()

const emit = defineEmits<{
  'save': [data: { name: string; phone: string }]
}>()

const editName = ref(props.name || '')
const editPhone = ref(props.phone || '')

const save = () => {
  emit('save', { name: editName.value, phone: editPhone.value })
}
</script>

<template>
  <div class="recipient-info">
    <div class="header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <h4>ข้อมูลผู้รับ</h4>
    </div>
    
    <template v-if="mode === 'edit'">
      <div class="form">
        <div class="field">
          <label>ชื่อผู้รับ</label>
          <input v-model="editName" type="text" placeholder="กรอกชื่อผู้รับ" />
        </div>
        <div class="field">
          <label>เบอร์โทรศัพท์</label>
          <input v-model="editPhone" type="tel" placeholder="0812345678" />
        </div>
        <button type="button" class="btn-save" @click="save">บันทึก</button>
      </div>
    </template>
    
    <template v-else>
      <div class="info-list">
        <div class="info-row">
          <span class="label">ชื่อ</span>
          <span class="value">{{ name || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">เบอร์โทร</span>
          <span class="value">{{ phone || '-' }}</span>
        </div>
        <div v-if="address" class="info-row">
          <span class="label">ที่อยู่</span>
          <span class="value">{{ address }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.recipient-info {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.header h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
}

.field input {
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.field input:focus {
  border-color: #000;
}

.btn-save {
  padding: 12px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 4px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
}

.info-row .label {
  font-size: 14px;
  color: #6b6b6b;
}

.info-row .value {
  font-size: 14px;
  font-weight: 500;
}
</style>
