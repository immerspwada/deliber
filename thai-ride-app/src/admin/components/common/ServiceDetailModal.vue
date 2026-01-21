<script setup lang="ts">
import { computed } from 'vue'
import type { Order, ServiceType } from '../../types'

const props = defineProps<{
  order: Order | null
  serviceType: ServiceType
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', minimumFractionDigits: 0
  }).format(amount || 0)
}

function getStatusColor(s: string): string {
  const colors: Record<string, string> = {
    pending: '#F59E0B', matched: '#3B82F6', confirmed: '#3B82F6',
    pickup: '#8B5CF6', in_transit: '#8B5CF6', in_progress: '#8B5CF6',
    completed: '#10B981', delivered: '#059669', cancelled: '#EF4444'
  }
  return colors[s] || '#6B7280'
}

const serviceTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    ride: 'Ride', delivery: 'Delivery', shopping: 'Shopping',
    queue: 'Queue', moving: 'Moving', laundry: 'Laundry'
  }
  return labels[props.serviceType] || props.serviceType
})
</script>

<template>
  <div v-if="show && order" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ serviceTypeLabel }}</h2>
        <button class="close-btn" @click="emit('close')">X</button>
      </div>
      <div class="modal-body">
        <div class="order-header">
          <code class="tracking-id">{{ order.tracking_id }}</code>
          <span class="status-badge" :style="{ color: getStatusColor(order.status) }">
            {{ order.status }}
          </span>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><label>Customer</label><span>{{ order.customer_name || '-' }}</span></div>
          <div class="detail-item"><label>Phone</label><span>{{ order.customer_phone || '-' }}</span></div>
          <div class="detail-item"><label>Provider</label><span>{{ order.provider_name || '-' }}</span></div>
          <div class="detail-item"><label>Amount</label><span>{{ formatCurrency(order.total_amount) }}</span></div>
          <div class="detail-item full"><label>Pickup</label><span>{{ order.pickup_address || '-' }}</span></div>
          <div class="detail-item full"><label>Dropoff</label><span>{{ order.dropoff_address || '-' }}</span></div>
          <div class="detail-item"><label>Created</label><span>{{ formatDate(order.created_at) }}</span></div>
          <div class="detail-item"><label>Completed</label><span>{{ formatDate(order.completed_at) }}</span></div>
        </div>
        <div class="modal-actions"><button class="btn" @click="emit('close')">Close</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; }
.modal-header { display: flex; justify-content: space-between; padding: 20px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: #6B7280; }
.modal-body { padding: 20px; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.tracking-id { font-family: monospace; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.status-badge { padding: 4px 12px; border-radius: 16px; font-size: 13px; font-weight: 500; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full { grid-column: span 2; }
.detail-item label { font-size: 12px; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.modal-actions { margin-top: 20px; text-align: right; }
.btn { padding: 10px 20px; background: #F3F4F6; border: none; border-radius: 8px; cursor: pointer; }
</style>
