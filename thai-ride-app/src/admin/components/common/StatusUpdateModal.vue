<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Order, ServiceType } from '../../types'

const props = defineProps<{
  order: Order | null
  serviceType: ServiceType
  show: boolean
  statusOptions: { value: string; label: string }[]
  isUpdating: boolean
}>()

const emit = defineEmits<{
  close: []
  update: [orderId: string, status: string]
}>()

const newStatus = ref('')

watch(() => props.order, (order) => {
  if (order) newStatus.value = order.status
})

function handleUpdate() {
  if (props.order && newStatus.value) {
    emit('update', props.order.id, newStatus.value)
  }
}
</script>

<template>
  <div v-if="show && order" class="modal-overlay" @click.self="emit('close')">
    <div class="modal modal-sm">
      <div class="modal-header">
        <h2>เปลี่ยนสถานะ</h2>
        <button class="close-btn" @click="emit('close')">X</button>
      </div>
      <div class="modal-body">
        <div class="order-info">
          <code class="tracking-id">{{ order.tracking_id }}</code>
          <span class="current-status">สถานะปัจจุบัน: {{ order.status }}</span>
        </div>
        <div class="form-group">
          <label>สถานะใหม่</label>
          <select v-model="newStatus" class="form-select">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="emit('close')">ยกเลิก</button>
          <button 
            class="btn btn-primary" 
            :disabled="isUpdating || newStatus === order.status"
            @click="handleUpdate"
          >
            {{ isUpdating ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: #6B7280; }
.modal-body { padding: 20px; }
.order-info { margin-bottom: 20px; }
.tracking-id { display: block; font-family: monospace; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; margin-bottom: 8px; }
.current-status { font-size: 13px; color: #6B7280; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #374151; }
.form-select { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.btn-primary { background: #00A86B; color: #fff; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
