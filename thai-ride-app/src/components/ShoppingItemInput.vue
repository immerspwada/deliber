<script setup lang="ts">
/**
 * Feature: F326 - Shopping Item Input
 * Inline input for adding shopping items
 */
import { ref } from 'vue'

const emit = defineEmits<{
  'add': [item: { name: string; quantity: number; note: string }]
}>()

const itemName = ref('')
const quantity = ref(1)
const note = ref('')
const showNote = ref(false)

const handleAdd = () => {
  if (!itemName.value.trim()) return
  emit('add', {
    name: itemName.value.trim(),
    quantity: quantity.value,
    note: note.value.trim()
  })
  resetForm()
}

const resetForm = () => {
  itemName.value = ''
  quantity.value = 1
  note.value = ''
  showNote.value = false
}

const incrementQty = () => { quantity.value++ }
const decrementQty = () => { if (quantity.value > 1) quantity.value-- }
</script>

<template>
  <div class="item-input">
    <div class="input-row">
      <input 
        v-model="itemName"
        type="text"
        class="name-input"
        placeholder="ชื่อสินค้า เช่น นมสด, ไข่ไก่"
        @keyup.enter="handleAdd"
      />
      
      <div class="qty-control">
        <button type="button" class="qty-btn" :disabled="quantity <= 1" @click="decrementQty">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <span class="qty-value">{{ quantity }}</span>
        <button type="button" class="qty-btn" @click="incrementQty">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
      
      <button type="button" class="add-btn" :disabled="!itemName.trim()" @click="handleAdd">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
    
    <button v-if="!showNote" type="button" class="note-toggle" @click="showNote = true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      เพิ่มหมายเหตุ
    </button>
    
    <div v-else class="note-input">
      <input 
        v-model="note"
        type="text"
        placeholder="หมายเหตุ เช่น ยี่ห้อ, ขนาด, รสชาติ"
      />
      <button type="button" class="note-close" @click="showNote = false; note = ''">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.item-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 12px;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.name-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
}

.name-input:focus {
  border-color: #000;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 4px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
}

.qty-btn:hover:not(:disabled) {
  background: #f6f6f6;
}

.qty-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.qty-value {
  font-size: 14px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.add-btn {
  width: 40px;
  height: 40px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.note-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.note-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.note-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
  outline: none;
}

.note-input input:focus {
  border-color: #000;
}

.note-close {
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
