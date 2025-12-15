<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MapView from './MapView.vue'
import { useRealtime } from '../composables/useRealtime'
import type { DeliveryRequest, ServiceProvider } from '../types/database'
import type { GeoLocation } from '../composables/useLocation'

const props = defineProps<{
  delivery: DeliveryRequest
  provider?: ServiceProvider | null
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'complete'): void
}>()

const { subscribeToDelivery, subscribeToDriverLocation, unsubscribe } = useRealtime()

const currentDelivery = ref<DeliveryRequest>(props.delivery)
const providerLocation = ref<GeoLocation | null>(null)
const deliveryChannelName = ref<string | null>(null)
const providerChannelName = ref<string | null>(null)

const statusConfig = {
  pending: { label: 'กำลังค้นหาผู้ส่ง', color: '#F59E0B', icon: 'search' },
  matched: { label: 'พบผู้ส่งแล้ว', color: '#3B82F6', icon: 'check' },
  pickup: { label: 'กำลังไปรับพัสดุ', color: '#8B5CF6', icon: 'package' },
  in_transit: { label: 'กำลังจัดส่ง', color: '#10B981', icon: 'truck' },
  delivered: { label: 'ส่งสำเร็จ', color: '#22C55E', icon: 'flag' },
  failed: { label: 'ส่งไม่สำเร็จ', color: '#EF4444', icon: 'x' },
  cancelled: { label: 'ยกเลิกแล้ว', color: '#6B7280', icon: 'x' }
}

const currentStatus = computed(() => {
  const status = currentDelivery.value.status || 'pending'
  return (statusConfig as Record<string, any>)[status] || statusConfig.pending
})

const senderLocation = computed<GeoLocation>(() => ({
  lat: currentDelivery.value.sender_lat,
  lng: currentDelivery.value.sender_lng,
  address: currentDelivery.value.sender_address
}))

const recipientLocation = computed<GeoLocation>(() => ({
  lat: currentDelivery.value.recipient_lat,
  lng: currentDelivery.value.recipient_lng,
  address: currentDelivery.value.recipient_address
}))

const canCancel = computed(() => 
  ['pending', 'matched'].includes(currentDelivery.value.status || '')
)

const isActive = computed(() => 
  ['pending', 'matched', 'pickup', 'in_transit'].includes(currentDelivery.value.status || '')
)

const setupSubscriptions = () => {
  const channel = subscribeToDelivery(
    currentDelivery.value.id,
    (delivery) => {
      currentDelivery.value = delivery
      if (delivery.status === 'delivered') {
        emit('complete')
      }
    }
  )
  if (channel) {
    deliveryChannelName.value = `delivery_requests:id:${currentDelivery.value.id}`
  }

  if (props.provider?.id) {
    const channel = subscribeToDriverLocation(
      props.provider.id,
      (location) => {
        providerLocation.value = { ...location, address: 'ตำแหน่งผู้ส่ง' }
      }
    )
    if (channel) {
      providerChannelName.value = `driver:${props.provider.id}`
    }
  }
}

const cleanupSubscriptions = () => {
  if (deliveryChannelName.value) unsubscribe(deliveryChannelName.value)
  if (providerChannelName.value) unsubscribe(providerChannelName.value)
}

watch(() => props.delivery, (newDelivery) => {
  currentDelivery.value = newDelivery
}, { deep: true })

onMounted(() => setupSubscriptions())
onUnmounted(() => cleanupSubscriptions())
</script>

<template>
  <div class="delivery-tracker">
    <!-- Status Header -->
    <div class="status-header" :style="{ borderColor: currentStatus.color }">
      <div class="status-indicator" :style="{ backgroundColor: currentStatus.color }">
        <svg v-if="currentStatus.icon === 'search'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'check'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'package'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'truck'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'flag'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
        </svg>
        <svg v-else class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <div class="status-text">
        <span class="status-label">{{ currentStatus.label }}</span>
        <span v-if="isActive" class="status-pulse"></span>
      </div>
    </div>

    <!-- Map -->
    <MapView
      :pickup="senderLocation"
      :destination="recipientLocation"
      :show-route="true"
      height="180px"
    />

    <!-- Package Info -->
    <div class="package-info">
      <div class="package-header">
        <svg class="package-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <span>{{ currentDelivery.package_description }}</span>
      </div>
      <div class="package-details">
        <span class="package-weight">{{ currentDelivery.package_weight }} กก.</span>
        <span class="package-type">{{ currentDelivery.package_type }}</span>
      </div>
    </div>

    <!-- Locations -->
    <div class="locations">
      <div class="location-item">
        <div class="location-dot sender"></div>
        <div class="location-content">
          <span class="location-label">ผู้ส่ง</span>
          <span class="location-name">{{ currentDelivery.sender_name }}</span>
          <span class="location-address">{{ currentDelivery.sender_address }}</span>
        </div>
      </div>
      <div class="location-line"></div>
      <div class="location-item">
        <div class="location-dot recipient"></div>
        <div class="location-content">
          <span class="location-label">ผู้รับ</span>
          <span class="location-name">{{ currentDelivery.recipient_name }}</span>
          <span class="location-address">{{ currentDelivery.recipient_address }}</span>
        </div>
      </div>
    </div>

    <!-- Fee -->
    <div class="fee-info">
      <span class="fee-label">ค่าส่ง</span>
      <span class="fee-amount">฿{{ currentDelivery.estimated_fee }}</span>
    </div>

    <!-- Actions -->
    <div v-if="canCancel" class="actions">
      <button @click="emit('cancel')" class="btn-secondary cancel-btn">
        ยกเลิกการส่ง
      </button>
    </div>
  </div>
</template>

<style scoped>
.delivery-tracker {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-left: 4px solid;
  background-color: var(--color-secondary);
}

.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
}

.status-pulse {
  width: 8px;
  height: 8px;
  background-color: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.package-info {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.package-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.package-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
}

.package-details {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.locations {
  padding: 16px;
}

.location-item {
  display: flex;
  gap: 12px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.sender {
  background-color: var(--color-success);
}

.location-dot.recipient {
  background-color: var(--color-error);
}

.location-line {
  width: 2px;
  height: 16px;
  background-color: var(--color-border);
  margin-left: 5px;
}

.location-content {
  display: flex;
  flex-direction: column;
}

.location-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.location-name {
  font-size: 14px;
  font-weight: 500;
}

.location-address {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.fee-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.fee-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.fee-amount {
  font-size: 20px;
  font-weight: 700;
}

.actions {
  padding: 16px;
  padding-top: 0;
}

.cancel-btn {
  width: 100%;
  color: var(--color-error);
}
</style>
