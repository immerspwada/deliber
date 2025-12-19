<!--
  AdminOrdersView - ระบบจัดการออเดอร์แบบเต็มรูปแบบ
  
  Feature: F23 - Admin Dashboard (Orders Management)
  
  ความสามารถ:
  - ดูออเดอร์ทุกประเภท (Ride, Delivery, Shopping, Queue, Moving, Laundry)
  - แก้ไขสถานะออเดอร์ (ส่งผลต่อ Customer และ Provider)
  - ยกเลิกออเดอร์พร้อม Refund
  - ดูรายละเอียดออเดอร์แบบละเอียด
  - ค้นหาและกรองข้อมูล
  - Export ข้อมูล
  - Realtime sync
  
  @syncs-with
  - Customer: ride.ts, useDelivery.ts, useShopping.ts
  - Provider: useProvider.ts
  - Database: ride_requests, delivery_requests, shopping_requests, etc.
-->

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { AdminModal, AdminButton, AdminStatusBadge } from '../components/admin'
import { useAdmin } from '../composables/useAdmin'
import { useAdminCleanup } from '../composables/useAdminCleanup'
import { supabase } from '../lib/supabase'

// Type assertion helper for Supabase
const db = supabase as any

const { loading } = useAdmin()
const { addSubscription, addCleanup } = useAdminCleanup()

// State
const orders = ref<any[]>([])
const totalOrders = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
// Sort options (used in queries)
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
void sortBy // Reserved for future sorting feature
void sortOrder // Reserved for future sorting feature

// Modal states
const showDetailModal = ref(false)
const showStatusModal = ref(false)
const showCancelModal = ref(false)
const showRefundModal = ref(false)
const showBulkStatusModal = ref(false)
const showBulkCancelModal = ref(false)
const showTimelineModal = ref(false)
const selectedOrder = ref<any>(null)
const actionLoading = ref(false)

// Bulk selection state
const selectedOrders = ref<Set<string>>(new Set())
const selectAll = ref(false)
const bulkNewStatus = ref('')
const bulkCancelReason = ref('')

// Timeline state
const orderTimeline = ref<any[]>([])
const timelineLoading = ref(false)

// Quick filter state
const activeQuickFilter = ref('')

// Order Notes state
const showNotesModal = ref(false)
const orderNotes = ref<any[]>([])
const newNoteText = ref('')
const notesLoading = ref(false)

// Order Assignment state
const showAssignModal = ref(false)
const availableProviders = ref<any[]>([])
const selectedProviderId = ref('')
const providersLoading = ref(false)
const providerSearchQuery = ref('')

// Auto-Assignment state
const autoAssignEnabled = ref(false)
const autoAssignThreshold = ref(5) // minutes
const autoAssignLoading = ref(false)
const autoAssignInterval = ref<any>(null)
const lastAutoAssignRun = ref<Date | null>(null)

// Provider Map state
const showProviderMap = ref(false)
const mapCenter = ref({ lat: 13.7563, lng: 100.5018 }) // Bangkok default
const providerMarkers = ref<any[]>([])

// Auto-Assignment Rules state
const showRulesModal = ref(false)
const autoAssignRules = ref({
  minRating: 4.0,
  maxDistance: 10, // km
  maxActiveTrips: 2,
  minTotalTrips: 10,
  preferredVehicleTypes: [] as string[],
  excludeNewProviders: false, // providers with < 10 trips
  prioritizeHighRating: true
})

// Assignment History state
const showHistoryModal = ref(false)
const assignmentHistory = ref<any[]>([])
const historyLoading = ref(false)
const historyStats = ref({
  totalAttempts: 0,
  successCount: 0,
  failedCount: 0,
  avgAssignTime: 0, // seconds
  topFailReasons: [] as { reason: string; count: number }[]
})
void historyLoading // Reserved for future use

// Auto-Assignment Schedule state
const autoAssignSchedule = ref({
  enabled: false,
  startTime: '06:00',
  endTime: '22:00',
  workingDaysOnly: false, // Mon-Fri only
  activeDays: [0, 1, 2, 3, 4, 5, 6] as number[] // 0=Sun, 1=Mon, ..., 6=Sat
})

// Note Templates
const noteTemplates = [
  { id: 1, text: 'ติดต่อลูกค้าแล้ว รอ callback', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { id: 2, text: 'ส่งต่อทีม Support แล้ว', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 3, text: 'ลูกค้าขอเลื่อนเวลา', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 4, text: 'รอยืนยันจาก Provider', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 5, text: 'ปัญหาการชำระเงิน - ตรวจสอบแล้ว', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 6, text: 'ที่อยู่ไม่ชัดเจน - ติดต่อลูกค้าเพิ่มเติม', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { id: 7, text: 'Refund อนุมัติแล้ว รอดำเนินการ', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 8, text: 'เคสพิเศษ - ต้องติดตามใกล้ชิด', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
]

// Stats
const stats = ref({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0,
  todayRevenue: 0
})

// Cancel/Refund form
const cancelReason = ref('')
const refundAmount = ref(0)
const refundNote = ref('')

// Order types configuration
const orderTypes = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'ride', label: 'เรียกรถ', icon: '🚗', color: '#00A86B' },
  { value: 'delivery', label: 'ส่งของ', icon: '📦', color: '#F5A623' },
  { value: 'shopping', label: 'ซื้อของ', icon: '🛒', color: '#E91E63' },
  { value: 'queue', label: 'จองคิว', icon: '🎫', color: '#9C27B0' },
  { value: 'moving', label: 'ขนย้าย', icon: '🚚', color: '#2196F3' },
  { value: 'laundry', label: 'ซักผ้า', icon: '👕', color: '#00BCD4' }
]

// Status configuration
const statusConfig: Record<string, { label: string; color: string; badgeStatus: string }> = {
  pending: { label: 'รอดำเนินการ', color: '#F5A623', badgeStatus: 'pending' },
  matched: { label: 'จับคู่แล้ว', color: '#1976D2', badgeStatus: 'info' },
  confirmed: { label: 'ยืนยันแล้ว', color: '#1976D2', badgeStatus: 'info' },
  pickup: { label: 'กำลังรับ', color: '#1976D2', badgeStatus: 'info' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#1976D2', badgeStatus: 'info' },
  in_transit: { label: 'กำลังส่ง', color: '#1976D2', badgeStatus: 'info' },
  shopping: { label: 'กำลังซื้อ', color: '#E91E63', badgeStatus: 'info' },
  delivering: { label: 'กำลังจัดส่ง', color: '#1976D2', badgeStatus: 'info' },
  washing: { label: 'กำลังซัก', color: '#00BCD4', badgeStatus: 'info' },
  ready: { label: 'พร้อมส่ง', color: '#00A86B', badgeStatus: 'success' },
  completed: { label: 'สำเร็จ', color: '#00A86B', badgeStatus: 'success' },
  delivered: { label: 'ส่งแล้ว', color: '#00A86B', badgeStatus: 'success' },
  cancelled: { label: 'ยกเลิก', color: '#E53935', badgeStatus: 'error' },
  failed: { label: 'ล้มเหลว', color: '#E53935', badgeStatus: 'error' }
}

// Status options for update
const statusOptions = [
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'matched', label: 'จับคู่แล้ว' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'สำเร็จ' },
  { value: 'cancelled', label: 'ยกเลิก' }
]

// Fetch all orders from all tables
const fetchAllOrders = async () => {
  loading.value = true
  try {
    // Fetch from all order tables in parallel
    const [rides, deliveries, shopping, queues, moving, laundry] = await Promise.all([
      db.from('ride_requests').select(`
        *, 
        users:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, vehicle_plate, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100),
      
      db.from('delivery_requests').select(`
        *, 
        users:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, vehicle_plate, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100),
      
      db.from('shopping_requests').select(`
        *, 
        users:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, vehicle_plate, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100),
      
      db.from('queue_bookings').select(`
        *, 
        user:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100),
      
      db.from('moving_requests').select(`
        *, 
        user:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100),
      
      db.from('laundry_requests').select(`
        *, 
        user:user_id(id, name, email, phone_number, member_uid),
        provider:provider_id(id, vehicle_type, users(name, phone_number))
      `).order('created_at', { ascending: false }).limit(100)
    ])

    // Normalize and combine all orders
    const allOrders = [
      ...(rides.data || []).map((r: any) => normalizeOrder(r, 'ride')),
      ...(deliveries.data || []).map((d: any) => normalizeOrder(d, 'delivery')),
      ...(shopping.data || []).map((s: any) => normalizeOrder(s, 'shopping')),
      ...(queues.data || []).map((q: any) => normalizeOrder(q, 'queue')),
      ...(moving.data || []).map((m: any) => normalizeOrder(m, 'moving')),
      ...(laundry.data || []).map((l: any) => normalizeOrder(l, 'laundry'))
    ]

    // Sort by created_at
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    orders.value = allOrders
    totalOrders.value = allOrders.length
    calculateStats(allOrders)
  } catch (err) {
    console.error('Error fetching orders:', err)
    // Use mock data for demo
    orders.value = generateMockOrders()
    calculateStats(orders.value)
  } finally {
    loading.value = false
  }
}

// Normalize order data from different tables
const normalizeOrder = (order: any, type: string) => {
  const user = order.users || order.user
  const provider = order.provider
  
  return {
    id: order.id,
    type,
    tracking_id: order.tracking_id || `${type.toUpperCase().slice(0,3)}-${order.id?.slice(0,8)}`,
    status: order.status,
    user_id: order.user_id,
    provider_id: order.provider_id,
    
    // User info
    user_name: user?.name || 'ไม่ระบุ',
    user_phone: user?.phone_number || user?.phone || '',
    user_email: user?.email || '',
    member_uid: user?.member_uid || '',
    
    // Provider info
    provider_name: provider?.users?.name || '',
    provider_phone: provider?.users?.phone_number || '',
    vehicle_type: provider?.vehicle_type || '',
    vehicle_plate: provider?.vehicle_plate || '',
    
    // Location info
    pickup_address: order.pickup_address || order.sender_address || order.pickup_location || order.location_name || '',
    destination_address: order.destination_address || order.recipient_address || order.delivery_address || '',
    
    // Price info
    amount: order.final_fare || order.estimated_fare || order.estimated_fee || 
            order.service_fee || order.total_price || order.price || 0,
    tip_amount: order.tip_amount || 0,
    
    // Timestamps
    created_at: order.created_at,
    updated_at: order.updated_at,
    completed_at: order.completed_at,
    cancelled_at: order.cancelled_at,
    scheduled_time: order.scheduled_time || order.scheduled_datetime || null,
    
    // Additional info
    notes: order.notes || order.special_instructions || order.description || '',
    cancel_reason: order.cancel_reason || order.cancellation_reason || '',
    payment_method: order.payment_method || 'cash',
    
    // Package photo (for delivery)
    package_photo: order.package_photo || null,
    pickup_photo: order.pickup_photo || null,
    delivery_photo: order.delivery_photo || null,
    
    // Delivery proof photos with GPS (F03 Enhancement)
    pickup_proof_photo: order.pickup_proof_photo || null,
    pickup_proof_lat: order.pickup_proof_lat || null,
    pickup_proof_lng: order.pickup_proof_lng || null,
    pickup_proof_timestamp: order.pickup_proof_timestamp || null,
    delivery_proof_photo: order.delivery_proof_photo || null,
    delivery_proof_lat: order.delivery_proof_lat || null,
    delivery_proof_lng: order.delivery_proof_lng || null,
    delivery_proof_timestamp: order.delivery_proof_timestamp || null,
    
    // Recipient signature (F03c Enhancement)
    recipient_signature: order.recipient_signature || null,
    signature_timestamp: order.signature_timestamp || null,
    signature_name: order.signature_name || null,
    
    // Original data for detail view
    _raw: order
  }
}

// Calculate stats from orders
const calculateStats = (orderList: any[]) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  stats.value = {
    total: orderList.length,
    pending: orderList.filter(o => o.status === 'pending').length,
    inProgress: orderList.filter(o => ['matched', 'in_progress', 'pickup', 'in_transit', 'shopping', 'washing'].includes(o.status)).length,
    completed: orderList.filter(o => ['completed', 'delivered'].includes(o.status)).length,
    cancelled: orderList.filter(o => o.status === 'cancelled').length,
    todayRevenue: orderList
      .filter(o => ['completed', 'delivered'].includes(o.status) && new Date(o.created_at) >= today)
      .reduce((sum, o) => sum + (o.amount || 0), 0)
  }
}

// Filtered and sorted orders
const filteredOrders = computed(() => {
  let result = [...orders.value]
  
  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(o => 
      o.tracking_id?.toLowerCase().includes(query) ||
      o.user_name?.toLowerCase().includes(query) ||
      o.member_uid?.toLowerCase().includes(query) ||
      o.user_phone?.includes(query) ||
      o.pickup_address?.toLowerCase().includes(query) ||
      o.destination_address?.toLowerCase().includes(query)
    )
  }
  
  // Type filter
  if (typeFilter.value) {
    result = result.filter(o => o.type === typeFilter.value)
  }
  
  // Status filter
  if (statusFilter.value) {
    result = result.filter(o => o.status === statusFilter.value)
  }
  
  // Date filter
  if (dateFilter.value) {
    const filterDate = new Date(dateFilter.value)
    filterDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(filterDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    result = result.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= filterDate && orderDate < nextDay
    })
  }
  
  // Quick filter
  if (activeQuickFilter.value) {
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    
    switch (activeQuickFilter.value) {
      case 'waiting_long':
        // Orders pending for more than 30 minutes
        result = result.filter(o => 
          o.status === 'pending' && 
          new Date(o.created_at) < thirtyMinutesAgo
        )
        break
      case 'needs_attention':
        // Orders with issues (cancelled, failed, or pending too long)
        result = result.filter(o => 
          o.status === 'cancelled' || 
          o.status === 'failed' ||
          (o.status === 'pending' && new Date(o.created_at) < thirtyMinutesAgo)
        )
        break
      case 'pending_refund':
        // Cancelled orders that might need refund
        result = result.filter(o => 
          o.status === 'cancelled' && 
          o.amount > 0 && 
          !o._raw?.refunded_at
        )
        break
      case 'no_provider':
        // Orders without provider assigned
        result = result.filter(o => 
          o.status === 'pending' && 
          !o.provider_id
        )
        break
      case 'today':
        // Today's orders
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        result = result.filter(o => new Date(o.created_at) >= today)
        break
    }
  }
  
  return result
})

// Paginated orders
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / pageSize.value))

// Get table name for order type
const getTableName = (type: string) => {
  const tables: Record<string, string> = {
    ride: 'ride_requests',
    delivery: 'delivery_requests',
    shopping: 'shopping_requests',
    queue: 'queue_bookings',
    moving: 'moving_requests',
    laundry: 'laundry_requests'
  }
  return tables[type] || 'ride_requests'
}

// Update order status - affects Customer & Provider via Realtime
const updateOrderStatus = async (order: any, newStatus: string) => {
  actionLoading.value = true
  try {
    const tableName = getTableName(order.type)
    
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus === 'completed' || newStatus === 'delivered') {
      updates.completed_at = new Date().toISOString()
    }
    
    const { error } = await db
      .from(tableName)
      .update(updates)
      .eq('id', order.id)
    
    if (error) throw error
    
    // Send notification to customer
    await sendNotification(order.user_id, {
      type: 'order_update',
      title: 'สถานะออเดอร์อัพเดท',
      message: `ออเดอร์ ${order.tracking_id} เปลี่ยนสถานะเป็น ${statusConfig[newStatus]?.label || newStatus}`,
      data: { order_id: order.id, order_type: order.type, status: newStatus }
    })
    
    // Send notification to provider if assigned
    if (order.provider_id) {
      await sendNotification(order.provider_id, {
        type: 'order_update',
        title: 'สถานะงานอัพเดท',
        message: `งาน ${order.tracking_id} ถูกอัพเดทโดย Admin`,
        data: { order_id: order.id, order_type: order.type, status: newStatus }
      }, true)
    }
    
    // Log audit
    await logAudit('order_status_update', {
      order_id: order.id,
      order_type: order.type,
      old_status: order.status,
      new_status: newStatus,
      updated_by: 'admin'
    })
    
    // Refresh orders
    await fetchAllOrders()
    showStatusModal.value = false
    
  } catch (err) {
    console.error('Error updating status:', err)
    alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ')
  } finally {
    actionLoading.value = false
  }
}

// Cancel order with reason - affects all roles
const cancelOrder = async () => {
  if (!selectedOrder.value || !cancelReason.value) return
  
  actionLoading.value = true
  try {
    const order = selectedOrder.value
    const tableName = getTableName(order.type)
    
    const { error } = await db
      .from(tableName)
      .update({
        status: 'cancelled',
        cancel_reason: cancelReason.value,
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
    
    if (error) throw error
    
    // Notify customer
    await sendNotification(order.user_id, {
      type: 'order_cancelled',
      title: 'ออเดอร์ถูกยกเลิก',
      message: `ออเดอร์ ${order.tracking_id} ถูกยกเลิก: ${cancelReason.value}`,
      data: { order_id: order.id, reason: cancelReason.value }
    })
    
    // Notify provider if assigned
    if (order.provider_id) {
      await sendNotification(order.provider_id, {
        type: 'order_cancelled',
        title: 'งานถูกยกเลิก',
        message: `งาน ${order.tracking_id} ถูกยกเลิกโดย Admin`,
        data: { order_id: order.id, reason: cancelReason.value }
      }, true)
    }
    
    await logAudit('order_cancelled', {
      order_id: order.id,
      order_type: order.type,
      reason: cancelReason.value,
      cancelled_by: 'admin'
    })
    
    await fetchAllOrders()
    showCancelModal.value = false
    cancelReason.value = ''
    
  } catch (err) {
    console.error('Error cancelling order:', err)
    alert('เกิดข้อผิดพลาดในการยกเลิกออเดอร์')
  } finally {
    actionLoading.value = false
  }
}

// Process refund - affects Customer wallet
const processRefund = async () => {
  if (!selectedOrder.value || refundAmount.value <= 0) return
  
  actionLoading.value = true
  try {
    const order = selectedOrder.value
    
    // Add refund to customer wallet
    const { error: walletError } = await db.rpc('add_wallet_transaction', {
      p_user_id: order.user_id,
      p_amount: refundAmount.value,
      p_type: 'refund',
      p_description: `คืนเงินออเดอร์ ${order.tracking_id}: ${refundNote.value || 'Admin refund'}`,
      p_reference_id: order.id,
      p_reference_type: order.type
    })
    
    if (walletError) {
      // Fallback: insert directly to wallet_transactions
      await db.from('wallet_transactions').insert({
        user_id: order.user_id,
        amount: refundAmount.value,
        type: 'refund',
        description: `คืนเงินออเดอร์ ${order.tracking_id}`,
        reference_id: order.id,
        reference_type: order.type,
        status: 'completed'
      })
    }
    
    // Update order with refund info
    const tableName = getTableName(order.type)
    await db
      .from(tableName)
      .update({
        refund_amount: refundAmount.value,
        refund_reason: refundNote.value,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
    
    // Notify customer
    await sendNotification(order.user_id, {
      type: 'refund_processed',
      title: 'คืนเงินสำเร็จ',
      message: `คุณได้รับเงินคืน ฿${refundAmount.value.toLocaleString()} จากออเดอร์ ${order.tracking_id}`,
      data: { order_id: order.id, amount: refundAmount.value }
    })
    
    await logAudit('refund_processed', {
      order_id: order.id,
      order_type: order.type,
      amount: refundAmount.value,
      note: refundNote.value
    })
    
    await fetchAllOrders()
    showRefundModal.value = false
    refundAmount.value = 0
    refundNote.value = ''
    
  } catch (err) {
    console.error('Error processing refund:', err)
    alert('เกิดข้อผิดพลาดในการคืนเงิน')
  } finally {
    actionLoading.value = false
  }
}

// Send notification helper
const sendNotification = async (userId: string, notification: any, isProvider = false) => {
  try {
    const table = isProvider ? 'user_notifications' : 'user_notifications'
    await db.from(table).insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      is_read: false
    })
  } catch (err) {
    console.error('Error sending notification:', err)
  }
}

// Log audit helper
const logAudit = async (action: string, data: any) => {
  try {
    await db.from('status_audit_log').insert({
      action,
      entity_type: data.order_type || 'order',
      entity_id: data.order_id,
      old_value: data.old_status ? { status: data.old_status } : null,
      new_value: data.new_status ? { status: data.new_status } : data,
      changed_by: 'admin',
      change_reason: data.reason || action
    })
  } catch (err) {
    console.error('Error logging audit:', err)
  }
}

// Open modals
const openDetailModal = (order: any) => {
  selectedOrder.value = order
  showDetailModal.value = true
}

const openStatusModal = (order: any) => {
  selectedOrder.value = order
  showStatusModal.value = true
}

const openCancelModal = (order: any) => {
  selectedOrder.value = order
  cancelReason.value = ''
  showCancelModal.value = true
}

const openRefundModal = (order: any) => {
  selectedOrder.value = order
  refundAmount.value = order.amount || 0
  refundNote.value = ''
  showRefundModal.value = true
}

// Open photo viewer (simple window.open for now)
const openPhotoViewer = (photoUrl: string) => {
  window.open(photoUrl, '_blank')
}

// =====================================================
// BULK ACTIONS
// =====================================================

// Toggle single order selection
const toggleOrderSelection = (orderId: string) => {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId)
  } else {
    selectedOrders.value.add(orderId)
  }
  // Update selectAll state
  selectAll.value = selectedOrders.value.size === paginatedOrders.value.length
}

// Toggle select all on current page
const toggleSelectAll = () => {
  if (selectAll.value) {
    // Deselect all
    selectedOrders.value.clear()
    selectAll.value = false
  } else {
    // Select all on current page that can be modified
    paginatedOrders.value.forEach(order => {
      if (!['completed', 'cancelled', 'delivered'].includes(order.status)) {
        selectedOrders.value.add(order.id)
      }
    })
    selectAll.value = true
  }
}

// Clear all selections
const clearSelection = () => {
  selectedOrders.value.clear()
  selectAll.value = false
}

// Get selected orders data
const getSelectedOrdersData = () => {
  return orders.value.filter(o => selectedOrders.value.has(o.id))
}

// Open bulk status modal
const openBulkStatusModal = () => {
  if (selectedOrders.value.size === 0) {
    alert('กรุณาเลือกออเดอร์อย่างน้อย 1 รายการ')
    return
  }
  bulkNewStatus.value = ''
  showBulkStatusModal.value = true
}

// Open bulk cancel modal
const openBulkCancelModal = () => {
  if (selectedOrders.value.size === 0) {
    alert('กรุณาเลือกออเดอร์อย่างน้อย 1 รายการ')
    return
  }
  bulkCancelReason.value = ''
  showBulkCancelModal.value = true
}

// Bulk update status
const bulkUpdateStatus = async () => {
  if (!bulkNewStatus.value) return
  
  actionLoading.value = true
  const selectedData = getSelectedOrdersData()
  let successCount = 0
  let failCount = 0
  
  try {
    for (const order of selectedData) {
      try {
        const tableName = getTableName(order.type)
        const updates: Record<string, any> = {
          status: bulkNewStatus.value,
          updated_at: new Date().toISOString()
        }
        
        if (bulkNewStatus.value === 'completed' || bulkNewStatus.value === 'delivered') {
          updates.completed_at = new Date().toISOString()
        }
        
        const { error } = await db
          .from(tableName)
          .update(updates)
          .eq('id', order.id)
        
        if (error) throw error
        
        // Send notification to customer
        await sendNotification(order.user_id, {
          type: 'order_update',
          title: 'สถานะออเดอร์อัพเดท',
          message: `ออเดอร์ ${order.tracking_id} เปลี่ยนสถานะเป็น ${statusConfig[bulkNewStatus.value]?.label}`,
          data: { order_id: order.id, status: bulkNewStatus.value }
        })
        
        // Notify provider if assigned
        if (order.provider_id) {
          await sendNotification(order.provider_id, {
            type: 'order_update',
            title: 'สถานะงานอัพเดท',
            message: `งาน ${order.tracking_id} ถูกอัพเดทโดย Admin`,
            data: { order_id: order.id, status: bulkNewStatus.value }
          }, true)
        }
        
        // Log audit
        await logAudit('bulk_status_update', {
          order_id: order.id,
          order_type: order.type,
          old_status: order.status,
          new_status: bulkNewStatus.value,
          bulk_action: true
        })
        
        successCount++
      } catch {
        failCount++
      }
    }
    
    alert(`อัพเดทสำเร็จ ${successCount} รายการ${failCount > 0 ? `, ล้มเหลว ${failCount} รายการ` : ''}`)
    
    await fetchAllOrders()
    clearSelection()
    showBulkStatusModal.value = false
    
  } catch (err) {
    console.error('Bulk update error:', err)
    alert('เกิดข้อผิดพลาดในการอัพเดท')
  } finally {
    actionLoading.value = false
  }
}

// Bulk cancel orders
const bulkCancelOrders = async () => {
  if (!bulkCancelReason.value) return
  
  actionLoading.value = true
  const selectedData = getSelectedOrdersData()
  let successCount = 0
  let failCount = 0
  
  try {
    for (const order of selectedData) {
      try {
        const tableName = getTableName(order.type)
        
        const { error } = await db
          .from(tableName)
          .update({
            status: 'cancelled',
            cancel_reason: bulkCancelReason.value,
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'admin',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
        
        if (error) throw error
        
        // Notify customer
        await sendNotification(order.user_id, {
          type: 'order_cancelled',
          title: 'ออเดอร์ถูกยกเลิก',
          message: `ออเดอร์ ${order.tracking_id} ถูกยกเลิก: ${bulkCancelReason.value}`,
          data: { order_id: order.id, reason: bulkCancelReason.value }
        })
        
        // Notify provider if assigned
        if (order.provider_id) {
          await sendNotification(order.provider_id, {
            type: 'order_cancelled',
            title: 'งานถูกยกเลิก',
            message: `งาน ${order.tracking_id} ถูกยกเลิกโดย Admin`,
            data: { order_id: order.id, reason: bulkCancelReason.value }
          }, true)
        }
        
        // Log audit
        await logAudit('bulk_order_cancelled', {
          order_id: order.id,
          order_type: order.type,
          reason: bulkCancelReason.value,
          bulk_action: true
        })
        
        successCount++
      } catch {
        failCount++
      }
    }
    
    alert(`ยกเลิกสำเร็จ ${successCount} รายการ${failCount > 0 ? `, ล้มเหลว ${failCount} รายการ` : ''}`)
    
    await fetchAllOrders()
    clearSelection()
    showBulkCancelModal.value = false
    
  } catch (err) {
    console.error('Bulk cancel error:', err)
    alert('เกิดข้อผิดพลาดในการยกเลิก')
  } finally {
    actionLoading.value = false
  }
}

// =====================================================
// ORDER TIMELINE
// =====================================================

// Fetch order timeline/audit history
const fetchOrderTimeline = async (order: any) => {
  timelineLoading.value = true
  orderTimeline.value = []
  
  try {
    // Fetch from status_audit_log
    const { data: auditLogs } = await db
      .from('status_audit_log')
      .select('*')
      .eq('entity_id', order.id)
      .order('created_at', { ascending: true })
    
    if (auditLogs && auditLogs.length > 0) {
      orderTimeline.value = auditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        oldStatus: log.old_value?.status,
        newStatus: log.new_value?.status,
        changedBy: log.changed_by || 'system',
        reason: log.change_reason,
        timestamp: log.created_at,
        data: log.new_value
      }))
    } else {
      // Generate timeline from order data if no audit logs
      orderTimeline.value = generateTimelineFromOrder(order)
    }
  } catch (err) {
    console.error('Error fetching timeline:', err)
    // Fallback to generated timeline
    orderTimeline.value = generateTimelineFromOrder(order)
  } finally {
    timelineLoading.value = false
  }
}

// Generate timeline from order data (fallback)
const generateTimelineFromOrder = (order: any) => {
  const timeline = []
  
  // Order created
  timeline.push({
    id: 'created',
    action: 'order_created',
    newStatus: 'pending',
    changedBy: 'customer',
    reason: 'ลูกค้าสร้างออเดอร์',
    timestamp: order.created_at
  })
  
  // If matched
  if (order.provider_id && order.status !== 'pending') {
    timeline.push({
      id: 'matched',
      action: 'provider_matched',
      oldStatus: 'pending',
      newStatus: 'matched',
      changedBy: 'provider',
      reason: `${order.provider_name || 'ผู้ให้บริการ'} รับงาน`,
      timestamp: order.matched_at || order.updated_at
    })
  }
  
  // Current status if different
  if (!['pending', 'matched'].includes(order.status)) {
    timeline.push({
      id: 'current',
      action: 'status_update',
      newStatus: order.status,
      changedBy: order.cancelled_by || 'system',
      reason: order.cancel_reason || `สถานะเปลี่ยนเป็น ${statusConfig[order.status]?.label || order.status}`,
      timestamp: order.completed_at || order.cancelled_at || order.updated_at
    })
  }
  
  return timeline
}

// Open timeline modal
const openTimelineModal = async (order: any) => {
  selectedOrder.value = order
  showTimelineModal.value = true
  await fetchOrderTimeline(order)
}

// Get timeline icon based on action
const getTimelineIcon = (action: string) => {
  const icons: Record<string, string> = {
    order_created: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    provider_matched: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    status_update: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    order_cancelled: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    refund_processed: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    bulk_status_update: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  }
  return icons[action] || icons.status_update
}

// Get timeline color based on status
const getTimelineColor = (status: string) => {
  if (status === 'completed' || status === 'delivered') return '#00A86B'
  if (status === 'cancelled' || status === 'failed') return '#E53935'
  if (status === 'pending') return '#F5A623'
  return '#1976D2'
}

// Format timeline action text
const formatTimelineAction = (item: any) => {
  const actions: Record<string, string> = {
    order_created: 'สร้างออเดอร์',
    provider_matched: 'ผู้ให้บริการรับงาน',
    status_update: 'อัพเดทสถานะ',
    order_status_update: 'อัพเดทสถานะ',
    order_cancelled: 'ยกเลิกออเดอร์',
    bulk_order_cancelled: 'ยกเลิกออเดอร์ (Bulk)',
    bulk_status_update: 'อัพเดทสถานะ (Bulk)',
    refund_processed: 'คืนเงิน'
  }
  return actions[item.action] || item.action
}

// =====================================================
// QUICK FILTERS
// =====================================================

// Quick filter options
const quickFilters = [
  { value: 'today', label: 'วันนี้', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: '#1976D2' },
  { value: 'waiting_long', label: 'รอนาน >30 นาที', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#F5A623' },
  { value: 'needs_attention', label: 'ต้องดูแล', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: '#E53935' },
  { value: 'pending_refund', label: 'รอ Refund', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: '#9C27B0' },
  { value: 'no_provider', label: 'ไม่มีคนรับ', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: '#00BCD4' }
]

// Apply quick filter
const applyQuickFilter = (filterValue: string) => {
  if (activeQuickFilter.value === filterValue) {
    activeQuickFilter.value = ''
  } else {
    activeQuickFilter.value = filterValue
    // Clear other filters when using quick filter
    typeFilter.value = ''
    statusFilter.value = ''
    dateFilter.value = ''
    searchQuery.value = ''
  }
  currentPage.value = 1
}

// Get quick filter count
const getQuickFilterCount = (filterValue: string) => {
  const now = new Date()
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (filterValue) {
    case 'waiting_long':
      return orders.value.filter(o => 
        o.status === 'pending' && 
        new Date(o.created_at) < thirtyMinutesAgo
      ).length
    case 'needs_attention':
      return orders.value.filter(o => 
        o.status === 'cancelled' || 
        o.status === 'failed' ||
        (o.status === 'pending' && new Date(o.created_at) < thirtyMinutesAgo)
      ).length
    case 'pending_refund':
      return orders.value.filter(o => 
        o.status === 'cancelled' && 
        o.amount > 0 && 
        !o._raw?.refunded_at
      ).length
    case 'no_provider':
      return orders.value.filter(o => 
        o.status === 'pending' && 
        !o.provider_id
      ).length
    case 'today':
      return orders.value.filter(o => new Date(o.created_at) >= today).length
    default:
      return 0
  }
}

// =====================================================
// ORDER NOTES / COMMENTS
// =====================================================

// Fetch order notes
const fetchOrderNotes = async (orderId: string) => {
  notesLoading.value = true
  orderNotes.value = []
  
  try {
    const { data } = await db
      .from('order_notes')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    
    if (data) {
      orderNotes.value = data
    }
  } catch (err) {
    console.error('Error fetching notes:', err)
    // Generate mock notes for demo
    orderNotes.value = []
  } finally {
    notesLoading.value = false
  }
}

// Add new note
const addOrderNote = async () => {
  if (!selectedOrder.value || !newNoteText.value.trim()) return
  
  notesLoading.value = true
  try {
    const newNote = {
      order_id: selectedOrder.value.id,
      order_type: selectedOrder.value.type,
      note: newNoteText.value.trim(),
      created_by: 'admin',
      created_at: new Date().toISOString()
    }
    
    // Try to insert to database
    const { error } = await db
      .from('order_notes')
      .insert(newNote)
    
    if (error) {
      // If table doesn't exist, just add to local state for demo
      console.warn('order_notes table may not exist, adding locally')
    }
    
    // Add to local state
    orderNotes.value.unshift({
      ...newNote,
      id: Date.now().toString()
    })
    
    newNoteText.value = ''
    
    // Log audit
    await logAudit('note_added', {
      order_id: selectedOrder.value.id,
      order_type: selectedOrder.value.type,
      note_preview: newNote.note.substring(0, 50)
    })
    
  } catch (err) {
    console.error('Error adding note:', err)
    alert('เกิดข้อผิดพลาดในการเพิ่มหมายเหตุ')
  } finally {
    notesLoading.value = false
  }
}

// Open notes modal
const openNotesModal = async (order: any) => {
  selectedOrder.value = order
  newNoteText.value = ''
  showNotesModal.value = true
  await fetchOrderNotes(order.id)
}

// Delete note
const deleteNote = async (noteId: string) => {
  if (!confirm('ต้องการลบหมายเหตุนี้?')) return
  
  try {
    await db
      .from('order_notes')
      .delete()
      .eq('id', noteId)
    
    orderNotes.value = orderNotes.value.filter(n => n.id !== noteId)
  } catch (err) {
    console.error('Error deleting note:', err)
  }
}

// Use note template
const useNoteTemplate = (template: { text: string }) => {
  newNoteText.value = template.text
}

// =====================================================
// ORDER ASSIGNMENT
// =====================================================

// Fetch available providers for assignment
const fetchAvailableProviders = async (orderType: string) => {
  providersLoading.value = true
  availableProviders.value = []
  
  try {
    // Map order type to provider type
    const providerTypeMap: Record<string, string[]> = {
      ride: ['car', 'motorcycle', 'taxi'],
      delivery: ['motorcycle', 'car'],
      shopping: ['motorcycle', 'car'],
      queue: ['service'],
      moving: ['truck', 'van'],
      laundry: ['laundry']
    }
    
    const types = providerTypeMap[orderType] || ['car', 'motorcycle']
    
    const { data } = await db
      .from('service_providers')
      .select(`
        id,
        vehicle_type,
        vehicle_plate,
        is_available,
        current_lat,
        current_lng,
        rating,
        total_trips,
        users(id, name, phone_number)
      `)
      .eq('is_available', true)
      .eq('is_verified', true)
      .in('vehicle_type', types)
      .order('rating', { ascending: false })
      .limit(20)
    
    if (data) {
      availableProviders.value = data.map((p: any) => ({
        id: p.id,
        name: p.users?.name || 'ไม่ระบุชื่อ',
        phone: p.users?.phone_number || '',
        vehicle_type: p.vehicle_type,
        vehicle_plate: p.vehicle_plate,
        rating: p.rating || 0,
        total_trips: p.total_trips || 0,
        is_available: p.is_available
      }))
    }
  } catch (err) {
    console.error('Error fetching providers:', err)
    // Generate mock providers for demo
    availableProviders.value = [
      { id: '1', name: 'สมชาย ขับดี', phone: '0812345678', vehicle_type: 'car', vehicle_plate: 'กข 1234', rating: 4.8, total_trips: 150, is_available: true },
      { id: '2', name: 'วิชัย ส่งไว', phone: '0823456789', vehicle_type: 'motorcycle', vehicle_plate: '1กก 5678', rating: 4.6, total_trips: 89, is_available: true },
      { id: '3', name: 'มานะ ทำงานหนัก', phone: '0834567890', vehicle_type: 'car', vehicle_plate: 'ขค 9012', rating: 4.9, total_trips: 230, is_available: true }
    ]
  } finally {
    providersLoading.value = false
  }
}

// Filtered providers based on search
const filteredProviders = computed(() => {
  if (!providerSearchQuery.value) return availableProviders.value
  
  const query = providerSearchQuery.value.toLowerCase()
  return availableProviders.value.filter(p => 
    p.name?.toLowerCase().includes(query) ||
    p.phone?.includes(query) ||
    p.vehicle_plate?.toLowerCase().includes(query)
  )
})

// Open assignment modal
const openAssignModal = async (order: any) => {
  if (order.provider_id) {
    if (!confirm('ออเดอร์นี้มี Provider แล้ว ต้องการเปลี่ยนหรือไม่?')) return
  }
  
  selectedOrder.value = order
  selectedProviderId.value = ''
  providerSearchQuery.value = ''
  showAssignModal.value = true
  await fetchAvailableProviders(order.type)
}

// Assign provider to order
const assignProvider = async () => {
  if (!selectedOrder.value || !selectedProviderId.value) return
  
  actionLoading.value = true
  try {
    const order = selectedOrder.value
    const tableName = getTableName(order.type)
    const provider = availableProviders.value.find(p => p.id === selectedProviderId.value)
    
    // Update order with provider
    const { error } = await db
      .from(tableName)
      .update({
        provider_id: selectedProviderId.value,
        status: 'matched',
        matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
    
    if (error) throw error
    
    // Notify customer
    await sendNotification(order.user_id, {
      type: 'provider_assigned',
      title: 'พบผู้ให้บริการแล้ว',
      message: `${provider?.name || 'ผู้ให้บริการ'} จะมารับงานของคุณ`,
      data: { order_id: order.id, provider_id: selectedProviderId.value }
    })
    
    // Notify provider
    await sendNotification(selectedProviderId.value, {
      type: 'order_assigned',
      title: 'คุณได้รับงานใหม่',
      message: `Admin มอบหมายงาน ${order.tracking_id} ให้คุณ`,
      data: { order_id: order.id, order_type: order.type }
    }, true)
    
    // Log audit
    await logAudit('provider_assigned', {
      order_id: order.id,
      order_type: order.type,
      provider_id: selectedProviderId.value,
      provider_name: provider?.name,
      assigned_by: 'admin'
    })
    
    // Add note about assignment
    await db.from('order_notes').insert({
      order_id: order.id,
      order_type: order.type,
      note: `Admin มอบหมายงานให้ ${provider?.name || 'Provider'} (${provider?.vehicle_plate || ''})`,
      created_by: 'admin'
    })
    
    await fetchAllOrders()
    showAssignModal.value = false
    alert('มอบหมายงานสำเร็จ')
    
  } catch (err) {
    console.error('Error assigning provider:', err)
    alert('เกิดข้อผิดพลาดในการมอบหมายงาน')
  } finally {
    actionLoading.value = false
  }
}

// Get vehicle type label
const getVehicleTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    car: 'รถยนต์',
    motorcycle: 'มอเตอร์ไซค์',
    taxi: 'แท็กซี่',
    truck: 'รถบรรทุก',
    van: 'รถตู้',
    service: 'บริการ',
    laundry: 'ซักผ้า'
  }
  return labels[type] || type
}

// =====================================================
// AUTO-ASSIGNMENT SYSTEM
// =====================================================

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate provider score for auto-assignment (with rules)
const calculateProviderScore = (provider: any, orderLat: number, orderLng: number): { score: number; eligible: boolean; reason: string } => {
  const rules = autoAssignRules.value
  
  // Check eligibility based on rules
  const rating = provider.rating || 0
  const totalTrips = provider.total_trips || 0
  const activeTrips = provider.active_trips || 0
  
  // Distance calculation
  const distance = calculateDistance(
    provider.current_lat || 13.7563,
    provider.current_lng || 100.5018,
    orderLat,
    orderLng
  )
  
  // Rule checks
  if (rating < rules.minRating) {
    return { score: 0, eligible: false, reason: `Rating ต่ำกว่า ${rules.minRating}` }
  }
  
  if (distance > rules.maxDistance) {
    return { score: 0, eligible: false, reason: `ระยะทางเกิน ${rules.maxDistance} km` }
  }
  
  if (activeTrips >= rules.maxActiveTrips) {
    return { score: 0, eligible: false, reason: `มีงานอยู่ ${activeTrips} งาน (เกินกำหนด)` }
  }
  
  if (rules.excludeNewProviders && totalTrips < rules.minTotalTrips) {
    return { score: 0, eligible: false, reason: `Provider ใหม่ (< ${rules.minTotalTrips} งาน)` }
  }
  
  if (rules.preferredVehicleTypes.length > 0 && !rules.preferredVehicleTypes.includes(provider.vehicle_type)) {
    return { score: 0, eligible: false, reason: `ประเภทรถไม่ตรงกำหนด` }
  }
  
  // Calculate score for eligible providers
  // Distance score (closer = higher, max 40 points)
  const distanceScore = Math.max(0, 40 - (distance * 4)) // -4 points per km
  
  // Rating score (higher = better, max 30 points, boosted if prioritizeHighRating)
  let ratingScore = rating * 6 // 5 stars = 30 points
  if (rules.prioritizeHighRating && rating >= 4.5) {
    ratingScore += 10 // Bonus for high rating
  }
  
  // Workload score (fewer active trips = better, max 20 points)
  const workloadScore = Math.max(0, 20 - (activeTrips * 10))
  
  // Experience score (more trips = better, max 10 points)
  const experienceScore = Math.min(10, totalTrips / 50)
  
  const totalScore = distanceScore + ratingScore + workloadScore + experienceScore
  
  return { score: totalScore, eligible: true, reason: 'ผ่านเกณฑ์' }
}

// Find best provider for an order (with rules and history tracking)
const findBestProvider = async (order: any): Promise<{ provider: any | null; reason: string; candidates: number }> => {
  const startTime = Date.now()
  
  try {
    // Map order type to provider types
    const providerTypeMap: Record<string, string[]> = {
      ride: ['car', 'motorcycle', 'taxi'],
      delivery: ['motorcycle', 'car'],
      shopping: ['motorcycle', 'car'],
      queue: ['service'],
      moving: ['truck', 'van'],
      laundry: ['laundry']
    }
    
    const types = providerTypeMap[order.type] || ['car', 'motorcycle']
    
    // Fetch available providers with location
    const { data: providers } = await db
      .from('service_providers')
      .select(`
        id,
        vehicle_type,
        vehicle_plate,
        is_available,
        current_lat,
        current_lng,
        rating,
        total_trips,
        active_trips,
        users(id, name, phone_number)
      `)
      .eq('is_available', true)
      .eq('is_verified', true)
      .in('vehicle_type', types)
      .limit(50)
    
    if (!providers || providers.length === 0) {
      return { provider: null, reason: 'ไม่มี Provider ออนไลน์', candidates: 0 }
    }
    
    // Get order location (use pickup coordinates or default Bangkok)
    const orderLat = order._raw?.pickup_lat || 13.7563
    const orderLng = order._raw?.pickup_lng || 100.5018
    
    // Calculate scores and filter eligible providers
    const scoredProviders = providers.map((p: any) => {
      const scoreResult = calculateProviderScore(p, orderLat, orderLng)
      return {
        ...p,
        ...scoreResult,
        distance: calculateDistance(
          p.current_lat || 13.7563,
          p.current_lng || 100.5018,
          orderLat,
          orderLng
        )
      }
    })
    
    // Filter eligible and sort by score
    const eligibleProviders = scoredProviders
      .filter((p: any) => p.eligible)
      .sort((a: any, b: any) => b.score - a.score)
    
    // Track ineligible reasons for history
    const ineligibleReasons = scoredProviders
      .filter((p: any) => !p.eligible)
      .reduce((acc: Record<string, number>, p: any) => {
        acc[p.reason] = (acc[p.reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    if (eligibleProviders.length === 0) {
      const topReason = (Object.entries(ineligibleReasons) as [string, number][])
        .sort((a, b) => b[1] - a[1])[0]
      return { 
        provider: null, 
        reason: topReason ? `${topReason[0]} (${topReason[1]} คน)` : 'ไม่มี Provider ผ่านเกณฑ์',
        candidates: providers.length
      }
    }
    
    // Return best provider (highest score)
    const bestProvider = eligibleProviders[0]
    const assignTime = Date.now() - startTime
    
    // Update history stats
    historyStats.value.avgAssignTime = 
      (historyStats.value.avgAssignTime * historyStats.value.successCount + assignTime) / 
      (historyStats.value.successCount + 1)
    
    return { 
      provider: bestProvider, 
      reason: `คะแนน ${bestProvider.score.toFixed(1)} (${eligibleProviders.length} คนผ่านเกณฑ์)`,
      candidates: providers.length
    }
  } catch (err) {
    console.error('Error finding best provider:', err)
    return { provider: null, reason: 'เกิดข้อผิดพลาดในระบบ', candidates: 0 }
  }
}

// Auto-assign a single order (with history tracking)
const autoAssignOrder = async (order: any): Promise<{ success: boolean; reason: string }> => {
  const startTime = Date.now()
  
  try {
    const result = await findBestProvider(order)
    
    // Record history entry
    const historyEntry = {
      id: Date.now().toString(),
      order_id: order.id,
      tracking_id: order.tracking_id,
      order_type: order.type,
      timestamp: new Date().toISOString(),
      success: false,
      reason: '',
      provider_id: null as string | null,
      provider_name: null as string | null,
      provider_score: null as number | null,
      distance_km: null as number | null,
      candidates_count: result.candidates,
      assign_time_ms: 0
    }
    
    if (!result.provider) {
      historyEntry.reason = result.reason
      historyEntry.assign_time_ms = Date.now() - startTime
      assignmentHistory.value.unshift(historyEntry)
      
      // Update fail stats
      historyStats.value.totalAttempts++
      historyStats.value.failedCount++
      updateFailReasons(result.reason)
      
      return { success: false, reason: result.reason }
    }
    
    const bestProvider = result.provider
    const tableName = getTableName(order.type)
    
    // Update order with provider
    const { error } = await db
      .from(tableName)
      .update({
        provider_id: bestProvider.id,
        status: 'matched',
        matched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        auto_assigned: true
      })
      .eq('id', order.id)
      .eq('status', 'pending') // Only if still pending
    
    if (error) throw error
    
    // Notify customer
    await sendNotification(order.user_id, {
      type: 'provider_assigned',
      title: 'พบผู้ให้บริการแล้ว',
      message: `${bestProvider.users?.name || 'ผู้ให้บริการ'} จะมารับงานของคุณ`,
      data: { order_id: order.id, provider_id: bestProvider.id, auto_assigned: true }
    })
    
    // Notify provider
    await sendNotification(bestProvider.id, {
      type: 'order_assigned',
      title: 'คุณได้รับงานใหม่',
      message: `ระบบมอบหมายงาน ${order.tracking_id} ให้คุณอัตโนมัติ`,
      data: { order_id: order.id, order_type: order.type, auto_assigned: true }
    }, true)
    
    // Log audit
    await logAudit('auto_assignment', {
      order_id: order.id,
      order_type: order.type,
      provider_id: bestProvider.id,
      provider_name: bestProvider.users?.name,
      provider_score: bestProvider.score,
      distance_km: bestProvider.distance?.toFixed(2)
    })
    
    // Record success history
    historyEntry.success = true
    historyEntry.reason = 'จับคู่สำเร็จ'
    historyEntry.provider_id = bestProvider.id
    historyEntry.provider_name = bestProvider.users?.name || 'ไม่ระบุ'
    historyEntry.provider_score = bestProvider.score
    historyEntry.distance_km = bestProvider.distance
    historyEntry.assign_time_ms = Date.now() - startTime
    assignmentHistory.value.unshift(historyEntry)
    
    // Update success stats
    historyStats.value.totalAttempts++
    historyStats.value.successCount++
    
    // Keep only last 100 history entries
    if (assignmentHistory.value.length > 100) {
      assignmentHistory.value = assignmentHistory.value.slice(0, 100)
    }
    
    return { success: true, reason: result.reason }
  } catch (err) {
    console.error('Auto-assign error:', err)
    
    // Record error in history
    historyStats.value.totalAttempts++
    historyStats.value.failedCount++
    updateFailReasons('ข้อผิดพลาดระบบ')
    
    return { success: false, reason: 'เกิดข้อผิดพลาดในระบบ' }
  }
}

// Update fail reasons stats
const updateFailReasons = (reason: string) => {
  const existing = historyStats.value.topFailReasons.find(r => r.reason === reason)
  if (existing) {
    existing.count++
  } else {
    historyStats.value.topFailReasons.push({ reason, count: 1 })
  }
  // Sort by count and keep top 5
  historyStats.value.topFailReasons.sort((a, b) => b.count - a.count)
  historyStats.value.topFailReasons = historyStats.value.topFailReasons.slice(0, 5)
}

// Check if current time is within schedule
const isWithinSchedule = (): boolean => {
  const schedule = autoAssignSchedule.value
  
  // If schedule is not enabled, always allow
  if (!schedule.enabled) return true
  
  const now = new Date()
  const currentDay = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  // Check if current day is active
  if (!schedule.activeDays.includes(currentDay)) {
    return false
  }
  
  // Check if working days only (Mon-Fri)
  if (schedule.workingDaysOnly && (currentDay === 0 || currentDay === 6)) {
    return false
  }
  
  // Check time range
  if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
    return false
  }
  
  return true
}

// Run auto-assignment for all pending orders
const runAutoAssignment = async () => {
  if (autoAssignLoading.value) return
  
  // Check schedule before running
  if (!isWithinSchedule()) {
    console.log('Auto-assignment skipped: outside scheduled hours')
    return
  }
  
  autoAssignLoading.value = true
  let assignedCount = 0
  let failedCount = 0
  
  try {
    const now = new Date()
    const thresholdTime = new Date(now.getTime() - autoAssignThreshold.value * 60 * 1000)
    
    // Get pending orders older than threshold
    const pendingOrders = orders.value.filter(o => 
      o.status === 'pending' && 
      !o.provider_id &&
      new Date(o.created_at) < thresholdTime
    )
    
    for (const order of pendingOrders) {
      const result = await autoAssignOrder(order)
      if (result.success) {
        assignedCount++
      } else {
        failedCount++
      }
    }
    
    lastAutoAssignRun.value = new Date()
    
    if (assignedCount > 0) {
      await fetchAllOrders()
    }
    
    if (pendingOrders.length > 0) {
      console.log(`Auto-assignment: ${assignedCount} assigned, ${failedCount} failed`)
    }
  } catch (err) {
    console.error('Run auto-assignment error:', err)
  } finally {
    autoAssignLoading.value = false
  }
}

// =====================================================
// AUTO-ASSIGNMENT RULES MANAGEMENT
// =====================================================

// Open rules modal
const openRulesModal = () => {
  showRulesModal.value = true
}

// Save rules
const saveRules = () => {
  // Rules are reactive, so they're already saved
  showRulesModal.value = false
  // Log audit
  logAudit('auto_assign_rules_updated', {
    rules: { ...autoAssignRules.value }
  })
}
void saveRules // Used in rules modal

// Reset rules to default
const resetRulesToDefault = () => {
  autoAssignRules.value = {
    minRating: 4.0,
    maxDistance: 10,
    maxActiveTrips: 2,
    minTotalTrips: 10,
    preferredVehicleTypes: [],
    excludeNewProviders: false,
    prioritizeHighRating: true
  }
}
void resetRulesToDefault // Used in rules modal

// =====================================================
// ASSIGNMENT HISTORY
// =====================================================

// Open history modal
const openHistoryModal = () => {
  showHistoryModal.value = true
}

// Clear history
const clearHistory = () => {
  if (confirm('ต้องการล้างประวัติทั้งหมด?')) {
    assignmentHistory.value = []
    historyStats.value = {
      totalAttempts: 0,
      successCount: 0,
      failedCount: 0,
      avgAssignTime: 0,
      topFailReasons: []
    }
  }
}
void clearHistory // Used in history modal

// Get success rate
const successRate = computed(() => {
  if (historyStats.value.totalAttempts === 0) return 0
  return Math.round((historyStats.value.successCount / historyStats.value.totalAttempts) * 100)
})

// Export history to CSV
const exportHistory = () => {
  if (assignmentHistory.value.length === 0) {
    alert('ไม่มีประวัติให้ Export')
    return
  }
  
  const headers = ['Timestamp', 'Tracking ID', 'Order Type', 'Status', 'Provider Name', 'Provider Score', 'Distance (km)', 'Reason', 'Assign Time (ms)', 'Candidates']
  const rows = assignmentHistory.value.map(h => [
    h.timestamp,
    h.tracking_id,
    h.order_type,
    h.success ? 'Success' : 'Failed',
    h.provider_name || '-',
    h.provider_score?.toFixed(1) || '-',
    h.distance_km?.toFixed(2) || '-',
    h.reason,
    h.assign_time_ms,
    h.candidates_count
  ])
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `auto_assignment_history_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// =====================================================
// AUTO-ASSIGNMENT SCHEDULE
// =====================================================

// Day names for display
const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

// Toggle day in schedule
const toggleScheduleDay = (day: number) => {
  const index = autoAssignSchedule.value.activeDays.indexOf(day)
  if (index > -1) {
    autoAssignSchedule.value.activeDays.splice(index, 1)
  } else {
    autoAssignSchedule.value.activeDays.push(day)
    autoAssignSchedule.value.activeDays.sort()
  }
}

// Set working days only (Mon-Fri)
const setWorkingDaysOnly = () => {
  autoAssignSchedule.value.workingDaysOnly = true
  autoAssignSchedule.value.activeDays = [1, 2, 3, 4, 5] // Mon-Fri
}

// Set all days
const setAllDays = () => {
  autoAssignSchedule.value.workingDaysOnly = false
  autoAssignSchedule.value.activeDays = [0, 1, 2, 3, 4, 5, 6]
}

// Get schedule status text
const scheduleStatusText = computed(() => {
  const schedule = autoAssignSchedule.value
  if (!schedule.enabled) return 'ปิดใช้งาน'
  
  const days = schedule.workingDaysOnly 
    ? 'จ.-ศ.' 
    : schedule.activeDays.length === 7 
      ? 'ทุกวัน' 
      : schedule.activeDays.map(d => dayNames[d]).join(', ')
  
  return `${schedule.startTime} - ${schedule.endTime} (${days})`
})

// Check if currently within schedule
const isCurrentlyInSchedule = computed(() => isWithinSchedule())

// Toggle auto-assignment
const toggleAutoAssignment = () => {
  autoAssignEnabled.value = !autoAssignEnabled.value
  
  if (autoAssignEnabled.value) {
    // Run immediately
    runAutoAssignment()
    // Set interval (every 30 seconds)
    autoAssignInterval.value = setInterval(runAutoAssignment, 30000)
  } else {
    // Clear interval
    if (autoAssignInterval.value) {
      clearInterval(autoAssignInterval.value)
      autoAssignInterval.value = null
    }
  }
}

// =====================================================
// PROVIDER LOCATION MAP
// =====================================================

// Prepare provider markers for map
const prepareProviderMarkers = () => {
  if (!selectedOrder.value) return
  
  // Set map center to order pickup location
  const orderLat = selectedOrder.value._raw?.pickup_lat || 13.7563
  const orderLng = selectedOrder.value._raw?.pickup_lng || 100.5018
  mapCenter.value = { lat: orderLat, lng: orderLng }
  
  // Create markers for providers
  providerMarkers.value = availableProviders.value
    .filter(p => p.current_lat && p.current_lng)
    .map(p => {
      const distance = calculateDistance(
        p.current_lat,
        p.current_lng,
        orderLat,
        orderLng
      )
      return {
        id: p.id,
        lat: p.current_lat,
        lng: p.current_lng,
        name: p.name,
        rating: p.rating,
        vehicle_type: p.vehicle_type,
        distance: distance.toFixed(1)
      }
    })
}

// Toggle map view
const toggleProviderMap = () => {
  showProviderMap.value = !showProviderMap.value
  if (showProviderMap.value) {
    prepareProviderMarkers()
  }
}

// Select provider from map
const selectProviderFromMap = (providerId: string) => {
  selectedProviderId.value = providerId
  showProviderMap.value = false
}

// Get marker position for map visualization
const getMarkerPosition = (index: number) => {
  // Distribute markers around the center in a circle pattern
  const positions = [
    { left: '25%', top: '30%' },
    { left: '70%', top: '25%' },
    { left: '80%', top: '55%' },
    { left: '65%', top: '75%' },
    { left: '30%', top: '70%' },
    { left: '15%', top: '50%' },
    { left: '40%', top: '20%' },
    { left: '55%', top: '80%' }
  ]
  return positions[index % positions.length]
}

// Export orders to CSV
const exportOrders = () => {
  const headers = ['Tracking ID', 'ประเภท', 'ลูกค้า', 'เบอร์โทร', 'Member UID', 'ต้นทาง', 'ปลายทาง', 'ราคา', 'สถานะ', 'วันที่']
  const rows = filteredOrders.value.map(o => [
    o.tracking_id,
    orderTypes.find(t => t.value === o.type)?.label || o.type,
    o.user_name,
    o.user_phone,
    o.member_uid,
    o.pickup_address,
    o.destination_address,
    o.amount,
    statusConfig[o.status]?.label || o.status,
    formatDate(o.created_at)
  ])
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

// Realtime subscription
let realtimeChannel: any = null

const setupRealtime = () => {
  realtimeChannel = supabase
    .channel('admin-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => fetchAllOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests' }, () => fetchAllOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_requests' }, () => fetchAllOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_bookings' }, () => fetchAllOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'moving_requests' }, () => fetchAllOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'laundry_requests' }, () => fetchAllOrders())
    .subscribe()
  
  // Track subscription for cleanup
  addSubscription(realtimeChannel)
}

// Helpers
const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

const formatCurrency = (n: number) => `฿${(n || 0).toLocaleString('th-TH')}`

const getTypeConfig = (type: string) => orderTypes.find(t => t.value === type) || { label: type, color: '#666' }

// Mock data for demo
const generateMockOrders = () => [
  { id: '1', type: 'ride', tracking_id: 'RID-20251218-001', status: 'completed', user_name: 'สมชาย ใจดี', user_phone: '0812345678', member_uid: 'TRD-A1B2C3D4', pickup_address: 'สยามพารากอน', destination_address: 'อโศก', amount: 85, created_at: new Date().toISOString() },
  { id: '2', type: 'delivery', tracking_id: 'DEL-20251218-002', status: 'in_transit', user_name: 'สมหญิง รักดี', user_phone: '0823456789', member_uid: 'TRD-E5F6G7H8', pickup_address: 'ลาดพร้าว', destination_address: 'บางนา', amount: 59, provider_name: 'วีระ ส่งไว', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', type: 'shopping', tracking_id: 'SHP-20251218-003', status: 'shopping', user_name: 'วิชัย มั่งมี', user_phone: '0834567890', member_uid: 'TRD-I9J0K1L2', pickup_address: 'Big C ราชดำริ', destination_address: 'รามคำแหง', amount: 235, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', type: 'ride', tracking_id: 'RID-20251218-004', status: 'pending', user_name: 'นภา สวยงาม', user_phone: '0845678901', member_uid: 'TRD-M3N4O5P6', pickup_address: 'เซ็นทรัลเวิลด์', destination_address: 'สีลม', amount: 120, created_at: new Date(Date.now() - 900000).toISOString() },
  { id: '5', type: 'queue', tracking_id: 'QUE-20251218-005', status: 'confirmed', user_name: 'ธนา รวยมาก', user_phone: '0856789012', member_uid: 'TRD-Q7R8S9T0', pickup_address: 'ธนาคารกรุงเทพ สาขาสยาม', destination_address: '', amount: 0, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: '6', type: 'moving', tracking_id: 'MOV-20251218-006', status: 'matched', user_name: 'ประภา ย้ายบ้าน', user_phone: '0867890123', member_uid: 'TRD-U1V2W3X4', pickup_address: 'คอนโด ลุมพินี', destination_address: 'บ้านใหม่ รังสิต', amount: 2500, provider_name: 'ทีมขนย้าย A', created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: '7', type: 'laundry', tracking_id: 'LAU-20251218-007', status: 'washing', user_name: 'มานี ซักผ้า', user_phone: '0878901234', member_uid: 'TRD-Y5Z6A7B8', pickup_address: 'หมู่บ้านเมืองทอง', destination_address: '', amount: 180, created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: '8', type: 'ride', tracking_id: 'RID-20251218-008', status: 'cancelled', user_name: 'สุดา ยกเลิก', user_phone: '0889012345', member_uid: 'TRD-C9D0E1F2', pickup_address: 'MBK', destination_address: 'พระราม 9', amount: 65, cancel_reason: 'ลูกค้ายกเลิก', created_at: new Date(Date.now() - 14400000).toISOString() }
]

onMounted(() => {
  fetchAllOrders()
  setupRealtime()
  
  // Register cleanup for data arrays and state
  addCleanup(() => {
    // Clear all data arrays
    orders.value = []
    totalOrders.value = 0
    selectedOrder.value = null
    selectedOrders.value.clear()
    
    // Reset filters
    searchQuery.value = ''
    typeFilter.value = ''
    statusFilter.value = ''
    dateFilter.value = ''
    activeQuickFilter.value = ''
    
    // Reset pagination
    currentPage.value = 1
    
    // Reset modal states
    showDetailModal.value = false
    showStatusModal.value = false
    showCancelModal.value = false
    showRefundModal.value = false
    showBulkStatusModal.value = false
    showBulkCancelModal.value = false
    showTimelineModal.value = false
    showNotesModal.value = false
    showAssignModal.value = false
    showProviderMap.value = false
    showRulesModal.value = false
    showHistoryModal.value = false
    
    // Clear notes and timeline
    orderNotes.value = []
    orderTimeline.value = []
    
    // Clear providers
    availableProviders.value = []
    providerMarkers.value = []
    
    // Clear assignment history
    assignmentHistory.value = []
    
    // Reset stats
    stats.value = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      todayRevenue: 0
    }
    
    // Clean up auto-assignment interval
    if (autoAssignInterval.value) {
      clearInterval(autoAssignInterval.value)
      autoAssignInterval.value = null
    }
  })
})

onUnmounted(() => {
  // Cleanup is now handled by useAdminCleanup
  // Manual cleanup for backward compatibility
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
  if (autoAssignInterval.value) {
    clearInterval(autoAssignInterval.value)
  }
})

// Watch for filter changes
watch([typeFilter, statusFilter, dateFilter], () => {
  currentPage.value = 1
})
</script>

<template>
  <AdminLayout>
    <div class="admin-orders">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>จัดการออเดอร์</h1>
          <p class="subtitle">ดูและจัดการออเดอร์ทุกประเภทในระบบ</p>
        </div>
        <div class="header-actions">
          <!-- Auto-Assignment Toggle -->
          <div class="auto-assign-control">
            <button 
              class="btn-auto-assign"
              :class="{ active: autoAssignEnabled, loading: autoAssignLoading }"
              @click="toggleAutoAssignment"
              :title="autoAssignEnabled ? 'ปิด Auto-Assignment' : 'เปิด Auto-Assignment'"
            >
              <svg v-if="autoAssignLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span class="auto-assign-label">Auto</span>
              <span class="auto-assign-status" :class="{ on: autoAssignEnabled }">
                {{ autoAssignEnabled ? 'ON' : 'OFF' }}
              </span>
            </button>
            <select 
              v-model.number="autoAssignThreshold" 
              class="auto-assign-threshold"
              :disabled="autoAssignEnabled"
              title="เวลารอก่อน Auto-Assign"
            >
              <option :value="3">3 นาที</option>
              <option :value="5">5 นาที</option>
              <option :value="10">10 นาที</option>
              <option :value="15">15 นาที</option>
              <option :value="30">30 นาที</option>
            </select>
            <button class="btn-rules" @click="openRulesModal" title="ตั้งค่ากฎ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
            <button class="btn-history" @click="openHistoryModal" title="ประวัติ Auto-Assign">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span v-if="historyStats.totalAttempts > 0" class="history-badge">{{ historyStats.totalAttempts }}</span>
            </button>
          </div>
          
          <button class="btn-export" @click="exportOrders">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
          <button class="btn-refresh" @click="fetchAllOrders" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.total.toLocaleString() }}</span>
            <span class="stat-label">ออเดอร์ทั้งหมด</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">รอดำเนินการ</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon progress">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.inProgress }}</span>
            <span class="stat-label">กำลังดำเนินการ</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon completed">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">สำเร็จ</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatCurrency(stats.todayRevenue) }}</span>
            <span class="stat-label">รายได้วันนี้</span>
          </div>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="quick-filters">
        <button 
          v-for="filter in quickFilters" 
          :key="filter.value"
          class="quick-filter-btn"
          :class="{ active: activeQuickFilter === filter.value }"
          :style="{ '--filter-color': filter.color }"
          @click="applyQuickFilter(filter.value)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="filter.icon"/>
          </svg>
          <span class="filter-label">{{ filter.label }}</span>
          <span v-if="getQuickFilterCount(filter.value) > 0" class="filter-count">
            {{ getQuickFilterCount(filter.value) }}
          </span>
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="ค้นหา Tracking ID, ชื่อ, เบอร์โทร, Member UID..."
            class="search-input"
          />
        </div>
        
        <div class="filter-group">
          <select v-model="typeFilter" class="filter-select">
            <option v-for="type in orderTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
          
          <select v-model="statusFilter" class="filter-select">
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="matched">จับคู่แล้ว</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">สำเร็จ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          
          <input 
            v-model="dateFilter" 
            type="date" 
            class="filter-date"
          />
          
          <button 
            v-if="typeFilter || statusFilter || dateFilter || searchQuery || activeQuickFilter"
            class="btn-clear-filters"
            @click="typeFilter = ''; statusFilter = ''; dateFilter = ''; searchQuery = ''; activeQuickFilter = ''"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      <!-- Bulk Action Bar -->
      <div v-if="selectedOrders.size > 0" class="bulk-action-bar">
        <div class="bulk-info">
          <div class="bulk-checkbox" @click="clearSelection">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
          <span class="bulk-count">เลือก {{ selectedOrders.size }} รายการ</span>
        </div>
        <div class="bulk-actions">
          <button class="bulk-btn status" @click="openBulkStatusModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            อัพเดทสถานะ
          </button>
          <button class="bulk-btn cancel" @click="openBulkCancelModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            ยกเลิกทั้งหมด
          </button>
          <button class="bulk-btn clear" @click="clearSelection">
            ยกเลิกการเลือก
          </button>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="orders-table-container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>กำลังโหลดข้อมูล...</span>
        </div>
        
        <div v-else-if="filteredOrders.length === 0" class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <p>ไม่พบออเดอร์</p>
        </div>
        
        <table v-else class="orders-table">
          <thead>
            <tr>
              <th class="col-checkbox">
                <label class="checkbox-wrapper" @click.stop>
                  <input 
                    type="checkbox" 
                    :checked="selectAll"
                    @change="toggleSelectAll"
                  />
                  <span class="checkmark"></span>
                </label>
              </th>
              <th>Tracking ID</th>
              <th>ประเภท</th>
              <th>ลูกค้า</th>
              <th>ต้นทาง / ปลายทาง</th>
              <th>ราคา</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in paginatedOrders" :key="order.id" @click="openDetailModal(order)" :class="{ selected: selectedOrders.has(order.id) }">
              <td class="col-checkbox" @click.stop>
                <label class="checkbox-wrapper">
                  <input 
                    type="checkbox" 
                    :checked="selectedOrders.has(order.id)"
                    :disabled="['completed', 'cancelled', 'delivered'].includes(order.status)"
                    @change="toggleOrderSelection(order.id)"
                  />
                  <span class="checkmark"></span>
                </label>
              </td>
              <td class="col-tracking">
                <span class="tracking-id">{{ order.tracking_id }}</span>
              </td>
              <td class="col-type">
                <span class="type-badge" :style="{ background: getTypeConfig(order.type).color + '15', color: getTypeConfig(order.type).color }">
                  {{ getTypeConfig(order.type).label }}
                </span>
              </td>
              <td class="col-customer">
                <div class="customer-info">
                  <span class="customer-name">{{ order.user_name }}</span>
                  <span class="customer-phone">{{ order.user_phone }}</span>
                  <span v-if="order.member_uid" class="member-uid">{{ order.member_uid }}</span>
                </div>
              </td>
              <td class="col-location">
                <div class="location-info">
                  <div class="location-row">
                    <span class="location-dot pickup"></span>
                    <span class="location-text">{{ order.pickup_address || '-' }}</span>
                  </div>
                  <div v-if="order.destination_address" class="location-row">
                    <span class="location-dot destination"></span>
                    <span class="location-text">{{ order.destination_address }}</span>
                  </div>
                </div>
              </td>
              <td class="col-amount">
                <span class="amount">{{ formatCurrency(order.amount) }}</span>
              </td>
              <td class="col-status">
                <AdminStatusBadge 
                  :status="(statusConfig[order.status]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
                  :text="statusConfig[order.status]?.label || order.status"
                  size="sm"
                />
              </td>
              <td class="col-date">
                <div class="date-info">
                  <span>{{ formatDate(order.created_at) }}</span>
                  <span v-if="order.scheduled_time" class="scheduled-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    {{ formatDate(order.scheduled_time) }}
                  </span>
                </div>
              </td>
              <td class="col-actions" @click.stop>
                <div class="action-buttons">
                  <button class="btn-action view" @click="openDetailModal(order)" title="ดูรายละเอียด">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button class="btn-action timeline" @click="openTimelineModal(order)" title="ดู Timeline">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </button>
                  <button class="btn-action notes" @click="openNotesModal(order)" title="หมายเหตุ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </button>
                  <button 
                    v-if="order.status === 'pending' || !order.provider_id"
                    class="btn-action assign" 
                    @click="openAssignModal(order)" 
                    title="มอบหมายงาน"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                  </button>
                  <button 
                    v-if="!['completed', 'cancelled', 'delivered'].includes(order.status)"
                    class="btn-action edit" 
                    @click="openStatusModal(order)" 
                    title="แก้ไขสถานะ"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button 
                    v-if="!['completed', 'cancelled', 'delivered'].includes(order.status)"
                    class="btn-action cancel" 
                    @click="openCancelModal(order)" 
                    title="ยกเลิก"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M15 9l-6 6M9 9l6 6"/>
                    </svg>
                  </button>
                  <button 
                    v-if="['completed', 'delivered', 'cancelled'].includes(order.status) && order.amount > 0"
                    class="btn-action refund" 
                    @click="openRefundModal(order)" 
                    title="คืนเงิน"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 10h18M3 14h18M12 6v12"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <span class="page-info">
          หน้า {{ currentPage }} จาก {{ totalPages }} ({{ filteredOrders.length }} รายการ)
        </span>
        
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Order Detail Modal -->
      <AdminModal v-model="showDetailModal" title="รายละเอียดออเดอร์" size="lg">
        <div v-if="selectedOrder" class="order-detail">
          <div class="detail-header">
            <div class="detail-tracking">
              <span class="tracking-label">Tracking ID</span>
              <span class="tracking-value">{{ selectedOrder.tracking_id }}</span>
            </div>
            <AdminStatusBadge 
              :status="(statusConfig[selectedOrder.status]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
              :text="statusConfig[selectedOrder.status]?.label || selectedOrder.status"
              size="md"
            />
          </div>
          
          <div class="detail-grid">
            <div class="detail-section">
              <h4>ข้อมูลลูกค้า</h4>
              <div class="detail-row">
                <span class="label">ชื่อ:</span>
                <span class="value">{{ selectedOrder.user_name }}</span>
              </div>
              <div class="detail-row">
                <span class="label">เบอร์โทร:</span>
                <span class="value">{{ selectedOrder.user_phone || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Member UID:</span>
                <span class="value uid">{{ selectedOrder.member_uid || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">อีเมล:</span>
                <span class="value">{{ selectedOrder.user_email || '-' }}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <h4>ข้อมูลผู้ให้บริการ</h4>
              <div v-if="selectedOrder.provider_name" class="detail-row">
                <span class="label">ชื่อ:</span>
                <span class="value">{{ selectedOrder.provider_name }}</span>
              </div>
              <div v-if="selectedOrder.provider_phone" class="detail-row">
                <span class="label">เบอร์โทร:</span>
                <span class="value">{{ selectedOrder.provider_phone }}</span>
              </div>
              <div v-if="selectedOrder.vehicle_type" class="detail-row">
                <span class="label">ยานพาหนะ:</span>
                <span class="value">{{ selectedOrder.vehicle_type }} {{ selectedOrder.vehicle_plate }}</span>
              </div>
              <div v-if="!selectedOrder.provider_name" class="no-provider">
                ยังไม่มีผู้รับงาน
              </div>
            </div>
          </div>
          
          <div class="detail-section full">
            <h4>สถานที่</h4>
            <div class="location-detail">
              <div class="location-item">
                <span class="location-dot pickup"></span>
                <div class="location-content">
                  <span class="location-label">ต้นทาง</span>
                  <span class="location-address">{{ selectedOrder.pickup_address || '-' }}</span>
                </div>
              </div>
              <div v-if="selectedOrder.destination_address" class="location-item">
                <span class="location-dot destination"></span>
                <div class="location-content">
                  <span class="location-label">ปลายทาง</span>
                  <span class="location-address">{{ selectedOrder.destination_address }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-section full">
            <h4>ข้อมูลการชำระเงิน</h4>
            <div class="payment-detail">
              <div class="payment-row">
                <span>ราคา</span>
                <span class="amount">{{ formatCurrency(selectedOrder.amount) }}</span>
              </div>
              <div v-if="selectedOrder.tip_amount" class="payment-row">
                <span>ทิป</span>
                <span>{{ formatCurrency(selectedOrder.tip_amount) }}</span>
              </div>
              <div class="payment-row">
                <span>วิธีชำระ</span>
                <span>{{ selectedOrder.payment_method === 'cash' ? 'เงินสด' : selectedOrder.payment_method }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedOrder.notes" class="detail-section full">
            <h4>หมายเหตุ</h4>
            <p class="notes">{{ selectedOrder.notes }}</p>
          </div>
          
          <!-- Package Photos (for delivery orders) -->
          <div v-if="selectedOrder.type === 'delivery' && (selectedOrder.package_photo || selectedOrder.pickup_photo || selectedOrder.delivery_photo)" class="detail-section full">
            <h4>รูปภาพพัสดุ</h4>
            <div class="package-photos-grid">
              <div v-if="selectedOrder.package_photo" class="photo-item">
                <img :src="selectedOrder.package_photo" alt="Package photo" class="photo-img" @click="openPhotoViewer(selectedOrder.package_photo)" />
                <span class="photo-label">รูปพัสดุ (ลูกค้าถ่าย)</span>
              </div>
              <div v-if="selectedOrder.pickup_photo" class="photo-item">
                <img :src="selectedOrder.pickup_photo" alt="Pickup photo" class="photo-img" @click="openPhotoViewer(selectedOrder.pickup_photo)" />
                <span class="photo-label">รูปรับพัสดุ</span>
              </div>
              <div v-if="selectedOrder.delivery_photo" class="photo-item">
                <img :src="selectedOrder.delivery_photo" alt="Delivery photo" class="photo-img" @click="openPhotoViewer(selectedOrder.delivery_photo)" />
                <span class="photo-label">รูปส่งพัสดุ</span>
              </div>
            </div>
          </div>
          
          <!-- Delivery Proof Photos with GPS (F03 Enhancement) -->
          <div v-if="selectedOrder.type === 'delivery' && (selectedOrder.pickup_proof_photo || selectedOrder.delivery_proof_photo)" class="detail-section full">
            <h4>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right: 8px; vertical-align: middle;">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              หลักฐานการส่ง (Proof Photos)
            </h4>
            <div class="package-photos-grid">
              <!-- Pickup Proof -->
              <div v-if="selectedOrder.pickup_proof_photo" class="photo-item proof-photo">
                <img :src="selectedOrder.pickup_proof_photo" alt="Pickup proof" class="photo-img" @click="openPhotoViewer(selectedOrder.pickup_proof_photo)" />
                <span class="photo-label">รูปยืนยันรับพัสดุ</span>
                <div class="proof-meta">
                  <div v-if="selectedOrder.pickup_proof_timestamp" class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>{{ formatDate(selectedOrder.pickup_proof_timestamp) }}</span>
                  </div>
                  <div v-if="selectedOrder.pickup_proof_lat && selectedOrder.pickup_proof_lng" class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <a :href="`https://www.google.com/maps?q=${selectedOrder.pickup_proof_lat},${selectedOrder.pickup_proof_lng}`" target="_blank" class="gps-link">
                      ดูตำแหน่ง GPS
                    </a>
                  </div>
                </div>
              </div>
              
              <!-- Delivery Proof -->
              <div v-if="selectedOrder.delivery_proof_photo" class="photo-item proof-photo">
                <img :src="selectedOrder.delivery_proof_photo" alt="Delivery proof" class="photo-img" @click="openPhotoViewer(selectedOrder.delivery_proof_photo)" />
                <span class="photo-label">รูปยืนยันส่งสำเร็จ</span>
                <div class="proof-meta">
                  <div v-if="selectedOrder.delivery_proof_timestamp" class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <span>{{ formatDate(selectedOrder.delivery_proof_timestamp) }}</span>
                  </div>
                  <div v-if="selectedOrder.delivery_proof_lat && selectedOrder.delivery_proof_lng" class="meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <a :href="`https://www.google.com/maps?q=${selectedOrder.delivery_proof_lat},${selectedOrder.delivery_proof_lng}`" target="_blank" class="gps-link">
                      ดูตำแหน่ง GPS
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Recipient Signature (F03c Enhancement) -->
          <div v-if="selectedOrder.type === 'delivery' && selectedOrder.recipient_signature" class="detail-section full">
            <h4>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; margin-right: 8px; vertical-align: middle;">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              ลายเซ็นผู้รับ
            </h4>
            <div class="signature-display">
              <div class="signature-image-container">
                <img :src="selectedOrder.recipient_signature" alt="Recipient signature" class="signature-image" />
              </div>
              <div class="signature-meta">
                <div class="meta-row">
                  <span class="meta-label">ผู้เซ็น:</span>
                  <span class="meta-value">{{ selectedOrder.signature_name || 'ไม่ระบุชื่อ' }}</span>
                </div>
                <div v-if="selectedOrder.signature_timestamp" class="meta-row">
                  <span class="meta-label">เวลา:</span>
                  <span class="meta-value">{{ formatDate(selectedOrder.signature_timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedOrder.cancel_reason" class="detail-section full cancel-info">
            <h4>เหตุผลการยกเลิก</h4>
            <p class="cancel-reason">{{ selectedOrder.cancel_reason }}</p>
          </div>
          
          <div class="detail-timestamps">
            <span>สร้างเมื่อ: {{ formatDate(selectedOrder.created_at) }}</span>
            <span v-if="selectedOrder.completed_at">เสร็จเมื่อ: {{ formatDate(selectedOrder.completed_at) }}</span>
            <span v-if="selectedOrder.cancelled_at">ยกเลิกเมื่อ: {{ formatDate(selectedOrder.cancelled_at) }}</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showDetailModal = false">ปิด</AdminButton>
          <AdminButton 
            v-if="selectedOrder && !['completed', 'cancelled', 'delivered'].includes(selectedOrder.status)"
            variant="primary" 
            @click="showDetailModal = false; openStatusModal(selectedOrder)"
          >
            แก้ไขสถานะ
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Status Update Modal -->
      <AdminModal v-model="showStatusModal" title="อัพเดทสถานะออเดอร์" size="sm">
        <div v-if="selectedOrder" class="status-update-form">
          <p class="form-info">
            ออเดอร์: <strong>{{ selectedOrder.tracking_id }}</strong><br/>
            สถานะปัจจุบัน: <strong>{{ statusConfig[selectedOrder.status]?.label || selectedOrder.status }}</strong>
          </p>
          
          <div class="form-group">
            <label>เลือกสถานะใหม่</label>
            <div class="status-options">
              <button 
                v-for="option in statusOptions.filter(s => s.value !== selectedOrder.status)"
                :key="option.value"
                class="status-option"
                :class="{ selected: option.value === selectedOrder._newStatus }"
                @click="selectedOrder._newStatus = option.value"
              >
                <AdminStatusBadge 
                  :status="(statusConfig[option.value]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
                  :text="option.label"
                  size="sm"
                  :showDot="false"
                />
              </button>
            </div>
          </div>
          
          <div class="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>การเปลี่ยนสถานะจะส่งผลต่อลูกค้าและผู้ให้บริการทันที</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showStatusModal = false">ยกเลิก</AdminButton>
          <AdminButton 
            variant="primary" 
            :loading="actionLoading"
            :disabled="!selectedOrder?._newStatus"
            @click="updateOrderStatus(selectedOrder, selectedOrder._newStatus)"
          >
            อัพเดทสถานะ
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Cancel Order Modal -->
      <AdminModal v-model="showCancelModal" title="ยกเลิกออเดอร์" size="sm">
        <div v-if="selectedOrder" class="cancel-form">
          <p class="form-info">
            คุณกำลังจะยกเลิกออเดอร์ <strong>{{ selectedOrder.tracking_id }}</strong>
          </p>
          
          <div class="form-group">
            <label>เหตุผลการยกเลิก <span class="required">*</span></label>
            <select v-model="cancelReason" class="form-select">
              <option value="">เลือกเหตุผล</option>
              <option value="ลูกค้าขอยกเลิก">ลูกค้าขอยกเลิก</option>
              <option value="ไม่มีผู้รับงาน">ไม่มีผู้รับงาน</option>
              <option value="ผู้ให้บริการยกเลิก">ผู้ให้บริการยกเลิก</option>
              <option value="ข้อมูลไม่ถูกต้อง">ข้อมูลไม่ถูกต้อง</option>
              <option value="ปัญหาทางเทคนิค">ปัญหาทางเทคนิค</option>
              <option value="อื่นๆ">อื่นๆ</option>
            </select>
          </div>
          
          <div class="warning-box error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <span>การยกเลิกจะแจ้งเตือนลูกค้าและผู้ให้บริการทันที</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showCancelModal = false">ปิด</AdminButton>
          <AdminButton 
            variant="danger" 
            :loading="actionLoading"
            :disabled="!cancelReason"
            @click="cancelOrder"
          >
            ยืนยันยกเลิก
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Refund Modal -->
      <AdminModal v-model="showRefundModal" title="คืนเงินลูกค้า" size="sm">
        <div v-if="selectedOrder" class="refund-form">
          <p class="form-info">
            คืนเงินสำหรับออเดอร์ <strong>{{ selectedOrder.tracking_id }}</strong><br/>
            ลูกค้า: <strong>{{ selectedOrder.user_name }}</strong>
          </p>
          
          <div class="form-group">
            <label>จำนวนเงินที่คืน (บาท) <span class="required">*</span></label>
            <input 
              v-model.number="refundAmount" 
              type="number" 
              class="form-input"
              :max="selectedOrder.amount"
              min="1"
            />
            <span class="form-hint">ราคาออเดอร์: {{ formatCurrency(selectedOrder.amount) }}</span>
          </div>
          
          <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea 
              v-model="refundNote" 
              class="form-textarea"
              placeholder="ระบุเหตุผลการคืนเงิน..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="info-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>เงินจะถูกเพิ่มเข้า Wallet ของลูกค้าทันที</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showRefundModal = false">ยกเลิก</AdminButton>
          <AdminButton 
            variant="success" 
            :loading="actionLoading"
            :disabled="refundAmount <= 0 || refundAmount > (selectedOrder?.amount || 0)"
            @click="processRefund"
          >
            ยืนยันคืนเงิน {{ formatCurrency(refundAmount) }}
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Bulk Status Update Modal -->
      <AdminModal v-model="showBulkStatusModal" title="อัพเดทสถานะหลายรายการ" size="sm">
        <div class="bulk-status-form">
          <p class="form-info">
            คุณกำลังจะอัพเดทสถานะ <strong>{{ selectedOrders.size }} ออเดอร์</strong>
          </p>
          
          <div class="form-group">
            <label>เลือกสถานะใหม่ <span class="required">*</span></label>
            <div class="status-options">
              <button 
                v-for="option in statusOptions.filter(s => s.value !== 'cancelled')"
                :key="option.value"
                class="status-option"
                :class="{ selected: option.value === bulkNewStatus }"
                @click="bulkNewStatus = option.value"
              >
                <AdminStatusBadge 
                  :status="(statusConfig[option.value]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
                  :text="option.label"
                  size="sm"
                  :showDot="false"
                />
              </button>
            </div>
          </div>
          
          <div class="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>การเปลี่ยนสถานะจะส่งผลต่อลูกค้าและผู้ให้บริการทุกรายทันที</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showBulkStatusModal = false">ยกเลิก</AdminButton>
          <AdminButton 
            variant="primary" 
            :loading="actionLoading"
            :disabled="!bulkNewStatus"
            @click="bulkUpdateStatus"
          >
            อัพเดท {{ selectedOrders.size }} รายการ
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Bulk Cancel Modal -->
      <AdminModal v-model="showBulkCancelModal" title="ยกเลิกหลายออเดอร์" size="sm">
        <div class="bulk-cancel-form">
          <p class="form-info">
            คุณกำลังจะยกเลิก <strong>{{ selectedOrders.size }} ออเดอร์</strong>
          </p>
          
          <div class="form-group">
            <label>เหตุผลการยกเลิก <span class="required">*</span></label>
            <select v-model="bulkCancelReason" class="form-select">
              <option value="">เลือกเหตุผล</option>
              <option value="ลูกค้าขอยกเลิก">ลูกค้าขอยกเลิก</option>
              <option value="ไม่มีผู้รับงาน">ไม่มีผู้รับงาน</option>
              <option value="ผู้ให้บริการยกเลิก">ผู้ให้บริการยกเลิก</option>
              <option value="ข้อมูลไม่ถูกต้อง">ข้อมูลไม่ถูกต้อง</option>
              <option value="ปัญหาทางเทคนิค">ปัญหาทางเทคนิค</option>
              <option value="Admin ยกเลิก (Bulk)">Admin ยกเลิก (Bulk)</option>
            </select>
          </div>
          
          <div class="warning-box error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <span>การยกเลิกจะแจ้งเตือนลูกค้าและผู้ให้บริการทุกรายทันที</span>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showBulkCancelModal = false">ปิด</AdminButton>
          <AdminButton 
            variant="danger" 
            :loading="actionLoading"
            :disabled="!bulkCancelReason"
            @click="bulkCancelOrders"
          >
            ยกเลิก {{ selectedOrders.size }} รายการ
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Timeline Modal -->
      <AdminModal v-model="showTimelineModal" title="ประวัติการเปลี่ยนสถานะ" size="md">
        <div v-if="selectedOrder" class="timeline-modal">
          <div class="timeline-header">
            <span class="timeline-tracking">{{ selectedOrder.tracking_id }}</span>
            <AdminStatusBadge 
              :status="(statusConfig[selectedOrder.status]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
              :text="statusConfig[selectedOrder.status]?.label || selectedOrder.status"
              size="sm"
            />
          </div>
          
          <div v-if="timelineLoading" class="timeline-loading">
            <div class="spinner"></div>
            <span>กำลังโหลดประวัติ...</span>
          </div>
          
          <div v-else-if="orderTimeline.length === 0" class="timeline-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <p>ไม่พบประวัติการเปลี่ยนสถานะ</p>
          </div>
          
          <div v-else class="timeline-list">
            <div 
              v-for="(item, index) in orderTimeline" 
              :key="item.id || index"
              class="timeline-item"
            >
              <div class="timeline-connector">
                <div 
                  class="timeline-dot"
                  :style="{ background: getTimelineColor(item.newStatus || 'pending') }"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path :d="getTimelineIcon(item.action)"/>
                  </svg>
                </div>
                <div v-if="index < orderTimeline.length - 1" class="timeline-line"></div>
              </div>
              
              <div class="timeline-content">
                <div class="timeline-action">
                  <span class="action-text">{{ formatTimelineAction(item) }}</span>
                  <AdminStatusBadge 
                    v-if="item.newStatus"
                    :status="(statusConfig[item.newStatus]?.badgeStatus || 'neutral') as 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'inactive' | 'neutral'"
                    :text="statusConfig[item.newStatus]?.label || item.newStatus"
                    size="xs"
                  />
                </div>
                <p v-if="item.reason" class="timeline-reason">{{ item.reason }}</p>
                <div class="timeline-meta">
                  <span class="timeline-by">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    {{ item.changedBy === 'admin' ? 'Admin' : item.changedBy === 'customer' ? 'ลูกค้า' : item.changedBy === 'provider' ? 'ผู้ให้บริการ' : item.changedBy || 'ระบบ' }}
                  </span>
                  <span class="timeline-time">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    {{ formatDate(item.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showTimelineModal = false">ปิด</AdminButton>
        </template>
      </AdminModal>

      <!-- Order Notes Modal -->
      <AdminModal v-model="showNotesModal" title="หมายเหตุออเดอร์" size="md">
        <div v-if="selectedOrder" class="notes-modal">
          <div class="notes-header">
            <span class="notes-tracking">{{ selectedOrder.tracking_id }}</span>
            <span class="notes-customer">{{ selectedOrder.user_name }}</span>
          </div>
          
          <!-- Note Templates -->
          <div class="note-templates">
            <span class="templates-label">เทมเพลตด่วน:</span>
            <div class="templates-list">
              <button 
                v-for="template in noteTemplates" 
                :key="template.id"
                class="template-btn"
                @click="useNoteTemplate(template)"
                :title="template.text"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path :d="template.icon"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Add Note Form -->
          <div class="add-note-form">
            <textarea 
              v-model="newNoteText"
              class="note-input"
              placeholder="เพิ่มหมายเหตุใหม่..."
              rows="3"
            ></textarea>
            <AdminButton 
              variant="primary" 
              size="sm"
              :loading="notesLoading"
              :disabled="!newNoteText.trim()"
              @click="addOrderNote"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              เพิ่มหมายเหตุ
            </AdminButton>
          </div>
          
          <!-- Notes List -->
          <div v-if="notesLoading && orderNotes.length === 0" class="notes-loading">
            <div class="spinner"></div>
            <span>กำลังโหลด...</span>
          </div>
          
          <div v-else-if="orderNotes.length === 0" class="notes-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <p>ยังไม่มีหมายเหตุ</p>
          </div>
          
          <div v-else class="notes-list">
            <div v-for="note in orderNotes" :key="note.id" class="note-item">
              <div class="note-content">
                <p class="note-text">{{ note.note }}</p>
                <div class="note-meta">
                  <span class="note-by">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    {{ note.created_by === 'admin' ? 'Admin' : note.created_by }}
                  </span>
                  <span class="note-time">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    {{ formatDate(note.created_at) }}
                  </span>
                </div>
              </div>
              <button class="note-delete" @click="deleteNote(note.id)" title="ลบ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showNotesModal = false">ปิด</AdminButton>
        </template>
      </AdminModal>

      <!-- Order Assignment Modal -->
      <AdminModal v-model="showAssignModal" title="มอบหมายงานให้ Provider" size="md">
        <div v-if="selectedOrder" class="assign-modal">
          <div class="assign-header">
            <div class="assign-order-info">
              <span class="assign-tracking">{{ selectedOrder.tracking_id }}</span>
              <span class="assign-type" :style="{ color: getTypeConfig(selectedOrder.type).color }">
                {{ getTypeConfig(selectedOrder.type).label }}
              </span>
            </div>
            <div class="assign-location">
              <div class="location-row">
                <span class="location-dot pickup"></span>
                <span>{{ selectedOrder.pickup_address || '-' }}</span>
              </div>
              <div v-if="selectedOrder.destination_address" class="location-row">
                <span class="location-dot destination"></span>
                <span>{{ selectedOrder.destination_address }}</span>
              </div>
            </div>
          </div>
          
          <!-- Provider Search & Map Toggle -->
          <div class="provider-controls">
            <div class="provider-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                v-model="providerSearchQuery"
                type="text"
                placeholder="ค้นหา Provider (ชื่อ, เบอร์โทร, ทะเบียน)..."
                class="provider-search-input"
              />
            </div>
            <button 
              class="btn-map-toggle"
              :class="{ active: showProviderMap }"
              @click="toggleProviderMap"
              title="แสดงแผนที่"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              <span>แผนที่</span>
            </button>
          </div>
          
          <!-- Provider Location Map -->
          <div v-if="showProviderMap" class="provider-map-container">
            <div class="map-header">
              <div class="map-legend">
                <div class="legend-item">
                  <span class="legend-dot order"></span>
                  <span>จุดรับ</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot provider"></span>
                  <span>Provider</span>
                </div>
              </div>
              <span class="map-info">{{ providerMarkers.length }} คนพร้อมให้บริการ</span>
            </div>
            
            <div class="map-placeholder">
              <!-- Map visualization (simplified for demo) -->
              <div class="map-visual">
                <!-- Order pickup marker -->
                <div class="map-marker order-marker" :style="{ left: '50%', top: '50%' }">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#E53935">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span class="marker-label">จุดรับ</span>
                </div>
                
                <!-- Provider markers -->
                <div 
                  v-for="(marker, index) in providerMarkers.slice(0, 8)" 
                  :key="marker.id"
                  class="map-marker provider-marker"
                  :class="{ selected: selectedProviderId === marker.id }"
                  :style="getMarkerPosition(index)"
                  @click="selectProviderFromMap(marker.id)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#00A86B">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                  <div class="marker-info">
                    <span class="marker-name">{{ marker.name?.split(' ')[0] }}</span>
                    <span class="marker-distance">{{ marker.distance }} km</span>
                  </div>
                </div>
              </div>
              
              <div class="map-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <span>คลิกที่ Provider เพื่อเลือก</span>
              </div>
            </div>
          </div>
          
          <!-- Provider List -->
          <div v-if="providersLoading" class="providers-loading">
            <div class="spinner"></div>
            <span>กำลังโหลด Provider...</span>
          </div>
          
          <div v-else-if="filteredProviders.length === 0" class="providers-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="18" y1="8" x2="23" y2="13"/>
              <line x1="23" y1="8" x2="18" y2="13"/>
            </svg>
            <p>ไม่พบ Provider ที่พร้อมให้บริการ</p>
          </div>
          
          <div v-else class="providers-list">
            <div 
              v-for="provider in filteredProviders" 
              :key="provider.id"
              class="provider-item"
              :class="{ selected: selectedProviderId === provider.id }"
              @click="selectedProviderId = provider.id"
            >
              <div class="provider-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="provider-info">
                <span class="provider-name">{{ provider.name }}</span>
                <span class="provider-phone">{{ provider.phone }}</span>
                <div class="provider-details">
                  <span class="provider-vehicle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13"/>
                      <polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/>
                      <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    {{ getVehicleTypeLabel(provider.vehicle_type) }} {{ provider.vehicle_plate }}
                  </span>
                  <span class="provider-rating">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" stroke-width="2">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                    {{ provider.rating?.toFixed(1) || '0.0' }}
                  </span>
                  <span class="provider-trips">{{ provider.total_trips || 0 }} งาน</span>
                </div>
              </div>
              <div class="provider-check" v-if="selectedProviderId === provider.id">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A86B" stroke-width="3">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="showAssignModal = false">ยกเลิก</AdminButton>
          <AdminButton 
            variant="primary" 
            :loading="actionLoading"
            :disabled="!selectedProviderId"
            @click="assignProvider"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            มอบหมายงาน
          </AdminButton>
        </template>
      </AdminModal>

      <!-- Auto-Assignment Rules Modal -->
      <AdminModal v-model="showRulesModal" title="ตั้งค่ากฎ Auto-Assignment" size="md">
        <div class="rules-modal">
          <div class="rules-section">
            <h4>เกณฑ์คุณสมบัติ Provider</h4>
            
            <div class="rule-item">
              <label>Rating ขั้นต่ำ</label>
              <div class="rule-input-group">
                <input 
                  v-model.number="autoAssignRules.minRating" 
                  type="number" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  class="rule-input"
                />
                <span class="rule-unit">ดาว</span>
              </div>
              <span class="rule-hint">Provider ที่ rating ต่ำกว่านี้จะไม่ถูกเลือก</span>
            </div>
            
            <div class="rule-item">
              <label>ระยะทางสูงสุด</label>
              <div class="rule-input-group">
                <input 
                  v-model.number="autoAssignRules.maxDistance" 
                  type="number" 
                  min="1" 
                  max="50"
                  class="rule-input"
                />
                <span class="rule-unit">km</span>
              </div>
              <span class="rule-hint">Provider ที่อยู่ไกลกว่านี้จะไม่ถูกเลือก</span>
            </div>
            
            <div class="rule-item">
              <label>จำนวนงานสูงสุดที่รับได้</label>
              <div class="rule-input-group">
                <input 
                  v-model.number="autoAssignRules.maxActiveTrips" 
                  type="number" 
                  min="1" 
                  max="10"
                  class="rule-input"
                />
                <span class="rule-unit">งาน</span>
              </div>
              <span class="rule-hint">Provider ที่มีงานอยู่เกินนี้จะไม่ถูกเลือก</span>
            </div>
          </div>
          
          <div class="rules-section">
            <h4>ตัวเลือกเพิ่มเติม</h4>
            
            <div class="rule-toggle">
              <label class="toggle-label">
                <input 
                  v-model="autoAssignRules.excludeNewProviders" 
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-switch"></span>
                <span class="toggle-text">ไม่รวม Provider ใหม่</span>
              </label>
              <span class="rule-hint">Provider ที่มีงานน้อยกว่า {{ autoAssignRules.minTotalTrips }} งานจะไม่ถูกเลือก</span>
            </div>
            
            <div class="rule-toggle">
              <label class="toggle-label">
                <input 
                  v-model="autoAssignRules.prioritizeHighRating" 
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-switch"></span>
                <span class="toggle-text">ให้ความสำคัญกับ Rating สูง</span>
              </label>
              <span class="rule-hint">Provider ที่มี rating 4.5+ จะได้คะแนนโบนัส</span>
            </div>
            
            <div class="rule-item">
              <label>จำนวนงานขั้นต่ำ (สำหรับ Provider ใหม่)</label>
              <div class="rule-input-group">
                <input 
                  v-model.number="autoAssignRules.minTotalTrips" 
                  type="number" 
                  min="0" 
                  max="100"
                  class="rule-input"
                  :disabled="!autoAssignRules.excludeNewProviders"
                />
                <span class="rule-unit">งาน</span>
              </div>
            </div>
          </div>
          
          <!-- Schedule Section -->
          <div class="rules-section schedule-section">
            <div class="schedule-header">
              <h4>ตารางเวลาทำงาน</h4>
              <label class="toggle-label compact">
                <input 
                  v-model="autoAssignSchedule.enabled" 
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-switch"></span>
              </label>
            </div>
            
            <div v-if="autoAssignSchedule.enabled" class="schedule-content">
              <div class="schedule-time-row">
                <div class="time-input-group">
                  <label>เริ่ม</label>
                  <input 
                    v-model="autoAssignSchedule.startTime" 
                    type="time"
                    class="time-input"
                  />
                </div>
                <span class="time-separator">ถึง</span>
                <div class="time-input-group">
                  <label>สิ้นสุด</label>
                  <input 
                    v-model="autoAssignSchedule.endTime" 
                    type="time"
                    class="time-input"
                  />
                </div>
              </div>
              
              <div class="schedule-days">
                <label>วันที่ทำงาน</label>
                <div class="days-selector">
                  <button 
                    v-for="(name, index) in dayNames" 
                    :key="index"
                    class="day-btn"
                    :class="{ active: autoAssignSchedule.activeDays.includes(index) }"
                    @click="toggleScheduleDay(index)"
                  >
                    {{ name }}
                  </button>
                </div>
                <div class="days-presets">
                  <button class="preset-btn" @click="setWorkingDaysOnly">จ.-ศ.</button>
                  <button class="preset-btn" @click="setAllDays">ทุกวัน</button>
                </div>
              </div>
              
              <div class="schedule-status" :class="{ active: isCurrentlyInSchedule }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path v-if="isCurrentlyInSchedule" d="M9 12l2 2 4-4"/>
                  <path v-else d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <span>{{ isCurrentlyInSchedule ? 'อยู่ในช่วงเวลาทำงาน' : 'นอกช่วงเวลาทำงาน' }}</span>
              </div>
            </div>
            
            <div v-else class="schedule-disabled">
              <span class="rule-hint">เปิดใช้งานเพื่อกำหนดช่วงเวลาที่ Auto-Assignment ทำงาน</span>
            </div>
          </div>
          
          <div class="rules-preview">
            <h4>สรุปกฎที่ใช้</h4>
            <ul class="preview-list">
              <li>Rating ขั้นต่ำ: {{ autoAssignRules.minRating }} ดาว</li>
              <li>ระยะทางสูงสุด: {{ autoAssignRules.maxDistance }} km</li>
              <li>งานสูงสุด: {{ autoAssignRules.maxActiveTrips }} งาน</li>
              <li v-if="autoAssignRules.excludeNewProviders">ไม่รวม Provider ใหม่ (&lt; {{ autoAssignRules.minTotalTrips }} งาน)</li>
              <li v-if="autoAssignRules.prioritizeHighRating">ให้ความสำคัญกับ Rating สูง</li>
              <li v-if="autoAssignSchedule.enabled">ตารางเวลา: {{ scheduleStatusText }}</li>
            </ul>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="secondary" @click="resetRulesToDefault">รีเซ็ตค่าเริ่มต้น</AdminButton>
          <AdminButton variant="primary" @click="saveRules">บันทึกกฎ</AdminButton>
        </template>
      </AdminModal>

      <!-- Assignment History Modal -->
      <AdminModal v-model="showHistoryModal" title="ประวัติ Auto-Assignment" size="lg">
        <div class="history-modal">
          <!-- Stats Summary -->
          <div class="history-stats">
            <div class="history-stat-card">
              <span class="stat-number">{{ historyStats.totalAttempts }}</span>
              <span class="stat-label">ทั้งหมด</span>
            </div>
            <div class="history-stat-card success">
              <span class="stat-number">{{ historyStats.successCount }}</span>
              <span class="stat-label">สำเร็จ</span>
            </div>
            <div class="history-stat-card failed">
              <span class="stat-number">{{ historyStats.failedCount }}</span>
              <span class="stat-label">ล้มเหลว</span>
            </div>
            <div class="history-stat-card rate">
              <span class="stat-number">{{ successRate }}%</span>
              <span class="stat-label">อัตราสำเร็จ</span>
            </div>
          </div>
          
          <!-- Top Fail Reasons -->
          <div v-if="historyStats.topFailReasons.length > 0" class="fail-reasons">
            <h4>สาเหตุที่ล้มเหลวบ่อย</h4>
            <div class="reasons-list">
              <div v-for="(item, index) in historyStats.topFailReasons" :key="index" class="reason-item">
                <span class="reason-rank">{{ index + 1 }}</span>
                <span class="reason-text">{{ item.reason }}</span>
                <span class="reason-count">{{ item.count }} ครั้ง</span>
              </div>
            </div>
          </div>
          
          <!-- History List -->
          <div class="history-list-section">
            <div class="history-header">
              <h4>ประวัติล่าสุด</h4>
              <button v-if="assignmentHistory.length > 0" class="btn-clear-history" @click="clearHistory">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                ล้างประวัติ
              </button>
            </div>
            
            <div v-if="assignmentHistory.length === 0" class="history-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <p>ยังไม่มีประวัติ Auto-Assignment</p>
            </div>
            
            <div v-else class="history-list">
              <div 
                v-for="item in assignmentHistory.slice(0, 20)" 
                :key="item.id"
                class="history-item"
                :class="{ success: item.success, failed: !item.success }"
              >
                <div class="history-icon">
                  <svg v-if="item.success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                </div>
                <div class="history-content">
                  <div class="history-main">
                    <span class="history-tracking">{{ item.tracking_id }}</span>
                    <span class="history-type">{{ getTypeConfig(item.order_type).label }}</span>
                  </div>
                  <div class="history-detail">
                    <span v-if="item.success" class="history-provider">
                      {{ item.provider_name }} ({{ item.provider_score?.toFixed(1) }} คะแนน, {{ item.distance_km?.toFixed(1) }} km)
                    </span>
                    <span v-else class="history-reason">{{ item.reason }}</span>
                  </div>
                  <div class="history-meta">
                    <span class="history-time">{{ formatDate(item.timestamp) }}</span>
                    <span class="history-duration">{{ item.assign_time_ms }}ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="history-footer-actions">
            <AdminButton variant="secondary" @click="exportHistory">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </AdminButton>
          </div>
          <AdminButton variant="secondary" @click="showHistoryModal = false">ปิด</AdminButton>
        </template>
      </AdminModal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-orders {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-export, .btn-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: #00A86B;
  color: white;
  border: none;
}

.btn-export:hover {
  background: #008F5B;
}

.btn-refresh {
  background: #F5F5F5;
  color: #1A1A1A;
  border: 1px solid #E8E8E8;
  padding: 10px;
}

.btn-refresh:hover {
  background: #EBEBEB;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.total { background: #E3F2FD; color: #1976D2; }
.stat-icon.pending { background: #FFF3E0; color: #F5A623; }
.stat-icon.progress { background: #E8F5EF; color: #00A86B; }
.stat-icon.completed { background: #E8F5EF; color: #00A86B; }
.stat-icon.revenue { background: #FCE4EC; color: #E91E63; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

/* Quick Filters */
.quick-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.quick-filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-filter-btn:hover {
  border-color: var(--filter-color, #00A86B);
  color: var(--filter-color, #00A86B);
}

.quick-filter-btn.active {
  background: var(--filter-color, #00A86B);
  border-color: var(--filter-color, #00A86B);
  color: white;
}

.quick-filter-btn svg {
  flex-shrink: 0;
}

.filter-label {
  white-space: nowrap;
}

.filter-count {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.quick-filter-btn.active .filter-count {
  background: rgba(255, 255, 255, 0.25);
}

/* Filters Section */
.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 0 16px;
}

.search-box svg {
  color: #999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 14px 0;
  font-size: 14px;
}

.filter-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select, .filter-date {
  padding: 12px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  min-width: 140px;
}

.filter-select:focus, .filter-date:focus {
  border-color: #00A86B;
  outline: none;
}

.btn-clear-filters {
  padding: 12px 16px;
  background: #FFF3E0;
  color: #F57C00;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-clear-filters:hover {
  background: #FFE0B2;
}

/* Orders Table */
.orders-table-container {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #999;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  text-align: left;
  padding: 16px;
  background: #FAFAFA;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #F0F0F0;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
  vertical-align: middle;
}

.orders-table tbody tr {
  cursor: pointer;
  transition: background 0.2s;
}

.orders-table tbody tr:hover {
  background: #FAFAFA;
}

.tracking-id {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-weight: 500;
  color: #1A1A1A;
}

.customer-phone {
  font-size: 12px;
  color: #666;
}

.member-uid {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  color: #00A86B;
  background: #E8F5EF;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.location-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 200px;
}

.location-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.location-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.pickup { background: #00A86B; }
.location-dot.destination { background: #E53935; }

.location-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.amount {
  font-weight: 600;
  color: #1A1A1A;
}

.col-date {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scheduled-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.scheduled-badge svg {
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action.view { background: #E3F2FD; color: #1976D2; }
.btn-action.view:hover { background: #BBDEFB; }
.btn-action.edit { background: #E8F5EF; color: #00A86B; }
.btn-action.edit:hover { background: #C8E6C9; }
.btn-action.cancel { background: #FFEBEE; color: #E53935; }
.btn-action.cancel:hover { background: #FFCDD2; }
.btn-action.refund { background: #FFF3E0; color: #F57C00; }
.btn-action.refund:hover { background: #FFE0B2; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-top: 1px solid #F0F0F0;
}

.page-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #F5F5F5;
  border-color: #00A86B;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

/* Order Detail Modal */
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.detail-tracking {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tracking-label {
  font-size: 12px;
  color: #666;
}

.tracking-value {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.detail-section {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;
}

.detail-section.full {
  grid-column: 1 / -1;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E8E8E8;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: #666;
  font-size: 13px;
}

.detail-row .value {
  font-weight: 500;
  color: #1A1A1A;
  font-size: 13px;
}

.detail-row .value.uid {
  font-family: 'SF Mono', Monaco, monospace;
  color: #00A86B;
}

.no-provider {
  color: #999;
  font-style: italic;
  font-size: 13px;
}

.location-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.location-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.location-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-label {
  font-size: 12px;
  color: #666;
}

.location-address {
  font-size: 14px;
  color: #1A1A1A;
}

.payment-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.payment-row .amount {
  font-size: 18px;
  color: #00A86B;
}

.notes {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.cancel-info {
  background: #FFEBEE;
}

.cancel-reason {
  font-size: 14px;
  color: #E53935;
  margin: 0;
}

.detail-timestamps {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #999;
  padding-top: 16px;
  border-top: 1px solid #F0F0F0;
}

/* Package Photos Grid */
.package-photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.photo-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.photo-img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid #E8E8E8;
}

.photo-img:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.photo-label {
  font-size: 11px;
  color: #666;
  text-align: center;
}

/* Proof Photo Styles */
.photo-item.proof-photo {
  background: #F8FBF9;
  border: 1px solid #E8F5EF;
  border-radius: 12px;
  padding: 10px;
}

.proof-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.proof-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #666;
}

.proof-meta .meta-item svg {
  width: 12px;
  height: 12px;
  color: #00A86B;
  flex-shrink: 0;
}

.proof-meta .gps-link {
  color: #00A86B;
  text-decoration: none;
  font-weight: 500;
}

.proof-meta .gps-link:hover {
  text-decoration: underline;
}

/* Signature Display */
.signature-display {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.signature-image-container {
  background: #FAFAFA;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 12px;
  flex-shrink: 0;
}

.signature-image {
  width: 200px;
  height: auto;
  max-height: 100px;
  object-fit: contain;
}

.signature-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signature-meta .meta-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.signature-meta .meta-label {
  color: #666;
}

.signature-meta .meta-value {
  color: #1A1A1A;
  font-weight: 500;
}

/* Status Update Modal */
.status-update-form, .cancel-form, .refund-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-info {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.form-info strong {
  color: #1A1A1A;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.required {
  color: #E53935;
}

.status-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-option {
  padding: 8px 12px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.status-option:hover {
  border-color: #00A86B;
}

.status-option.selected {
  border-color: #00A86B;
  background: #E8F5EF;
}

.form-select, .form-input, .form-textarea {
  padding: 12px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-select:focus, .form-input:focus, .form-textarea:focus {
  border-color: #00A86B;
  outline: none;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  font-size: 12px;
  color: #999;
}

.warning-box, .info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 13px;
}

.warning-box {
  background: #FFF3E0;
  color: #F57C00;
}

.warning-box.error {
  background: #FFEBEE;
  color: #E53935;
}

.info-box {
  background: #E3F2FD;
  color: #1976D2;
}

.warning-box svg, .info-box svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Bulk Action Bar */
.bulk-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 14px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.25);
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bulk-checkbox {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.bulk-checkbox:hover {
  background: rgba(255, 255, 255, 0.3);
}

.bulk-checkbox svg {
  color: white;
}

.bulk-count {
  color: white;
  font-weight: 600;
  font-size: 15px;
}

.bulk-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.bulk-btn.status {
  background: white;
  color: #00A86B;
}

.bulk-btn.status:hover {
  background: #E8F5EF;
}

.bulk-btn.cancel {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.bulk-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.25);
}

.bulk-btn.clear {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: none;
  text-decoration: underline;
}

.bulk-btn.clear:hover {
  color: white;
}

/* Checkbox Styling */
.col-checkbox {
  width: 48px;
  text-align: center;
}

.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.checkbox-wrapper input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  width: 20px;
  height: 20px;
  background: white;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-wrapper:hover .checkmark {
  border-color: #00A86B;
}

.checkbox-wrapper input:checked ~ .checkmark {
  background: #00A86B;
  border-color: #00A86B;
}

.checkbox-wrapper input:checked ~ .checkmark::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-wrapper input:disabled ~ .checkmark {
  background: #F5F5F5;
  border-color: #E8E8E8;
  cursor: not-allowed;
}

.orders-table tbody tr.selected {
  background: #E8F5EF;
}

.orders-table tbody tr.selected:hover {
  background: #D4EDE3;
}

/* Timeline Button */
.btn-action.timeline {
  background: #F3E5F5;
  color: #9C27B0;
}

.btn-action.timeline:hover {
  background: #E1BEE7;
}

/* Notes Button */
.btn-action.notes {
  background: #FFF8E1;
  color: #F57C00;
}

.btn-action.notes:hover {
  background: #FFECB3;
}

/* Timeline Modal */
.timeline-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.timeline-tracking {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.timeline-loading, .timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #999;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 32px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: #E8E8E8;
  margin: 4px 0;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24px;
}

.timeline-action {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-text {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 14px;
}

.timeline-reason {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  background: #FAFAFA;
  padding: 10px 14px;
  border-radius: 10px;
  border-left: 3px solid #E8E8E8;
}

.timeline-meta {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.timeline-by, .timeline-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.timeline-by svg, .timeline-time svg {
  flex-shrink: 0;
}

/* Bulk Status/Cancel Form */
.bulk-status-form, .bulk-cancel-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Notes Modal */
.notes-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.notes-tracking {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.notes-customer {
  font-size: 14px;
  color: #666;
}

.add-note-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.note-input:focus {
  border-color: #00A86B;
  outline: none;
}

.add-note-form .admin-button {
  align-self: flex-end;
}

.notes-loading, .notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #999;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.note-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #FAFAFA;
  border-radius: 12px;
  border-left: 3px solid #00A86B;
}

.note-content {
  flex: 1;
}

.note-text {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.5;
  margin: 0 0 10px 0;
  white-space: pre-wrap;
}

.note-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.note-by, .note-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

.note-by svg, .note-time svg {
  flex-shrink: 0;
}

.note-delete {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.note-delete:hover {
  background: #FFEBEE;
  color: #E53935;
}

/* Note Templates */
.note-templates {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F0F0F0;
}

.templates-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.templates-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  background: white;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.template-btn:hover {
  border-color: #00A86B;
  color: #00A86B;
  background: #E8F5EF;
}

/* Assign Button */
.btn-action.assign {
  background: #E3F2FD;
  color: #1976D2;
}

.btn-action.assign:hover {
  background: #BBDEFB;
}

/* Assignment Modal */
.assign-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assign-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.assign-order-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.assign-tracking {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.assign-type {
  font-size: 13px;
  font-weight: 600;
}

.assign-location {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assign-location .location-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.provider-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FAFAFA;
  border-radius: 12px;
  border: 1px solid #E8E8E8;
}

.provider-search svg {
  color: #999;
  flex-shrink: 0;
}

.provider-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.providers-loading, .providers-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #999;
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.provider-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FAFAFA;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-item:hover {
  border-color: #E8E8E8;
  background: white;
}

.provider-item.selected {
  border-color: #00A86B;
  background: #E8F5EF;
}

.provider-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  flex-shrink: 0;
}

.provider-item.selected .provider-avatar {
  background: #00A86B;
  color: white;
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 14px;
}

.provider-phone {
  font-size: 12px;
  color: #666;
}

.provider-details {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.provider-vehicle, .provider-rating, .provider-trips {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
}

.provider-rating svg {
  flex-shrink: 0;
}

.provider-check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E8F5EF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Auto-Assignment Control */
.auto-assign-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 4px;
}

.btn-auto-assign {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: #F5F5F5;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-auto-assign:hover {
  background: #EBEBEB;
}

.btn-auto-assign.active {
  background: #00A86B;
  color: white;
}

.btn-auto-assign.loading {
  opacity: 0.7;
  pointer-events: none;
}

.auto-assign-label {
  font-weight: 600;
}

.auto-assign-status {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.1);
}

.auto-assign-status.on {
  background: rgba(255, 255, 255, 0.25);
}

.auto-assign-threshold {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #F5F5F5;
  font-size: 12px;
  cursor: pointer;
  min-width: 80px;
}

.auto-assign-threshold:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-rules, .btn-history {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: #F5F5F5;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}

.btn-rules:hover, .btn-history:hover {
  background: #E8F5EF;
  color: #00A86B;
}

.history-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #00A86B;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

/* Rules Modal */
.rules-modal {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rules-section {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;
}

.rules-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.rule-item {
  margin-bottom: 16px;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-item label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.rule-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-input {
  width: 80px;
  padding: 10px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.rule-input:focus {
  border-color: #00A86B;
  outline: none;
}

.rule-input:disabled {
  background: #F5F5F5;
  opacity: 0.6;
}

.rule-unit {
  font-size: 13px;
  color: #666;
}

.rule-hint {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.rule-toggle {
  margin-bottom: 16px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: #E8E8E8;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toggle-input:checked + .toggle-switch {
  background: #00A86B;
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.toggle-text {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

.rules-preview {
  background: #E8F5EF;
  border-radius: 12px;
  padding: 16px;
}

.rules-preview h4 {
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  margin: 0 0 12px 0;
}

.preview-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #1A1A1A;
  line-height: 1.8;
}

/* Schedule Section */
.schedule-section {
  border: 1px solid #E8E8E8;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schedule-header h4 {
  margin: 0;
}

.toggle-label.compact {
  gap: 0;
}

.schedule-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.schedule-time-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-input-group label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.time-input {
  padding: 10px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  font-family: 'SF Mono', Monaco, monospace;
  width: 100px;
}

.time-input:focus {
  border-color: #00A86B;
  outline: none;
}

.time-separator {
  font-size: 13px;
  color: #666;
  padding-bottom: 10px;
}

.schedule-days {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-days > label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.days-selector {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.day-btn {
  width: 40px;
  height: 36px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.day-btn:hover {
  border-color: #00A86B;
  color: #00A86B;
}

.day-btn.active {
  background: #00A86B;
  border-color: #00A86B;
  color: white;
}

.days-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.preset-btn {
  padding: 6px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  background: white;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #F5F5F5;
  border-color: #00A86B;
  color: #00A86B;
}

.schedule-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #FFEBEE;
  border-radius: 8px;
  font-size: 12px;
  color: #E53935;
}

.schedule-status.active {
  background: #E8F5EF;
  color: #00A86B;
}

.schedule-disabled {
  padding: 12px;
  background: #F5F5F5;
  border-radius: 8px;
  text-align: center;
}

/* History Modal */
.history-modal {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.history-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.history-stat-card {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.history-stat-card.success {
  background: #E8F5EF;
}

.history-stat-card.failed {
  background: #FFEBEE;
}

.history-stat-card.rate {
  background: #E3F2FD;
}

.history-stat-card .stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
}

.history-stat-card.success .stat-number {
  color: #00A86B;
}

.history-stat-card.failed .stat-number {
  color: #E53935;
}

.history-stat-card.rate .stat-number {
  color: #1976D2;
}

.history-stat-card .stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.fail-reasons {
  background: #FFF3E0;
  border-radius: 12px;
  padding: 16px;
}

.fail-reasons h4 {
  font-size: 13px;
  font-weight: 600;
  color: #F57C00;
  margin: 0 0 12px 0;
}

.reasons-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
}

.reason-rank {
  width: 20px;
  height: 20px;
  background: #F57C00;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reason-text {
  flex: 1;
  font-size: 13px;
  color: #1A1A1A;
}

.reason-count {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.history-list-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-clear-history {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-history:hover {
  background: #FFEBEE;
  border-color: #E53935;
  color: #E53935;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #999;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background: #FAFAFA;
  border-radius: 10px;
  border-left: 3px solid #E8E8E8;
}

.history-item.success {
  border-left-color: #00A86B;
}

.history-item.failed {
  border-left-color: #E53935;
}

.history-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-item.success .history-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.history-item.failed .history-icon {
  background: #FFEBEE;
  color: #E53935;
}

.history-content {
  flex: 1;
  min-width: 0;
}

.history-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.history-tracking {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.history-type {
  font-size: 11px;
  padding: 2px 8px;
  background: #E8E8E8;
  border-radius: 4px;
  color: #666;
}

.history-detail {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.history-provider {
  color: #00A86B;
}

.history-reason {
  color: #E53935;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #999;
}

.history-footer-actions {
  display: flex;
  gap: 8px;
  margin-right: auto;
}

.history-footer-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Provider Controls */
.provider-controls {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.provider-controls .provider-search {
  flex: 1;
}

.btn-map-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #F5F5F5;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-map-toggle:hover {
  background: #EBEBEB;
  border-color: #00A86B;
  color: #00A86B;
}

.btn-map-toggle.active {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
}

/* Provider Location Map */
.provider-map-container {
  background: #FAFAFA;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #E8E8E8;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #E8E8E8;
}

.map-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.order {
  background: #E53935;
}

.legend-dot.provider {
  background: #00A86B;
}

.map-info {
  font-size: 12px;
  color: #999;
}

.map-placeholder {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #E8F5EF 0%, #F5F5F5 100%);
  overflow: hidden;
}

.map-visual {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 1;
}

.map-marker:hover {
  z-index: 10;
  transform: translate(-50%, -50%) scale(1.1);
}

.order-marker {
  z-index: 5;
}

.order-marker .marker-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #E53935;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  margin-top: 4px;
}

.provider-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.provider-marker.selected svg {
  fill: #1976D2;
  transform: scale(1.3);
}

.provider-marker .marker-info {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.provider-marker:hover .marker-info {
  opacity: 1;
}

.provider-marker.selected .marker-info {
  opacity: 1;
  background: #E3F2FD;
}

.marker-name {
  font-size: 11px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
}

.marker-distance {
  font-size: 10px;
  color: #00A86B;
  font-weight: 500;
}

.map-note {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  color: #666;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Responsive */
@media (max-width: 1024px) {
  .orders-table th:nth-child(5),
  .orders-table td:nth-child(5) {
    display: none;
  }
}

@media (max-width: 768px) {
  .admin-orders {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  
  .auto-assign-control {
    flex: 1;
    min-width: 200px;
  }
  
  .btn-auto-assign {
    flex: 1;
    justify-content: center;
  }
  
  .provider-controls {
    flex-direction: column;
  }
  
  .btn-map-toggle {
    justify-content: center;
  }
  
  .map-placeholder {
    height: 180px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Quick Filters Mobile */
  .quick-filters {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }
  
  .quick-filter-btn {
    flex-shrink: 0;
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    min-width: 100%;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-select, .filter-date {
    flex: 1;
    min-width: 0;
  }
  
  /* Bulk Action Bar Mobile */
  .bulk-action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .bulk-info {
    justify-content: center;
  }
  
  .bulk-actions {
    justify-content: center;
  }
  
  .orders-table {
    display: block;
  }
  
  .orders-table thead {
    display: none;
  }
  
  .orders-table tbody {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  
  .orders-table tr {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: #FAFAFA;
    border-radius: 12px;
    border: none !important;
  }
  
  .orders-table tr.selected {
    background: #E8F5EF;
  }
  
  .orders-table td {
    padding: 0;
    border: none;
  }
  
  .col-checkbox {
    order: 0;
    width: auto;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .col-checkbox::after {
    content: 'เลือก';
    font-size: 12px;
    color: #666;
  }
  
  .col-tracking {
    order: 1;
  }
  
  .col-type {
    order: 2;
  }
  
  .col-status {
    order: 3;
  }
  
  .col-customer {
    order: 4;
  }
  
  .col-amount {
    order: 5;
  }
  
  .col-date {
    order: 6;
  }
  
  .col-actions {
    order: 7;
    padding-top: 12px;
    border-top: 1px solid #E8E8E8 !important;
  }
  
  .action-buttons {
    justify-content: flex-end;
  }
  
  .location-info {
    max-width: 100%;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  /* Timeline Mobile */
  .timeline-meta {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-value {
    font-size: 20px;
  }
}
</style>
