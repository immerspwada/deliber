<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'
import { useExternalNotifications } from '../composables/useExternalNotifications'
import { useAdminCleanup } from '../composables/useAdminCleanup'
import { supabase } from '../lib/supabase'

const { fetchProviders, SERVICE_TYPES, updateProviderServices, getProviderServices } = useAdmin()
const { 
  sendProviderApprovalNotification, 
  sendProviderRejectionNotification,
  sendProviderSuspensionNotification 
} = useExternalNotifications()
const { addSubscription, addCleanup } = useAdminCleanup()

const providers = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const typeFilter = ref('')
const statusFilter = ref('')
const searchQuery = ref('')

// Modal state
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const showImageModal = ref(false)
const showHistoryModal = ref(false)
const selectedProvider = ref<any>(null)
const rejectionReason = ref('')
const actionLoading = ref(false)
const previewImage = ref({ src: '', title: '' })

// Status history
const statusHistory = ref<any[]>([])
const historyLoading = ref(false)

// Service permissions modal
const showServicesModal = ref(false)
const selectedServices = ref<string[]>([])
const servicesLoading = ref(false)

// Stats
const stats = computed(() => {
  const pending = providers.value.filter(p => p.status === 'pending').length
  const approved = providers.value.filter(p => p.status === 'approved').length
  const rejected = providers.value.filter(p => p.status === 'rejected').length
  const suspended = providers.value.filter(p => p.status === 'suspended').length
  return { pending, approved, rejected, suspended }
})

// Bulk selection
const selectedIds = ref<string[]>([])
const selectAll = ref(false)

const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = providers.value.filter(p => p.status === 'pending').map(p => p.id)
  } else {
    selectedIds.value = []
  }
}

const toggleSelect = (id: string) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
  selectAll.value = selectedIds.value.length === providers.value.filter(p => p.status === 'pending').length
}

const isSelected = (id: string) => selectedIds.value.includes(id)

// Bulk actions
const bulkApprove = async () => {
  if (selectedIds.value.length === 0) return
  if (!confirm(`อนุมัติ ${selectedIds.value.length} รายการ?`)) return
  
  actionLoading.value = true
  for (const id of selectedIds.value) {
    const provider = providers.value.find(p => p.id === id)
    await (supabase.from('service_providers') as any)
      .update({ 
        status: 'approved', 
        is_verified: true,
        documents: { id_card: 'verified', license: 'verified', vehicle: 'verified' }
      })
      .eq('id', id)
    
    if (provider?.user_id) {
      await sendProviderNotification(provider.user_id, 'approved')
    }
  }
  selectedIds.value = []
  selectAll.value = false
  actionLoading.value = false
  loadProviders()
}

const bulkReject = async () => {
  if (selectedIds.value.length === 0) return
  const reason = prompt('เหตุผลที่ปฏิเสธ (ใช้กับทุกรายการ):')
  if (!reason) return
  
  actionLoading.value = true
  for (const id of selectedIds.value) {
    const provider = providers.value.find(p => p.id === id)
    await (supabase.from('service_providers') as any)
      .update({ status: 'rejected', is_verified: false, rejection_reason: reason })
      .eq('id', id)
    
    if (provider?.user_id) {
      await sendProviderNotification(provider.user_id, 'rejected', reason)
    }
  }
  selectedIds.value = []
  selectAll.value = false
  actionLoading.value = false
  loadProviders()
}

// Verification Checklist Modal
const showChecklistModal = ref(false)
const checklist = ref({
  id_card_clear: false,
  id_card_name_match: false,
  id_card_not_expired: false,
  license_clear: false,
  license_name_match: false,
  license_not_expired: false,
  vehicle_clear: false,
  vehicle_plate_visible: false,
  vehicle_condition_ok: false
})

const openChecklistModal = (provider: any) => {
  selectedProvider.value = provider
  // Reset checklist
  Object.keys(checklist.value).forEach(key => {
    (checklist.value as any)[key] = false
  })
  showChecklistModal.value = true
}

const checklistComplete = computed(() => {
  return Object.values(checklist.value).every(v => v)
})

const approveWithChecklist = async () => {
  if (!checklistComplete.value || !selectedProvider.value) return
  await quickApproveAll(selectedProvider.value)
  showChecklistModal.value = false
}

const loadProviders = async () => {
  loading.value = true
  const result = await fetchProviders(1, 50, { type: typeFilter.value || undefined, status: statusFilter.value || undefined })
  providers.value = result.data
  total.value = result.total
  loading.value = false
}

// Setup cleanup for memory stability
addCleanup(() => {
  // Clear all provider data arrays
  providers.value = []
  selectedProvider.value = null
  statusHistory.value = []
  selectedIds.value = []
  selectedServices.value = []
  
  // Reset all filters and search
  typeFilter.value = ''
  statusFilter.value = ''
  searchQuery.value = ''
  
  // Reset modal states
  showDetailModal.value = false
  showRejectModal.value = false
  showImageModal.value = false
  showHistoryModal.value = false
  showServicesModal.value = false
  showChecklistModal.value = false
  
  // Reset action states
  actionLoading.value = false
  servicesLoading.value = false
  historyLoading.value = false
  loading.value = false
  
  // Reset form data
  rejectionReason.value = ''
  rejectReason.value = ''
  rejectingDocType.value = null
  previewImage.value = { src: '', title: '' }
  
  // Reset checklist
  Object.keys(checklist.value).forEach(key => {
    (checklist.value as any)[key] = false
  })
  
  // Reset bulk selection
  selectAll.value = false
  
  console.log('[AdminProvidersView] Cleanup completed - all data cleared')
})

// Load status history for a provider
const loadStatusHistory = async (providerId: string) => {
  historyLoading.value = true
  try {
    const { data, error } = await supabase
      .rpc('get_provider_status_history', { p_provider_id: providerId })
    
    if (!error && data) {
      statusHistory.value = data
    } else {
      // Fallback: query directly
      const { data: historyData } = await (supabase
        .from('provider_status_history') as any)
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
      statusHistory.value = historyData || []
    }
  } catch (e) {
    statusHistory.value = []
  }
  historyLoading.value = false
}

// Open history modal
const openHistoryModal = async (provider: any) => {
  selectedProvider.value = provider
  showHistoryModal.value = true
  await loadStatusHistory(provider.id)
}

// Open services modal - จัดการสิทธิ์งานที่ provider เห็นได้
const openServicesModal = async (provider: any) => {
  selectedProvider.value = provider
  servicesLoading.value = true
  showServicesModal.value = true
  
  // Load current services
  const services = await getProviderServices(provider.id)
  selectedServices.value = services || provider.allowed_services || []
  servicesLoading.value = false
}

// Toggle service selection
const toggleService = (serviceId: string) => {
  const index = selectedServices.value.indexOf(serviceId)
  if (index > -1) {
    selectedServices.value.splice(index, 1)
  } else {
    selectedServices.value.push(serviceId)
  }
}

// Save provider services
const saveProviderServices = async () => {
  if (!selectedProvider.value) return
  
  servicesLoading.value = true
  const result = await updateProviderServices(selectedProvider.value.id, [...selectedServices.value])
  
  if (result.success) {
    // Update local data
    const idx = providers.value.findIndex(p => p.id === selectedProvider.value.id)
    if (idx > -1) {
      providers.value[idx].allowed_services = selectedServices.value
    }
    showServicesModal.value = false
  }
  servicesLoading.value = false
}

// Get service name in Thai
const getServiceName = (serviceId: string) => {
  const service = SERVICE_TYPES.find(s => s.id === serviceId)
  return service?.name_th || serviceId
}

onMounted(loadProviders)

// View provider details
const viewDetails = (provider: any) => {
  selectedProvider.value = provider
  showDetailModal.value = true
}

// Send notification to provider (in-app + Email/SMS)
const sendProviderNotification = async (userId: string, type: 'approved' | 'rejected' | 'suspended', reason?: string) => {
  const notifications = {
    approved: {
      title: 'ยินดีด้วย! ใบสมัครได้รับการอนุมัติ',
      message: 'คุณสามารถเริ่มรับงานได้แล้ว เปิดสถานะออนไลน์เพื่อเริ่มต้น'
    },
    rejected: {
      title: 'ใบสมัครไม่ผ่านการอนุมัติ',
      message: reason || 'กรุณาตรวจสอบข้อมูลและสมัครใหม่อีกครั้ง'
    },
    suspended: {
      title: 'บัญชีถูกระงับชั่วคราว',
      message: 'กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม'
    }
  }

  const notif = notifications[type]
  
  // In-app notification
  await (supabase.from('user_notifications') as any).insert({
    user_id: userId,
    type: 'system',
    title: notif.title,
    message: notif.message,
    action_url: '/provider',
    is_read: false
  })
  
  // Email/SMS notification (queued via trigger, but also call directly for immediate feedback)
  try {
    if (type === 'approved') {
      await sendProviderApprovalNotification(userId)
    } else if (type === 'rejected') {
      await sendProviderRejectionNotification(userId, reason)
    } else if (type === 'suspended') {
      await sendProviderSuspensionNotification(userId, reason)
    }
  } catch (e) {
    console.warn('External notification failed:', e)
  }
}

// Approve provider
const approveProvider = async (id: string) => {
  const provider = providers.value.find(p => p.id === id) || selectedProvider.value
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
  
  // Send notification (trigger will also send, but this is immediate)
  if (provider?.user_id) {
    await sendProviderNotification(provider.user_id, 'approved')
  }
  
  actionLoading.value = false
  showDetailModal.value = false
  loadProviders()
}

// Quick approve all documents and provider
const quickApproveAll = async (provider: any) => {
  if (!confirm('อนุมัติเอกสารทั้งหมดและผู้ให้บริการ?')) return
  actionLoading.value = true
  
  const updatedDocs = {
    id_card: 'verified',
    license: 'verified', 
    vehicle: 'verified'
  }
  
  await (supabase.from('service_providers') as any)
    .update({ 
      documents: updatedDocs,
      status: 'approved',
      is_verified: true
    })
    .eq('id', provider.id)
  
  if (provider.user_id) {
    await sendProviderNotification(provider.user_id, 'approved')
  }
  
  actionLoading.value = false
  showDetailModal.value = false
  loadProviders()
}

// Open reject modal
const openRejectModal = (provider: any) => {
  selectedProvider.value = provider
  rejectionReason.value = ''
  showRejectModal.value = true
}

// Reject provider
const rejectProvider = async () => {
  if (!selectedProvider.value || !rejectionReason.value.trim()) return
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ 
      status: 'rejected', 
      is_verified: false,
      rejection_reason: rejectionReason.value 
    })
    .eq('id', selectedProvider.value.id)
  
  // Send notification
  if (selectedProvider.value?.user_id) {
    await sendProviderNotification(selectedProvider.value.user_id, 'rejected', rejectionReason.value)
  }
  
  actionLoading.value = false
  showRejectModal.value = false
  showDetailModal.value = false
  loadProviders()
}

// Suspend provider
const suspendProvider = async (id: string) => {
  const provider = providers.value.find(p => p.id === id)
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'suspended', is_available: false })
    .eq('id', id)
  
  // Send notification
  if (provider?.user_id) {
    await sendProviderNotification(provider.user_id, 'suspended')
  }
  
  actionLoading.value = false
  loadProviders()
}

// Reactivate provider
const reactivateProvider = async (id: string) => {
  actionLoading.value = true
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
  actionLoading.value = false
  loadProviders()
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#ffc043',
    approved: '#05944f',
    rejected: '#e11900',
    suspended: '#6b6b6b'
  }
  return colors[status] || '#6b6b6b'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอตรวจสอบ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    suspended: 'ถูกระงับ'
  }
  return texts[status] || status
}

const getTypeText = (t: string) => ({ driver: 'คนขับ', rider: 'ไรเดอร์', delivery: 'ส่งของ', both: 'ทั้งสอง' }[t] || t)

// Open image preview modal
const openImagePreview = (src: string, title: string) => {
  if (!src) return
  previewImage.value = { src, title }
  showImageModal.value = true
}

// Approve individual document
const approveDocument = async (docType: 'id_card' | 'license' | 'vehicle') => {
  if (!selectedProvider.value) return
  actionLoading.value = true
  
  const currentDocs = selectedProvider.value.documents || {}
  const updatedDocs = { ...currentDocs, [docType]: 'verified' }
  
  // Update timestamps
  const currentTimestamps = (selectedProvider.value as any).document_timestamps || {}
  const updatedTimestamps = { ...currentTimestamps, [docType]: new Date().toISOString() }
  
  await (supabase.from('service_providers') as any)
    .update({ 
      documents: updatedDocs,
      document_timestamps: updatedTimestamps
    })
    .eq('id', selectedProvider.value.id)
  
  selectedProvider.value.documents = updatedDocs
  ;(selectedProvider.value as any).document_timestamps = updatedTimestamps
  
  // Send notification for document approval
  const docNames: Record<string, string> = {
    id_card: 'บัตรประชาชน',
    license: 'ใบขับขี่',
    vehicle: 'รูปยานพาหนะ'
  }
  
  if (selectedProvider.value.user_id) {
    await (supabase.from('user_notifications') as any).insert({
      user_id: selectedProvider.value.user_id,
      type: 'system',
      title: 'เอกสารผ่านการตรวจสอบ',
      message: `${docNames[docType]} ได้รับการยืนยันแล้ว`,
      action_url: '/provider/documents',
      is_read: false
    })
    
    // Queue push notification
    await (supabase.from('push_notification_queue') as any).insert({
      user_id: selectedProvider.value.user_id,
      title: 'เอกสารผ่านการตรวจสอบ',
      body: `${docNames[docType]} ได้รับการยืนยันแล้ว`,
      data: { url: '/provider/documents' }
    })
  }
  
  // Check if all documents are verified
  const allVerified = ['id_card', 'license', 'vehicle'].every(
    key => updatedDocs[key] === 'verified'
  )
  
  if (allVerified && selectedProvider.value.status === 'pending') {
    await approveProvider(selectedProvider.value.id)
  }
  
  actionLoading.value = false
}

// Document rejection state
const rejectingDocType = ref<'id_card' | 'license' | 'vehicle' | null>(null)
const rejectReason = ref('')

const openDocRejectModal = (docType: 'id_card' | 'license' | 'vehicle') => {
  rejectingDocType.value = docType
  rejectReason.value = ''
  showRejectModal.value = true
}

const cancelReject = () => {
  showRejectModal.value = false
  rejectingDocType.value = null
  rejectReason.value = ''
}

// Reject individual document with reason
const rejectDocument = async (docType: 'id_card' | 'license' | 'vehicle') => {
  openDocRejectModal(docType)
}

const confirmRejectDocument = async () => {
  if (!selectedProvider.value || !rejectingDocType.value) return
  actionLoading.value = true
  
  const docType = rejectingDocType.value
  const currentDocs = selectedProvider.value.documents || {}
  const updatedDocs = { ...currentDocs, [docType]: 'rejected' }
  
  // Get current rejection reasons or create new object
  const currentReasons = (selectedProvider.value as any).rejection_reasons || {}
  const updatedReasons = { 
    ...currentReasons, 
    [docType]: rejectReason.value || 'เอกสารไม่ชัดเจนหรือไม่ถูกต้อง' 
  }
  
  // Update timestamps
  const currentTimestamps = (selectedProvider.value as any).document_timestamps || {}
  const updatedTimestamps = { ...currentTimestamps, [docType]: new Date().toISOString() }
  
  await (supabase.from('service_providers') as any)
    .update({ 
      documents: updatedDocs,
      rejection_reasons: updatedReasons,
      document_timestamps: updatedTimestamps
    })
    .eq('id', selectedProvider.value.id)
  
  selectedProvider.value.documents = updatedDocs
  ;(selectedProvider.value as any).rejection_reasons = updatedReasons
  ;(selectedProvider.value as any).document_timestamps = updatedTimestamps
  
  // Notify provider
  if (selectedProvider.value.user_id) {
    const docNames: Record<string, string> = {
      id_card: 'บัตรประชาชน',
      license: 'ใบขับขี่',
      vehicle: 'รูปยานพาหนะ'
    }
    
    const reasonText = rejectReason.value ? ` เหตุผล: ${rejectReason.value}` : ''
    
    // In-app notification
    await (supabase.from('user_notifications') as any).insert({
      user_id: selectedProvider.value.user_id,
      type: 'system',
      title: 'เอกสารไม่ผ่านการตรวจสอบ',
      message: `${docNames[docType]} ไม่ผ่านการตรวจสอบ${reasonText} กรุณาอัพโหลดใหม่`,
      action_url: '/provider/documents',
      is_read: false
    })
    
    // Queue push notification
    await (supabase.from('push_notification_queue') as any).insert({
      user_id: selectedProvider.value.user_id,
      title: 'เอกสารไม่ผ่านการตรวจสอบ',
      body: `${docNames[docType]} ไม่ผ่าน กรุณาอัพโหลดใหม่`,
      data: { url: '/provider/documents' }
    })
  }
  
  actionLoading.value = false
  showRejectModal.value = false
  rejectingDocType.value = null
  rejectReason.value = ''
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการผู้ให้บริการ</h1>
        <p class="subtitle">{{ total }} ผู้ให้บริการทั้งหมด</p>
      </div>

      <!-- Quick Action Banner -->
      <div v-if="stats.pending > 0" class="quick-action-banner">
        <div class="banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="banner-content">
          <h3>มี {{ stats.pending }} รายการรอการอนุมัติ</h3>
          <p>กรุณาตรวจสอบและอนุมัติผู้ให้บริการใหม่</p>
        </div>
        <button @click="statusFilter = 'pending'; loadProviders()" class="banner-btn">
          ดูรายการ
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card pending" @click="statusFilter = 'pending'; loadProviders()">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">รอตรวจสอบ</span>
          </div>
        </div>
        <div class="stat-card approved" @click="statusFilter = 'approved'; loadProviders()">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.approved }}</span>
            <span class="stat-label">อนุมัติแล้ว</span>
          </div>
        </div>
        <div class="stat-card rejected" @click="statusFilter = 'rejected'; loadProviders()">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.rejected }}</span>
            <span class="stat-label">ไม่อนุมัติ</span>
          </div>
        </div>
        <div class="stat-card suspended" @click="statusFilter = 'suspended'; loadProviders()">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.suspended }}</span>
            <span class="stat-label">ถูกระงับ</span>
          </div>
        </div>
      </div>

      <!-- Bulk Actions Bar -->
      <div v-if="selectedIds.length > 0" class="bulk-actions-bar">
        <div class="bulk-info">
          <span class="bulk-count">{{ selectedIds.length }} รายการที่เลือก</span>
          <button @click="selectedIds = []; selectAll = false" class="clear-selection">ยกเลิกการเลือก</button>
        </div>
        <div class="bulk-buttons">
          <button @click="bulkApprove" :disabled="actionLoading" class="bulk-btn approve">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            อนุมัติทั้งหมด
          </button>
          <button @click="bulkReject" :disabled="actionLoading" class="bulk-btn reject">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            ปฏิเสธทั้งหมด
          </button>
        </div>
      </div>

      <div class="filters">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, อีเมล, ทะเบียน..." class="search-input" />
        </div>
        <select v-model="typeFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="driver">คนขับ</option>
          <option value="rider">ไรเดอร์</option>
          <option value="delivery">ส่งของ</option>
          <option value="shopper">ซื้อของ</option>
        </select>
        <select v-model="statusFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ไม่อนุมัติ</option>
          <option value="suspended">ถูกระงับ</option>
        </select>
        <button v-if="statusFilter || typeFilter" @click="statusFilter = ''; typeFilter = ''; loadProviders()" class="clear-filter-btn">
          ล้างตัวกรอง
        </button>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <!-- Select All for Pending -->
      <div v-if="!loading && stats.pending > 0 && (statusFilter === 'pending' || statusFilter === '')" class="select-all-bar">
        <label class="checkbox-label">
          <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
          <span class="checkmark"></span>
          <span>เลือกทั้งหมด ({{ stats.pending }} รายการที่รอตรวจสอบ)</span>
        </label>
      </div>

      <div v-if="!loading" class="providers-list">
        <div v-for="p in providers" :key="p.id" class="provider-card" :class="{ selected: isSelected(p.id) }">
          <div class="provider-header">
            <!-- Checkbox for pending providers -->
            <label v-if="p.status === 'pending'" class="checkbox-label card-checkbox" @click.stop>
              <input type="checkbox" :checked="isSelected(p.id)" @change="toggleSelect(p.id)" />
              <span class="checkmark"></span>
            </label>
            <div class="provider-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
            </div>
            <div class="provider-info">
              <span class="provider-name">{{ p.users?.name }}</span>
              <span class="provider-email">{{ p.users?.email }}</span>
            </div>
            <span class="provider-type">{{ getTypeText(p.provider_type) }}</span>
          </div>

          <div class="provider-details">
            <div class="detail-item">
              <span class="detail-label">ยานพาหนะ</span>
              <span class="detail-value">{{ p.vehicle_type || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ทะเบียน</span>
              <span class="detail-value">{{ p.vehicle_plate || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">คะแนน</span>
              <span class="detail-value">{{ p.rating?.toFixed(1) || '0.0' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">เที่ยว</span>
              <span class="detail-value">{{ p.total_trips || 0 }}</span>
            </div>
          </div>

          <div class="provider-footer">
            <div class="status-badge" :style="{ color: getStatusColor(p.status || 'pending') }">
              <span class="status-dot" :style="{ background: getStatusColor(p.status || 'pending') }"></span>
              {{ getStatusText(p.status || 'pending') }}
            </div>
            <div class="online-status" :class="{ online: p.is_available }">
              {{ p.is_available ? 'พร้อมรับงาน' : 'ไม่พร้อม' }}
            </div>
            <div v-if="p.is_available && p.current_lat && p.current_lng" class="gps-status">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              GPS
            </div>
            <div class="provider-actions">
              <button class="action-btn view" @click="viewDetails(p)" title="ดูรายละเอียด">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="action-btn history" @click="openHistoryModal(p)" title="ประวัติสถานะ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </button>
              <button v-if="p.status === 'approved'" class="action-btn services" @click="openServicesModal(p)" title="จัดการสิทธิ์งาน">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
              <button v-if="p.status === 'pending'" class="action-btn checklist" @click="openChecklistModal(p)" title="ตรวจสอบและอนุมัติ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </button>
              <button v-if="p.status === 'pending'" class="action-btn approve" @click="quickApproveAll(p)" title="อนุมัติทันที">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </button>
              <button v-if="p.status === 'pending'" class="action-btn reject" @click="openRejectModal(p)" title="ปฏิเสธ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <button v-if="p.status === 'approved'" class="action-btn reject" @click="suspendProvider(p.id)" title="ระงับ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </button>
              <button v-if="p.status === 'suspended' || p.status === 'rejected'" class="action-btn approve" @click="reactivateProvider(p.id)" title="เปิดใช้งาน">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="showDetailModal && selectedProvider" class="modal-overlay" @click.self="showDetailModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>รายละเอียดผู้ให้บริการ</h2>
            <button @click="showDetailModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="detail-section">
              <h3>ข้อมูลส่วนตัว</h3>
              <div class="detail-grid">
                <div><span>ชื่อ:</span> {{ selectedProvider.users?.name }}</div>
                <div><span>อีเมล:</span> {{ selectedProvider.users?.email }}</div>
                <div><span>โทร:</span> {{ selectedProvider.users?.phone || '-' }}</div>
                <div><span>ประเภท:</span> {{ getTypeText(selectedProvider.provider_type) }}</div>
              </div>
            </div>

            <div class="detail-section">
              <h3>ข้อมูลยานพาหนะ</h3>
              <div class="detail-grid">
                <div><span>ประเภท:</span> {{ selectedProvider.vehicle_type || '-' }}</div>
                <div><span>ยี่ห้อ:</span> {{ selectedProvider.vehicle_brand || selectedProvider.vehicle_info?.brand || '-' }}</div>
                <div><span>รุ่น:</span> {{ selectedProvider.vehicle_model || selectedProvider.vehicle_info?.model || '-' }}</div>
                <div><span>ปี:</span> {{ selectedProvider.vehicle_year || '-' }}</div>
                <div><span>ทะเบียน:</span> {{ selectedProvider.vehicle_plate || '-' }}</div>
                <div><span>สี:</span> {{ selectedProvider.vehicle_color || '-' }}</div>
              </div>
            </div>

            <div class="detail-section">
              <h3>ใบอนุญาต</h3>
              <div class="detail-grid">
                <div><span>เลขที่:</span> {{ selectedProvider.license_number || '-' }}</div>
                <div><span>หมดอายุ:</span> {{ selectedProvider.license_expiry || '-' }}</div>
              </div>
            </div>

            <div class="detail-section">
              <h3>ตำแหน่ง GPS</h3>
              <div v-if="selectedProvider.current_lat && selectedProvider.current_lng" class="detail-grid">
                <div><span>พิกัด:</span> {{ selectedProvider.current_lat?.toFixed(5) }}, {{ selectedProvider.current_lng?.toFixed(5) }}</div>
                <div><span>อัพเดทล่าสุด:</span> {{ selectedProvider.last_location_update ? new Date(selectedProvider.last_location_update).toLocaleString('th-TH') : '-' }}</div>
              </div>
              <p v-else class="no-docs">ยังไม่มีข้อมูลตำแหน่ง</p>
            </div>

            <div class="detail-section">
              <h3>เอกสาร</h3>
              <div v-if="selectedProvider.documents && Object.keys(selectedProvider.documents).length > 0" class="documents-grid">
                <div v-if="selectedProvider.documents.id_card" class="doc-item">
                  <span>บัตรประชาชน</span>
                  <div class="doc-preview" @click="openImagePreview(selectedProvider.documents.id_card === 'verified' ? '' : selectedProvider.documents.id_card, 'บัตรประชาชน')">
                    <img v-if="selectedProvider.documents.id_card !== 'verified' && selectedProvider.documents.id_card !== 'pending'" :src="selectedProvider.documents.id_card" alt="ID Card" />
                    <div v-else class="doc-status-badge" :class="selectedProvider.documents.id_card">
                      {{ selectedProvider.documents.id_card === 'verified' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ' }}
                    </div>
                  </div>
                  <div v-if="selectedProvider.documents.id_card !== 'verified'" class="doc-actions">
                    <button @click="approveDocument('id_card')" class="doc-btn approve">อนุมัติ</button>
                    <button @click="rejectDocument('id_card')" class="doc-btn reject">ปฏิเสธ</button>
                  </div>
                </div>
                <div v-if="selectedProvider.documents.license" class="doc-item">
                  <span>ใบขับขี่</span>
                  <div class="doc-preview" @click="openImagePreview(selectedProvider.documents.license === 'verified' ? '' : selectedProvider.documents.license, 'ใบขับขี่')">
                    <img v-if="selectedProvider.documents.license !== 'verified' && selectedProvider.documents.license !== 'pending'" :src="selectedProvider.documents.license" alt="License" />
                    <div v-else class="doc-status-badge" :class="selectedProvider.documents.license">
                      {{ selectedProvider.documents.license === 'verified' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ' }}
                    </div>
                  </div>
                  <div v-if="selectedProvider.documents.license !== 'verified'" class="doc-actions">
                    <button @click="approveDocument('license')" class="doc-btn approve">อนุมัติ</button>
                    <button @click="rejectDocument('license')" class="doc-btn reject">ปฏิเสธ</button>
                  </div>
                </div>
                <div v-if="selectedProvider.documents.vehicle" class="doc-item">
                  <span>รูปรถ</span>
                  <div class="doc-preview" @click="openImagePreview(selectedProvider.documents.vehicle === 'verified' ? '' : selectedProvider.documents.vehicle, 'รูปรถ')">
                    <img v-if="selectedProvider.documents.vehicle !== 'verified' && selectedProvider.documents.vehicle !== 'pending'" :src="selectedProvider.documents.vehicle" alt="Vehicle" />
                    <div v-else class="doc-status-badge" :class="selectedProvider.documents.vehicle">
                      {{ selectedProvider.documents.vehicle === 'verified' ? 'ยืนยันแล้ว' : 'รอตรวจสอบ' }}
                    </div>
                  </div>
                  <div v-if="selectedProvider.documents.vehicle !== 'verified'" class="doc-actions">
                    <button @click="approveDocument('vehicle')" class="doc-btn approve">อนุมัติ</button>
                    <button @click="rejectDocument('vehicle')" class="doc-btn reject">ปฏิเสธ</button>
                  </div>
                </div>
              </div>
              <p v-else class="no-docs">ยังไม่มีเอกสาร</p>
            </div>

            <div v-if="selectedProvider.rejection_reason" class="rejection-box">
              <span>เหตุผลที่ปฏิเสธ:</span>
              <p>{{ selectedProvider.rejection_reason }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="selectedProvider.status === 'pending'" class="action-btn quick-approve" @click="quickApproveAll(selectedProvider)" :disabled="actionLoading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              อนุมัติทั้งหมด
            </button>
            <button v-if="selectedProvider.status === 'pending'" class="action-btn approve" @click="approveProvider(selectedProvider.id)" :disabled="actionLoading">
              อนุมัติ
            </button>
            <button v-if="selectedProvider.status === 'pending'" class="action-btn reject" @click="openRejectModal(selectedProvider)" :disabled="actionLoading">
              ปฏิเสธ
            </button>
            <button @click="openHistoryModal(selectedProvider)" class="action-btn history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              ประวัติ
            </button>
            <button @click="showDetailModal = false" class="action-btn secondary">ปิด</button>
          </div>
        </div>
      </div>

      <!-- Status History Modal -->
      <div v-if="showHistoryModal && selectedProvider" class="modal-overlay" @click.self="showHistoryModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>ประวัติการเปลี่ยนสถานะ</h2>
            <button @click="showHistoryModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="provider-summary">
              <span class="provider-name">{{ selectedProvider.users?.name || 'ไม่ระบุชื่อ' }}</span>
              <span class="provider-type-badge">{{ getTypeText(selectedProvider.provider_type) }}</span>
              <span class="status-badge" :style="{ color: getStatusColor(selectedProvider.status || 'pending') }">
                <span class="status-dot" :style="{ background: getStatusColor(selectedProvider.status || 'pending') }"></span>
                {{ getStatusText(selectedProvider.status || 'pending') }}
              </span>
            </div>

            <div v-if="historyLoading" class="loading-state small">
              <div class="spinner"></div>
            </div>

            <div v-else-if="statusHistory.length === 0" class="empty-history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p>ยังไม่มีประวัติการเปลี่ยนสถานะ</p>
            </div>

            <div v-else class="history-timeline">
              <div v-for="(item, index) in statusHistory" :key="item.id" class="history-item">
                <div class="timeline-dot" :class="item.new_status"></div>
                <div class="timeline-content">
                  <div class="history-header">
                    <span class="status-change">
                      <span v-if="item.old_status" class="old-status">{{ getStatusText(item.old_status) }}</span>
                      <svg v-if="item.old_status" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      <span class="new-status" :style="{ color: getStatusColor(item.new_status) }">{{ getStatusText(item.new_status) }}</span>
                    </span>
                    <span class="history-time">{{ new Date(item.created_at).toLocaleString('th-TH') }}</span>
                  </div>
                  <p v-if="item.reason" class="history-reason">
                    <strong>เหตุผล:</strong> {{ item.reason }}
                  </p>
                  <p v-if="item.changed_by_name" class="history-by">
                    โดย: {{ item.changed_by_name }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="showHistoryModal = false" class="action-btn secondary">ปิด</button>
          </div>
        </div>
      </div>

      <!-- Services Permission Modal - จัดการสิทธิ์งานที่ Provider เห็นได้ -->
      <div v-if="showServicesModal && selectedProvider" class="modal-overlay" @click.self="showServicesModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>จัดการสิทธิ์งาน</h2>
            <button @click="showServicesModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="provider-info-header">
              <div class="provider-avatar">
                {{ selectedProvider.users?.first_name?.charAt(0) || 'P' }}
              </div>
              <div>
                <h3>{{ selectedProvider.users?.first_name }} {{ selectedProvider.users?.last_name }}</h3>
                <p>{{ selectedProvider.vehicle_type }} - {{ selectedProvider.vehicle_plate }}</p>
              </div>
            </div>

            <div class="services-section">
              <h4>เลือกประเภทงานที่เห็นได้</h4>
              <p class="services-hint">Provider จะเห็นเฉพาะงานที่เปิดสิทธิ์ไว้เท่านั้น</p>
              
              <div v-if="servicesLoading" class="services-loading">
                <div class="spinner"></div>
                <span>กำลังโหลด...</span>
              </div>
              
              <div v-else class="services-grid">
                <button 
                  v-for="service in SERVICE_TYPES" 
                  :key="service.id"
                  @click="toggleService(service.id)"
                  :class="['service-toggle', { active: selectedServices.includes(service.id) }]"
                >
                  <div class="service-icon">
                    <svg v-if="service.id === 'ride'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13" rx="2"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <svg v-else-if="service.id === 'delivery'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13" rx="2"/>
                      <path d="M16 8h4l3 3v5h-7V8z"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <svg v-else-if="service.id === 'shopping'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    <svg v-else-if="service.id === 'queue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <svg v-else-if="service.id === 'moving'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="3" width="15" height="13" rx="2"/>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
                    </svg>
                  </div>
                  <span class="service-name">{{ service.name_th }}</span>
                  <div class="service-check">
                    <svg v-if="selectedServices.includes(service.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                </button>
              </div>

              <div class="selected-summary">
                <span v-if="selectedServices.length === 0" class="no-services">ยังไม่ได้เลือกงาน (Provider จะไม่เห็นงานใดๆ)</span>
                <span v-else>เลือกแล้ว {{ selectedServices.length }} ประเภท: {{ selectedServices.map(s => getServiceName(s)).join(', ') }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="saveProviderServices" :disabled="servicesLoading" class="action-btn approve">
              {{ servicesLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
            <button @click="showServicesModal = false" class="action-btn secondary">ยกเลิก</button>
          </div>
        </div>
      </div>

      <!-- Reject Provider Modal -->
      <div v-if="showRejectModal && !rejectingDocType" class="modal-overlay" @click.self="showRejectModal = false">
        <div class="modal-content small">
          <div class="modal-header">
            <h2>ปฏิเสธใบสมัคร</h2>
            <button @click="showRejectModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label">เหตุผลที่ปฏิเสธ</label>
            <textarea v-model="rejectionReason" placeholder="กรุณาระบุเหตุผล..." class="form-textarea"></textarea>
          </div>
          <div class="modal-footer">
            <button @click="rejectProvider" :disabled="!rejectionReason.trim() || actionLoading" class="action-btn reject">
              {{ actionLoading ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
            </button>
            <button @click="showRejectModal = false" class="action-btn secondary">ยกเลิก</button>
          </div>
        </div>
      </div>

      <!-- Reject Document Modal -->
      <div v-if="showRejectModal && rejectingDocType" class="modal-overlay" @click.self="cancelReject">
        <div class="modal-content small">
          <div class="modal-header">
            <h2>ปฏิเสธเอกสาร</h2>
            <button @click="cancelReject" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="reject-doc-info">
              เอกสาร: <strong>{{ rejectingDocType === 'id_card' ? 'บัตรประชาชน' : rejectingDocType === 'license' ? 'ใบขับขี่' : 'รูปยานพาหนะ' }}</strong>
            </p>
            <label class="form-label">เหตุผลที่ปฏิเสธ (ไม่บังคับ)</label>
            <textarea v-model="rejectReason" placeholder="เช่น รูปไม่ชัด, เอกสารหมดอายุ, ข้อมูลไม่ตรงกัน..." class="form-textarea"></textarea>
            <div class="reject-reason-hints">
              <span @click="rejectReason = 'รูปไม่ชัดเจน'" class="hint-chip">รูปไม่ชัดเจน</span>
              <span @click="rejectReason = 'เอกสารหมดอายุ'" class="hint-chip">เอกสารหมดอายุ</span>
              <span @click="rejectReason = 'ข้อมูลไม่ตรงกัน'" class="hint-chip">ข้อมูลไม่ตรงกัน</span>
              <span @click="rejectReason = 'เอกสารถูกตัดต่อ'" class="hint-chip">เอกสารถูกตัดต่อ</span>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="confirmRejectDocument" :disabled="actionLoading" class="action-btn reject">
              {{ actionLoading ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
            </button>
            <button @click="cancelReject" class="action-btn secondary">ยกเลิก</button>
          </div>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div v-if="showImageModal" class="image-modal-overlay" @click="showImageModal = false">
        <div class="image-modal-content" @click.stop>
          <div class="image-modal-header">
            <h3>{{ previewImage.title }}</h3>
            <button @click="showImageModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="image-modal-body">
            <img :src="previewImage.src" :alt="previewImage.title" />
          </div>
          <div class="image-modal-footer">
            <a :href="previewImage.src" download class="action-btn secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ดาวน์โหลด
            </a>
            <button @click="showImageModal = false" class="action-btn secondary">ปิด</button>
          </div>
        </div>
      </div>

      <!-- Verification Checklist Modal -->
      <div v-if="showChecklistModal && selectedProvider" class="modal-overlay" @click.self="showChecklistModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>ตรวจสอบเอกสาร</h2>
            <button @click="showChecklistModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="provider-summary">
              <span class="provider-name">{{ selectedProvider.users?.name || 'ไม่ระบุชื่อ' }}</span>
              <span class="provider-type-badge">{{ getTypeText(selectedProvider.provider_type) }}</span>
            </div>

            <div class="checklist-section">
              <h4>บัตรประชาชน</h4>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.id_card_clear" />
                <span class="checkmark"></span>
                <span>รูปชัดเจน อ่านข้อมูลได้</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.id_card_name_match" />
                <span class="checkmark"></span>
                <span>ชื่อตรงกับข้อมูลที่กรอก</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.id_card_not_expired" />
                <span class="checkmark"></span>
                <span>บัตรยังไม่หมดอายุ</span>
              </label>
            </div>

            <div class="checklist-section">
              <h4>ใบขับขี่</h4>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.license_clear" />
                <span class="checkmark"></span>
                <span>รูปชัดเจน อ่านข้อมูลได้</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.license_name_match" />
                <span class="checkmark"></span>
                <span>ชื่อตรงกับบัตรประชาชน</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.license_not_expired" />
                <span class="checkmark"></span>
                <span>ใบขับขี่ยังไม่หมดอายุ</span>
              </label>
            </div>

            <div class="checklist-section">
              <h4>รูปยานพาหนะ</h4>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.vehicle_clear" />
                <span class="checkmark"></span>
                <span>รูปชัดเจน เห็นรถทั้งคัน</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.vehicle_plate_visible" />
                <span class="checkmark"></span>
                <span>เห็นทะเบียนรถชัดเจน</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" v-model="checklist.vehicle_condition_ok" />
                <span class="checkmark"></span>
                <span>สภาพรถดี พร้อมให้บริการ</span>
              </label>
            </div>

            <div class="checklist-progress">
              <div class="progress-bar-container">
                <div class="progress-bar-fill" :style="{ width: `${Object.values(checklist).filter(v => v).length / 9 * 100}%` }"></div>
              </div>
              <span>{{ Object.values(checklist).filter(v => v).length }}/9 รายการ</span>
            </div>
          </div>

          <div class="modal-footer">
            <button @click="approveWithChecklist" :disabled="!checklistComplete || actionLoading" class="action-btn approve">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              อนุมัติ
            </button>
            <button @click="showChecklistModal = false" class="action-btn secondary">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-card.pending { border-color: #ffc043; }
.stat-card.approved { border-color: #00A86B; }
.stat-card.rejected { border-color: #e11900; }
.stat-card.suspended { border-color: #6b6b6b; }
.stat-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
.stat-card.pending .stat-icon { background: #fff8e6; color: #ffc043; }
.stat-card.approved .stat-icon { background: #e8f5ef; color: #00A86B; }
.stat-card.rejected .stat-icon { background: #ffebee; color: #e11900; }
.stat-card.suspended .stat-icon { background: #f5f5f5; color: #6b6b6b; }
.stat-icon svg { width: 24px; height: 24px; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: #6b6b6b; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 0 16px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; flex: 1; min-width: 200px; }
.search-box svg { width: 18px; height: 18px; color: #999; flex-shrink: 0; }
.search-input { flex: 1; padding: 12px 0; border: none; font-size: 14px; background: transparent; }
.search-input:focus { outline: none; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }
.clear-filter-btn { padding: 12px 16px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; color: #e11900; }
.clear-filter-btn:hover { background: #ffebee; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.providers-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }

.provider-card { background: #fff; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; }
.provider-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.provider-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.provider-avatar { width: 48px; height: 48px; border-radius: 12px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; color: #000; }
.provider-info { flex: 1; }
.provider-name { display: block; font-weight: 600; font-size: 15px; }
.provider-email { display: block; font-size: 11px; color: #999; }
.provider-type { font-size: 12px; padding: 4px 10px; background: #f6f6f6; border-radius: 20px; font-weight: 500; }

.provider-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; }
.detail-item { }
.detail-label { display: block; font-size: 11px; color: #999; }
.detail-value { font-size: 14px; font-weight: 500; }

.provider-footer { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.online-status { font-size: 12px; color: #999; }
.online-status.online { color: #05944f; }
.gps-status { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #05944f; background: #e8f5e9; padding: 2px 8px; border-radius: 10px; }
.gps-status svg { color: #05944f; }

.provider-actions { display: flex; gap: 6px; margin-left: auto; }
.action-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.action-btn.view { background: #f6f6f6; color: #000; width: 36px; height: 36px; padding: 0; }
.action-btn.view:hover { background: #e5e5e5; }
.action-btn.history { background: #e3f2fd; color: #1976d2; width: 36px; height: 36px; padding: 0; }
.action-btn.history:hover { background: #bbdefb; }
.action-btn.checklist { background: #fff3e0; color: #f57c00; width: 36px; height: 36px; padding: 0; }
.action-btn.checklist:hover { background: #ffe0b2; }
.action-btn.approve { background: #00A86B; color: #fff; width: 36px; height: 36px; padding: 0; }
.action-btn.approve:hover { background: #008F5B; transform: scale(1.05); }
.action-btn.reject { background: #ffebee; color: #e11900; width: 36px; height: 36px; padding: 0; }
.action-btn.reject:hover { background: #ffcdd2; }
.action-btn.quick-approve { background: #00A86B; color: #fff; padding: 8px 16px; width: auto; height: auto; box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3); }
.action-btn.quick-approve:hover { background: #008F5B; }
.action-btn.secondary { background: #f6f6f6; color: #000; width: auto; height: auto; padding: 8px 16px; }
.action-btn.secondary:hover { background: #e5e5e5; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-content.small { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
.close-btn svg { width: 20px; height: 20px; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; gap: 12px; padding: 20px; border-top: 1px solid #e5e5e5; }

.detail-section { margin-bottom: 20px; }
.detail-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #6b6b6b; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.detail-grid div { font-size: 14px; }
.detail-grid span { color: #6b6b6b; }

.documents-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.doc-item { text-align: center; }
.doc-item span { display: block; font-size: 12px; color: #6b6b6b; margin-bottom: 8px; }
.doc-preview { width: 100%; height: 80px; border-radius: 8px; cursor: pointer; border: 1px solid #e5e5e5; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f6f6f6; }
.doc-preview:hover { border-color: #000; }
.doc-preview img { width: 100%; height: 100%; object-fit: cover; }
.doc-status-badge { font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: 4px; }
.doc-status-badge.verified { background: #e8f5e9; color: #05944f; }
.doc-status-badge.pending { background: #fff3e0; color: #e65100; }
.doc-actions { display: flex; gap: 4px; margin-top: 6px; }
.doc-btn { flex: 1; padding: 4px 8px; border: none; border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer; }
.doc-btn.approve { background: #e8f5e9; color: #05944f; }
.doc-btn.approve:hover { background: #c8e6c9; }
.doc-btn.reject { background: #ffebee; color: #e11900; }
.doc-btn.reject:hover { background: #ffcdd2; }
.no-docs { font-size: 14px; color: #999; text-align: center; padding: 20px; }

.rejection-box { padding: 12px; background: rgba(225,25,0,0.05); border-radius: 8px; margin-top: 16px; }
.rejection-box span { font-size: 12px; color: #e11900; font-weight: 600; }
.rejection-box p { font-size: 14px; margin-top: 4px; }

.form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-textarea { width: 100%; min-height: 100px; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; resize: vertical; }
.form-textarea:focus { outline: none; border-color: #000; }

/* Image Preview Modal */
.image-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px; }
.image-modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; }
.image-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e5e5e5; }
.image-modal-header h3 { font-size: 16px; font-weight: 600; }
.image-modal-body { flex: 1; overflow: auto; padding: 20px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; }
.image-modal-body img { max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; }
.image-modal-footer { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e5e5e5; justify-content: flex-end; }
.image-modal-footer a { display: flex; align-items: center; gap: 6px; text-decoration: none; }

/* Reject Document Modal */
.reject-doc-info { font-size: 14px; color: #6b6b6b; margin-bottom: 16px; }
.reject-doc-info strong { color: #000; }
.reject-reason-hints { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.hint-chip { 
  padding: 6px 12px; background: #f6f6f6; border-radius: 20px; 
  font-size: 12px; cursor: pointer; transition: all 0.2s; 
}
.hint-chip:hover { background: #e5e5e5; }

/* Provider Summary in History Modal */
.provider-summary { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f6f6f6; border-radius: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.provider-summary .provider-name { font-weight: 600; font-size: 16px; }
.provider-type-badge { padding: 4px 10px; background: #e3f2fd; color: #1976d2; border-radius: 20px; font-size: 12px; font-weight: 500; }

/* History Timeline */
.history-timeline { position: relative; padding-left: 24px; }
.history-item { position: relative; padding-bottom: 24px; }
.history-item:last-child { padding-bottom: 0; }
.history-item::before { content: ''; position: absolute; left: -18px; top: 24px; bottom: 0; width: 2px; background: #e5e5e5; }
.history-item:last-child::before { display: none; }
.timeline-dot { position: absolute; left: -24px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: #e5e5e5; border: 2px solid #fff; box-shadow: 0 0 0 2px #e5e5e5; }
.timeline-dot.pending { background: #ffc043; box-shadow: 0 0 0 2px #ffc043; }
.timeline-dot.approved { background: #00A86B; box-shadow: 0 0 0 2px #00A86B; }
.timeline-dot.rejected { background: #e11900; box-shadow: 0 0 0 2px #e11900; }
.timeline-dot.suspended { background: #6b6b6b; box-shadow: 0 0 0 2px #6b6b6b; }
.timeline-content { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
.history-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.status-change { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.old-status { color: #999; }
.new-status { font-weight: 600; }
.history-time { font-size: 12px; color: #999; }
.history-reason { font-size: 13px; color: #666; margin-top: 8px; padding: 8px 12px; background: #fff8e6; border-radius: 8px; }
.history-by { font-size: 12px; color: #999; margin-top: 8px; }

/* Empty History */
.empty-history { text-align: center; padding: 40px 20px; color: #999; }
.empty-history svg { margin-bottom: 12px; opacity: 0.5; }
.empty-history p { font-size: 14px; }

/* Loading State Small */
.loading-state.small { padding: 40px; }

/* Bulk Actions Bar */
.bulk-actions-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.3);
}
.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bulk-count {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}
.clear-selection {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.clear-selection:hover {
  background: rgba(255, 255, 255, 0.3);
}
.bulk-buttons {
  display: flex;
  gap: 8px;
}
.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.bulk-btn.approve {
  background: #fff;
  color: #00A86B;
}
.bulk-btn.approve:hover {
  background: #f0fff8;
}
.bulk-btn.reject {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.bulk-btn.reject:hover {
  background: rgba(255, 255, 255, 0.3);
}
.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Select All Bar */
.select-all-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 1px solid #e5e5e5;
}

/* Checkbox Styling */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}
.checkbox-label input[type="checkbox"] {
  display: none;
}
.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #d0d0d0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: #fff;
  flex-shrink: 0;
}
.checkbox-label input[type="checkbox"]:checked + .checkmark {
  background: #00A86B;
  border-color: #00A86B;
}
.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}
.checkbox-label:hover .checkmark {
  border-color: #00A86B;
}

/* Card Checkbox */
.card-checkbox {
  margin-right: 4px;
}
.card-checkbox .checkmark {
  width: 18px;
  height: 18px;
}

/* Selected Provider Card */
.provider-card.selected {
  border: 2px solid #00A86B;
  background: #f0fff8;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.15);
}

/* Checklist Section */
.checklist-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}
.checklist-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.checklist-section h4::before {
  content: '';
  width: 4px;
  height: 16px;
  background: #00A86B;
  border-radius: 2px;
}

/* Checklist Item */
.checklist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e5e5;
}
.checklist-item:last-child {
  margin-bottom: 0;
}
.checklist-item:hover {
  border-color: #00A86B;
  background: #f0fff8;
}
.checklist-item input[type="checkbox"]:checked ~ span:last-child {
  color: #00A86B;
}

/* Checklist Progress */
.checklist-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  margin-top: 16px;
}
.checklist-progress span {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.progress-bar-container {
  flex: 1;
  height: 8px;
  background: #e5e5e5;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A86B 0%, #00c77b 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Services Button */
.action-btn.services {
  background: #e8f5ef;
  color: #00A86B;
}
.action-btn.services:hover {
  background: #00A86B;
  color: #fff;
}

/* Services Modal */
.provider-info-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 20px;
}
.provider-info-header .provider-avatar {
  width: 56px;
  height: 56px;
  font-size: 20px;
  font-weight: 700;
}
.provider-info-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}
.provider-info-header p {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.services-section h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px;
}
.services-hint {
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}
.services-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #666;
}
.services-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.service-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.service-toggle:hover {
  border-color: #00A86B;
  background: #f0fff8;
}
.service-toggle.active {
  border-color: #00A86B;
  background: #e8f5ef;
}
.service-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #666;
}
.service-toggle.active .service-icon {
  background: #00A86B;
  color: #fff;
}
.service-icon svg {
  width: 22px;
  height: 22px;
}
.service-name {
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}
.service-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s;
}
.service-toggle.active .service-check {
  opacity: 1;
  transform: scale(1);
}
.service-check svg {
  width: 12px;
  height: 12px;
  color: #fff;
}
.selected-summary {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
  color: #333;
}
.no-services {
  color: #e11900;
}

/* Quick Action Banner */
.quick-action-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #ffc043 0%, #ff9800 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(255, 192, 67, 0.3);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(255, 192, 67, 0.3); }
  50% { box-shadow: 0 6px 24px rgba(255, 192, 67, 0.5); }
}
.banner-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.banner-icon svg {
  width: 28px;
  height: 28px;
}
.banner-content {
  flex: 1;
}
.banner-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}
.banner-content p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}
.banner-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #fff;
  color: #ff9800;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.banner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .filters { flex-direction: column; }
  .search-box { width: 100%; }
  .provider-actions { flex-wrap: wrap; justify-content: flex-end; }
  .services-grid { grid-template-columns: 1fr; }
  
  .bulk-actions-bar {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  .bulk-info {
    width: 100%;
    justify-content: space-between;
  }
  .bulk-buttons {
    width: 100%;
  }
  .bulk-btn {
    flex: 1;
    justify-content: center;
  }
  
  .quick-action-banner {
    flex-direction: column;
    text-align: center;
  }
  .banner-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
