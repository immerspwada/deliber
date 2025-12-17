<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import { supabase } from '../lib/supabase'
import { useDelivery } from '../composables/useDelivery'
import { useShopping } from '../composables/useShopping'

const route = useRoute()
const router = useRouter()
const { formatStatus: formatDeliveryStatus } = useDelivery()
const { formatStatus: formatShoppingStatus } = useShopping()

const loading = ref(true)
const error = ref('')
const orderData = ref<any>(null)
const orderType = ref<'ride' | 'delivery' | 'shopping'>('ride')

let subscription: any = null

const trackingId = computed(() => route.params.trackingId as string)

const fetchOrder = async () => {
  const id = trackingId.value
  if (!id) {
    error.value = 'ไม่พบรหัสติดตาม'
    loading.value = false
    return
  }

  try {
    // Determine order type from tracking ID prefix
    if (id.startsWith('RID-')) {
      orderType.value = 'ride'
      const { data, error: fetchError } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id, vehicle_type, vehicle_plate, vehicle_color, rating, current_lat, current_lng,
            user:user_id (name, phone, avatar_url)
          ),
          user:user_id (name, phone)
        `)
        .eq('tracking_id', id)
        .single()

      if (fetchError || !data) {
        error.value = 'ไม่พบข้อมูลการเดินทาง'
        return
      }
      orderData.value = data
      subscribeToUpdates('ride_requests', data.id)
    } else if (id.startsWith('DEL-')) {
      orderType.value = 'delivery'
      const { data, error: fetchError } = await (supabase
        .from('delivery_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id, vehicle_type, vehicle_plate, rating, current_lat, current_lng,
            user:user_id (name, phone, avatar_url)
          ),
          user:user_id (name, phone)
        `)
        .eq('tracking_id', id)
        .single()

      if (fetchError || !data) {
        error.value = 'ไม่พบข้อมูลการจัดส่ง'
        return
      }
      orderData.value = data
      subscribeToUpdates('delivery_requests', data.id)
    } else if (id.startsWith('SHP-')) {
      orderType.value = 'shopping'
      const { data, error: fetchError } = await (supabase
        .from('shopping_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id, vehicle_type, vehicle_plate, rating, current_lat, current_lng,
            user:user_id (name, phone, avatar_url)
          ),
          user:user_id (name, phone)
        `)
        .eq('tracking_id', id)
        .single()

      if (fetchError || !data) {
        error.value = 'ไม่พบข้อมูลการซื้อของ'
        return
      }
      orderData.value = data
      subscribeToUpdates('shopping_requests', data.id)
    } else {
      error.value = 'รูปแบบรหัสติดตามไม่ถูกต้อง'
    }
  } catch (err) {
    console.error('Error fetching order:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

const subscribeToUpdates = (table: string, orderId: string) => {
  subscription = supabase
    .channel(`order-track-${orderId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: table,
      filter: `id=eq.${orderId}`
    }, (payload) => {
      orderData.value = { ...orderData.value, ...payload.new }
    })
    .subscribe()
}

onMounted(() => {
  fetchOrder()
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})

const getStatusText = (status: string) => {
  if (orderType.value === 'ride') {
    const statusMap: Record<string, string> = {
      'pending': 'กำลังหาคนขับ',
      'matched': 'คนขับกำลังมารับ',
      'pickup': 'คนขับถึงจุดรับแล้ว',
      'in_progress': 'กำลังเดินทาง',
      'completed': 'ถึงจุดหมายแล้ว',
      'cancelled': 'ยกเลิกแล้ว'
    }
    return statusMap[status] || status
  } else if (orderType.value === 'delivery') {
    return formatDeliveryStatus(status)
  } else {
    return formatShoppingStatus(status)
  }
}

const getStatusColor = (status: string) => {
  if (['completed', 'delivered'].includes(status)) return 'status-success'
  if (['cancelled', 'failed'].includes(status)) return 'status-error'
  if (['in_progress', 'in_transit', 'shopping', 'delivering'].includes(status)) return 'status-active'
  return 'status-pending'
}

const pickupLocation = computed(() => {
  if (!orderData.value) return null
  if (orderType.value === 'ride') {
    return { lat: orderData.value.pickup_lat, lng: orderData.value.pickup_lng, address: orderData.value.pickup_address }
  } else if (orderType.value === 'delivery') {
    return { lat: orderData.value.sender_lat, lng: orderData.value.sender_lng, address: orderData.value.sender_address }
  } else {
    return { lat: orderData.value.store_lat, lng: orderData.value.store_lng, address: orderData.value.store_address }
  }
})

const destinationLocation = computed(() => {
  if (!orderData.value) return null
  if (orderType.value === 'ride') {
    return { lat: orderData.value.destination_lat, lng: orderData.value.destination_lng, address: orderData.value.destination_address }
  } else if (orderType.value === 'delivery') {
    return { lat: orderData.value.recipient_lat, lng: orderData.value.recipient_lng, address: orderData.value.recipient_address }
  } else {
    return { lat: orderData.value.delivery_lat, lng: orderData.value.delivery_lng, address: orderData.value.delivery_address }
  }
})


</script>

<template>
  <div class="tracking-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <h2>{{ error }}</h2>
      <button @click="router.push('/')" class="btn-primary">กลับหน้าหลัก</button>
    </div>

    <!-- Order Data -->
    <template v-else-if="orderData">
      <div class="map-area">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="true"
          height="100%"
        />
      </div>

      <div class="info-panel">
        <div class="tracking-header">
          <span class="tracking-id">{{ trackingId }}</span>
          <span :class="['status-badge', getStatusColor(orderData.status)]">
            {{ getStatusText(orderData.status) }}
          </span>
        </div>

        <div class="trip-info">
          <div class="location-row">
            <div class="dot pickup"></div>
            <div class="location-text">
              <span class="label">{{ orderType === 'delivery' ? 'ผู้ส่ง' : orderType === 'shopping' ? 'ร้านค้า' : 'จุดรับ' }}</span>
              <span class="address">{{ pickupLocation?.address || '-' }}</span>
            </div>
          </div>
          <div class="location-row">
            <div class="dot destination"></div>
            <div class="location-text">
              <span class="label">{{ orderType === 'delivery' ? 'ผู้รับ' : 'จุดหมาย' }}</span>
              <span class="address">{{ destinationLocation?.address || '-' }}</span>
            </div>
          </div>
        </div>

        <div v-if="orderData.provider" class="driver-info">
          <div class="driver-avatar">
            <img v-if="orderData.provider.user?.avatar_url" :src="orderData.provider.user.avatar_url" alt="Driver" />
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="driver-text">
            <span class="driver-name">{{ orderData.provider.user?.name || 'คนขับ' }}</span>
            <span class="vehicle">{{ orderData.provider.vehicle_type }} {{ orderData.provider.vehicle_color }} - {{ orderData.provider.vehicle_plate }}</span>
            <span class="rating">{{ orderData.provider.rating?.toFixed(1) || '5.0' }} ★</span>
          </div>
        </div>

        <div v-if="orderData.estimated_fare || orderData.estimated_fee || orderData.service_fee" class="fare-info">
          <span class="fare-label">ค่าบริการ</span>
          <span class="fare-amount">฿{{ orderData.final_fare || orderData.final_fee || orderData.total_cost || orderData.estimated_fare || orderData.estimated_fee || orderData.service_fee }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tracking-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state svg {
  width: 64px;
  height: 64px;
  color: #E11900;
  margin-bottom: 16px;
}

.error-state h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

.btn-primary {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.map-area {
  flex: 1;
  min-height: 50vh;
}

.info-panel {
  padding: 20px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  position: relative;
  z-index: 10;
}

.tracking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tracking-id {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}

.status-pending { background: #F6F6F6; color: #6B6B6B; }
.status-active { background: #E8F5E9; color: #2E7D32; }
.status-success { background: #E3F2FD; color: #1565C0; }
.status-error { background: #FFEBEE; color: #C62828; }

.trip-info {
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}

.location-row:first-child {
  border-bottom: 1px solid #E5E5E5;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
}

.dot.pickup { background: #000; }
.dot.destination { border: 2px solid #000; }

.location-text {
  flex: 1;
}

.location-text .label {
  display: block;
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 2px;
}

.location-text .address {
  font-size: 15px;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-avatar svg {
  width: 24px;
  height: 24px;
  color: #6B6B6B;
}

.driver-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
}

.vehicle {
  font-size: 13px;
  color: #6B6B6B;
}

.rating {
  font-size: 13px;
  color: #F59E0B;
}

.fare-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
}

.fare-label {
  font-size: 14px;
  color: #6B6B6B;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
}
</style>
