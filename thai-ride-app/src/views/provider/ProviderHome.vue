<script setup lang="ts">
/**
 * ProviderHomeNew - หน้าหลัก Provider ใหม่
 * Design: Green theme ตาม reference UI
 * 
 * Features:
 * - Green gradient header with earnings & level
 * - Online/Offline status toggle with clear indicator
 * - Active job card with quick actions
 * - Today's job stats
 * - Rush hour alert
 * - Available orders count
 * - Recent transactions
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RideStatus } from '../../types/ride-requests'
import { usePushNotification } from '../../composables/usePushNotification'
import { useOrderNumber } from '../../composables/useOrderNumber'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'
import { useToast } from '../../composables/useToast'

const router = useRouter()

// Push Notification
const { 
  isSupported: pushSupported, 
  isSubscribed: pushSubscribed, 
  permission: pushPermission,
  loading: pushLoading,
  requestPermission,
  notifyNewJob
} = usePushNotification()

// Order Number
const { formatOrderNumber } = useOrderNumber()
const { copyToClipboard } = useCopyToClipboard()
const { showSuccess, showError } = useToast()

// Realtime subscription
let realtimeChannel: RealtimeChannel | null = null

// Types for Supabase queries
interface ProviderRow {
  id: string
  first_name: string | null
  last_name: string | null
  rating: number | null
  total_earnings: number | null
  total_trips: number | null
  is_online: boolean
  is_available: boolean
}

interface RideRequestRow {
  id: string
  tracking_id: string
  status: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  estimated_distance: number | null
  final_fare: number | null
  created_at: string
  user_id: string
  pickup_lat: number
  pickup_lng: number
  destination_lat: number
  destination_lng: number
  rating: number | null
  provider_id: string | null
}

interface ProfileRow {
  name: string | null
}

// State
const loading = ref(true)
const isOnline = ref(false)
const isToggling = ref(false)
const providerId = ref<string | null>(null)
const showNotificationPrompt = ref(false)
const isCopied = ref(false)

// Provider data
const providerData = ref<{
  first_name?: string
  last_name?: string
  rating?: number
  total_earnings?: number
  total_trips?: number
} | null>(null)

// Earnings & Stats
const todayEarnings = ref(0)
const availableOrders = ref(0)
const todayStats = ref({
  completed: 0,
  cancelled: 0,
  totalDistance: 0,
  avgRating: 0
})

// Active job
const activeJob = ref<{
  id: string
  tracking_id: string
  status: RideStatus
  pickup_address: string
  destination_address: string
  estimated_fare: number
  customer_name?: string
  created_at: string
} | null>(null)

// Recent transactions
const recentTransactions = ref<Array<{
  id: string
  type: string
  count: number
  earnings: number
  tips: number
  date: string
  distance: number
}>>([])

// Rush hour state
const isRushHour = computed(() => {
  const hour = new Date().getHours()
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
})

// Computed
const displayName = computed(() => {
  if (!providerData.value) return 'พาร์ทเนอร์'
  const first = providerData.value.first_name || ''
  return first || 'พาร์ทเนอร์'
})

const providerLevel = computed(() => {
  // Calculate level based on total_trips
  const trips = providerData.value?.total_trips || 0
  if (trips >= 1000) return 5
  if (trips >= 500) return 4
  if (trips >= 100) return 3
  if (trips >= 20) return 2
  return 1
})

// Job status helpers
const hasActiveJob = computed(() => activeJob.value !== null)

const jobStatusLabel = computed(() => {
  if (!activeJob.value) return ''
  const statusMap: Record<RideStatus, string> = {
    'pending': 'รอรับงาน',
    'matched': 'กำลังไปรับ',
    'pickup': 'ถึงจุดรับแล้ว',
    'in_progress': 'กำลังเดินทาง',
    'completed': 'เสร็จสิ้น',
    'cancelled': 'ยกเลิก'
  }
  return statusMap[activeJob.value.status] || activeJob.value.status
})

const jobStatusColor = computed(() => {
  if (!activeJob.value) return 'gray'
  const colorMap: Record<RideStatus, string> = {
    'pending': 'yellow',
    'matched': 'blue',
    'pickup': 'orange',
    'in_progress': 'green',
    'completed': 'green',
    'cancelled': 'red'
  }
  return colorMap[activeJob.value.status] || 'gray'
})

// Availability status
const availabilityStatus = computed(() => {
  if (!isOnline.value) {
    return { label: 'ออฟไลน์', desc: 'คุณไม่ได้รับงานอยู่', color: 'gray', icon: 'offline' }
  }
  if (hasActiveJob.value) {
    return { label: 'กำลังทำงาน', desc: jobStatusLabel.value, color: 'blue', icon: 'working' }
  }
  return { label: 'พร้อมรับงาน', desc: 'รอรับงานใหม่', color: 'green', icon: 'ready' }
})

// Methods
async function loadProviderData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider info
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id, first_name, last_name, rating, total_earnings, total_trips, is_online, is_available')
      .eq('user_id', user.id)
      .maybeSingle() as { data: ProviderRow | null }

    if (provider) {
      providerId.value = provider.id
      providerData.value = provider
      isOnline.value = provider.is_online && provider.is_available

      // Load all data in parallel
      await Promise.all([
        loadTodayEarnings(provider.id),
        loadAvailableOrders(),
        loadRecentTransactions(provider.id),
        loadActiveJob(provider.id),
        loadTodayStats(provider.id)
      ])
    }
  } catch (err) {
    console.error('[ProviderHome] Error:', err)
  } finally {
    loading.value = false
  }
}

async function loadActiveJob(provId: string) {
  console.log('[ProviderHome] Loading active job for provider:', provId)
  
  // Check all request types for active jobs
  const [rideResult, queueResult, shoppingResult, deliveryResult] = await Promise.all([
    // Check ride_requests
    supabase
      .from('ride_requests')
      .select(`
        id,
        tracking_id,
        status,
        pickup_address,
        destination_address,
        estimated_fare,
        created_at,
        user_id
      `)
      .eq('provider_id', provId)
      .in('status', ['matched', 'pickup', 'in_progress'])
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: RideRequestRow | null },
    
    // Check queue_bookings (uses 'confirmed' status instead of 'matched')
    supabase
      .from('queue_bookings')
      .select(`
        id,
        tracking_id,
        status,
        place_name,
        place_address,
        service_fee,
        created_at,
        user_id,
        scheduled_date,
        scheduled_time
      `)
      .eq('provider_id', provId)
      .in('status', ['confirmed', 'in_progress'])
      .order('confirmed_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any | null },
    
    // Check shopping_requests
    supabase
      .from('shopping_requests')
      .select(`
        id,
        tracking_id,
        status,
        store_name,
        store_address,
        delivery_address,
        service_fee,
        created_at,
        user_id
      `)
      .eq('provider_id', provId)
      .in('status', ['matched', 'shopping', 'delivering'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any | null },
    
    // Check delivery_requests
    supabase
      .from('delivery_requests')
      .select(`
        id,
        tracking_id,
        status,
        sender_address,
        recipient_address,
        estimated_fee,
        created_at,
        user_id
      `)
      .eq('provider_id', provId)
      .in('status', ['matched', 'pickup', 'in_transit'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any | null }
  ])

  console.log('[ProviderHome] Active job results:', {
    ride: rideResult.data ? 'found' : 'none',
    queue: queueResult.data ? 'found' : 'none',
    shopping: shoppingResult.data ? 'found' : 'none',
    delivery: deliveryResult.data ? 'found' : 'none'
  })

  // Prioritize by most recent
  const results = [
    { data: rideResult.data, type: 'ride' },
    { data: queueResult.data, type: 'queue' },
    { data: shoppingResult.data, type: 'shopping' },
    { data: deliveryResult.data, type: 'delivery' }
  ].filter(r => r.data !== null)
  
  if (results.length === 0) {
    console.log('[ProviderHome] No active jobs found')
    activeJob.value = null
    return
  }
  
  // Get the most recent one
  const mostRecent = results.reduce((prev, curr) => {
    const prevTime = new Date(prev.data.created_at).getTime()
    const currTime = new Date(curr.data.created_at).getTime()
    return currTime > prevTime ? curr : prev
  })
  
  console.log('[ProviderHome] Most recent active job:', mostRecent.type, mostRecent.data.tracking_id)
  
  const data = mostRecent.data
  const jobType = mostRecent.type

  if (data) {
    // Get customer name from users table (production uses 'users' not 'profiles')
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', data.user_id)
      .maybeSingle() as { data: ProfileRow | null }

    // Format based on job type
    if (jobType === 'queue') {
      // Queue booking format
      activeJob.value = {
        id: data.id,
        tracking_id: data.tracking_id,
        status: data.status as RideStatus,
        pickup_address: data.place_name || data.place_address || 'จองคิว',
        destination_address: `${data.scheduled_date} ${data.scheduled_time}`,
        estimated_fare: data.service_fee,
        customer_name: profile?.name || 'ลูกค้า',
        created_at: data.created_at
      }
    } else if (jobType === 'shopping') {
      // Shopping request format
      activeJob.value = {
        id: data.id,
        tracking_id: data.tracking_id,
        status: data.status as RideStatus,
        pickup_address: data.store_name || data.store_address || 'ร้านค้า',
        destination_address: data.delivery_address || 'ที่อยู่จัดส่ง',
        estimated_fare: data.service_fee,
        customer_name: profile?.name || 'ลูกค้า',
        created_at: data.created_at
      }
    } else if (jobType === 'delivery') {
      // Delivery request format
      activeJob.value = {
        id: data.id,
        tracking_id: data.tracking_id,
        status: data.status as RideStatus,
        pickup_address: data.sender_address || 'ที่อยู่ผู้ส่ง',
        destination_address: data.recipient_address || 'ที่อยู่ผู้รับ',
        estimated_fare: data.estimated_fee,
        customer_name: profile?.name || 'ลูกค้า',
        created_at: data.created_at
      }
    } else {
      // Ride request format
      activeJob.value = {
        id: data.id,
        tracking_id: data.tracking_id,
        status: data.status as RideStatus,
        pickup_address: data.pickup_address,
        destination_address: data.destination_address,
        estimated_fare: data.estimated_fare,
        customer_name: profile?.name || 'ลูกค้า',
        created_at: data.created_at
      }
    }
    
    console.log('[ProviderHome] Active job set:', activeJob.value.tracking_id)
  } else {
    activeJob.value = null
  }
}

async function loadTodayStats(provId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Query ride_requests for status counts (rating is in ride_ratings table)
  const { data } = await supabase
    .from('ride_requests')
    .select('status')
    .eq('provider_id', provId)
    .gte('created_at', today.toISOString()) as { data: RideRequestRow[] | null }

  if (data) {
    const completed = data.filter(r => r.status === 'completed')
    const cancelled = data.filter(r => r.status === 'cancelled')

    todayStats.value = {
      completed: completed.length,
      cancelled: cancelled.length,
      totalDistance: 0, // Distance not tracked in ride_requests
      avgRating: 0 // Would need to query ride_ratings separately
    }
  }
}

async function loadTodayEarnings(provId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('ride_requests')
    .select('estimated_fare, final_fare')
    .eq('provider_id', provId)
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString()) as { data: RideRequestRow[] | null }

  if (data) {
    todayEarnings.value = data.reduce((sum, r) => sum + (r.final_fare || r.estimated_fare || 0), 0)
  }
}

async function loadAvailableOrders() {
  console.log('[ProviderHome] 🔍 Loading available orders...')
  
  // Count all request types
  const [ridesResult, queueResult, shoppingResult, deliveryResult] = await Promise.all([
    supabase
      .from('ride_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('queue_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('shopping_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('delivery_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
  ])

  const ridesCount = ridesResult.count || 0
  const queueCount = queueResult.count || 0
  const shoppingCount = shoppingResult.count || 0
  const deliveryCount = deliveryResult.count || 0
  const total = ridesCount + queueCount + shoppingCount + deliveryCount
  
  console.log('[ProviderHome] 📊 Available orders:', {
    rides: ridesCount,
    queue: queueCount,
    shopping: shoppingCount,
    delivery: deliveryCount,
    total
  })
  
  console.log('[ProviderHome] ✅ Setting availableOrders.value =', total)
  
  availableOrders.value = total
  
  console.log('[ProviderHome] ✅ availableOrders.value is now:', availableOrders.value)
}

async function loadRecentTransactions(provId: string) {
  const { data } = await supabase
    .from('ride_requests')
    .select('id, ride_type, estimated_fare, final_fare, created_at, pickup_lat, pickup_lng, destination_lat, destination_lng')
    .eq('provider_id', provId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5) as { data: RideRequestRow[] | null }

  if (data && data.length > 0) {
    // Group by date
    const grouped = new Map<string, RideRequestRow[]>()
    data.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('th-TH')
      if (!grouped.has(date)) grouped.set(date, [])
      grouped.get(date)!.push(item)
    })

    recentTransactions.value = Array.from(grouped.entries()).map(([date, items]) => ({
      id: date,
      type: 'batch',
      count: items.length,
      earnings: items.reduce((sum, i) => sum + (i.final_fare || i.estimated_fare || 0), 0),
      tips: 0, // TODO: Add tips support
      date,
      distance: items.reduce((sum, i) => {
        if (!i.pickup_lat || !i.destination_lat) return sum
        return sum + calculateDistance(i.pickup_lat, i.pickup_lng, i.destination_lat, i.destination_lng)
      }, 0)
    }))
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function toggleOnline() {
  if (isToggling.value) return
  isToggling.value = true

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newStatus = !isOnline.value

     
    await (supabase.from('providers_v2') as any)
      .update({
        is_online: newStatus,
        is_available: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    isOnline.value = newStatus

    if (newStatus) {
      await loadAvailableOrders()
    }
  } catch (err) {
    console.error('[ProviderHome] Toggle error:', err)
  } finally {
    isToggling.value = false
  }
}

function goToOrders() {
  router.push('/provider/orders')
}

function goToJobDetail() {
  if (activeJob.value) {
    router.push(`/provider/job/${activeJob.value.id}`)
  }
}

async function copyOrderNumber() {
  if (!activeJob.value?.tracking_id) {
    showError('ไม่พบหมายเลขออเดอร์')
    return
  }

  const success = await copyToClipboard(activeJob.value.tracking_id)

  if (success) {
    isCopied.value = true
    showSuccess('คัดลอกหมายเลขออเดอร์แล้ว')

    // Reset copied state after 2 seconds
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } else {
    showError('ไม่สามารถคัดลอกได้')
  }
}

// Keyboard support for order number copy
function handleOrderNumberKeydown(event: KeyboardEvent) {
  // Handle Enter and Space keys
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault() // Prevent page scroll on Space
    copyOrderNumber()
  }
}

function openMenu() {
  // TODO: Open side menu
}

// Push Notification handlers
async function enableNotifications() {
  const granted = await requestPermission()
  if (granted) {
    showNotificationPrompt.value = false
  }
}

function dismissNotificationPrompt() {
  showNotificationPrompt.value = false
  // Store in localStorage to not show again for a while
  localStorage.setItem('notification_prompt_dismissed', Date.now().toString())
}

function shouldShowNotificationPrompt(): boolean {
  if (!pushSupported.value) return false
  if (pushSubscribed.value) return false
  if (pushPermission.value === 'denied') return false
  
  // Check if dismissed recently (within 7 days)
  const dismissed = localStorage.getItem('notification_prompt_dismissed')
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - dismissedTime < sevenDays) return false
  }
  
  return true
}

// Lifecycle
onMounted(() => {
  loadProviderData()
  setupRealtimeSubscription()
  
  // Check if should show notification prompt
  setTimeout(() => {
    if (shouldShowNotificationPrompt()) {
      showNotificationPrompt.value = true
    }
  }, 3000) // Show after 3 seconds
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
})

// Realtime subscription for new jobs
function setupRealtimeSubscription() {
  console.log('[ProviderHome] Setting up realtime subscription...')
  
  realtimeChannel = supabase
    .channel('provider-home-jobs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[ProviderHome] New ride job received:', payload.new)
        // Reload available orders count when new job comes in
        loadAvailableOrders()
        
        // Send push notification if online and subscribed
        if (isOnline.value && pushSubscribed.value) {
          const newJob = payload.new as RideRequestRow
          notifyNewJob({
            id: newJob.id,
            service_type: 'ride',
            status: 'pending',
            customer_id: newJob.user_id,
            pickup_location: { lat: newJob.pickup_lat, lng: newJob.pickup_lng },
            pickup_address: newJob.pickup_address,
            dropoff_location: { lat: newJob.destination_lat, lng: newJob.destination_lng },
            dropoff_address: newJob.destination_address,
            estimated_earnings: newJob.estimated_fare,
            created_at: newJob.created_at
          })
        }
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
        console.log('[ProviderHome] New queue booking received:', payload.new)
        // Reload available orders count when new queue booking comes in
        loadAvailableOrders()
        
        // Send push notification if online and subscribed
        if (isOnline.value && pushSubscribed.value) {
          const newQueue = payload.new as any
          notifyNewJob({
            id: newQueue.id,
            service_type: 'queue',
            status: 'pending',
            customer_id: newQueue.user_id,
            pickup_location: { lat: 0, lng: 0 }, // Queue bookings don't have coordinates
            pickup_address: newQueue.place_name || newQueue.place_address || 'จองคิว',
            dropoff_location: { lat: 0, lng: 0 },
            dropoff_address: `${newQueue.scheduled_date} ${newQueue.scheduled_time}`,
            estimated_earnings: newQueue.service_fee,
            created_at: newQueue.created_at
          })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shopping_requests',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[ProviderHome] 🛒 New shopping order received:', payload.new)
        // Reload available orders count when new shopping order comes in
        loadAvailableOrders()
        
        // Send push notification if online and subscribed
        if (isOnline.value && pushSubscribed.value) {
          const newShopping = payload.new as any
          notifyNewJob({
            id: newShopping.id,
            service_type: 'shopping',
            status: 'pending',
            customer_id: newShopping.user_id,
            pickup_location: { lat: 0, lng: 0 },
            pickup_address: newShopping.store_name || newShopping.store_address || 'ร้านค้า',
            dropoff_location: { lat: 0, lng: 0 },
            dropoff_address: newShopping.delivery_address || 'ที่อยู่จัดส่ง',
            estimated_earnings: newShopping.service_fee,
            created_at: newShopping.created_at
          })
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_requests',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[ProviderHome] 📦 New delivery order received:', payload.new)
        // Reload available orders count when new delivery order comes in
        loadAvailableOrders()
        
        // Send push notification if online and subscribed
        if (isOnline.value && pushSubscribed.value) {
          const newDelivery = payload.new as any
          notifyNewJob({
            id: newDelivery.id,
            service_type: 'delivery',
            status: 'pending',
            customer_id: newDelivery.user_id,
            pickup_location: { lat: 0, lng: 0 },
            pickup_address: newDelivery.sender_address || 'ผู้ส่ง',
            dropoff_location: { lat: 0, lng: 0 },
            dropoff_address: newDelivery.recipient_address || 'ผู้รับ',
            estimated_earnings: newDelivery.estimated_fee,
            created_at: newDelivery.created_at
          })
        }
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
        console.log('[ProviderHome] Ride job updated:', payload.eventType, payload.new)
        // Reload count when job status changes
        loadAvailableOrders()
        
        // Reload active job if it's ours
        if (providerId.value) {
          const updated = payload.new as RideRequestRow
          if (updated.provider_id === providerId.value) {
            loadActiveJob(providerId.value)
          }
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
        console.log('[ProviderHome] Queue booking updated:', payload.eventType, payload.new)
        // Reload count when queue booking status changes
        loadAvailableOrders()
        
        // Reload active job if it's ours
        if (providerId.value) {
          const updated = payload.new as any
          if (updated.provider_id === providerId.value) {
            loadActiveJob(providerId.value)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopping_requests'
      },
      (payload) => {
        console.log('[ProviderHome] 🛒 Shopping order updated:', payload.eventType, payload.new)
        // Reload count when shopping order status changes
        loadAvailableOrders()
        
        // Reload active job if it's ours
        if (providerId.value) {
          const updated = payload.new as any
          if (updated.provider_id === providerId.value) {
            loadActiveJob(providerId.value)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_requests'
      },
      (payload) => {
        console.log('[ProviderHome] 📦 Delivery order updated:', payload.eventType, payload.new)
        // Reload count when delivery order status changes
        loadAvailableOrders()
        
        // Reload active job if it's ours
        if (providerId.value) {
          const updated = payload.new as any
          if (updated.provider_id === providerId.value) {
            loadActiveJob(providerId.value)
          }
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
      () => {
        console.log('[ProviderHome] Ride job deleted')
        loadAvailableOrders()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'queue_bookings'
      },
      () => {
        console.log('[ProviderHome] Queue booking deleted')
        loadAvailableOrders()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'shopping_requests'
      },
      () => {
        console.log('[ProviderHome] 🛒 Shopping order deleted')
        loadAvailableOrders()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'delivery_requests'
      },
      () => {
        console.log('[ProviderHome] 📦 Delivery order deleted')
        loadAvailableOrders()
      }
    )
    .subscribe((status) => {
      console.log('[ProviderHome] Realtime subscription status:', status)
    })
}
</script>

<template>
  <div class="provider-home">
    <!-- Push Notification Prompt -->
    <Transition name="slide-down">
      <div v-if="showNotificationPrompt" class="notification-prompt">
        <div class="prompt-content">
          <div class="prompt-icon">🔔</div>
          <div class="prompt-text">
            <h4>เปิดการแจ้งเตือน</h4>
            <p>รับแจ้งเตือนเมื่อมีงานใหม่เข้ามา</p>
          </div>
        </div>
        <div class="prompt-actions">
          <button class="prompt-btn dismiss" type="button" @click="dismissNotificationPrompt">
            ไว้ทีหลัง
          </button>
          <button 
            class="prompt-btn enable" 
            :disabled="pushLoading" 
            type="button"
            @click="enableNotifications"
          >
            {{ pushLoading ? 'กำลังเปิด...' : 'เปิดเลย' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Green Header -->
    <header class="header">
      <!-- Menu Button -->
      <button class="menu-btn" aria-label="เมนู" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Notification Status Badge -->
      <div v-if="pushSubscribed" class="notification-badge" title="การแจ้งเตือนเปิดอยู่">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
        </svg>
      </div>

      <!-- Profile Section -->
      <div class="profile-section">
        <div class="level-badge">ระดับ {{ providerLevel }}</div>
        <h1 class="partner-name">พาร์ทเนอร์ {{ displayName }}</h1>
        
        <!-- Earnings Display -->
        <div class="earnings-display">
          <span class="earnings-label">รายได้วันนี้</span>
          <span class="earnings-amount">
            <span class="currency">฿</span>
            {{ todayEarnings.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Delivery Person Illustration (SVG) -->
      <div class="illustration">
        <svg viewBox="0 0 200 200" fill="none" class="delivery-svg">
          <!-- Scooter -->
          <ellipse cx="100" cy="160" rx="60" ry="10" fill="rgba(0,0,0,0.1)"/>
          <circle cx="60" cy="150" r="20" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <circle cx="140" cy="150" r="20" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <path d="M50 130 L70 100 L130 100 L150 130" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <rect x="65" y="90" width="70" height="15" rx="5" fill="#333"/>
          <!-- Person -->
          <circle cx="100" cy="50" r="20" fill="#FFB347"/>
          <ellipse cx="100" cy="85" rx="25" ry="20" fill="#00A86B"/>
          <rect x="85" y="100" width="30" height="5" fill="#333"/>
          <!-- Helmet -->
          <path d="M80 45 Q100 20 120 45" fill="#FFD93D" stroke="#333" stroke-width="2"/>
          <!-- Box -->
          <rect x="110" y="70" width="35" height="30" rx="3" fill="#8B4513" stroke="#333" stroke-width="2"/>
          <rect x="115" y="75" width="25" height="5" fill="#A0522D"/>
        </svg>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Availability Status Card -->
      <div class="availability-card" :class="availabilityStatus.color">
        <div class="availability-indicator">
          <!-- Status Icon -->
          <div class="status-icon-wrapper" :class="availabilityStatus.color">
            <!-- Offline Icon -->
            <svg v-if="availabilityStatus.icon === 'offline'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
            <!-- Working Icon -->
            <svg v-else-if="availabilityStatus.icon === 'working'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            <!-- Ready Icon -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
          </div>
          
          <div class="status-text">
            <span class="status-label">{{ availabilityStatus.label }}</span>
            <span class="status-desc">{{ availabilityStatus.desc }}</span>
          </div>
        </div>
        
        <button 
          class="toggle-btn"
          :class="{ active: isOnline }"
          :disabled="isToggling"
          :aria-label="isOnline ? 'ปิดรับงาน' : 'เปิดรับงาน'"
          @click="toggleOnline"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <!-- Active Job Card -->
      <div v-if="hasActiveJob && activeJob" class="active-job-card" @click="goToJobDetail">
        <div class="job-header">
          <div class="job-status-badge" :class="jobStatusColor">
            <span class="pulse-dot"></span>
            {{ jobStatusLabel }}
          </div>
          
          <!-- Order Number Badge -->
          <button
            class="order-number-badge"
            :class="{ copied: isCopied }"
            :aria-label="`หมายเลขออเดอร์ ${formatOrderNumber(activeJob.tracking_id)} แตะเพื่อคัดลอก`"
            role="button"
            tabindex="0"
            type="button"
            @click.stop="copyOrderNumber"
            @keydown="handleOrderNumberKeydown"
          >
            <span aria-hidden="true">{{ formatOrderNumber(activeJob.tracking_id) }}</span>
            <svg class="copy-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          
          <span class="job-fare">฿{{ activeJob.estimated_fare.toFixed(0) }}</span>
        </div>
        
        <div class="job-route">
          <div class="route-point pickup">
            <div class="point-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </div>
            <div class="point-info">
              <span class="point-label">รับ</span>
              <span class="point-address">{{ activeJob.pickup_address }}</span>
            </div>
          </div>
          
          <div class="route-line"></div>
          
          <div class="route-point dropoff">
            <div class="point-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
            </div>
            <div class="point-info">
              <span class="point-label">ส่ง</span>
              <span class="point-address">{{ activeJob.destination_address }}</span>
            </div>
          </div>
        </div>
        
        <div class="job-footer">
          <span class="customer-name">👤 {{ activeJob.customer_name }}</span>
          <span class="view-detail">
            ดูรายละเอียด
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      <!-- Today's Stats -->
      <div v-if="isOnline" class="stats-card">
        <h3 class="stats-title">สถิติวันนี้</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ todayStats.completed }}</span>
            <span class="stat-label">งานสำเร็จ</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ todayStats.totalDistance.toFixed(1) }}</span>
            <span class="stat-label">กม.</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" :class="{ 'text-red': todayStats.cancelled > 0 }">{{ todayStats.cancelled }}</span>
            <span class="stat-label">ยกเลิก</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ todayStats.avgRating > 0 ? todayStats.avgRating.toFixed(1) : '-' }}</span>
            <span class="stat-label">⭐ เรตติ้ง</span>
          </div>
        </div>
      </div>

      <!-- Rush Hour Alert -->
      <div v-if="isRushHour && isOnline && !hasActiveJob" class="alert-card">
        <div class="alert-icon">
          <svg viewBox="0 0 64 64" fill="none" class="alert-svg">
            <rect x="10" y="20" width="44" height="35" rx="4" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>
            <rect x="15" y="25" width="34" height="5" fill="#A0522D"/>
            <path d="M20 45 L32 35 L44 45" stroke="#8B4513" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <div class="alert-content">
          <span class="alert-badge">ช่วงเร่งด่วน ระวังด้วยนะ</span>
          <h3 class="alert-title">พบ {{ availableOrders }} งานส่ง!</h3>
          <button class="alert-link" @click="goToOrders">
            ดูรายละเอียด
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Orders Available (when not rush hour and no active job) -->
      <div v-else-if="isOnline && availableOrders > 0 && !hasActiveJob" class="orders-card" @click="goToOrders">
        <div class="orders-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div class="orders-content">
          <h3>{{ availableOrders }} งานที่พร้อมรับ</h3>
          <span>แตะเพื่อดูและรับงาน</span>
        </div>
        <svg class="orders-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- No Jobs Available -->
      <div v-else-if="isOnline && availableOrders === 0 && !hasActiveJob" class="no-jobs-card">
        <div class="no-jobs-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <p>ยังไม่มีงานใหม่ในขณะนี้</p>
        <span>ระบบจะแจ้งเตือนเมื่อมีงานเข้ามา</span>
      </div>

      <!-- Recent Transactions -->
      <section class="transactions-section">
        <h2 class="section-title">รายการล่าสุด</h2>
        
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="recentTransactions.length === 0" class="empty-state">
          <p>ไม่มีรายการล่าสุด</p>
        </div>

        <div v-else class="transactions-list">
          <div 
            v-for="tx in recentTransactions" 
            :key="tx.id"
            class="transaction-item"
          >
            <div class="tx-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            </div>
            <div class="tx-content">
              <h4>{{ tx.count }} งานส่ง</h4>
              <span class="tx-meta">{{ tx.date }} • {{ tx.distance.toFixed(1) }} กม.</span>
            </div>
            <div class="tx-amount">
              <span class="tx-earnings">+ ฿{{ tx.earnings.toFixed(2) }}</span>
              <span v-if="tx.tips > 0" class="tx-tips">+ ฿{{ tx.tips.toFixed(2) }} ทิป</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.provider-home {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Notification Prompt */
.notification-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
  color: #FFFFFF;
  padding: 16px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.prompt-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.prompt-icon {
  font-size: 28px;
}

.prompt-text h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 2px 0;
}

.prompt-text p {
  font-size: 13px;
  opacity: 0.9;
  margin: 0;
}

.prompt-actions {
  display: flex;
  gap: 8px;
}

.prompt-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.prompt-btn.dismiss {
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
}

.prompt-btn.dismiss:active {
  background: rgba(255, 255, 255, 0.3);
}

.prompt-btn.enable {
  background: #FFFFFF;
  color: #1E40AF;
}

.prompt-btn.enable:active {
  transform: scale(0.98);
}

.prompt-btn.enable:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Slide down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Notification Badge */
.notification-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.notification-badge svg {
  width: 20px;
  height: 20px;
}

/* Header */
.header {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  padding: 16px 20px 80px;
  position: relative;
  overflow: hidden;
}

.menu-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #FFFFFF;
  margin-bottom: 20px;
}

.menu-btn svg {
  width: 24px;
  height: 24px;
}

.profile-section {
  position: relative;
  z-index: 1;
}

.level-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.partner-name {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 16px 0;
}

.earnings-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.earnings-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.earnings-amount {
  font-size: 36px;
  font-weight: 700;
  color: #FFFFFF;
}

.currency {
  font-size: 24px;
  margin-right: 2px;
}

.illustration {
  position: absolute;
  right: -10px;
  bottom: 30px;
  width: 160px;
  height: 160px;
  opacity: 0.95;
}

.delivery-svg {
  width: 100%;
  height: 100%;
}

/* Content */
.content {
  padding: 0 16px 24px;
  margin-top: -60px;
  position: relative;
  z-index: 10;
}

/* Availability Status Card */
.availability-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  border-left: 4px solid #9CA3AF;
  transition: border-color 0.3s;
}

.availability-card.green {
  border-left-color: #00A86B;
}

.availability-card.blue {
  border-left-color: #3B82F6;
}

.availability-card.gray {
  border-left-color: #9CA3AF;
}

.availability-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  color: #6B7280;
}

.status-icon-wrapper.green {
  background: #E8F5EF;
  color: #00A86B;
}

.status-icon-wrapper.blue {
  background: #EFF6FF;
  color: #3B82F6;
}

.status-icon-wrapper.gray {
  background: #F3F4F6;
  color: #6B7280;
}

.status-icon-wrapper svg {
  width: 24px;
  height: 24px;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.status-desc {
  font-size: 13px;
  color: #6B7280;
}

/* Active Job Card */
.active-job-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid #3B82F6;
}

.active-job-card:active {
  transform: scale(0.98);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
}

.job-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: #3B82F6;
  color: #FFFFFF;
}

.job-status-badge.blue {
  background: #3B82F6;
}

.job-status-badge.orange {
  background: #F97316;
}

.job-status-badge.green {
  background: #00A86B;
}

.job-status-badge.yellow {
  background: #EAB308;
  color: #1F2937;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Order Number Badge */
.order-number-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 44px;
}

.order-number-badge:hover {
  background: #E5E7EB;
}

.order-number-badge:focus {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

.order-number-badge:focus:not(:focus-visible) {
  outline: none;
}

.order-number-badge:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

.order-number-badge:active {
  background: #D1FAE5;
  color: #065F46;
  transform: scale(0.95);
}

.order-number-badge.copied {
  background: #D1FAE5;
  color: #065F46;
  animation: pulse-success 0.5s ease;
}

@keyframes pulse-success {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.copy-icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.order-number-badge:hover .copy-icon {
  opacity: 1;
}

/* Responsive styles for order number badge */
@media (max-width: 639px) {
  .order-number-badge {
    font-size: 12px;
    padding: 4px 8px;
  }
}

@media (min-width: 640px) and (max-width: 1023px) {
  .order-number-badge {
    font-size: 13px;
  }
}

@media (min-width: 1024px) {
  .order-number-badge {
    font-size: 14px;
    padding: 6px 12px;
  }
}

.job-fare {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.job-route {
  padding: 16px;
  position: relative;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-point.pickup {
  margin-bottom: 24px;
}

.point-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.route-point.pickup .point-icon {
  color: #00A86B;
}

.route-point.dropoff .point-icon {
  color: #EF4444;
}

.point-icon svg {
  width: 100%;
  height: 100%;
}

.point-info {
  flex: 1;
  min-width: 0;
}

.point-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.point-address {
  display: block;
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-line {
  position: absolute;
  left: 27px;
  top: 44px;
  width: 2px;
  height: 20px;
  background: repeating-linear-gradient(
    to bottom,
    #D1D5DB 0px,
    #D1D5DB 4px,
    transparent 4px,
    transparent 8px
  );
}

.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #F9FAFB;
  border-top: 1px solid #E5E7EB;
}

.customer-name {
  font-size: 14px;
  color: #374151;
}

.view-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #3B82F6;
}

.view-detail svg {
  width: 16px;
  height: 16px;
}

/* Stats Card */
.stats-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  margin: 0 0 12px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-item {
  text-align: center;
  padding: 8px 4px;
  background: #F9FAFB;
  border-radius: 12px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.stat-value.text-red {
  color: #EF4444;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #6B7280;
  margin-top: 2px;
}

/* No Jobs Card */
.no-jobs-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  text-align: center;
}

.no-jobs-icon {
  width: 56px;
  height: 56px;
  background: #F3F4F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  margin-bottom: 12px;
}

.no-jobs-icon svg {
  width: 28px;
  height: 28px;
}

.no-jobs-card p {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 4px 0;
}

.no-jobs-card span {
  font-size: 13px;
  color: #6B7280;
}

/* Status Card - Legacy (keeping for compatibility) */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.toggle-track {
  display: block;
  width: 52px;
  height: 32px;
  background: #E5E7EB;
  border-radius: 16px;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: #00A86B;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

/* Alert Card */
.alert-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.alert-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.alert-svg {
  width: 100%;
  height: 100%;
}

.alert-content {
  flex: 1;
}

.alert-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #FEF3C7;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #B45309;
  margin-bottom: 8px;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.alert-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
}

.alert-link svg {
  width: 16px;
  height: 16px;
}

/* Orders Card */
.orders-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.orders-card:active {
  transform: scale(0.98);
}

.orders-icon {
  width: 48px;
  height: 48px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.orders-icon svg {
  width: 24px;
  height: 24px;
}

.orders-content {
  flex: 1;
}

.orders-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

.orders-content span {
  font-size: 13px;
  color: #6B7280;
}

.orders-arrow {
  width: 20px;
  height: 20px;
  color: #9CA3AF;
}

/* Transactions Section */
.transactions-section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B7280;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  width: 44px;
  height: 44px;
  background: #F3F4F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
}

.tx-icon svg {
  width: 22px;
  height: 22px;
}

.tx-content {
  flex: 1;
}

.tx-content h4 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

.tx-meta {
  font-size: 13px;
  color: #6B7280;
}

.tx-amount {
  text-align: right;
}

.tx-earnings {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #00A86B;
}

.tx-tips {
  display: block;
  font-size: 12px;
  color: #6B7280;
}
</style>
