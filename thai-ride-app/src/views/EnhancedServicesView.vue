<script setup lang="ts">
/**
 * EnhancedServicesView - Enhanced Customer Services with UX Components
 * 
 * ใช้ customer components ใหม่: SmartLocationInput, ProgressiveLoadingOverlay,
 * EnhancedServiceCard, PullToRefresh, EmptyState
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPermissionModal from '../components/LocationPermissionModal.vue'
import { 
  SmartLocationInput, 
  ProgressiveLoadingOverlay, 
  EnhancedServiceCard, 
  PullToRefresh,
  EmptyState,
  useHapticFeedback,
  useSmartSuggestions,
  useProgressiveLoading,
  customerUtils,
  customerColors
} from '../components/customer'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useServices } from '../composables/useServices'
import { useRideStore } from '../stores/ride'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { useWallet } from '../composables/useWallet'
import { useLoyalty } from '../composables/useLoyalty'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const router = useRouter()
const rideStore = useRideStore()
const authStore = useAuthStore()
const toast = useToast()
const { getCurrentPosition, shouldShowPermissionModal } = useLocation()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()
const { balance, fetchBalance } = useWallet()
const { summary: loyaltySummary, fetchSummary: fetchLoyaltySummary } = useLoyalty()

// Enhanced UX composables
const { trigger: triggerHaptic } = useHapticFeedback()
const { suggestions, getSuggestions, recordSelection } = useSmartSuggestions()
const { 
  state: loadingState, 
  startLoading, 
  updateProgress, 
  completeLoading, 
  setError 
} = useProgressiveLoading()

const loading = ref(false)
const pickupLocation = ref<GeoLocation | null>(null)
const showLocationPermission = ref(false)
const isLoaded = ref(false)
const showSmartSearch = ref(false)

const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018, address: 'กรุงเทพฯ' }

// Active orders tracking
interface ActiveOrder {
  id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  typeName: string
  status: string
  statusText: string
  from: string
  to: string
  trackingPath: string
}

const activeOrders = ref<ActiveOrder[]>([])
const loadingOrders = ref(true)
let realtimeChannel: RealtimeChannel | null = null

// Main services - บริการหลัก
const mainServices = [
  { id: 'ride', name: 'เรียกรถ', route: '/customer/ride', color: '#00A86B', description: 'รถยนต์ส่วนตัว', icon: 'car' },
  { id: 'delivery', name: 'ส่งของ', route: '/customer/delivery', color: '#F5A623', description: 'ส่งพัสดุด่วน', icon: 'delivery' },
  { id: 'shopping', name: 'ซื้อของ', route: '/customer/shopping', color: '#E53935', description: 'ฝากซื้อสินค้า', icon: 'shopping' }
]

// Additional services - บริการเพิ่มเติม
const additionalServices = [
  { id: 'queue', name: 'จองคิว', route: '/customer/queue-booking', color: '#9C27B0', description: 'จองคิวร้านค้า/โรงพยาบาล', icon: 'queue' },
  { id: 'moving', name: 'ขนย้าย', route: '/customer/moving', color: '#2196F3', description: 'บริการยกของ/ขนย้าย', icon: 'moving' },
  { id: 'laundry', name: 'ซักรีด', route: '/customer/laundry', color: '#00BCD4', description: 'รับ-ส่งซักผ้า', icon: 'laundry' }
]

const savedPlaces = computed(() => [
  { id: 'home', name: homePlace.value?.name || 'บ้าน', place: homePlace.value, icon: 'home' },
  { id: 'work', name: workPlace.value?.name || 'ที่ทำงาน', place: workPlace.value, icon: 'work' }
])

const displayRecentPlaces = computed(() => recentPlaces.value.slice(0, 3))
const walletBalance = computed(() => balance.value?.balance || 0)
const loyaltyPoints = computed(() => loyaltySummary.value?.current_points || 0)

const getStatusText = (type: string, status: string): string => {
  return customerUtils.getStatusText(type, status)
}

const fetchActiveOrders = async () => {
  if (!authStore.user?.id) return
  loadingOrders.value = true
  
  try {
    const userId = authStore.user.id
    const orders: ActiveOrder[] = []
    
    // Fetch active rides
    const { data: rides } = await (supabase.from('ride_requests') as any)
      .select('id, status, pickup_address, destination_address')
      .eq('user_id', userId)
      .in('status', ['pending', 'matched', 'arrived', 'in_progress'])
      .limit(3)
    
    rides?.forEach((r: any) => {
      orders.push({
        id: r.id, type: 'ride', typeName: 'เรียกรถ', status: r.status,
        statusText: getStatusText('ride', r.status),
        from: r.pickup_address?.split(',')[0] || '',
        to: r.destination_address?.split(',')[0] || '',
        trackingPath: `/customer/ride`
      })
    })
    
    // Fetch active deliveries
    const { data: deliveries } = await (supabase.from('delivery_requests') as any)
      .select('id, status, sender_address, recipient_address')
      .eq('user_id', userId)
      .in('status', ['pending', 'matched', 'picked_up', 'in_transit'])
      .limit(3)
    
    deliveries?.forEach((d: any) => {
      orders.push({
        id: d.id, type: 'delivery', typeName: 'ส่งของ', status: d.status,
        statusText: getStatusText('delivery', d.status),
        from: d.sender_address?.split(',')[0] || '',
        to: d.recipient_address?.split(',')[0] || '',
        trackingPath: `/tracking/${d.id}`
      })
    })

    activeOrders.value = orders.slice(0, 3)
  } catch (err) {
    console.error('Error fetching active orders:', err)
  } finally {
    loadingOrders.value = false
  }
}

// Enhanced refresh with progressive loading
const handleRefresh = async () => {
  triggerHaptic('medium')
  
  startLoading([
    { id: 'places', label: 'โหลดสถานที่บันทึก', weight: 25 },
    { id: 'orders', label: 'โหลดออเดอร์', weight: 25 },
    { id: 'wallet', label: 'โหลดกระเป๋าเงิน', weight: 25 },
    { id: 'loyalty', label: 'โหลดแต้มสะสม', weight: 25 }
  ])
  
  try {
    await fetchSavedPlaces(true)
    updateProgress('places', 100)
    
    await fetchRecentPlaces(5, true)
    await fetchActiveOrders()
    updateProgress('orders', 100)
    
    await fetchBalance()
    updateProgress('wallet', 100)
    
    await fetchLoyaltySummary()
    updateProgress('loyalty', 100)
    
    completeLoading()
    triggerHaptic('success')
    toast.success('รีเฟรชข้อมูลแล้ว')
  } catch (error) {
    setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    triggerHaptic('error')
  }
}

const getCurrentLocation = async () => {
  const shouldShow = await shouldShowPermissionModal()
  if (shouldShow) {
    showLocationPermission.value = true
    return
  }
  await fetchCurrentLocation()
}

const fetchCurrentLocation = async () => {
  loading.value = true
  try {
    const location = await getCurrentPosition()
    pickupLocation.value = location
  } catch (error) {
    console.warn('Location error:', error)
    pickupLocation.value = DEFAULT_LOCATION
  } finally {
    loading.value = false
  }
}

const handlePermissionAllow = async () => {
  showLocationPermission.value = false
  await fetchCurrentLocation()
}

const handlePermissionDeny = () => {
  showLocationPermission.value = false
  pickupLocation.value = DEFAULT_LOCATION
}

const goToService = (route: string) => {
  triggerHaptic('light')
  router.push(route)
}

const handleServiceClick = (service: typeof mainServices[0]) => {
  triggerHaptic('medium')
  router.push(service.route)
}

const goToRideWithDestination = (place: { lat?: number; lng?: number; address?: string; name?: string }) => {
  triggerHaptic('light')
  if (place?.lat && place?.lng) {
    rideStore.setDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name || ''
    })
    recordSelection(place as any)
  }
  router.push('/customer/ride')
}

const handleSavedPlace = (item: { id: string; place: any }) => {
  triggerHaptic('light')
  if (item.place?.lat && item.place?.lng) {
    goToRideWithDestination(item.place)
  } else {
    toast.info(`กรุณาเพิ่มที่อยู่${item.id === 'home' ? 'บ้าน' : 'ที่ทำงาน'}ก่อน`)
    router.push({ path: '/customer/saved-places', query: { add: item.id } })
  }
}

const handleLocationSelect = (location: any) => {
  triggerHaptic('success')
  showSmartSearch.value = false
  goToRideWithDestination(location)
}

const goBack = () => {
  triggerHaptic('light')
  router.push('/customer')
}

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return
  const userId = authStore.user.id
  
  realtimeChannel = supabase
    .channel('services-active-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .subscribe()
}

onMounted(async () => {
  if (!pickupLocation.value) pickupLocation.value = DEFAULT_LOCATION
  
  // Load smart suggestions
  getSuggestions()
  
  await Promise.all([
    fetchSavedPlaces().catch(() => {}),
    fetchRecentPlaces().catch(() => {}),
    fetchActiveOrders(),
    fetchBalance().catch(() => {}),
    fetchLoyaltySummary().catch(() => {})
  ])
  
  getCurrentLocation()
  setupRealtimeSubscription()
  isLoaded.value = true
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
})
</script>

<template>
  <PullToRefresh @refresh="handleRefresh" :disabled="loadingState.isLoading">
    <div class="enhanced-services" :class="{ loaded: isLoaded }">
      <!-- Progressive Loading Overlay -->
      <ProgressiveLoadingOverlay 
        :visible="loadingState.isLoading"
        :steps="loadingState.steps"
        :current-step="loadingState.currentStep"
        :progress="loadingState.progress"
        :error="loadingState.error"
        title="กำลังโหลดข้อมูล"
      />

      <!-- Map Background -->
      <div class="map-container">
        <MapView
          :pickup="pickupLocation"
          :show-route="false"
          :draggable="false"
          height="100%"
        />
        
        <!-- Top Bar -->
        <div class="top-bar">
          <button class="back-btn" @click="goBack" aria-label="กลับ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="logo">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2"/>
              <path d="M16 8L22 20H10L16 8Z" fill="#00A86B"/>
              <circle cx="16" cy="18" r="3" fill="#00A86B"/>
            </svg>
            <span>GOBEAR</span>
          </div>
          <button class="wallet-btn" @click="goToService('/customer/wallet')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
            <span>{{ customerUtils.formatCurrency(walletBalance) }}</span>
          </button>
        </div>
      </div>

      <!-- Bottom Sheet -->
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        
        <!-- Smart Location Search -->
        <div class="search-section">
          <button class="destination-btn" @click="showSmartSearch = true">
            <div class="dest-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#E53935"/>
                <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
              </svg>
            </div>
            <div class="dest-text">
              <span class="dest-label">ไปไหนดี?</span>
              <span class="dest-hint">ค้นหาจุดหมายปลายทาง</span>
            </div>
            <svg class="dest-arrow" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Smart Suggestions -->
        <div v-if="suggestions.length > 0" class="suggestions-section">
          <div class="section-header">
            <h3 class="section-title">แนะนำสำหรับคุณ</h3>
          </div>
          <div class="suggestions-scroll">
            <button 
              v-for="suggestion in suggestions.slice(0, 4)" 
              :key="suggestion.id"
              class="suggestion-chip"
              @click="handleLocationSelect(suggestion)"
            >
              <svg v-if="suggestion.type === 'frequent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <svg v-else-if="suggestion.type === 'recent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{{ customerUtils.truncateText(suggestion.name, 15) }}</span>
            </button>
          </div>
        </div>

        <!-- Active Orders -->
        <div v-if="!loadingOrders && activeOrders.length > 0" class="active-orders-section">
          <div class="section-header">
            <h3 class="section-title">กำลังดำเนินการ</h3>
            <span class="order-count">{{ activeOrders.length }}</span>
          </div>
          <div class="active-orders-list">
            <button 
              v-for="order in activeOrders" 
              :key="order.id" 
              class="active-order-card"
              @click="goToService(order.trackingPath)"
            >
              <div class="order-type-badge" :class="order.type">
                <svg v-if="order.type === 'ride'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
                  <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="7" width="12" height="12" rx="1"/>
                  <path d="M15 11h4l2 4v4h-6v-8z"/>
                </svg>
              </div>
              <div class="order-info">
                <div class="order-header">
                  <span class="order-type-name">{{ order.typeName }}</span>
                  <span class="order-status" :style="{ color: customerUtils.getStatusColor(order.status) }">
                    {{ order.statusText }}
                  </span>
                </div>
                <div class="order-route">
                  <span>{{ order.from }}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  <span>{{ order.to }}</span>
                </div>
              </div>
              <div class="order-pulse"></div>
            </button>
          </div>
        </div>

        <!-- Main Services Grid with Enhanced Cards -->
        <div class="services-section">
          <div class="section-header">
            <h3 class="section-title">บริการหลัก</h3>
          </div>
          <div class="services-grid">
            <EnhancedServiceCard
              v-for="service in mainServices"
              :key="service.id"
              :title="service.name"
              :description="service.description"
              :icon="service.icon"
              :color="service.color"
              :badge="service.id === 'ride' ? 'ยอดนิยม' : undefined"
              @click="handleServiceClick(service)"
            />
          </div>
        </div>

        <!-- Saved Places -->
        <div class="saved-section">
          <div class="section-header">
            <h3 class="section-title">สถานที่บันทึก</h3>
            <button class="see-all-btn" @click="goToService('/customer/saved-places')">จัดการ</button>
          </div>
          <div class="saved-row">
            <button 
              v-for="item in savedPlaces" 
              :key="item.id"
              class="saved-btn"
              @click="handleSavedPlace(item)"
            >
              <div class="saved-icon">
                <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <div class="saved-info">
                <span class="saved-name">{{ item.name }}</span>
                <span class="saved-hint">{{ item.place ? 'กดเพื่อไป' : 'กดเพื่อเพิ่ม' }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Loyalty Points Card -->
        <button class="loyalty-card" @click="goToService('/customer/loyalty')">
          <div class="loyalty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700"/>
            </svg>
          </div>
          <div class="loyalty-info">
            <span class="loyalty-label">แต้มสะสม</span>
            <span class="loyalty-points">{{ loyaltyPoints.toLocaleString() }} แต้ม</span>
          </div>
          <svg class="loyalty-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- Additional Services -->
        <div class="additional-section">
          <div class="section-header">
            <h3 class="section-title">บริการเพิ่มเติม</h3>
          </div>
          <div class="additional-grid">
            <EnhancedServiceCard
              v-for="service in additionalServices"
              :key="service.id"
              :title="service.name"
              :description="service.description"
              :icon="service.icon"
              :color="service.color"
              size="small"
              @click="handleServiceClick(service)"
            />
          </div>
        </div>

        <!-- Recent Places -->
        <div v-if="displayRecentPlaces.length > 0" class="recent-section">
          <div class="section-header">
            <h3 class="section-title">ล่าสุด</h3>
          </div>
          <div class="recent-list">
            <button 
              v-for="place in displayRecentPlaces" 
              :key="place.name"
              class="recent-item"
              @click="goToRideWithDestination(place)"
            >
              <div class="recent-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4l3 3" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="12" cy="12" r="9" stroke="#666" stroke-width="2"/>
                </svg>
              </div>
              <span class="recent-name">{{ place.name }}</span>
              <svg class="recent-arrow" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty State when no recent places -->
        <EmptyState
          v-else
          type="history"
          title="ยังไม่มีประวัติการเดินทาง"
          description="เริ่มใช้บริการเพื่อบันทึกสถานที่ที่คุณไปบ่อย"
          action-text="เริ่มเรียกรถ"
          @action="goToService('/customer/ride')"
        />

        <!-- Quick Actions -->
        <div class="quick-section">
          <div class="quick-grid">
            <button class="quick-item" @click="goToService('/customer/scheduled-rides')">
              <div class="quick-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <span>นัดล่วงหน้า</span>
            </button>
            <button class="quick-item" @click="goToService('/customer/history')">
              <div class="quick-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <span>ประวัติ</span>
            </button>
            <button class="quick-item" @click="goToService('/customer/promotions')">
              <div class="quick-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <circle cx="7" cy="7" r="1"/>
                </svg>
              </div>
              <span>โปรโมชั่น</span>
            </button>
            <button class="quick-item" @click="goToService('/customer/help')">
              <div class="quick-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                  <circle cx="12" cy="17" r="1"/>
                </svg>
              </div>
              <span>ช่วยเหลือ</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Smart Location Search Modal -->
      <Teleport to="body">
        <div v-if="showSmartSearch" class="search-modal-overlay" @click.self="showSmartSearch = false">
          <div class="search-modal">
            <SmartLocationInput
              placeholder="ค้นหาจุดหมายปลายทาง"
              :show-suggestions="true"
              @select="handleLocationSelect"
              @close="showSmartSearch = false"
            />
          </div>
        </div>
      </Teleport>

      <!-- Location Permission Modal -->
      <LocationPermissionModal
        :show="showLocationPermission"
        @allow="handlePermissionAllow"
        @deny="handlePermissionDeny"
      />
    </div>
  </PullToRefresh>
</template>

<style scoped>
.enhanced-services {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  position: relative;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.enhanced-services.loaded {
  opacity: 1;
}

/* Map Container */
.map-container {
  position: relative;
  height: 28vh;
  flex-shrink: 0;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.back-btn:active { transform: scale(0.95); }

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo svg { width: 24px; height: 24px; }

.logo span {
  font-size: 13px;
  font-weight: 700;
  color: #00A86B;
  letter-spacing: 0.5px;
}

.wallet-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.wallet-btn svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.wallet-btn span {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.wallet-btn:active { transform: scale(0.95); }

/* Bottom Sheet */
.bottom-sheet {
  flex: 1;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  margin-top: -20px;
  padding: 10px 20px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #E0E0E0;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* Destination Button */
.destination-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #F8F8F8;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 16px;
  text-align: left;
  transition: background 0.2s ease, transform 0.2s ease;
}

.destination-btn:active { 
  background: #F0F0F0;
  transform: scale(0.98);
}

.dest-icon {
  width: 48px;
  height: 48px;
  background: #FFFFFF;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.dest-icon svg { width: 26px; height: 26px; }

.dest-text { flex: 1; min-width: 0; }

.dest-label {
  display: block;
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.dest-hint {
  display: block;
  font-size: 13px;
  color: #999999;
}

.dest-arrow {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Suggestions Section */
.suggestions-section {
  margin-bottom: 20px;
}

.suggestions-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.suggestions-scroll::-webkit-scrollbar {
  display: none;
}

.suggestion-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #E8F5EF;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.suggestion-chip svg {
  width: 16px;
  height: 16px;
  color: #00A86B;
}

.suggestion-chip span {
  font-size: 13px;
  font-weight: 500;
  color: #00A86B;
}

.suggestion-chip:active {
  transform: scale(0.95);
  background: #D0EBE0;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.see-all-btn {
  font-size: 13px;
  font-weight: 500;
  color: #00A86B;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.see-all-btn:active {
  background: #E8F5EF;
}

.order-count {
  background: #00A86B;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Active Orders */
.active-orders-section {
  margin-bottom: 20px;
}

.active-orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.active-order-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.active-order-card:active {
  transform: scale(0.98);
  background: #FAFAFA;
}

.order-type-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-type-badge.ride { background: #E8F5EF; }
.order-type-badge.delivery { background: #FFF3E0; }
.order-type-badge.shopping { background: #FFEBEE; }

.order-type-badge svg {
  width: 22px;
  height: 22px;
}

.order-type-badge.ride svg { color: #00A86B; }
.order-type-badge.delivery svg { color: #F5A623; }
.order-type-badge.shopping svg { color: #E53935; }

.order-info {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-type-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.order-status {
  font-size: 12px;
  font-weight: 500;
}

.order-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666666;
}

.order-route svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.order-pulse {
  position: absolute;
  right: 14px;
  width: 8px;
  height: 8px;
  background: #00A86B;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Services Grid */
.services-section {
  margin-bottom: 20px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

/* Saved Places */
.saved-section {
  margin-bottom: 20px;
}

.saved-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.saved-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.saved-btn:active {
  transform: scale(0.98);
  background: #FAFAFA;
}

.saved-icon {
  width: 40px;
  height: 40px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.saved-icon svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.saved-info {
  flex: 1;
  min-width: 0;
}

.saved-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.saved-hint {
  display: block;
  font-size: 12px;
  color: #999999;
}

/* Loyalty Card */
.loyalty-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  text-align: left;
  transition: all 0.2s ease;
}

.loyalty-card:active {
  transform: scale(0.98);
}

.loyalty-icon {
  width: 44px;
  height: 44px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.loyalty-icon svg {
  width: 24px;
  height: 24px;
}

.loyalty-info {
  flex: 1;
}

.loyalty-label {
  display: block;
  font-size: 12px;
  color: #996600;
  margin-bottom: 2px;
}

.loyalty-points {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.loyalty-arrow {
  width: 20px;
  height: 20px;
  color: #996600;
  flex-shrink: 0;
}

/* Additional Services */
.additional-section {
  margin-bottom: 20px;
}

.additional-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* Recent Places */
.recent-section {
  margin-bottom: 20px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-item:active {
  transform: scale(0.98);
  background: #FAFAFA;
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: #F5F5F5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-name {
  flex: 1;
  font-size: 14px;
  color: #1A1A1A;
  text-align: left;
}

.recent-arrow {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Quick Actions */
.quick-section {
  margin-bottom: 20px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-item:active {
  transform: scale(0.95);
  background: #FAFAFA;
}

.quick-icon {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.quick-item span {
  font-size: 11px;
  font-weight: 500;
  color: #666666;
  text-align: center;
}

/* Search Modal */
.search-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: env(safe-area-inset-top);
  animation: fadeIn 0.2s ease;
}

.search-modal {
  width: 100%;
  max-width: 500px;
  background: #FFFFFF;
  border-radius: 0 0 20px 20px;
  max-height: 80vh;
  overflow: hidden;
  animation: slideDown 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Responsive */
@media (max-width: 360px) {
  .services-grid,
  .additional-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
