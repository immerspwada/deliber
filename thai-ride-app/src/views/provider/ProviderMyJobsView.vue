<script setup lang="ts">
/**
 * ProviderMyJobsView - หน้าติดตามสถานะงานของ Provider
 * Feature: F14 - Provider Dashboard
 * 
 * แสดงงานทุกสถานะ:
 * - งานที่รับได้ (pending)
 * - งานที่กำลังทำ (matched, in_progress, picked_up)
 * - งานที่สำเร็จ (completed)
 * - งานที่ยกเลิก (cancelled)
 * 
 * ฟีเจอร์เพิ่มเติม:
 * - Filter ตามช่วงวันที่
 * - Export รายงาน CSV
 * - Pull-to-refresh
 * - Skeleton loading
 * 
 * MUNEEF Style: สีเขียว #00A86B
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../lib/supabase'
import { useProviderDashboard } from '../../composables/useProviderDashboard'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import ProviderLayout from '../../components/ProviderLayout.vue'
import JobDetailModal from '../../components/provider/JobDetailModal.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Get singleton profile from useProviderDashboard for consistency
const { profile: dashboardProfile, activeJob: dashboardActiveJob, acceptRequest, updateJobStatus } = useProviderDashboard()

// Haptic feedback
const { vibrate, feedback, notifyNewJob } = useHapticFeedback()

// Job Detail Modal state
const showJobModal = ref(false)
const selectedJob = ref<Job | null>(null)

// Types
interface Job {
  id: string
  tracking_id?: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  status: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  final_fare?: number
  customer_name: string
  customer_phone?: string
  created_at: string
  matched_at?: string
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  rating?: number
}

type TabType = 'available' | 'active' | 'completed' | 'cancelled'
type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom'

// State
const loading = ref(true)
const isRefreshing = ref(false)
const providerInfo = ref<any>(null)
const currentTab = ref<TabType>((route.query.tab as TabType) || 'available')
const jobs = ref<Job[]>([])
const stats = ref({
  available: 0,
  active: 0,
  completed: 0,
  cancelled: 0,
  todayEarnings: 0,
  todayTrips: 0
})

// Date Filter State
const showDateFilter = ref(false)
const dateFilter = ref<DateFilterType>('all')
const customStartDate = ref('')
const customEndDate = ref('')

// Pull-to-refresh state
const pullStartY = ref(0)
const pullDistance = ref(0)
const isPulling = ref(false)
const pullThreshold = 80

// Realtime subscription
let jobsSubscription: any = null

// Tab config
const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'available', label: 'รับได้', icon: 'inbox' },
  { key: 'active', label: 'กำลังทำ', icon: 'clock' },
  { key: 'completed', label: 'สำเร็จ', icon: 'check' },
  { key: 'cancelled', label: 'ยกเลิก', icon: 'x' }
]

// Date filter options
const dateFilterOptions: { key: DateFilterType; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'today', label: 'วันนี้' },
  { key: 'week', label: '7 วันที่แล้ว' },
  { key: 'month', label: '30 วันที่แล้ว' },
  { key: 'custom', label: 'กำหนดเอง' }
]

// Status mapping
const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'รอรับงาน', color: '#F59E0B', bg: '#FEF3C7' },
  matched: { label: 'รับงานแล้ว', color: '#3B82F6', bg: '#DBEAFE' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#8B5CF6', bg: '#EDE9FE' },
  picked_up: { label: 'รับของแล้ว', color: '#06B6D4', bg: '#CFFAFE' },
  completed: { label: 'สำเร็จ', color: '#00A86B', bg: '#E8F5EF' },
  cancelled: { label: 'ยกเลิก', color: '#EF4444', bg: '#FEE2E2' },
  cancelled_by_customer: { label: 'ลูกค้ายกเลิก', color: '#EF4444', bg: '#FEE2E2' },
  cancelled_by_provider: { label: 'ผู้ให้บริการยกเลิก', color: '#F97316', bg: '#FFEDD5' }
}

// Type labels
const typeLabels: Record<string, { label: string; icon: string }> = {
  ride: { label: 'เรียกรถ', icon: '🚗' },
  delivery: { label: 'ส่งของ', icon: '📦' },
  shopping: { label: 'ซื้อของ', icon: '🛒' },
  queue: { label: 'จองคิว', icon: '🎫' },
  moving: { label: 'ขนย้าย', icon: '🚚' },
  laundry: { label: 'ซักผ้า', icon: '👕' }
}

// Computed
const filteredJobs = computed(() => {
  // Include active job from singleton if not already in jobs list
  let allJobs = [...jobs.value]
  
  if (dashboardActiveJob.value && !allJobs.find(j => j.id === dashboardActiveJob.value?.id)) {
    const activeJob = dashboardActiveJob.value
    console.log('[MyJobs] Adding active job from singleton:', activeJob.tracking_id)
    allJobs.unshift({
      id: activeJob.id,
      tracking_id: activeJob.tracking_id,
      type: activeJob.type,
      status: activeJob.status,
      pickup_address: activeJob.pickup.address,
      destination_address: activeJob.destination.address,
      estimated_fare: activeJob.fare,
      customer_name: activeJob.customer.name,
      customer_phone: activeJob.customer.phone,
      created_at: activeJob.created_at
    })
  }
  
  let result = allJobs.filter(job => {
    switch (currentTab.value) {
      case 'available':
        return job.status === 'pending'
      case 'active':
        return ['matched', 'in_progress', 'picked_up'].includes(job.status)
      case 'completed':
        return job.status === 'completed'
      case 'cancelled':
        return job.status.startsWith('cancelled')
      default:
        return true
    }
  })
  
  // Apply date filter
  if (dateFilter.value !== 'all') {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (dateFilter.value) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        startDate = customStartDate.value ? new Date(customStartDate.value) : new Date(0)
        endDate = customEndDate.value ? new Date(customEndDate.value + 'T23:59:59') : now
        break
      default:
        startDate = new Date(0)
    }
    
    result = result.filter(job => {
      const jobDate = new Date(job.created_at)
      return jobDate >= startDate && jobDate <= endDate
    })
  }
  
  return result
})

// Computed stats that includes active job from singleton
const displayStats = computed(() => {
  const baseStats = { ...stats.value }
  
  // If there's an active job from singleton that's not in our jobs list, add to active count
  if (dashboardActiveJob.value) {
    const activeJobInList = jobs.value.find(j => j.id === dashboardActiveJob.value?.id)
    if (!activeJobInList && ['matched', 'in_progress', 'picked_up'].includes(dashboardActiveJob.value.status)) {
      baseStats.active += 1
    }
  }
  
  return baseStats
})

// Date filter label
const dateFilterLabel = computed(() => {
  const option = dateFilterOptions.find(o => o.key === dateFilter.value)
  if (dateFilter.value === 'custom' && customStartDate.value && customEndDate.value) {
    return `${formatShortDate(customStartDate.value)} - ${formatShortDate(customEndDate.value)}`
  }
  return option?.label || 'ทั้งหมด'
})

const formatShortDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// Watch tab changes and update URL
watch(currentTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } })
})

// Watch for active job changes from singleton - auto switch to active tab
watch(dashboardActiveJob, (newJob, oldJob) => {
  if (newJob && !oldJob) {
    console.log('[MyJobs] Active job detected from singleton, switching to active tab')
    currentTab.value = 'active'
    // Refresh jobs list to include the new active job
    fetchJobs()
  } else if (!newJob && oldJob) {
    console.log('[MyJobs] Active job completed/cancelled, refreshing jobs')
    fetchJobs()
  }
}, { immediate: false })

// Fetch provider info
const fetchProviderInfo = async () => {
  // First, check if we have profile from singleton (useProviderDashboard)
  if (dashboardProfile.value?.id) {
    console.log('[MyJobs] Using singleton profile:', { 
      id: dashboardProfile.value.id, 
      user_id: dashboardProfile.value.user_id 
    })
    providerInfo.value = dashboardProfile.value
    return dashboardProfile.value
  }
  
  if (!authStore.user?.id) {
    console.warn('[MyJobs] No auth user, cannot fetch provider info')
    return null
  }
  
  console.log('[MyJobs] Fetching provider info for user:', authStore.user.id)
  
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('user_id', authStore.user.id)
    .maybeSingle()
  
  if (error) {
    console.error('[MyJobs] Error fetching provider:', error)
    return null
  }
  
  if (data) {
    console.log('[MyJobs] Provider found:', { id: data.id, user_id: data.user_id, status: data.status })
  } else {
    console.warn('[MyJobs] No provider record found for user')
  }
  
  providerInfo.value = data
  return data
}

// Fetch all jobs
const fetchJobs = async () => {
  if (!providerInfo.value?.id) {
    console.warn('[MyJobs] No provider info, skipping fetch')
    return
  }
  
  const providerId = providerInfo.value.id
  console.log('[MyJobs] Fetching jobs for provider:', providerId)
  
  loading.value = true
  const allJobs: Job[] = []
  
  try {
    // Fetch rides - use two separate queries for clarity
    // Query 1: Rides assigned to this provider (any status)
    const { data: myRides, error: myRidesError } = await supabase
      .from('ride_requests')
      .select(`
        id, tracking_id, status, pickup_address, destination_address,
        estimated_fare, final_fare, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        ride_ratings (rating)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (myRidesError) {
      console.error('[MyJobs] Error fetching my rides:', myRidesError)
    } else {
      console.log('[MyJobs] My rides found:', myRides?.length || 0, myRides?.map(r => ({ id: r.tracking_id, status: r.status })))
    }
    
    // Query 2: Pending rides without provider (available to accept)
    const { data: pendingRides, error: pendingError } = await supabase
      .from('ride_requests')
      .select(`
        id, tracking_id, status, pickup_address, destination_address,
        estimated_fare, final_fare, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        ride_ratings (rating)
      `)
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (pendingError) {
      console.error('[MyJobs] Error fetching pending rides:', pendingError)
    } else {
      console.log('[MyJobs] Pending rides found:', pendingRides?.length || 0)
    }
    
    // Combine results (avoid duplicates)
    const allRides = [...(myRides || []), ...(pendingRides || [])]
    const uniqueRides = allRides.filter((ride, index, self) => 
      index === self.findIndex(r => r.id === ride.id)
    )
    
    if (uniqueRides.length > 0) {
      allJobs.push(...uniqueRides.map((r: any) => ({
        id: r.id,
        tracking_id: r.tracking_id,
        type: 'ride' as const,
        status: r.status,
        pickup_address: r.pickup_address,
        destination_address: r.destination_address,
        estimated_fare: r.estimated_fare || 0,
        final_fare: r.final_fare,
        customer_name: r.users ? `${r.users.first_name || ''} ${r.users.last_name || ''}`.trim() || 'ผู้โดยสาร' : 'ผู้โดยสาร',
        customer_phone: r.users?.phone_number,
        created_at: r.created_at,
        matched_at: r.matched_at,
        completed_at: r.completed_at,
        cancelled_at: r.cancelled_at,
        cancel_reason: r.cancel_reason,
        rating: r.ride_ratings?.[0]?.rating
      })))
    }

    // Fetch deliveries - use two separate queries
    // Query 1: Deliveries assigned to this provider
    const { data: myDeliveries, error: myDelError } = await supabase
      .from('delivery_requests')
      .select(`
        id, tracking_id, status, sender_address, recipient_address,
        estimated_fee, final_fee, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        delivery_ratings (rating)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (myDelError) {
      console.error('[MyJobs] Error fetching my deliveries:', myDelError)
    }
    
    // Query 2: Pending deliveries without provider
    const { data: pendingDeliveries, error: pendingDelError } = await supabase
      .from('delivery_requests')
      .select(`
        id, tracking_id, status, sender_address, recipient_address,
        estimated_fee, final_fee, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        delivery_ratings (rating)
      `)
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (pendingDelError) {
      console.error('[MyJobs] Error fetching pending deliveries:', pendingDelError)
    }
    
    // Combine and dedupe
    const allDeliveries = [...(myDeliveries || []), ...(pendingDeliveries || [])]
    const uniqueDeliveries = allDeliveries.filter((del, index, self) => 
      index === self.findIndex(d => d.id === del.id)
    )
    
    if (uniqueDeliveries.length > 0) {
      allJobs.push(...uniqueDeliveries.map((d: any) => ({
        id: d.id,
        tracking_id: d.tracking_id,
        type: 'delivery' as const,
        status: d.status,
        pickup_address: d.sender_address,
        destination_address: d.recipient_address,
        estimated_fare: d.estimated_fee || 0,
        final_fare: d.final_fee,
        customer_name: d.users ? `${d.users.first_name || ''} ${d.users.last_name || ''}`.trim() || 'ลูกค้า' : 'ลูกค้า',
        customer_phone: d.users?.phone_number,
        created_at: d.created_at,
        matched_at: d.matched_at,
        completed_at: d.completed_at,
        cancelled_at: d.cancelled_at,
        cancel_reason: d.cancel_reason,
        rating: d.delivery_ratings?.[0]?.rating
      })))
    }

    // Fetch shopping - use two separate queries
    // Query 1: Shopping assigned to this provider
    const { data: myShopping, error: myShopError } = await supabase
      .from('shopping_requests')
      .select(`
        id, tracking_id, status, store_address, delivery_address,
        service_fee, final_fee, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        shopping_ratings (rating)
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (myShopError) {
      console.error('[MyJobs] Error fetching my shopping:', myShopError)
    }
    
    // Query 2: Pending shopping without provider
    const { data: pendingShopping, error: pendingShopError } = await supabase
      .from('shopping_requests')
      .select(`
        id, tracking_id, status, store_address, delivery_address,
        service_fee, final_fee, created_at, matched_at, completed_at,
        cancelled_at, cancel_reason, provider_id,
        users:user_id (first_name, last_name, phone_number),
        shopping_ratings (rating)
      `)
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (pendingShopError) {
      console.error('[MyJobs] Error fetching pending shopping:', pendingShopError)
    }
    
    // Combine and dedupe
    const allShopping = [...(myShopping || []), ...(pendingShopping || [])]
    const uniqueShopping = allShopping.filter((shop, index, self) => 
      index === self.findIndex(s => s.id === shop.id)
    )
    
    if (uniqueShopping.length > 0) {
      allJobs.push(...uniqueShopping.map((s: any) => ({
        id: s.id,
        tracking_id: s.tracking_id,
        type: 'shopping' as const,
        status: s.status,
        pickup_address: s.store_address || 'ร้านค้า',
        destination_address: s.delivery_address,
        estimated_fare: s.service_fee || 0,
        final_fare: s.final_fee,
        customer_name: s.users ? `${s.users.first_name || ''} ${s.users.last_name || ''}`.trim() || 'ลูกค้า' : 'ลูกค้า',
        customer_phone: s.users?.phone_number,
        created_at: s.created_at,
        matched_at: s.matched_at,
        completed_at: s.completed_at,
        cancelled_at: s.cancelled_at,
        cancel_reason: s.cancel_reason,
        rating: s.shopping_ratings?.[0]?.rating
      })))
    }

    // Sort by created_at
    allJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    jobs.value = allJobs
    console.log('[MyJobs] Total jobs loaded:', allJobs.length, 'Active:', allJobs.filter(j => ['matched', 'in_progress', 'picked_up'].includes(j.status)).length)
    
    // Update stats
    stats.value = {
      available: allJobs.filter(j => j.status === 'pending').length,
      active: allJobs.filter(j => ['matched', 'in_progress', 'picked_up'].includes(j.status)).length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      cancelled: allJobs.filter(j => j.status.startsWith('cancelled')).length,
      todayEarnings: calculateTodayEarnings(allJobs),
      todayTrips: calculateTodayTrips(allJobs)
    }
  } catch (err) {
    console.error('Error fetching jobs:', err)
  } finally {
    loading.value = false
  }
}

// Calculate today's earnings
const calculateTodayEarnings = (allJobs: Job[]): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return allJobs
    .filter(j => j.status === 'completed' && j.completed_at && new Date(j.completed_at) >= today)
    .reduce((sum, j) => sum + (j.final_fare || j.estimated_fare), 0)
}

// Calculate today's trips
const calculateTodayTrips = (allJobs: Job[]): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return allJobs.filter(j => j.status === 'completed' && j.completed_at && new Date(j.completed_at) >= today).length
}

// Format date
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'เมื่อวาน ' + date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return `${days} วันที่แล้ว`
  } else {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  }
}

// Accept job
const acceptJob = async (job: Job) => {
  if (!providerInfo.value?.id) return
  
  loading.value = true
  
  try {
    let tableName = ''
    switch (job.type) {
      case 'ride': tableName = 'ride_requests'; break
      case 'delivery': tableName = 'delivery_requests'; break
      case 'shopping': tableName = 'shopping_requests'; break
      default: return
    }
    
    const { error } = await supabase
      .from(tableName)
      .update({
        provider_id: providerInfo.value.id,
        status: 'matched',
        matched_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'pending')
    
    if (error) throw error
    
    feedback('success')
    await fetchJobs()
    currentTab.value = 'active'
  } catch (err: any) {
    feedback('error')
    alert('ไม่สามารถรับงานได้: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Open job detail modal
const openJobModal = (job: Job) => {
  vibrate('light')
  selectedJob.value = job
  showJobModal.value = true
}

// Close job detail modal
const closeJobModal = () => {
  showJobModal.value = false
  selectedJob.value = null
}

// Handle accept from modal
const handleModalAccept = async (job: Job) => {
  closeJobModal()
  await acceptJob(job)
}

// Handle status update from modal
const handleModalUpdateStatus = async (job: Job, newStatus: string) => {
  loading.value = true
  try {
    let tableName = ''
    switch (job.type) {
      case 'ride': tableName = 'ride_requests'; break
      case 'delivery': tableName = 'delivery_requests'; break
      case 'shopping': tableName = 'shopping_requests'; break
      default: return
    }
    
    const updateData: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', job.id)
    
    if (error) throw error
    
    feedback('success')
    await fetchJobs()
    closeJobModal()
  } catch (err: any) {
    feedback('error')
    alert('ไม่สามารถอัพเดทสถานะได้: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Handle cancel from modal
const handleModalCancel = async (job: Job) => {
  loading.value = true
  try {
    let tableName = ''
    switch (job.type) {
      case 'ride': tableName = 'ride_requests'; break
      case 'delivery': tableName = 'delivery_requests'; break
      case 'shopping': tableName = 'shopping_requests'; break
      default: return
    }
    
    const { error } = await supabase
      .from(tableName)
      .update({
        status: 'cancelled_by_provider',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', job.id)
    
    if (error) throw error
    
    feedback('success')
    await fetchJobs()
    closeJobModal()
  } catch (err: any) {
    feedback('error')
    alert('ไม่สามารถยกเลิกงานได้: ' + err.message)
  } finally {
    loading.value = false
  }
}

// View job detail (legacy - navigate to page)
const viewJobDetail = (job: Job) => {
  const routes: Record<string, string> = {
    ride: '/provider/active-ride',
    delivery: '/delivery/tracking',
    shopping: '/shopping/tracking',
    queue: '/queue/tracking',
    moving: '/moving/tracking',
    laundry: '/laundry/tracking'
  }
  
  const basePath = routes[job.type] || '/provider/dashboard'
  router.push(`${basePath}/${job.id}`)
}

// Setup realtime with new job notification
const setupRealtime = () => {
  if (!providerInfo.value?.id) return
  
  // Track previous pending count for new job detection
  let previousPendingCount = jobs.value.filter(j => j.status === 'pending').length
  
  const handleRealtimeUpdate = async () => {
    await fetchJobs()
    
    // Check if new pending jobs arrived
    const currentPendingCount = jobs.value.filter(j => j.status === 'pending').length
    if (currentPendingCount > previousPendingCount) {
      console.log('[MyJobs] New job detected! Triggering notification')
      notifyNewJob()
    }
    previousPendingCount = currentPendingCount
  }
  
  jobsSubscription = supabase
    .channel('provider_jobs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, handleRealtimeUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests' }, handleRealtimeUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_requests' }, handleRealtimeUpdate)
    .subscribe()
}

// Enhanced Pull-to-refresh handlers with haptic
const onTouchStart = (e: TouchEvent) => {
  if (window.scrollY === 0) {
    pullStartY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value) return
  const currentY = e.touches[0].clientY
  const newDistance = Math.max(0, Math.min(currentY - pullStartY.value, pullThreshold * 1.5))
  
  // Haptic feedback when crossing threshold
  if (newDistance >= pullThreshold && pullDistance.value < pullThreshold) {
    vibrate('medium')
  }
  
  pullDistance.value = newDistance
}

const onTouchEnd = async () => {
  if (pullDistance.value >= pullThreshold && !isRefreshing.value) {
    vibrate('heavy')
    isRefreshing.value = true
    await fetchJobs()
    feedback('success')
    isRefreshing.value = false
  }
  pullDistance.value = 0
  isPulling.value = false
}

// Export to CSV
const exportToCSV = () => {
  vibrate('light')
  const dataToExport = filteredJobs.value
  if (dataToExport.length === 0) {
    alert('ไม่มีข้อมูลให้ส่งออก')
    return
  }
  
  const headers = ['Tracking ID', 'ประเภท', 'สถานะ', 'ลูกค้า', 'จุดรับ', 'จุดส่ง', 'ค่าบริการ', 'วันที่']
  const rows = dataToExport.map(job => [
    job.tracking_id || job.id.slice(0, 8),
    typeLabels[job.type]?.label || job.type,
    statusLabels[job.status]?.label || job.status,
    job.customer_name,
    `"${job.pickup_address}"`,
    `"${job.destination_address}"`,
    job.final_fare || job.estimated_fare,
    new Date(job.created_at).toLocaleString('th-TH')
  ])
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `provider-jobs-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Apply date filter
const applyDateFilter = (filter: DateFilterType) => {
  dateFilter.value = filter
  if (filter !== 'custom') {
    showDateFilter.value = false
  }
}

// Apply custom date range
const applyCustomDateRange = () => {
  if (customStartDate.value && customEndDate.value) {
    dateFilter.value = 'custom'
    showDateFilter.value = false
  }
}

onMounted(async () => {
  await fetchProviderInfo()
  if (providerInfo.value) {
    await fetchJobs()
    setupRealtime()
  } else {
    loading.value = false
  }
})

onUnmounted(() => {
  if (jobsSubscription) {
    supabase.removeChannel(jobsSubscription)
  }
})
</script>

<template>
  <ProviderLayout>
    <div 
      class="my-jobs-page"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Pull to Refresh Indicator -->
      <div 
        class="pull-indicator"
        :style="{ 
          height: pullDistance + 'px',
          opacity: pullDistance / pullThreshold
        }"
      >
        <div class="pull-content">
          <div :class="['pull-spinner', { spinning: isRefreshing }]"></div>
          <span>{{ isRefreshing ? 'กำลังโหลด...' : 'ดึงลงเพื่อรีเฟรช' }}</span>
        </div>
      </div>

      <!-- Header -->
      <div class="page-header">
        <div class="header-top">
          <h1>งานของฉัน</h1>
          <button class="export-btn" @click="exportToCSV" title="ส่งออก CSV">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
          </button>
        </div>
        <div class="today-stats">
          <div class="stat-item">
            <span class="stat-value">฿{{ displayStats.todayEarnings.toLocaleString() }}</span>
            <span class="stat-label">รายได้วันนี้</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ displayStats.todayTrips }}</span>
            <span class="stat-label">เที่ยววันนี้</span>
          </div>
        </div>
      </div>

      <!-- Date Filter -->
      <div class="filter-bar">
        <button class="filter-btn" @click="showDateFilter = !showDateFilter">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span>{{ dateFilterLabel }}</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <span class="filter-count">{{ filteredJobs.length }} รายการ</span>
      </div>

      <!-- Date Filter Dropdown -->
      <div v-if="showDateFilter" class="date-filter-dropdown">
        <button 
          v-for="option in dateFilterOptions" 
          :key="option.key"
          :class="['filter-option', { active: dateFilter === option.key }]"
          @click="applyDateFilter(option.key)"
        >
          {{ option.label }}
        </button>
        
        <!-- Custom Date Range -->
        <div v-if="dateFilter === 'custom'" class="custom-date-range">
          <div class="date-input-group">
            <label>จาก</label>
            <input type="date" v-model="customStartDate" />
          </div>
          <div class="date-input-group">
            <label>ถึง</label>
            <input type="date" v-model="customEndDate" />
          </div>
          <button class="apply-btn" @click="applyCustomDateRange">ใช้งาน</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: currentTab === tab.key }]"
          @click="currentTab = tab.key"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="displayStats[tab.key] > 0" class="tab-badge">{{ displayStats[tab.key] }}</span>
        </button>
      </div>

      <!-- Skeleton Loading -->
      <div v-if="loading" class="skeleton-list">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <div class="skeleton-icon"></div>
            <div class="skeleton-text short"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-body">
            <div class="skeleton-text"></div>
            <div class="skeleton-text medium"></div>
          </div>
          <div class="skeleton-footer">
            <div class="skeleton-text short"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      </div>

      <!-- No Provider -->
      <div v-else-if="!providerInfo" class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h3>ยังไม่ได้เป็นผู้ให้บริการ</h3>
        <p>สมัครเป็นผู้ให้บริการเพื่อเริ่มรับงาน</p>
        <button @click="router.push('/provider/onboarding')" class="btn-primary">
          สมัครเลย
        </button>
      </div>

      <!-- Empty Jobs -->
      <div v-else-if="filteredJobs.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6M9 15h6"/>
          </svg>
        </div>
        <h3>
          {{ currentTab === 'available' ? 'ยังไม่มีงานใหม่' : 
             currentTab === 'active' ? 'ไม่มีงานที่กำลังทำ' :
             currentTab === 'completed' ? 'ยังไม่มีงานที่สำเร็จ' : 'ไม่มีงานที่ยกเลิก' }}
        </h3>
        <p v-if="currentTab === 'available'">เปิดรับงานเพื่อรอรับงานใหม่</p>
      </div>

      <!-- Jobs List -->
      <div v-else class="jobs-list">
        <div 
          v-for="job in filteredJobs" 
          :key="job.id"
          class="job-card"
          @click="openJobModal(job)"
        >
          <!-- Job Header -->
          <div class="job-header">
            <div class="job-type">
              <svg v-if="job.type === 'ride'" class="type-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 4h8m-4 4v4m-4-4h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z"/>
              </svg>
              <svg v-else-if="job.type === 'delivery'" class="type-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <svg v-else-if="job.type === 'shopping'" class="type-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <svg v-else class="type-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span class="type-label">{{ typeLabels[job.type]?.label || job.type }}</span>
            </div>
            <div 
              class="job-status"
              :style="{ 
                color: statusLabels[job.status]?.color || '#666',
                backgroundColor: statusLabels[job.status]?.bg || '#F5F5F5'
              }"
            >
              {{ statusLabels[job.status]?.label || job.status }}
            </div>
          </div>

          <!-- Customer Info -->
          <div class="customer-info">
            <span class="customer-name">{{ job.customer_name }}</span>
            <span class="job-time">{{ formatDate(job.created_at) }}</span>
          </div>

          <!-- Route Info -->
          <div class="route-info">
            <div class="route-point">
              <div class="point-dot pickup"></div>
              <span class="point-address">{{ job.pickup_address }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="point-dot destination"></div>
              <span class="point-address">{{ job.destination_address }}</span>
            </div>
          </div>

          <!-- Job Footer -->
          <div class="job-footer">
            <!-- Rating (for completed) -->
            <div v-if="job.rating" class="rating-badge">
              <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>{{ job.rating }}</span>
            </div>

            <!-- Cancel Reason (for cancelled) -->
            <div v-else-if="job.cancel_reason" class="cancel-reason">
              {{ job.cancel_reason }}
            </div>

            <div v-else class="spacer"></div>

            <!-- Fare -->
            <span class="job-fare">฿{{ (job.final_fare || job.estimated_fare).toLocaleString() }}</span>
          </div>

          <!-- Accept Button (for available) -->
          <button 
            v-if="currentTab === 'available'"
            class="btn-accept"
            @click.stop="acceptJob(job)"
          >
            รับงาน
          </button>
        </div>
      </div>
    </div>
  </ProviderLayout>
</template>


<style scoped>
.my-jobs-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 100px;
  position: relative;
}

/* Pull to Refresh */
.pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #E8F5EF;
  z-index: 5;
}

.pull-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #00A86B;
}

.pull-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
}

.pull-spinner.spinning {
  animation: spin 0.8s linear infinite;
}

.page-header {
  background: #FFFFFF;
  padding: 20px;
  border-bottom: 1px solid #E8E8E8;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
}

.export-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn:hover {
  background: #E8E8E8;
  color: #00A86B;
}

.today-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #F5F5F5;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
}

.filter-count {
  font-size: 13px;
  color: #666666;
}

/* Date Filter Dropdown */
.date-filter-dropdown {
  background: #FFFFFF;
  padding: 12px 16px;
  border-bottom: 1px solid #E8E8E8;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-option {
  padding: 8px 14px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option.active {
  background: #00A86B;
  color: #FFFFFF;
}

.custom-date-range {
  width: 100%;
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.date-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-input-group label {
  font-size: 12px;
  color: #666666;
}

.date-input-group input {
  padding: 10px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

.apply-btn {
  align-self: flex-end;
  padding: 10px 20px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #FFFFFF;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #00A86B;
  color: #FFFFFF;
}

.tab-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.3);
}

/* Skeleton Loading */
.skeleton-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex: 1;
}

.skeleton-text.short {
  width: 80px;
  flex: none;
}

.skeleton-text.medium {
  width: 60%;
}

.skeleton-badge {
  width: 60px;
  height: 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #999999;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
}

.btn-primary {
  padding: 14px 32px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #008F5B;
}

/* Jobs List */
.jobs-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}

.job-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.job-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 20px;
}

.type-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.job-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.customer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.customer-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.job-time {
  font-size: 13px;
  color: #999999;
}

/* Route Info */
.route-info {
  position: relative;
  padding-left: 24px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

.route-point:first-child {
  margin-bottom: 12px;
}

.point-dot {
  position: absolute;
  left: -24px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.point-dot.pickup {
  background: #00A86B;
}

.point-dot.destination {
  background: #E53935;
}

.route-line {
  position: absolute;
  left: -20px;
  top: 18px;
  bottom: 18px;
  width: 2px;
  background: #E8E8E8;
}

.point-address {
  font-size: 14px;
  color: #333333;
  line-height: 1.4;
}

/* Job Footer */
.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #FEF3C7;
  border-radius: 12px;
}

.star-icon {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

.rating-badge span {
  font-size: 13px;
  font-weight: 600;
  color: #92400E;
}

.cancel-reason {
  font-size: 13px;
  color: #EF4444;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.job-fare {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

/* Accept Button */
.btn-accept {
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-accept:hover {
  background: #008F5B;
}

.btn-accept:active {
  transform: scale(0.98);
}

/* Responsive */
@media (max-width: 480px) {
  .page-header h1 {
    font-size: 20px;
  }
  
  .stat-value {
    font-size: 18px;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>
