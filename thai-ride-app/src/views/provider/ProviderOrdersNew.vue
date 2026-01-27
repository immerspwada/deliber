<script setup lang="ts">
/**
 * ProviderOrdersNew - หน้ารายละเอียด Orders (Enhanced UX/UI)
 * 
 * Improvements:
 * - Service type badges and grouping
 * - Better visual hierarchy
 * - Smart filtering by service type
 * - Enhanced earnings display
 * - Empty states
 * - Larger touch targets
 * - Cleaner layout with better spacing
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import JobPreviewMap from '../../components/provider/JobPreviewMap.vue'

const router = useRouter()

// Types
interface Order {
  id: string
  tracking_id?: string
  pickup_address: string
  destination_address: string
  pickup_lat: number
  pickup_lng: number
  destination_lat: number
  destination_lng: number
  estimated_fare: number
  final_fare: number | null
  actual_fare: number | null
  paid_amount: number | null
  promo_discount_amount: number | null
  promo_code: string | null
  payment_method: string | null
  tip_amount: number | null
  distance: number
  created_at: string
  service_type?: 'ride' | 'queue'
  scheduled_date?: string
  scheduled_time?: string
  place_name?: string
}

type ServiceFilter = 'all' | 'ride' | 'queue'

// State
const loading = ref(true)
const showMapPreview = ref(false)
const realtimeChannel = ref<any>(null)
const selectedOrderForMap = ref<Order | null>(null)
const orders = ref<Order[]>([])
const selectedOrders = ref<Set<string>>(new Set())
const alwaysBestRoute = ref(true)
const serviceFilter = ref<ServiceFilter>('all')

// Computed - Filtered orders
const filteredOrders = computed(() => {
  if (serviceFilter.value === 'all') return orders.value
  return orders.value.filter(o => o.service_type === serviceFilter.value)
})

// Computed - Grouped orders
const rideOrders = computed(() => 
  filteredOrders.value.filter(o => o.service_type === 'ride')
)

const queueOrders = computed(() => 
  filteredOrders.value.filter(o => o.service_type === 'queue')
)

// Computed - Counts
const rideCount = computed(() => rideOrders.value.length)
const queueCount = computed(() => queueOrders.value.length)
const selectedRideCount = computed(() => 
  rideOrders.value.filter(o => selectedOrders.value.has(o.id)).length
)
const selectedQueueCount = computed(() => 
  queueOrders.value.filter(o => selectedOrders.value.has(o.id)).length
)

// Computed - Earnings
const totalEarnings = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => {
      const fare = (o.paid_amount && o.paid_amount > 0 ? o.paid_amount : null) 
        ?? (o.final_fare && o.final_fare > 0 ? o.final_fare : null)
        ?? (o.actual_fare && o.actual_fare > 0 ? o.actual_fare : null)
        ?? o.estimated_fare 
        ?? 0
      return sum + fare
    }, 0)
})

const totalDiscount = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => sum + (o.promo_discount_amount || 0), 0)
})

const totalTips = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => sum + (o.tip_amount || 0), 0)
})

const totalDistance = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => sum + (o.distance || 0), 0)
})

const totalEstEarnings = computed(() => {
  return totalEarnings.value + totalTips.value
})

const dropPointsCount = computed(() => selectedOrders.value.size)

// Computed - Has orders
const hasOrders = computed(() => orders.value.length > 0)
const hasSelectedOrders = computed(() => selectedOrders.value.size > 0)

// Methods
async function loadOrders() {
  loading.value = true
  try {
    // Load both ride requests and queue bookings
    const [ridesResult, queueResult] = await Promise.all([
      supabase
        .from('ride_requests')
        .select('id, tracking_id, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, final_fare, actual_fare, paid_amount, promo_discount_amount, promo_code, payment_method, tip_amount, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),
      (supabase as any)
        .from('queue_bookings')
        .select('id, tracking_id, place_name, place_address, scheduled_date, scheduled_time, service_fee, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const allOrders: Order[] = []

    // Process ride requests
    if (ridesResult.data) {
      const rideOrders = ridesResult.data.map((o: any) => ({
        ...o,
        service_type: 'ride' as const,
        distance: calculateDistance(o.pickup_lat, o.pickup_lng, o.destination_lat, o.destination_lng)
      }))
      allOrders.push(...rideOrders)
    }

    // Process queue bookings
    if (queueResult.data) {
      const queueOrders = queueResult.data.map((q: any) => ({
        id: q.id,
        tracking_id: q.tracking_id,
        pickup_address: q.place_name || q.place_address || 'จองคิว',
        destination_address: `${q.scheduled_date} ${q.scheduled_time}`,
        pickup_lat: 0, // Queue bookings don't have coordinates
        pickup_lng: 0,
        destination_lat: 0,
        destination_lng: 0,
        estimated_fare: q.service_fee || 50,
        final_fare: null,
        actual_fare: null,
        paid_amount: null,
        promo_discount_amount: null,
        promo_code: null,
        payment_method: null,
        tip_amount: null,
        distance: 0,
        created_at: q.created_at,
        service_type: 'queue' as const,
        scheduled_date: q.scheduled_date,
        scheduled_time: q.scheduled_time,
        place_name: q.place_name
      }))
      allOrders.push(...queueOrders)
    }

    // Sort by created_at (newest first)
    orders.value = allOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    
    // Select all by default
    orders.value.forEach(o => selectedOrders.value.add(o.id))
  } catch (err) {
    console.error('[Orders] Error:', err)
  } finally {
    loading.value = false
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Helper: Get fare display (skip 0 values)
function getFareDisplay(order: typeof orders.value[0]): string {
  const fare = (order.paid_amount && order.paid_amount > 0 ? order.paid_amount : null) 
    ?? (order.final_fare && order.final_fare > 0 ? order.final_fare : null)
    ?? (order.actual_fare && order.actual_fare > 0 ? order.actual_fare : null)
    ?? order.estimated_fare 
    ?? 0
  return fare.toFixed(0)
}

function toggleOrder(orderId: string) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId)
  } else {
    selectedOrders.value.add(orderId)
  }
  selectedOrders.value = new Set(selectedOrders.value)
}

function selectAll() {
  filteredOrders.value.forEach(o => selectedOrders.value.add(o.id))
  selectedOrders.value = new Set(selectedOrders.value)
}

function deselectAll() {
  selectedOrders.value.clear()
  selectedOrders.value = new Set(selectedOrders.value)
}

function setServiceFilter(filter: ServiceFilter) {
  serviceFilter.value = filter
}

function getServiceIcon(serviceType: 'ride' | 'queue' | undefined): string {
  if (serviceType === 'queue') return '📅'
  return '🚗'
}

function getServiceLabel(serviceType: 'ride' | 'queue' | undefined): string {
  if (serviceType === 'queue') return 'จองคิว'
  return 'เรียกรถ'
}

function getServiceColor(serviceType: 'ride' | 'queue' | undefined): string {
  if (serviceType === 'queue') return 'queue'
  return 'ride'
}

function openMapPreview(order: typeof orders.value[0]) {
  selectedOrderForMap.value = order
  showMapPreview.value = true
}

function closeMapPreview() {
  showMapPreview.value = false
  selectedOrderForMap.value = null
}

async function acceptOrders() {
  if (selectedOrders.value.size === 0) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[Orders] No user found')
      return
    }

    // Get provider ID
    const { data: provider, error: providerError } = await (supabase
      .from('providers_v2')
      .select('id')
      .eq('user_id', user.id)
      .single() as any)

    if (providerError || !provider) {
      console.error('[Orders] Provider not found:', providerError)
      alert('ไม่พบข้อมูลผู้ให้บริการ')
      return
    }

    // Separate ride requests and queue bookings
    const selectedOrdersList = Array.from(selectedOrders.value)
    const rideOrders = orders.value.filter(o => 
      selectedOrdersList.includes(o.id) && o.service_type === 'ride'
    )
    const queueOrders = orders.value.filter(o => 
      selectedOrdersList.includes(o.id) && o.service_type === 'queue'
    )

    // Accept ride requests
    for (const order of rideOrders) {
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({
          provider_id: provider.id,
          status: 'matched',
          matched_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .eq('status', 'pending')

      if (updateError) {
        console.error('[Orders] Accept ride error:', updateError)
        alert(`ไม่สามารถรับงานได้: ${updateError.message}`)
        return
      }
    }

    // Accept queue bookings
    for (const order of queueOrders) {
      const { error: updateError } = await ((supabase as any)
        .from('queue_bookings')
        .update({
          provider_id: provider.id,
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .eq('status', 'pending'))

      if (updateError) {
        console.error('[Orders] Accept queue error:', updateError)
        alert(`ไม่สามารถรับงานจองคิวได้: ${updateError.message}`)
        return
      }
    }

    // Navigate to first job detail (prefer ride over queue)
    const firstOrderId = rideOrders[0]?.id || queueOrders[0]?.id
    if (firstOrderId) {
      router.push(`/provider/job/${firstOrderId}`)
    }
  } catch (err) {
    console.error('[Orders] Accept error:', err)
  }
}

function customSelect() {
  // Clear selection and let user pick
  selectedOrders.value = new Set()
}

function goBack() {
  router.back()
}

// Lifecycle
onMounted(() => {
  loadOrders()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
    realtimeChannel.value = null
  }
})

// Realtime subscription for new jobs
function setupRealtimeSubscription() {
  console.log('[Orders] Setting up realtime subscription...')
  
  realtimeChannel.value = supabase
    .channel('provider-orders-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[Orders] New ride job received:', payload.new)
        // Add new job to the list
        const newJob = payload.new as any
        
        // Calculate distance and add to orders
        const jobWithDistance: Order = {
          id: newJob.id,
          tracking_id: newJob.tracking_id,
          pickup_address: newJob.pickup_address,
          destination_address: newJob.destination_address,
          pickup_lat: newJob.pickup_lat,
          pickup_lng: newJob.pickup_lng,
          destination_lat: newJob.destination_lat,
          destination_lng: newJob.destination_lng,
          estimated_fare: newJob.estimated_fare ?? 0,
          final_fare: newJob.final_fare ?? null,
          actual_fare: newJob.actual_fare ?? null,
          paid_amount: newJob.paid_amount ?? null,
          promo_discount_amount: newJob.promo_discount_amount ?? null,
          promo_code: newJob.promo_code ?? null,
          payment_method: newJob.payment_method ?? null,
          tip_amount: newJob.tip_amount ?? null,
          created_at: newJob.created_at,
          service_type: 'ride',
          distance: calculateDistance(newJob.pickup_lat, newJob.pickup_lng, newJob.destination_lat, newJob.destination_lng)
        }
        
        // Add to beginning of list
        orders.value = [jobWithDistance, ...orders.value]
        
        // Auto-select new job
        selectedOrders.value.add(newJob.id)
        selectedOrders.value = new Set(selectedOrders.value)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'queue_bookings',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[Orders] New queue booking received:', payload.new)
        const newQueue = payload.new as any
        
        const queueOrder: Order = {
          id: newQueue.id,
          tracking_id: newQueue.tracking_id,
          pickup_address: newQueue.place_name || newQueue.place_address || 'จองคิว',
          destination_address: `${newQueue.scheduled_date} ${newQueue.scheduled_time}`,
          pickup_lat: 0,
          pickup_lng: 0,
          destination_lat: 0,
          destination_lng: 0,
          estimated_fare: newQueue.service_fee || 50,
          final_fare: null,
          actual_fare: null,
          paid_amount: null,
          promo_discount_amount: null,
          promo_code: null,
          payment_method: null,
          tip_amount: null,
          distance: 0,
          created_at: newQueue.created_at,
          service_type: 'queue',
          scheduled_date: newQueue.scheduled_date,
          scheduled_time: newQueue.scheduled_time,
          place_name: newQueue.place_name
        }
        
        // Add to beginning of list
        orders.value = [queueOrder, ...orders.value]
        
        // Auto-select new job
        selectedOrders.value.add(newQueue.id)
        selectedOrders.value = new Set(selectedOrders.value)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      },
      (payload) => {
        console.log('[Orders] Ride job updated:', payload.new)
        const updated = payload.new as { id: string; status: string }
        
        // Remove job if it's no longer pending (someone else took it)
        if (updated.status !== 'pending') {
          orders.value = orders.value.filter(o => o.id !== updated.id)
          selectedOrders.value.delete(updated.id)
          selectedOrders.value = new Set(selectedOrders.value)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'queue_bookings'
      },
      (payload) => {
        console.log('[Orders] Queue booking updated:', payload.new)
        const updated = payload.new as { id: string; status: string }
        
        // Remove job if it's no longer pending
        if (updated.status !== 'pending') {
          orders.value = orders.value.filter(o => o.id !== updated.id)
          selectedOrders.value.delete(updated.id)
          selectedOrders.value = new Set(selectedOrders.value)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'ride_requests'
      },
      (payload) => {
        console.log('[Orders] Job deleted:', payload.old)
        const deleted = payload.old as { id: string }
        orders.value = orders.value.filter(o => o.id !== deleted.id)
        selectedOrders.value.delete(deleted.id)
        selectedOrders.value = new Set(selectedOrders.value)
      }
    )
    .subscribe((status) => {
      console.log('[Orders] Realtime subscription status:', status)
    })
}
</script>

<template>
  <div class="orders-page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" aria-label="กลับ" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 class="title">งานที่พร้อมรับ</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-text">กำลังโหลดงาน...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasOrders" class="empty-state">
      <div class="empty-icon">📭</div>
      <h2 class="empty-title">ยังไม่มีงานใหม่</h2>
      <p class="empty-description">เมื่อมีงานใหม่เข้ามา จะแสดงที่นี่ทันที</p>
      <button class="refresh-btn" @click="loadOrders">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6M23 20v-6h-6" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
        รีเฟรช
      </button>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Service Type Filter -->
      <div class="filter-tabs">
        <button 
          class="filter-tab"
          :class="{ active: serviceFilter === 'all' }"
          @click="setServiceFilter('all')"
        >
          <span class="tab-label">ทั้งหมด</span>
          <span class="tab-badge">{{ orders.length }}</span>
        </button>
        <button 
          class="filter-tab"
          :class="{ active: serviceFilter === 'ride' }"
          @click="setServiceFilter('ride')"
        >
          <span class="tab-icon">🚗</span>
          <span class="tab-label">เรียกรถ</span>
          <span class="tab-badge">{{ rideCount }}</span>
        </button>
        <button 
          class="filter-tab"
          :class="{ active: serviceFilter === 'queue' }"
          @click="setServiceFilter('queue')"
        >
          <span class="tab-icon">📅</span>
          <span class="tab-label">จองคิว</span>
          <span class="tab-badge">{{ queueCount }}</span>
        </button>
      </div>

      <!-- Earnings Summary Card -->
      <div v-if="hasSelectedOrders" class="earnings-card">
        <div class="earnings-header">
          <h2 class="earnings-title">รายได้โดยประมาณ</h2>
          <div class="earnings-count">
            <span v-if="selectedRideCount > 0">🚗 {{ selectedRideCount }}</span>
            <span v-if="selectedQueueCount > 0">📅 {{ selectedQueueCount }}</span>
          </div>
        </div>
        
        <div class="earnings-main">
          <span class="earnings-amount">฿{{ totalEstEarnings.toFixed(0) }}</span>
          <span class="earnings-label">จาก {{ dropPointsCount }} งาน</span>
        </div>

        <div class="earnings-breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">ค่าบริการ</span>
            <span class="breakdown-value">฿{{ totalEarnings.toFixed(0) }}</span>
          </div>
          <div v-if="totalTips > 0" class="breakdown-item">
            <span class="breakdown-label">ทิป</span>
            <span class="breakdown-value tip">+฿{{ totalTips.toFixed(0) }}</span>
          </div>
          <div v-if="totalDiscount > 0" class="breakdown-item">
            <span class="breakdown-label">ส่วนลด</span>
            <span class="breakdown-value discount">-฿{{ totalDiscount.toFixed(0) }}</span>
          </div>
          <div v-if="totalDistance > 0" class="breakdown-item">
            <span class="breakdown-label">ระยะทาง</span>
            <span class="breakdown-value">{{ totalDistance.toFixed(1) }} กม.</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button 
          class="quick-action-btn"
          :class="{ active: selectedOrders.size === filteredOrders.length }"
          @click="selectAll"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          เลือกทั้งหมด
        </button>
        <button 
          class="quick-action-btn"
          :disabled="!hasSelectedOrders"
          @click="deselectAll"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          ยกเลิกทั้งหมด
        </button>
      </div>

      <!-- Orders List -->
      <div class="orders-section">
        <div class="section-header">
          <h3 class="section-title">รายการงาน</h3>
          <span class="section-count">{{ filteredOrders.length }} งาน</span>
        </div>

        <!-- Ride Orders -->
        <div v-if="rideOrders.length > 0 && (serviceFilter === 'all' || serviceFilter === 'ride')" class="orders-group">
          <div v-if="serviceFilter === 'all'" class="group-label">
            <span class="group-icon">🚗</span>
            <span class="group-text">เรียกรถ ({{ rideOrders.length }})</span>
          </div>
          
          <div 
            v-for="order in rideOrders" 
            :key="order.id"
            class="order-card"
            :class="{ selected: selectedOrders.has(order.id) }"
            @click="toggleOrder(order.id)"
          >
            <div class="order-checkbox">
              <svg v-if="selectedOrders.has(order.id)" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <div class="order-content">
              <div class="order-header">
                <span class="service-badge ride">
                  <span class="badge-icon">🚗</span>
                  <span class="badge-text">เรียกรถ</span>
                </span>
                <span class="order-fare">฿{{ getFareDisplay(order) }}</span>
              </div>

              <div class="order-route">
                <div class="route-point pickup">
                  <div class="route-dot"></div>
                  <span class="route-text">{{ order.pickup_address }}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point dropoff">
                  <div class="route-dot"></div>
                  <span class="route-text">{{ order.destination_address }}</span>
                </div>
              </div>

              <div class="order-footer">
                <span class="order-distance">{{ order.distance.toFixed(1) }} กม.</span>
                <span v-if="order.payment_method === 'cash'" class="payment-badge cash">💵 เงินสด</span>
                <span v-else-if="order.payment_method === 'wallet'" class="payment-badge wallet">💳 Wallet</span>
                <span v-if="order.promo_code" class="promo-badge">🎫 {{ order.promo_code }}</span>
                <button 
                  class="map-btn"
                  @click.stop="openMapPreview(order)"
                  aria-label="ดูแผนที่"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Queue Orders -->
        <div v-if="queueOrders.length > 0 && (serviceFilter === 'all' || serviceFilter === 'queue')" class="orders-group">
          <div v-if="serviceFilter === 'all'" class="group-label">
            <span class="group-icon">📅</span>
            <span class="group-text">จองคิว ({{ queueOrders.length }})</span>
          </div>
          
          <div 
            v-for="order in queueOrders" 
            :key="order.id"
            class="order-card"
            :class="{ selected: selectedOrders.has(order.id) }"
            @click="toggleOrder(order.id)"
          >
            <div class="order-checkbox">
              <svg v-if="selectedOrders.has(order.id)" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <div class="order-content">
              <div class="order-header">
                <span class="service-badge queue">
                  <span class="badge-icon">📅</span>
                  <span class="badge-text">จองคิว</span>
                </span>
                <span class="order-fare">฿{{ getFareDisplay(order) }}</span>
              </div>

              <div class="queue-info">
                <div class="info-row">
                  <span class="info-label">สถานที่:</span>
                  <span class="info-value">{{ order.place_name || order.pickup_address }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">วันที่:</span>
                  <span class="info-value">{{ order.scheduled_date }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">เวลา:</span>
                  <span class="info-value">{{ order.scheduled_time }}</span>
                </div>
              </div>

              <div class="order-footer">
                <span v-if="order.payment_method === 'cash'" class="payment-badge cash">💵 เงินสด</span>
                <span v-else-if="order.payment_method === 'wallet'" class="payment-badge wallet">💳 Wallet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Actions -->
    <footer v-if="!loading" class="actions">
      <button 
        class="accept-btn" 
        :disabled="!hasSelectedOrders" 
        @click="acceptOrders"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
        <span v-if="hasSelectedOrders">
          รับ {{ selectedOrders.size }} งาน (฿{{ totalEstEarnings.toFixed(0) }})
        </span>
        <span v-else>เลือกงานที่ต้องการรับ</span>
      </button>
    </footer>

    <!-- Map Preview Modal -->
    <Teleport to="body">
      <div 
        v-if="showMapPreview && selectedOrderForMap"
        class="map-modal-overlay"
        @click="closeMapPreview"
      >
        <div 
          class="map-modal-content"
          @click.stop
        >
          <div class="modal-header">
            <h3 class="modal-title">แผนที่เส้นทาง</h3>
            <button class="modal-close" @click="closeMapPreview" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <JobPreviewMap
            v-if="selectedOrderForMap"
            :pickup-lat="selectedOrderForMap.pickup_lat"
            :pickup-lng="selectedOrderForMap.pickup_lng"
            :dropoff-lat="selectedOrderForMap.destination_lat"
            :dropoff-lng="selectedOrderForMap.destination_lng"
            :pickup-address="selectedOrderForMap.pickup_address"
            :dropoff-address="selectedOrderForMap.destination_address"
            :show="showMapPreview"
            @close="closeMapPreview"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.orders-page {
  min-height: 100vh;
  background: #F9FAFB;
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.back-btn {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #111827;
  border-radius: 12px;
  transition: background 0.2s;
}

.back-btn:active {
  background: #F3F4F6;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-spacer {
  width: 44px;
}

/* ===== Loading ===== */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 15px;
  color: #6B7280;
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Empty State ===== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 15px;
  color: #6B7280;
  margin: 0 0 24px 0;
  max-width: 300px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #00A86B;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.refresh-btn:active {
  transform: scale(0.98);
  background: #008F5B;
}

.refresh-btn svg {
  width: 20px;
  height: 20px;
}

/* ===== Content ===== */
.content {
  flex: 1;
  padding: 16px;
  padding-bottom: 100px;
}

/* ===== Filter Tabs ===== */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: #FFFFFF;
  padding: 8px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.filter-tab.active {
  background: #00A86B;
  color: #FFFFFF;
}

.filter-tab:not(.active):active {
  background: #F3F4F6;
}

.tab-icon {
  font-size: 18px;
}

.tab-label {
  font-size: 14px;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.filter-tab.active .tab-badge {
  background: rgba(255, 255, 255, 0.25);
}

/* ===== Earnings Card ===== */
.earnings-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 16px;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
}

.earnings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.earnings-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.earnings-count {
  display: flex;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.earnings-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}

.earnings-amount {
  font-size: 40px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1;
}

.earnings-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.earnings-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.breakdown-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.breakdown-value {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
}

.breakdown-value.tip {
  color: #FCD34D;
}

.breakdown-value.discount {
  color: #FCA5A5;
}

/* ===== Quick Actions ===== */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-action-btn:not(:disabled):active {
  transform: scale(0.98);
  background: #F9FAFB;
}

.quick-action-btn.active {
  border-color: #00A86B;
  color: #00A86B;
  background: #E8F5EF;
}

.quick-action-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== Orders Section ===== */
.orders-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.section-count {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
}

/* ===== Orders Group ===== */
.orders-group {
  margin-bottom: 20px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #F3F4F6;
  border-radius: 8px;
}

.group-icon {
  font-size: 16px;
}

.group-text {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
}

/* ===== Order Card ===== */
.order-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #E5E7EB;
  border-radius: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.order-card:active {
  transform: scale(0.99);
}

.order-card.selected {
  border-color: #00A86B;
  background: #E8F5EF;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.15);
}

.order-checkbox {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 2px solid #D1D5DB;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.order-card.selected .order-checkbox {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.order-checkbox svg {
  width: 18px;
  height: 18px;
}

.order-content {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.service-badge.ride {
  background: #DBEAFE;
  color: #1E40AF;
}

.service-badge.queue {
  background: #FEF3C7;
  color: #92400E;
}

.badge-icon {
  font-size: 14px;
}

.badge-text {
  font-size: 12px;
}

.order-fare {
  font-size: 20px;
  font-weight: 800;
  color: #00A86B;
}

/* ===== Order Route ===== */
.order-route {
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  position: relative;
}

.route-point.dropoff {
  margin-top: 8px;
}

.route-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
}

.route-point.pickup .route-dot {
  background: #00A86B;
}

.route-point.dropoff .route-dot {
  background: #EF4444;
}

.route-line {
  position: absolute;
  left: 4px;
  top: 18px;
  width: 2px;
  height: 16px;
  background: repeating-linear-gradient(
    to bottom,
    #D1D5DB 0px,
    #D1D5DB 3px,
    transparent 3px,
    transparent 6px
  );
}

.route-text {
  flex: 1;
  font-size: 14px;
  color: #374151;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== Queue Info ===== */
.queue-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 12px;
}

.info-row {
  display: flex;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  min-width: 60px;
}

.info-value {
  font-size: 13px;
  color: #111827;
  flex: 1;
}

/* ===== Order Footer ===== */
.order-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-distance {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
}

.payment-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: #F3F4F6;
  color: #6B7280;
  white-space: nowrap;
}

.payment-badge.cash {
  background: #FEF3C7;
  color: #92400E;
}

.payment-badge.wallet {
  background: #DBEAFE;
  color: #1E40AF;
}

.promo-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: #F3E8FF;
  color: #7C3AED;
}

.map-btn {
  margin-left: auto;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.map-btn:active {
  background: #E5E7EB;
  transform: scale(0.95);
}

.map-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== Actions ===== */
.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.accept-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: #00A86B;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.accept-btn:disabled {
  background: #D1D5DB;
  color: #9CA3AF;
  cursor: not-allowed;
  box-shadow: none;
}

.accept-btn:not(:disabled):active {
  transform: scale(0.98);
  background: #008F5B;
}

.accept-btn svg {
  width: 22px;
  height: 22px;
}

/* ===== Map Modal ===== */
.map-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);
}

.map-modal-content {
  width: 100%;
  max-height: 85vh;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E7EB;
  background: #FFFFFF;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-close {
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border: none;
  border-radius: 12px;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:active {
  background: #E5E7EB;
  transform: scale(0.95);
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ===== Responsive ===== */
@media (min-width: 768px) {
  .map-modal-overlay {
    align-items: center;
    justify-content: center;
  }

  .map-modal-content {
    width: 90%;
    max-width: 700px;
    max-height: 80vh;
    border-radius: 24px;
  }

  .content {
    max-width: 800px;
    margin: 0 auto;
  }
}
</style>
