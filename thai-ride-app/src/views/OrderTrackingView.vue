<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import ChatWidget from '../components/customer/ChatWidget.vue'
import { supabase } from '../lib/supabase'
import { useDelivery } from '../composables/useDelivery'
import { useShopping } from '../composables/useShopping'
import { useRealtimeTracking } from '../composables/useRealtimeTracking'
import { useSoundNotification } from '../composables/useSoundNotification'

const route = useRoute()
const router = useRouter()
const { formatStatus: formatDeliveryStatus } = useDelivery()
const { formatStatus: formatShoppingStatus } = useShopping()
const { 
  startTracking, 
  stopTracking, 
  currentLocation: driverLocation,
  currentETA,
  formattedETA,
  trafficStatus
} = useRealtimeTracking()
const { notify, isMuted, toggleMute } = useSoundNotification()

const loading = ref(true)
const error = ref('')
const orderData = ref<any>(null)
const orderType = ref<'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'>('ride')
const showShareSheet = ref(false)
const showChatSheet = ref(false)
const copied = ref(false)
const unreadMessages = ref(0)
const previousStatus = ref<string | null>(null)

let subscription: any = null

const routeTrackingId = computed(() => route.params.trackingId as string)

// Display tracking_id from order data if available, otherwise use route param
const displayTrackingId = computed(() => {
  if (orderData.value?.tracking_id) {
    return orderData.value.tracking_id
  }
  return routeTrackingId.value
})

// Watch for status changes and play sound
watch(() => orderData.value?.status, (newStatus, oldStatus) => {
  if (newStatus && oldStatus && newStatus !== oldStatus) {
    previousStatus.value = oldStatus
    
    // Play appropriate sound based on status
    if (['completed', 'delivered'].includes(newStatus)) {
      notify('success')
    } else if (newStatus === 'cancelled') {
      notify('error')
    } else if (['pickup', 'arrived'].includes(newStatus)) {
      notify('arrival')
    } else {
      notify('status_change')
    }
  }
})

// Handle new chat message
const handleNewMessage = () => {
  if (!showChatSheet.value) {
    unreadMessages.value++
    notify('message')
  }
}

// Open chat and reset unread
const openChat = () => {
  showChatSheet.value = true
  unreadMessages.value = 0
}

// Helper: Check if string is UUID format
const isUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Determine order type from tracking ID prefix
const getOrderTypeFromPrefix = (id: string): { type: typeof orderType.value; table: string } | null => {
  const prefixMap: Record<string, { type: typeof orderType.value; table: string }> = {
    'RID-': { type: 'ride', table: 'ride_requests' },
    'DEL-': { type: 'delivery', table: 'delivery_requests' },
    'SHP-': { type: 'shopping', table: 'shopping_requests' },
    'QUE-': { type: 'queue', table: 'queue_bookings' },
    'MOV-': { type: 'moving', table: 'moving_requests' },
    'LAU-': { type: 'laundry', table: 'laundry_requests' }
  }
  for (const [prefix, config] of Object.entries(prefixMap)) {
    if (id.startsWith(prefix)) return config
  }
  return null
}

// Helper: Try to find order by UUID in all tables
const findOrderByUUID = async (uuid: string) => {
  const tables = [
    { table: 'ride_requests', type: 'ride' as const },
    { table: 'delivery_requests', type: 'delivery' as const },
    { table: 'shopping_requests', type: 'shopping' as const },
    { table: 'queue_bookings', type: 'queue' as const },
    { table: 'moving_requests', type: 'moving' as const },
    { table: 'laundry_requests', type: 'laundry' as const }
  ]
  for (const { table, type } of tables) {
    const { data } = await (supabase.from(table) as any)
      .select(`*, provider:provider_id (
        id, vehicle_type, vehicle_plate, vehicle_color, rating, current_lat, current_lng,
        user:user_id (name, phone, avatar_url)
      ), user:user_id (name, phone)`)
      .eq('id', uuid)
      .maybeSingle()
    if (data) return { data, type, table }
  }
  return null
}

const fetchOrder = async () => {
  const id = routeTrackingId.value
  if (!id) {
    error.value = 'ไม่พบรหัสติดตาม'
    loading.value = false
    return
  }
  try {
    let result: { data: any; type: typeof orderType.value; table: string } | null = null
    if (isUUID(id)) {
      result = await findOrderByUUID(id)
    } else {
      const config = getOrderTypeFromPrefix(id)
      if (config) {
        const { data } = await (supabase.from(config.table) as any)
          .select(`*, provider:provider_id (
            id, vehicle_type, vehicle_plate, vehicle_color, rating, current_lat, current_lng,
            user:user_id (name, phone, avatar_url)
          ), user:user_id (name, phone)`)
          .eq('tracking_id', id)
          .maybeSingle()
        if (data) result = { data, type: config.type, table: config.table }
      }
    }
    if (result) {
      orderType.value = result.type
      orderData.value = result.data
      subscribeToUpdates(result.table, result.data.id)
      if (result.data.provider_id && !['completed', 'cancelled', 'delivered'].includes(result.data.status)) {
        startTracking(result.data.id, result.data.provider_id)
      }
    } else {
      error.value = 'ไม่พบข้อมูลคำสั่ง'
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
      if (['completed', 'cancelled', 'delivered'].includes(payload.new.status)) {
        stopTracking()
      }
    })
    .subscribe()
}

onMounted(() => { fetchOrder() })
onUnmounted(() => {
  if (subscription) subscription.unsubscribe()
  stopTracking()
})

// Status helpers
const getStatusText = (status: string) => {
  const statusMaps: Record<string, Record<string, string>> = {
    ride: { 'pending': 'กำลังหาคนขับ', 'matched': 'คนขับกำลังมารับ', 'pickup': 'คนขับถึงจุดรับแล้ว', 'in_progress': 'กำลังเดินทาง', 'completed': 'ถึงจุดหมายแล้ว', 'cancelled': 'ยกเลิกแล้ว' },
    delivery: { 'pending': 'รอไรเดอร์รับงาน', 'matched': 'ไรเดอร์กำลังไปรับพัสดุ', 'picked_up': 'รับพัสดุแล้ว', 'in_transit': 'กำลังจัดส่ง', 'delivered': 'ส่งสำเร็จ', 'cancelled': 'ยกเลิกแล้ว' },
    shopping: { 'pending': 'รอคนรับงาน', 'matched': 'กำลังไปซื้อของ', 'shopping': 'กำลังซื้อของ', 'delivering': 'กำลังจัดส่ง', 'delivered': 'ส่งสำเร็จ', 'cancelled': 'ยกเลิกแล้ว' },
    queue: { 'pending': 'รอยืนยัน', 'confirmed': 'ยืนยันแล้ว', 'in_queue': 'อยู่ในคิว', 'serving': 'กำลังให้บริการ', 'completed': 'เสร็จสิ้น', 'cancelled': 'ยกเลิกแล้ว' },
    moving: { 'pending': 'รอทีมงาน', 'matched': 'ทีมงานกำลังมา', 'loading': 'กำลังขนของ', 'in_transit': 'กำลังเดินทาง', 'unloading': 'กำลังลงของ', 'completed': 'เสร็จสิ้น', 'cancelled': 'ยกเลิกแล้ว' },
    laundry: { 'pending': 'รอรับผ้า', 'picked_up': 'รับผ้าแล้ว', 'washing': 'กำลังซัก', 'ready': 'พร้อมส่งคืน', 'delivering': 'กำลังส่งคืน', 'delivered': 'ส่งคืนแล้ว', 'cancelled': 'ยกเลิกแล้ว' }
  }
  return statusMaps[orderType.value]?.[status] || status
}

const getStatusColor = (status: string) => {
  if (['completed', 'delivered'].includes(status)) return 'status-success'
  if (['cancelled', 'failed'].includes(status)) return 'status-error'
  if (['in_progress', 'in_transit', 'shopping', 'delivering', 'washing', 'loading', 'unloading', 'serving'].includes(status)) return 'status-active'
  if (['matched', 'picked_up', 'confirmed', 'ready'].includes(status)) return 'status-matched'
  return 'status-pending'
}

const getStatusSteps = computed(() => {
  const stepsMap: Record<string, { key: string; label: string }[]> = {
    ride: [{ key: 'pending', label: 'หาคนขับ' }, { key: 'matched', label: 'กำลังมารับ' }, { key: 'pickup', label: 'ถึงจุดรับ' }, { key: 'in_progress', label: 'เดินทาง' }, { key: 'completed', label: 'ถึงแล้ว' }],
    delivery: [{ key: 'pending', label: 'รอรับงาน' }, { key: 'matched', label: 'ไปรับพัสดุ' }, { key: 'picked_up', label: 'รับพัสดุแล้ว' }, { key: 'in_transit', label: 'กำลังส่ง' }, { key: 'delivered', label: 'ส่งสำเร็จ' }],
    shopping: [{ key: 'pending', label: 'รอรับงาน' }, { key: 'matched', label: 'ไปร้าน' }, { key: 'shopping', label: 'ซื้อของ' }, { key: 'delivering', label: 'กำลังส่ง' }, { key: 'delivered', label: 'ส่งสำเร็จ' }],
    queue: [{ key: 'pending', label: 'รอยืนยัน' }, { key: 'confirmed', label: 'ยืนยันแล้ว' }, { key: 'in_queue', label: 'อยู่ในคิว' }, { key: 'serving', label: 'ให้บริการ' }, { key: 'completed', label: 'เสร็จสิ้น' }],
    moving: [{ key: 'pending', label: 'รอทีมงาน' }, { key: 'matched', label: 'กำลังมา' }, { key: 'loading', label: 'ขนของ' }, { key: 'in_transit', label: 'เดินทาง' }, { key: 'completed', label: 'เสร็จสิ้น' }],
    laundry: [{ key: 'pending', label: 'รอรับผ้า' }, { key: 'picked_up', label: 'รับผ้าแล้ว' }, { key: 'washing', label: 'กำลังซัก' }, { key: 'ready', label: 'พร้อมส่ง' }, { key: 'delivered', label: 'ส่งคืนแล้ว' }]
  }
  return stepsMap[orderType.value] || stepsMap.ride
})

const currentStepIndex = computed(() => {
  if (!orderData.value) return 0
  const steps = getStatusSteps.value
  const idx = steps.findIndex(s => s.key === orderData.value.status)
  return idx >= 0 ? idx : 0
})

// Location helpers
const pickupLocation = computed(() => {
  if (!orderData.value) return null
  const locationMap: Record<string, { latKey: string; lngKey: string; addressKey: string }> = {
    ride: { latKey: 'pickup_lat', lngKey: 'pickup_lng', addressKey: 'pickup_address' },
    delivery: { latKey: 'sender_lat', lngKey: 'sender_lng', addressKey: 'sender_address' },
    shopping: { latKey: 'store_lat', lngKey: 'store_lng', addressKey: 'store_address' },
    queue: { latKey: 'location_lat', lngKey: 'location_lng', addressKey: 'location_address' },
    moving: { latKey: 'origin_lat', lngKey: 'origin_lng', addressKey: 'origin_address' },
    laundry: { latKey: 'pickup_lat', lngKey: 'pickup_lng', addressKey: 'pickup_address' }
  }
  const config = locationMap[orderType.value]
  if (!config) return null
  return { lat: orderData.value[config.latKey], lng: orderData.value[config.lngKey], address: orderData.value[config.addressKey] }
})

const destinationLocation = computed(() => {
  if (!orderData.value) return null
  const locationMap: Record<string, { latKey: string; lngKey: string; addressKey: string }> = {
    ride: { latKey: 'destination_lat', lngKey: 'destination_lng', addressKey: 'destination_address' },
    delivery: { latKey: 'recipient_lat', lngKey: 'recipient_lng', addressKey: 'recipient_address' },
    shopping: { latKey: 'delivery_lat', lngKey: 'delivery_lng', addressKey: 'delivery_address' },
    queue: { latKey: 'location_lat', lngKey: 'location_lng', addressKey: 'location_address' },
    moving: { latKey: 'destination_lat', lngKey: 'destination_lng', addressKey: 'destination_address' },
    laundry: { latKey: 'delivery_lat', lngKey: 'delivery_lng', addressKey: 'delivery_address' }
  }
  const config = locationMap[orderType.value]
  if (!config) return null
  return { lat: orderData.value[config.latKey], lng: orderData.value[config.lngKey], address: orderData.value[config.addressKey] }
})

const driverMapLocation = computed(() => {
  if (!driverLocation.value) return null
  return { lat: driverLocation.value.latitude, lng: driverLocation.value.longitude }
})

// Service type labels
const serviceTypeLabel = computed(() => {
  const labels: Record<string, string> = { ride: 'เรียกรถ', delivery: 'ส่งพัสดุ', shopping: 'ซื้อของ', queue: 'จองคิว', moving: 'ขนย้าย', laundry: 'ซักผ้า' }
  return labels[orderType.value] || 'บริการ'
})

const serviceTypeIcon = computed(() => {
  const icons: Record<string, string> = { ride: 'car', delivery: 'package', shopping: 'cart', queue: 'clock', moving: 'truck', laundry: 'shirt' }
  return icons[orderType.value] || 'box'
})

const pickupLabel = computed(() => {
  const labels: Record<string, string> = { ride: 'จุดรับ', delivery: 'ผู้ส่ง', shopping: 'ร้านค้า', queue: 'สถานที่', moving: 'ต้นทาง', laundry: 'รับผ้า' }
  return labels[orderType.value] || 'จุดรับ'
})

const destinationLabel = computed(() => {
  const labels: Record<string, string> = { ride: 'จุดหมาย', delivery: 'ผู้รับ', shopping: 'ส่งที่', queue: 'สถานที่', moving: 'ปลายทาง', laundry: 'ส่งคืน' }
  return labels[orderType.value] || 'จุดหมาย'
})

// Share functionality
const getBaseUrl = () => {
  return import.meta.env.VITE_APP_URL || window.location.origin
}
const shareUrl = computed(() => `${getBaseUrl()}/tracking/${displayTrackingId.value}`)

const copyTrackingLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch {
    const input = document.createElement('input')
    input.value = shareUrl.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  }
}

const shareTracking = async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: `ติดตามคำสั่ง ${displayTrackingId.value}`, text: `ติดตามสถานะ${serviceTypeLabel.value}ของคุณ`, url: shareUrl.value })
    } catch { showShareSheet.value = true }
  } else { showShareSheet.value = true }
}

const callProvider = () => {
  if (orderData.value?.provider?.user?.phone) {
    window.location.href = `tel:${orderData.value.provider.user.phone}`
  }
}

const formatPrice = (price: number | null | undefined) => {
  if (!price) return '฿0'
  return `฿${price.toLocaleString()}`
}

const totalPrice = computed(() => {
  if (!orderData.value) return 0
  return orderData.value.final_fare || orderData.value.final_fee || orderData.value.total_cost || orderData.value.estimated_fare || orderData.value.estimated_fee || orderData.value.service_fee || 0
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const isCompleted = computed(() => ['completed', 'delivered'].includes(orderData.value?.status))
const isCancelled = computed(() => orderData.value?.status === 'cancelled')
const isActive = computed(() => !isCompleted.value && !isCancelled.value)
const canCancel = computed(() => ['pending', 'confirmed'].includes(orderData.value?.status))

// Cancel order functionality
const showCancelSheet = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)

const cancelReasons = [
  'เปลี่ยนใจ',
  'รอนานเกินไป',
  'ราคาสูงเกินไป',
  'จองผิดสถานที่',
  'มีเหตุฉุกเฉิน',
  'อื่นๆ'
]

const getTableName = () => {
  const tableMap: Record<string, string> = {
    ride: 'ride_requests',
    delivery: 'delivery_requests',
    shopping: 'shopping_requests',
    queue: 'queue_bookings',
    moving: 'moving_requests',
    laundry: 'laundry_requests'
  }
  return tableMap[orderType.value] || 'ride_requests'
}

const cancelOrder = async () => {
  if (!orderData.value || !cancelReason.value) return
  
  cancelling.value = true
  try {
    const table = getTableName()
    const { error: updateError } = await supabase
      .from(table)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason.value,
        cancelled_by: 'customer'
      })
      .eq('id', orderData.value.id)
    
    if (updateError) throw updateError
    
    orderData.value.status = 'cancelled'
    showCancelSheet.value = false
    notify('error')
  } catch (err) {
    console.error('Error cancelling order:', err)
    alert('ไม่สามารถยกเลิกคำสั่งได้ กรุณาลองใหม่')
  } finally {
    cancelling.value = false
  }
}

// Map location props - ensure valid coordinates
const mapPickup = computed(() => {
  const loc = pickupLocation.value
  if (!loc) return null
  const lat = Number(loc.lat)
  const lng = Number(loc.lng)
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null
  return { lat, lng }
})

const mapDestination = computed(() => {
  const loc = destinationLocation.value
  if (!loc) return null
  const lat = Number(loc.lat)
  const lng = Number(loc.lng)
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null
  return { lat, lng }
})

// Default map center (Bangkok) when no coordinates available
const defaultMapCenter = { lat: 13.7563, lng: 100.5018 }
</script>

<template>
  <div class="tracking-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-content">
        <div class="pulse-ring"></div>
        <div class="loading-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
      <p class="loading-text">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <h2>{{ error }}</h2>
      <p>กรุณาตรวจสอบรหัสติดตามและลองใหม่อีกครั้ง</p>
      <div class="error-actions">
        <button @click="router.push('/tracking')" class="btn-primary">ค้นหาใหม่</button>
        <button @click="router.push('/')" class="btn-secondary">กลับหน้าหลัก</button>
      </div>
    </div>

    <!-- Order Data -->
    <template v-else-if="orderData">
      <!-- Map Area -->
      <div class="map-area">
        <MapView
          :pickup="mapPickup || defaultMapCenter"
          :destination="mapDestination"
          :driver-location="driverMapLocation"
          :show-route="!!mapPickup && !!mapDestination"
          height="100%"
        />
        
        <!-- Top Bar -->
        <div class="top-bar">
          <button class="icon-btn" @click="router.back()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <div class="tracking-badge">
            <span class="badge-label">รหัสติดตาม</span>
            <span class="badge-id">{{ displayTrackingId }}</span>
          </div>
          
          <div class="top-actions">
            <!-- Mute Button -->
            <button class="icon-btn small" @click="toggleMute" :class="{ muted: isMuted }">
              <svg v-if="!isMuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            </button>
            
            <!-- Share Button -->
            <button class="icon-btn" @click="shareTracking">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ETA Floating Card -->
        <div v-if="formattedETA && isActive" class="eta-card">
          <div class="eta-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="eta-info">
            <span class="eta-label">เวลาถึงโดยประมาณ</span>
            <span class="eta-time">{{ formattedETA }}</span>
          </div>
          <div v-if="trafficStatus" class="traffic-indicator" :style="{ background: trafficStatus.color }">
            {{ trafficStatus.label }}
          </div>
        </div>
      </div>

      <!-- Info Panel -->
      <div class="info-panel" :class="{ 'panel-completed': isCompleted, 'panel-cancelled': isCancelled }">
        <!-- Drag Handle -->
        <div class="drag-handle"></div>

        <!-- Status Header -->
        <div class="status-header">
          <div class="status-icon" :class="getStatusColor(orderData.status)">
            <svg v-if="isCompleted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            <svg v-else-if="isCancelled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="status-text">
            <span class="status-main">{{ getStatusText(orderData.status) }}</span>
            <span class="status-sub">{{ serviceTypeLabel }} • {{ formatDate(orderData.created_at) }}</span>
          </div>
        </div>

        <!-- Progress Steps (only for active orders) -->
        <div v-if="isActive && orderData.status !== 'cancelled'" class="progress-section">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${(currentStepIndex / (getStatusSteps.length - 1)) * 100}%` }"></div>
          </div>
          <div class="progress-steps">
            <div 
              v-for="(step, idx) in getStatusSteps" 
              :key="step.key"
              :class="['step', { 'active': idx === currentStepIndex, 'completed': idx < currentStepIndex }]"
            >
              <div class="step-dot">
                <svg v-if="idx < currentStepIndex" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
          </div>
        </div>

        <!-- Completed Banner -->
        <div v-if="isCompleted" class="completed-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          <span>บริการเสร็จสมบูรณ์</span>
        </div>

        <!-- Cancelled Banner -->
        <div v-if="isCancelled" class="cancelled-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
          <span>คำสั่งถูกยกเลิก</span>
        </div>

        <!-- Driver Card -->
        <div v-if="orderData.provider" class="driver-card">
          <div class="driver-avatar">
            <img v-if="orderData.provider.user?.avatar_url" :src="orderData.provider.user.avatar_url" alt="Driver" />
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="driver-info">
            <span class="driver-name">{{ orderData.provider.user?.name || 'ผู้ให้บริการ' }}</span>
            <div class="driver-meta">
              <span class="vehicle-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                {{ orderData.provider.vehicle_color }} {{ orderData.provider.vehicle_plate }}
              </span>
              <span class="rating">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {{ orderData.provider.rating?.toFixed(1) || '5.0' }}
              </span>
            </div>
          </div>
          <div class="driver-actions" v-if="isActive">
            <!-- Chat Button -->
            <button class="action-btn chat-btn" @click="openChat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span v-if="unreadMessages > 0" class="unread-badge">{{ unreadMessages }}</span>
            </button>
            <!-- Call Button -->
            <button v-if="orderData.provider.user?.phone" class="action-btn call-btn" @click="callProvider">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Locations -->
        <div class="locations-section">
          <div class="location-item">
            <div class="location-dot pickup"></div>
            <div class="location-content">
              <span class="location-label">{{ pickupLabel }}</span>
              <span class="location-address">{{ pickupLocation?.address || '-' }}</span>
            </div>
          </div>
          <div class="location-connector"></div>
          <div class="location-item">
            <div class="location-dot destination"></div>
            <div class="location-content">
              <span class="location-label">{{ destinationLabel }}</span>
              <span class="location-address">{{ destinationLocation?.address || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Fare Summary -->
        <div class="fare-section">
          <div class="fare-header">
            <span>สรุปค่าบริการ</span>
          </div>
          <div class="fare-row total">
            <span>ยอดรวม</span>
            <span class="fare-amount">{{ formatPrice(totalPrice) }}</span>
          </div>
          <div v-if="orderData.payment_method" class="payment-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>{{ orderData.payment_method === 'cash' ? 'ชำระเงินสด' : orderData.payment_method === 'wallet' ? 'ชำระผ่าน Wallet' : orderData.payment_method }}</span>
          </div>
        </div>

        <!-- Cancel Button (only for pending/confirmed orders) -->
        <div v-if="canCancel" class="cancel-section">
          <button class="btn-cancel" @click="showCancelSheet = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            ยกเลิกคำสั่ง
          </button>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="btn-outline" @click="router.push('/tracking')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            ค้นหาคำสั่งอื่น
          </button>
          <button class="btn-primary" @click="shareTracking">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16,6 12,2 8,6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            แชร์ลิงก์
          </button>
        </div>
      </div>

      <!-- Share Sheet -->
      <div v-if="showShareSheet" class="sheet-overlay" @click="showShareSheet = false">
        <div class="sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <h3>แชร์ลิงก์ติดตาม</h3>
            <button class="close-btn" @click="showShareSheet = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="sheet-content">
            <div class="share-url-box">
              <input type="text" :value="shareUrl" readonly />
              <button @click="copyTrackingLink" :class="{ 'copied': copied }">
                <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </button>
            </div>
            <p class="share-hint">{{ copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์เพื่อแชร์ให้ผู้อื่น' }}</p>
          </div>
        </div>
      </div>

      <!-- Chat Sheet -->
      <div v-if="showChatSheet" class="sheet-overlay chat-overlay" @click="showChatSheet = false">
        <div class="sheet chat-sheet" @click.stop>
          <ChatWidget
            :order-id="orderData.id"
            :order-type="orderType"
            :provider-name="orderData.provider?.user?.name"
            @close="showChatSheet = false"
            @new-message="handleNewMessage"
          />
        </div>
      </div>

      <!-- Cancel Sheet -->
      <div v-if="showCancelSheet" class="sheet-overlay" @click="showCancelSheet = false">
        <div class="sheet cancel-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <h3>ยกเลิกคำสั่ง</h3>
            <button class="close-btn" @click="showCancelSheet = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="sheet-content">
            <p class="cancel-warning">กรุณาเลือกเหตุผลในการยกเลิก</p>
            <div class="cancel-reasons">
              <button
                v-for="reason in cancelReasons"
                :key="reason"
                :class="['reason-btn', { selected: cancelReason === reason }]"
                @click="cancelReason = reason"
              >
                <span class="reason-radio">
                  <span v-if="cancelReason === reason" class="radio-dot"></span>
                </span>
                {{ reason }}
              </button>
            </div>
            <button
              class="btn-confirm-cancel"
              :disabled="!cancelReason || cancelling"
              @click="cancelOrder"
            >
              <svg v-if="cancelling" class="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-linecap="round"/>
              </svg>
              <span v-else>ยืนยันการยกเลิก</span>
            </button>
          </div>
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
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(180deg, #E8F5EF 0%, #FFFFFF 50%);
}

.loading-content {
  position: relative;
  width: 80px;
  height: 80px;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #00A86B;
  border-radius: 50%;
  animation: pulse 1.5s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.loading-icon {
  position: absolute;
  inset: 0;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-icon svg {
  width: 36px;
  height: 36px;
  color: #fff;
}

.loading-text {
  margin-top: 24px;
  font-size: 16px;
  color: #666666;
}

/* Error State */
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.error-icon-wrap {
  width: 80px;
  height: 80px;
  background: #FFEBEE;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.error-icon-wrap svg {
  width: 40px;
  height: 40px;
  color: #E53935;
}

.error-state h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.error-state p {
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px;
}

.error-actions {
  display: flex;
  gap: 12px;
}

/* Buttons */
.btn-primary {
  padding: 14px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s ease;
}

.btn-primary:hover { background: #008F5B; transform: translateY(-1px); }

.btn-primary svg { width: 18px; height: 18px; }

.btn-secondary {
  padding: 14px 24px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-outline {
  padding: 14px 24px;
  background: transparent;
  color: #00A86B;
  border: 2px solid #00A86B;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-outline:hover { background: #E8F5EF; }

.btn-outline svg { width: 18px; height: 18px; }

/* Map Area */
.map-area {
  flex: 1;
  min-height: 40vh;
  position: relative;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  background: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn.small {
  width: 36px;
  height: 36px;
}

.icon-btn.small svg {
  width: 16px;
  height: 16px;
}

.icon-btn.muted {
  background: #F5F5F5;
}

.icon-btn.muted svg {
  color: #999999;
}

.icon-btn svg { width: 20px; height: 20px; color: #1A1A1A; }

.tracking-badge {
  background: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.badge-label { font-size: 10px; color: #999999; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-id { font-size: 13px; font-weight: 600; color: #1A1A1A; font-family: monospace; }

/* ETA Card */
.eta-card {
  position: absolute;
  bottom: 24px;
  left: 16px;
  right: 16px;
  background: #fff;
  padding: 14px 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
}

.eta-icon {
  width: 44px;
  height: 44px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.eta-icon svg { width: 24px; height: 24px; color: #00A86B; }

.eta-info { flex: 1; }
.eta-label { display: block; font-size: 12px; color: #999999; }
.eta-time { display: block; font-size: 18px; font-weight: 700; color: #1A1A1A; }

.traffic-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

/* Info Panel */
.info-panel {
  background: #fff;
  border-radius: 24px 24px 0 0;
  margin-top: -24px;
  position: relative;
  z-index: 10;
  padding: 12px 20px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
}

.panel-completed { background: linear-gradient(180deg, #E8F5EF 0%, #FFFFFF 30%); }
.panel-cancelled { background: linear-gradient(180deg, #FFEBEE 0%, #FFFFFF 30%); }

.drag-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* Status Header */
.status-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.status-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon svg { width: 26px; height: 26px; }

.status-icon.status-pending { background: #F5F5F5; color: #666666; }
.status-icon.status-matched { background: #FFF3E0; color: #E65100; }
.status-icon.status-active { background: #E8F5EF; color: #00A86B; }
.status-icon.status-success { background: #E8F5EF; color: #00A86B; }
.status-icon.status-error { background: #FFEBEE; color: #E53935; }

.status-text { flex: 1; }
.status-main { display: block; font-size: 18px; font-weight: 700; color: #1A1A1A; }
.status-sub { display: block; font-size: 13px; color: #999999; margin-top: 2px; }

/* Progress Section */
.progress-section { margin-bottom: 20px; }

.progress-track {
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin-bottom: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.step.completed .step-dot { background: #00A86B; color: #fff; }
.step.active .step-dot { background: #00A86B; box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.2); }

.step-dot svg { width: 14px; height: 14px; }

.step-label { font-size: 11px; color: #999999; text-align: center; }
.step.completed .step-label, .step.active .step-label { color: #00A86B; font-weight: 600; }

/* Banners */
.completed-banner, .cancelled-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  margin-bottom: 20px;
  font-size: 15px;
  font-weight: 600;
}

.completed-banner { background: #E8F5EF; color: #00A86B; }
.cancelled-banner { background: #FFEBEE; color: #E53935; }

.completed-banner svg, .cancelled-banner svg { width: 22px; height: 22px; }

/* Driver Card */
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 16px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.driver-avatar img { width: 100%; height: 100%; object-fit: cover; }
.driver-avatar svg { width: 28px; height: 28px; color: #999999; }

.driver-info { flex: 1; min-width: 0; }
.driver-name { display: block; font-size: 16px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px; }

.driver-meta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

.vehicle-info svg { width: 16px; height: 16px; }

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #F5A623;
  font-weight: 600;
}

.rating svg { width: 14px; height: 14px; }

.driver-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.action-btn svg { width: 20px; height: 20px; }

.chat-btn {
  background: #E8F5EF;
}

.chat-btn svg { color: #00A86B; }

.chat-btn:hover { background: #D0EBE0; }

.call-btn {
  background: #00A86B;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.call-btn svg { color: #fff; }

.call-btn:hover { background: #008F5B; }

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: #E53935;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Locations Section */
.locations-section {
  background: #F5F5F5;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.location-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.location-dot.pickup { background: #00A86B; }
.location-dot.destination { background: #E53935; }

.location-content { flex: 1; min-width: 0; }
.location-label { display: block; font-size: 12px; color: #999999; margin-bottom: 2px; }
.location-address { display: block; font-size: 14px; color: #1A1A1A; line-height: 1.4; }

.location-connector {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin: 4px 0 4px 6px;
}

/* Fare Section */
.fare-section {
  background: #F5F5F5;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.fare-header {
  font-size: 13px;
  color: #999999;
  margin-bottom: 8px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fare-row.total span:first-child { font-size: 15px; color: #1A1A1A; font-weight: 500; }
.fare-amount { font-size: 24px; font-weight: 700; color: #00A86B; }

.payment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
  font-size: 13px;
  color: #666666;
}

.payment-row svg { width: 18px; height: 18px; }

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .btn-outline, .action-buttons .btn-primary { flex: 1; justify-content: center; }

/* Sheet Overlay */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.chat-overlay {
  align-items: stretch;
}

.sheet {
  background: #fff;
  width: 100%;
  max-width: 500px;
  border-radius: 24px 24px 0 0;
  padding: 12px 20px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  animation: slideUp 0.3s ease;
}

.chat-sheet {
  padding: 0;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sheet-header h3 { font-size: 18px; font-weight: 600; color: #1A1A1A; margin: 0; }

.close-btn {
  width: 36px;
  height: 36px;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg { width: 18px; height: 18px; color: #666666; }

.share-url-box {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.share-url-box input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  color: #1A1A1A;
  background: #F5F5F5;
  font-family: monospace;
}

.share-url-box button {
  width: 52px;
  height: 52px;
  background: #00A86B;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.share-url-box button.copied { background: #008F5B; }
.share-url-box button svg { width: 22px; height: 22px; color: #fff; }

.share-hint { font-size: 13px; color: #666666; text-align: center; margin: 0; }

/* Cancel Section */
.cancel-section {
  margin-bottom: 16px;
}

.btn-cancel {
  width: 100%;
  padding: 14px 20px;
  background: #FFF5F5;
  color: #E53935;
  border: 2px solid #FFCDD2;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #FFEBEE;
  border-color: #E53935;
}

.btn-cancel svg {
  width: 20px;
  height: 20px;
}

/* Cancel Sheet */
.cancel-sheet {
  max-height: 70vh;
}

.cancel-warning {
  font-size: 14px;
  color: #666666;
  margin: 0 0 16px;
}

.cancel-reasons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.reason-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.reason-btn:hover {
  background: #EEEEEE;
}

.reason-btn.selected {
  background: #FFF5F5;
  border-color: #E53935;
}

.reason-radio {
  width: 22px;
  height: 22px;
  border: 2px solid #E8E8E8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reason-btn.selected .reason-radio {
  border-color: #E53935;
}

.radio-dot {
  width: 12px;
  height: 12px;
  background: #E53935;
  border-radius: 50%;
}

.btn-confirm-cancel {
  width: 100%;
  padding: 16px 24px;
  background: #E53935;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
}

.btn-confirm-cancel:hover:not(:disabled) {
  background: #C62828;
}

.btn-confirm-cancel:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
}

.btn-confirm-cancel .spinner {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
