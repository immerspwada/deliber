<script setup lang="ts">
/**
 * Feature: F318 - Item Add Modal
 * Modal for adding items to shopping list
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add': [item: { name: string; quantity: number; note: string }]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const itemName = ref('')
const quantity = ref(1)
const note = ref('')

const canAdd = computed(() => itemName.value.trim().length > 0)

const handleAdd = () => {
  if (!canAdd.value) return
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
}

const incrementQty = () => { quantity.value++ }
const decrementQty = () => { if (quantity.value > 1) quantity.value-- }
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="isOpen = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">เพิ่มสินค้า</h2>
            <button type="button" class="close-btn" @click="isOpen = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">ชื่อสินค้า</label>
              <input 
                v-model="itemName"
                type="text" 
                class="form-input"
                placeholder="เช่น นมสด, ไข่ไก่, ขนมปัง"
              />
            </div>

            <div class="form-group">
              <label class="form-label">จำนวน</label>
              <div class="qty-control">
                <button type="button" class="qty-btn" :disabled="quantity <= 1" @click="decrementQty">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14"/>
                  </svg>
                </button>
                <span class="qty-value">{{ quantity }}</span>
                <button type="button" class="qty-btn" @click="incrementQty">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">หมายเหตุ (ไม่บังคับ)</label>
              <textarea 
                v-model="note"
                class="form-textarea"
                placeholder="เช่น ยี่ห้อที่ต้องการ, ขนาด, รสชาติ"
                rows="2"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="isOpen = false">ยกเลิก</button>
            <button 
              type="button" 
              class="add-btn"
              :disabled="!canAdd || loading"
              @click="handleAdd"
            >
              <span v-if="loading" class="spinner" />
              <span v-else>เพิ่มสินค้า</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b6b6b;
}

.modal-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #000;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  border-color: #000;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 16px;
}

.qty-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #e5e5e5;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
  transition: all 0.2s;
}

.qty-btn:hover:not(:disabled) {
  background: #f6f6f6;
}

.qty-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.qty-value {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  min-width: 32px;
  text-align: center;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.cancel-btn {
  flex: 1;
  padding: 14px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.add-btn {
  flex: 1;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
