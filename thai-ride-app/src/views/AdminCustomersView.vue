<script setup lang="ts">
/**
 * AdminCustomersView - Advanced Customer Management Dashboard
 * 
 * Feature: F23 - Admin Dashboard (Customer Management)
 * 
 * @architecture
 * - Smart Caching: Instant revisit with LRU cache
 * - URL Sync: Shareable filter/pagination state
 * - Race Condition Safe: Request cancellation
 * - Optimistic Updates: Instant UI feedback
 * - Memory Safe: Auto-cleanup for 50+ session stability
 * - Activity Timeline: Full customer history
 * - Export: CSV/Excel download
 * - Bulk Actions: Multi-select operations
 * 
 * @cleanup
 * - Clears all customer data arrays on unmount
 * - Resets filters and pagination state
 * - Removes click-outside event listeners
 * - Clears modal states and selections
 */
import { ref, computed, onMounted, onUnmounted, watch, type Directive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '../components/AdminLayout.vue'
import { useCustomerManagement, type Customer, type CustomerFilters } from '../composables/useCustomerManagement'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Click outside directive
const vClickOutside: Directive = {
  mounted(el, binding) {
    el._clickOutside = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}

const route = useRoute()
const router = useRouter()

// Cleanup composable
const { addCleanup } = useAdminCleanup()

const {
  customers,
  selectedCustomer,
  stats,
  loading,
  loadingCustomer,
  loadingStats,
  error,
  page,
  pageSize,
  total,
  totalPages,
  filters,
  fetchCustomers,
  fetchCustomerById,
  fetchStats,
  updateCustomerStatus,
  verifyCustomer,
  setSearch,
  setPage,
  setFilter,
  resetFilters,
  setSort,
  clearSelectedCustomer,
  refreshAll,
  initialize,
  // Activity Timeline
  activityTimeline,
  loadingTimeline,
  fetchActivityTimeline,
  // Export
  exportingCSV,
  exportToCSV,
  exportToExcel,
  // Bulk Actions
  selectedIds,
  bulkActionLoading,
  toggleSelection,
  selectAll,
  clearSelection,
  isSelected,
  isAllSelected,
  selectedCount,
  bulkUpdateStatus,
  bulkVerify,
  // Tags
  availableTags,
  customerTags,
  loadingTags,
  fetchAvailableTags,
  fetchCustomerTags,
  assignTag,
  removeTag,
  // Notes
  customerNotes,
  loadingNotes,
  fetchCustomerNotes,
  addNote,
  updateNote,
  deleteNote,
  // Quick Stats
  quickStats,
  loadingQuickStats,
  fetchQuickStats
} = useCustomerManagement()

// Local UI state
const showDetailModal = ref(false)
const showVerifyModal = ref(false)
const showBulkModal = ref(false)
const showExportMenu = ref(false)
const showTagsMenu = ref(false)
const showAddNoteModal = ref(false)
const activeTab = ref<'details' | 'timeline' | 'notes'>('details')
const verifyAction = ref<'verified' | 'rejected'>('verified')
const bulkAction = ref<'activate' | 'suspend' | 'verify' | 'reject'>('activate')
const rejectReason = ref('')
const searchInput = ref('')
const isRefreshing = ref(false)
const newNoteText = ref('')
const newNoteImportant = ref(false)

// Computed
const displayedCustomers = computed(() => customers.value)

const hasActiveFilters = computed(() => {
  return filters.value.status || 
         filters.value.verification_status || 
         filters.value.role || 
         filters.value.search
})

const paginationInfo = computed(() => {
  const start = (page.value - 1) * pageSize.value + 1
  const end = Math.min(page.value * pageSize.value, total.value)
  return `${start}-${end} จาก ${total.value}`
})

// Methods
const handleSearch = () => {
  setSearch(searchInput.value)
}

const handleSearchInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchInput.value = target.value
  setSearch(target.value)
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await refreshAll()
  isRefreshing.value = false
}

const openCustomerDetail = async (customer: Customer) => {
  showDetailModal.value = true
  activeTab.value = 'details'
  await fetchCustomerById(customer.id)
  await loadCustomerData(customer.id)
}

const closeDetailModal = () => {
  showDetailModal.value = false
  clearSelectedCustomer()
}

const handleToggleStatus = async (customer: Customer) => {
  const newStatus = !customer.is_active
  const success = await updateCustomerStatus(customer.id, newStatus)
  if (!success) {
    alert('ไม่สามารถอัพเดทสถานะได้')
  }
}

const openVerifyModal = (action: 'verified' | 'rejected') => {
  verifyAction.value = action
  rejectReason.value = ''
  showVerifyModal.value = true
}

const handleVerify = async () => {
  if (!selectedCustomer.value) return
  
  const success = await verifyCustomer(
    selectedCustomer.value.id,
    verifyAction.value,
    verifyAction.value === 'rejected' ? rejectReason.value : undefined
  )
  
  if (success) {
    showVerifyModal.value = false
    showDetailModal.value = false
  } else {
    alert('ไม่สามารถดำเนินการได้')
  }
}

const copyMemberUid = (uid: string) => {
  if (uid) {
    navigator.clipboard.writeText(uid)
  }
}

// Activity Timeline
const loadTimeline = async () => {
  if (selectedCustomer.value) {
    await fetchActivityTimeline(selectedCustomer.value.id)
  }
}

const switchTab = async (tab: 'details' | 'timeline' | 'notes') => {
  activeTab.value = tab
  if (!selectedCustomer.value) return
  
  if (tab === 'timeline' && activityTimeline.value.length === 0) {
    await loadTimeline()
  }
  if (tab === 'notes' && customerNotes.value.length === 0) {
    await fetchCustomerNotes(selectedCustomer.value.id)
  }
}

// Load customer data when opening modal
const loadCustomerData = async (customerId: string) => {
  await Promise.all([
    fetchCustomerTags(customerId),
    fetchQuickStats(customerId),
    fetchAvailableTags()
  ])
}

// Tag handlers
const handleAssignTag = async (tagId: string) => {
  if (!selectedCustomer.value) return
  await assignTag(selectedCustomer.value.id, tagId)
  showTagsMenu.value = false
}

const handleRemoveTag = async (tagId: string) => {
  if (!selectedCustomer.value) return
  await removeTag(selectedCustomer.value.id, tagId)
}

// Note handlers
const handleAddNote = async () => {
  if (!selectedCustomer.value || !newNoteText.value.trim()) return
  
  const success = await addNote(
    selectedCustomer.value.id,
    newNoteText.value.trim(),
    { is_important: newNoteImportant.value }
  )
  
  if (success) {
    newNoteText.value = ''
    newNoteImportant.value = false
    showAddNoteModal.value = false
  }
}

const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
  await updateNote(noteId, { is_pinned: !currentPinned })
}

const handleDeleteNote = async (noteId: string) => {
  if (confirm('ยืนยันการลบโน้ตนี้?')) {
    await deleteNote(noteId)
  }
}

// Get unassigned tags for dropdown
const unassignedTags = computed(() => {
  const assignedIds = new Set(customerTags.value.map(t => t.tag_id))
  return availableTags.value.filter(t => !assignedIds.has(t.id))
})

// Export handlers
const handleExportCSV = async () => {
  showExportMenu.value = false
  await exportToCSV()
}

const handleExportExcel = async () => {
  showExportMenu.value = false
  await exportToExcel()
}

// Bulk action handlers
const openBulkModal = (action: 'activate' | 'suspend' | 'verify' | 'reject') => {
  bulkAction.value = action
  showBulkModal.value = true
}

const handleBulkAction = async () => {
  let result: { success: number; failed: number }
  
  switch (bulkAction.value) {
    case 'activate':
      result = await bulkUpdateStatus(true)
      break
    case 'suspend':
      result = await bulkUpdateStatus(false)
      break
    case 'verify':
      result = await bulkVerify('verified')
      break
    case 'reject':
      result = await bulkVerify('rejected')
      break
    default:
      return
  }
  
  showBulkModal.value = false
  
  if (result.failed > 0) {
    alert(`สำเร็จ ${result.success} รายการ, ล้มเหลว ${result.failed} รายการ`)
  }
}

const getBulkActionText = () => {
  const texts: Record<string, string> = {
    activate: 'เปิดใช้งาน',
    suspend: 'ระงับบัญชี',
    verify: 'ยืนยันตัวตน',
    reject: 'ปฏิเสธการยืนยัน'
  }
  return texts[bulkAction.value] || ''
}

// Activity icon helper
const getActivityIcon = (type: string) => {
  const icons: Record<string, string> = {
    ride: 'M5 17h14v-5H5v5zM19 12l-2-6H7L5 12',
    delivery: 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    wallet: 'M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 100 4h4v-4h-4z',
    loyalty: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
  }
  return icons[type] || icons.ride
}

const getActivityStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอดำเนินการ',
    matched: 'จับคู่แล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return texts[status] || status
}

const getActivityStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#F5A623',
    matched: '#2196F3',
    in_progress: '#9C27B0',
    completed: '#00A86B',
    cancelled: '#E53935'
  }
  return colors[status] || '#666666'
}

// Formatters
const formatDate = (d: string | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNationalId = (id: string | null) => {
  if (!id || id.length !== 13) return id || '-'
  return `${id[0]}-${id.slice(1,5)}-${id.slice(5,10)}-${id.slice(10,12)}-${id[12]}`
}

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(amount)
}

// Status helpers
const getStatusColor = (isActive: boolean) => isActive ? '#00A86B' : '#E53935'
const getStatusText = (isActive: boolean) => isActive ? 'ใช้งาน' : 'ระงับ'
const getStatusBg = (isActive: boolean) => isActive ? '#E8F5EF' : '#FFEBEE'

const getVerificationColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#F5A623',
    verified: '#00A86B',
    rejected: '#E53935',
    suspended: '#666666'
  }
  return colors[status] || '#666666'
}

const getVerificationBg = (status: string) => {
  const bgs: Record<string, string> = {
    pending: '#FEF3C7',
    verified: '#E8F5EF',
    rejected: '#FFEBEE',
    suspended: '#F5F5F5'
  }
  return bgs[status] || '#F5F5F5'
}

const getVerificationText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอตรวจสอบ',
    verified: 'ยืนยันแล้ว',
    rejected: 'ปฏิเสธ',
    suspended: 'ระงับ'
  }
  return texts[status] || status
}

const getRoleText = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'แอดมิน',
    customer: 'ลูกค้า',
    rider: 'ไรเดอร์',
    driver: 'คนขับ'
  }
  return roles[role] || role
}

// Initialize on mount
onMounted(() => {
  searchInput.value = filters.value.search || ''
  initialize()
})

// Sync search input with filters
watch(() => filters.value.search, (newSearch) => {
  if (searchInput.value !== newSearch) {
    searchInput.value = newSearch || ''
  }
})

// Cleanup on unmount - Critical for memory stability
addCleanup(() => {
  console.log('[AdminCustomersView] Cleaning up customer data...')
  
  // Clear all customer data arrays
  customers.value = []
  activityTimeline.value = []
  customerTags.value = []
  customerNotes.value = []
  availableTags.value = []
  
  // Clear selected customer
  selectedCustomer.value = null
  clearSelectedCustomer()
  
  // Clear bulk selections
  selectedIds.value.clear()
  
  // Reset filters to default
  filters.value = {
    search: '',
    status: undefined,
    verification_status: undefined,
    role: undefined,
    sort: 'created_at',
    order: 'desc'
  }
  
  // Reset pagination
  page.value = 1
  total.value = 0
  
  // Clear all modal states
  showDetailModal.value = false
  showVerifyModal.value = false
  showBulkModal.value = false
  showExportMenu.value = false
  showTagsMenu.value = false
  showAddNoteModal.value = false
  
  // Reset tab state
  activeTab.value = 'details'
  
  // Clear search input
  searchInput.value = ''
  
  // Clear note form
  newNoteText.value = ''
  newNoteImportant.value = false
  
  // Clear verify form
  rejectReason.value = ''
  
  // Clear loading states
  isRefreshing.value = false
  
  console.log('[AdminCustomersView] Cleanup complete')
})

</script>

<template>
  <AdminLayout>
    <div class="admin-customers">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-content">
          <h1>จัดการลูกค้า</h1>
          <p class="subtitle">{{ total.toLocaleString() }} ลูกค้าทั้งหมด</p>
        </div>
        <div class="header-actions">
          <!-- Export Dropdown -->
          <div class="export-dropdown" v-click-outside="() => showExportMenu = false">
            <button 
              class="export-btn"
              @click="showExportMenu = !showExportMenu"
              :disabled="exportingCSV"
            >
              <svg v-if="!exportingCSV" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <div v-else class="btn-spinner"></div>
              <span>ส่งออก</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div v-if="showExportMenu" class="export-menu">
              <button @click="handleExportCSV" class="export-menu-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <span>CSV</span>
              </button>
              <button @click="handleExportExcel" class="export-menu-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="M8 13h2M8 17h2M14 13h2M14 17h2"/>
                </svg>
                <span>Excel</span>
              </button>
            </div>
          </div>
          
          <button 
            class="refresh-btn" 
            :class="{ spinning: isRefreshing }"
            @click="handleRefresh"
            :disabled="isRefreshing"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Bulk Actions Bar -->
      <div v-if="selectedCount > 0" class="bulk-actions-bar">
        <div class="bulk-info">
          <button class="clear-selection-btn" @click="clearSelection">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <span>เลือก {{ selectedCount }} รายการ</span>
        </div>
        <div class="bulk-buttons">
          <button class="bulk-btn activate" @click="openBulkModal('activate')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
            เปิดใช้งาน
          </button>
          <button class="bulk-btn suspend" @click="openBulkModal('suspend')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M4.93 4.93l14.14 14.14"/>
            </svg>
            ระงับ
          </button>
          <button class="bulk-btn verify" @click="openBulkModal('verify')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            ยืนยันตัวตน
          </button>
          <button class="bulk-btn reject" @click="openBulkModal('reject')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            ปฏิเสธ
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <section class="stats-grid" v-if="!loadingStats">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total.toLocaleString() }}</span>
            <span class="stat-label">ทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.active.toLocaleString() }}</span>
            <span class="stat-label">ใช้งาน</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending.toLocaleString() }}</span>
            <span class="stat-label">รอตรวจสอบ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon verified">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.verified.toLocaleString() }}</span>
            <span class="stat-label">ยืนยันแล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon new">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.newThisMonth.toLocaleString() }}</span>
            <span class="stat-label">ใหม่เดือนนี้</span>
          </div>
        </div>
      </section>

      <!-- Stats Loading Skeleton -->
      <section v-else class="stats-grid">
        <div v-for="i in 5" :key="i" class="stat-card skeleton">
          <div class="skeleton-icon"></div>
          <div class="skeleton-info">
            <div class="skeleton-value"></div>
            <div class="skeleton-label"></div>
          </div>
        </div>
      </section>

      <!-- Filters Section -->
      <section class="filters-section">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            type="text"
            v-model="searchInput"
            @input="handleSearchInput"
            @keyup.enter="handleSearch"
            placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร, Member ID..."
            class="search-input"
          />
          <button 
            v-if="searchInput" 
            class="clear-search"
            @click="searchInput = ''; setSearch('')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="filter-group">
          <select 
            :value="filters.role"
            @change="setFilter('role', ($event.target as HTMLSelectElement).value as any)"
            class="filter-select"
          >
            <option value="">ทุกบทบาท</option>
            <option value="customer">ลูกค้า</option>
            <option value="driver">คนขับ</option>
            <option value="rider">ไรเดอร์</option>
            <option value="admin">แอดมิน</option>
          </select>

          <select 
            :value="filters.verification_status"
            @change="setFilter('verification_status', ($event.target as HTMLSelectElement).value as any)"
            class="filter-select"
          >
            <option value="">ทุกสถานะยืนยัน</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="verified">ยืนยันแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>

          <select 
            :value="filters.status"
            @change="setFilter('status', ($event.target as HTMLSelectElement).value as any)"
            class="filter-select"
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="inactive">ระงับ</option>
          </select>

          <button 
            v-if="hasActiveFilters"
            class="reset-filters-btn"
            @click="resetFilters"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
            ล้างตัวกรอง
          </button>
        </div>
      </section>

      <!-- Table Header with Sort -->
      <div class="table-header">
        <div class="th-cell th-checkbox">
          <label class="checkbox-wrapper">
            <input 
              type="checkbox" 
              :checked="isAllSelected"
              @change="selectAll"
            />
            <span class="checkmark"></span>
          </label>
        </div>
        <div class="th-cell th-user" @click="setSort('name')">
          ลูกค้า
          <span v-if="filters.sort === 'name'" class="sort-icon">
            {{ filters.order === 'asc' ? '↑' : '↓' }}
          </span>
        </div>
        <div class="th-cell th-contact">ติดต่อ</div>
        <div class="th-cell th-status">สถานะ</div>
        <div class="th-cell th-verification">ยืนยัน</div>
        <div class="th-cell th-date" @click="setSort('created_at')">
          วันที่สมัคร
          <span v-if="filters.sort === 'created_at'" class="sort-icon">
            {{ filters.order === 'asc' ? '↑' : '↓' }}
          </span>
        </div>
        <div class="th-cell th-actions">จัดการ</div>
      </div>

      <!-- Customer List -->
      <section class="customers-list">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div v-for="i in 5" :key="i" class="customer-row skeleton">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-content">
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-60"></div>
            </div>
          </div>
        </div>

        <!-- Customer Rows -->
        <div 
          v-else-if="displayedCustomers.length > 0"
          class="customers-rows"
        >
          <div 
            v-for="customer in displayedCustomers" 
            :key="customer.id"
            class="customer-row"
            :class="{ inactive: !customer.is_active, selected: isSelected(customer.id) }"
            @click="openCustomerDetail(customer)"
          >
            <!-- Checkbox -->
            <div class="customer-checkbox" @click.stop>
              <label class="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  :checked="isSelected(customer.id)"
                  @change="toggleSelection(customer.id)"
                />
                <span class="checkmark"></span>
              </label>
            </div>
            
            <!-- Avatar -->
            <div class="customer-avatar">
              <img 
                v-if="customer.avatar_url" 
                :src="customer.avatar_url" 
                :alt="customer.name"
              />
              <span v-else>{{ customer.name?.charAt(0) || '?' }}</span>
            </div>

            <!-- User Info -->
            <div class="customer-info">
              <div class="customer-name">{{ customer.name || 'ไม่ระบุชื่อ' }}</div>
              <div class="customer-badges">
                <span class="role-badge">{{ getRoleText(customer.role) }}</span>
                <span 
                  v-if="customer.is_also_provider" 
                  class="dual-role-badge"
                  title="ลูกค้า + ผู้ให้บริการ"
                >
                  <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                  Dual
                </span>
                <span 
                  v-if="customer.member_uid" 
                  class="member-uid-badge"
                  @click.stop="copyMemberUid(customer.member_uid!)"
                  title="คลิกเพื่อคัดลอก"
                >
                  {{ customer.member_uid }}
                </span>
              </div>
            </div>

            <!-- Contact -->
            <div class="customer-contact">
              <span class="contact-email">{{ customer.email || '-' }}</span>
              <span class="contact-phone">{{ customer.phone || customer.phone_number || '-' }}</span>
            </div>

            <!-- Status -->
            <div class="customer-status">
              <span 
                class="status-badge"
                :style="{ 
                  backgroundColor: getStatusBg(customer.is_active),
                  color: getStatusColor(customer.is_active)
                }"
              >
                {{ getStatusText(customer.is_active) }}
              </span>
            </div>

            <!-- Verification -->
            <div class="customer-verification">
              <span 
                class="verification-badge"
                :style="{ 
                  backgroundColor: getVerificationBg(customer.verification_status),
                  color: getVerificationColor(customer.verification_status)
                }"
              >
                {{ getVerificationText(customer.verification_status) }}
              </span>
            </div>

            <!-- Date -->
            <div class="customer-date">
              {{ formatDate(customer.created_at) }}
            </div>

            <!-- Actions -->
            <div class="customer-actions" @click.stop>
              <button 
                v-if="customer.verification_status === 'pending'"
                class="action-btn approve"
                @click="openCustomerDetail(customer); openVerifyModal('verified')"
                title="ยืนยันตัวตน"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </button>
              <button 
                v-if="customer.is_active && customer.role !== 'admin'"
                class="action-btn suspend"
                @click="handleToggleStatus(customer)"
                title="ระงับบัญชี"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M4.93 4.93l14.14 14.14"/>
                </svg>
              </button>
              <button 
                v-if="!customer.is_active"
                class="action-btn activate"
                @click="handleToggleStatus(customer)"
                title="เปิดใช้งาน"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p>ไม่พบลูกค้า</p>
          <span v-if="hasActiveFilters">ลองปรับตัวกรองใหม่</span>
        </div>
      </section>

      <!-- Pagination -->
      <section v-if="totalPages > 1" class="pagination">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button 
            class="page-btn"
            :disabled="page <= 1"
            @click="setPage(1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
            </svg>
          </button>
          <button 
            class="page-btn"
            :disabled="page <= 1"
            @click="setPage(page - 1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
          
          <button 
            class="page-btn"
            :disabled="page >= totalPages"
            @click="setPage(page + 1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          <button 
            class="page-btn"
            :disabled="page >= totalPages"
            @click="setPage(totalPages)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Customer Detail Modal -->
      <Teleport to="body">
        <div 
          v-if="showDetailModal" 
          class="modal-overlay"
          @click="closeDetailModal"
        >
          <div class="modal-content" @click.stop>
            <!-- Modal Header -->
            <div class="modal-header">
              <h2>รายละเอียดลูกค้า</h2>
              <button class="close-btn" @click="closeDetailModal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Modal Tabs -->
            <div class="modal-tabs" v-if="selectedCustomer && !loadingCustomer">
              <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'details' }"
                @click="switchTab('details')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                ข้อมูล
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'timeline' }"
                @click="switchTab('timeline')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                ประวัติ
              </button>
              <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'notes' }"
                @click="switchTab('notes')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                โน้ต
                <span v-if="customerNotes.length > 0" class="tab-badge">{{ customerNotes.length }}</span>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body" v-if="selectedCustomer && !loadingCustomer">
              <!-- Details Tab -->
              <div v-if="activeTab === 'details'">
              <!-- Profile Header -->
              <div class="profile-header">
                <div class="profile-avatar">
                  <img 
                    v-if="selectedCustomer.avatar_url" 
                    :src="selectedCustomer.avatar_url" 
                    :alt="selectedCustomer.name"
                  />
                  <span v-else>{{ selectedCustomer.name?.charAt(0) || '?' }}</span>
                </div>
                <div class="profile-info">
                  <h3>{{ selectedCustomer.name || 'ไม่ระบุชื่อ' }}</h3>
                  <span class="role-badge large">{{ getRoleText(selectedCustomer.role) }}</span>
                </div>
              </div>

              <!-- Customer Tags -->
              <div class="customer-tags-section">
                <div class="tags-header">
                  <span class="tags-label">แท็ก</span>
                  <div class="tags-dropdown" v-click-outside="() => showTagsMenu = false">
                    <button class="add-tag-btn" @click="showTagsMenu = !showTagsMenu">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      เพิ่มแท็ก
                    </button>
                    <div v-if="showTagsMenu && unassignedTags.length > 0" class="tags-menu">
                      <button 
                        v-for="tag in unassignedTags" 
                        :key="tag.id"
                        class="tag-menu-item"
                        @click="handleAssignTag(tag.id)"
                      >
                        <span 
                          class="tag-dot" 
                          :style="{ backgroundColor: tag.color }"
                        ></span>
                        {{ tag.name_th || tag.name }}
                      </button>
                    </div>
                    <div v-else-if="showTagsMenu" class="tags-menu empty">
                      ไม่มีแท็กที่สามารถเพิ่มได้
                    </div>
                  </div>
                </div>
                <div class="tags-list" v-if="customerTags.length > 0">
                  <span 
                    v-for="tag in customerTags" 
                    :key="tag.tag_id"
                    class="customer-tag"
                    :style="{ backgroundColor: tag.bg_color, color: tag.color }"
                  >
                    {{ tag.name_th || tag.name }}
                    <button class="remove-tag-btn" @click="handleRemoveTag(tag.tag_id)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </span>
                </div>
                <div v-else class="no-tags">ยังไม่มีแท็ก</div>
              </div>

              <!-- Quick Stats Card -->
              <div class="quick-stats-card" v-if="quickStats">
                <div class="quick-stats-header">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 20V10M12 20V4M6 20v-6"/>
                  </svg>
                  <span>สถิติการใช้งาน</span>
                </div>
                <div class="quick-stats-grid">
                  <div class="quick-stat-item">
                    <span class="quick-stat-value">{{ quickStats.rides_this_month }}</span>
                    <span class="quick-stat-label">เที่ยวเดือนนี้</span>
                  </div>
                  <div class="quick-stat-item">
                    <span class="quick-stat-value">{{ formatCurrency(quickStats.spent_this_month) }}</span>
                    <span class="quick-stat-label">ใช้จ่ายเดือนนี้</span>
                  </div>
                  <div class="quick-stat-item">
                    <span class="quick-stat-value">{{ formatCurrency(quickStats.avg_ride_fare) }}</span>
                    <span class="quick-stat-label">เฉลี่ย/เที่ยว</span>
                  </div>
                  <div class="quick-stat-item">
                    <span class="quick-stat-value" :class="'activity-' + quickStats.activity_level">
                      {{ quickStats.activity_level === 'high' ? 'สูง' : quickStats.activity_level === 'medium' ? 'ปานกลาง' : 'ต่ำ' }}
                    </span>
                    <span class="quick-stat-label">ระดับกิจกรรม</span>
                  </div>
                </div>
                <div class="quick-stats-footer" v-if="quickStats.days_since_last_ride !== null">
                  <span v-if="quickStats.days_since_last_ride === 0">ใช้บริการวันนี้</span>
                  <span v-else-if="quickStats.days_since_last_ride === 1">ใช้บริการเมื่อวาน</span>
                  <span v-else>ไม่ได้ใช้บริการ {{ quickStats.days_since_last_ride }} วัน</span>
                </div>
              </div>
              <div v-else-if="loadingQuickStats" class="quick-stats-loading">
                <div class="spinner small"></div>
                <span>กำลังโหลดสถิติ...</span>
              </div>

              <!-- Member UID Card -->
              <div v-if="selectedCustomer.member_uid" class="member-uid-card">
                <span class="uid-label">Member ID</span>
                <span class="uid-value">{{ selectedCustomer.member_uid }}</span>
                <button 
                  class="copy-btn"
                  @click="copyMemberUid(selectedCustomer.member_uid!)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>

              <!-- Stats Row -->
              <div class="customer-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ selectedCustomer.total_rides || 0 }}</span>
                  <span class="mini-stat-label">เที่ยว</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ formatCurrency(selectedCustomer.total_spent) }}</span>
                  <span class="mini-stat-label">ใช้จ่าย</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ formatCurrency(selectedCustomer.wallet_balance) }}</span>
                  <span class="mini-stat-label">กระเป๋าเงิน</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ (selectedCustomer.loyalty_points || 0).toLocaleString() }}</span>
                  <span class="mini-stat-label">แต้ม</span>
                </div>
              </div>

              <!-- Detail Sections -->
              <div class="detail-section">
                <h4>ข้อมูลส่วนตัว</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">ชื่อ</span>
                    <span class="detail-value">{{ selectedCustomer.first_name || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">นามสกุล</span>
                    <span class="detail-value">{{ selectedCustomer.last_name || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">เลขบัตรประชาชน</span>
                    <span class="detail-value">{{ formatNationalId(selectedCustomer.national_id) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">เพศ</span>
                    <span class="detail-value">{{ selectedCustomer.gender || '-' }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h4>ข้อมูลติดต่อ</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">อีเมล</span>
                    <span class="detail-value">{{ selectedCustomer.email || '-' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">เบอร์โทร</span>
                    <span class="detail-value">{{ selectedCustomer.phone || selectedCustomer.phone_number || '-' }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h4>สถานะ</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">สถานะบัญชี</span>
                    <span 
                      class="detail-value"
                      :style="{ color: getStatusColor(selectedCustomer.is_active) }"
                    >
                      {{ getStatusText(selectedCustomer.is_active) }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">การยืนยันตัวตน</span>
                    <span 
                      class="detail-value"
                      :style="{ color: getVerificationColor(selectedCustomer.verification_status) }"
                    >
                      {{ getVerificationText(selectedCustomer.verification_status) }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">วันที่สมัคร</span>
                    <span class="detail-value">{{ formatDate(selectedCustomer.created_at) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">อัพเดทล่าสุด</span>
                    <span class="detail-value">{{ formatDate(selectedCustomer.updated_at) }}</span>
                  </div>
                </div>
              </div>
              </div>

              <!-- Timeline Tab -->
              <div v-else-if="activeTab === 'timeline'" class="timeline-tab">
                <!-- Timeline Loading -->
                <div v-if="loadingTimeline" class="timeline-loading">
                  <div class="spinner"></div>
                  <span>กำลังโหลดประวัติ...</span>
                </div>

                <!-- Timeline Empty -->
                <div v-else-if="activityTimeline.length === 0" class="timeline-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p>ยังไม่มีประวัติการใช้งาน</p>
                </div>

                <!-- Timeline Items -->
                <div v-else class="timeline-list">
                  <div 
                    v-for="activity in activityTimeline" 
                    :key="activity.id"
                    class="timeline-item"
                  >
                    <div class="timeline-icon" :style="{ backgroundColor: activity.color + '20', color: activity.color }">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path :d="getActivityIcon(activity.type)"/>
                      </svg>
                    </div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <span class="timeline-title">{{ activity.title }}</span>
                        <span 
                          class="timeline-status"
                          :style="{ color: getActivityStatusColor(activity.status) }"
                        >
                          {{ getActivityStatusText(activity.status) }}
                        </span>
                      </div>
                      <p class="timeline-description">{{ activity.description }}</p>
                      <div class="timeline-footer">
                        <span class="timeline-date">{{ formatDate(activity.created_at) }}</span>
                        <span v-if="activity.amount" class="timeline-amount">
                          {{ formatCurrency(activity.amount) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes Tab -->
              <div v-else-if="activeTab === 'notes'" class="notes-tab">
                <!-- Add Note Button -->
                <button class="add-note-btn" @click="showAddNoteModal = true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  เพิ่มโน้ต
                </button>

                <!-- Notes Loading -->
                <div v-if="loadingNotes" class="notes-loading">
                  <div class="spinner"></div>
                  <span>กำลังโหลดโน้ต...</span>
                </div>

                <!-- Notes Empty -->
                <div v-else-if="customerNotes.length === 0" class="notes-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p>ยังไม่มีโน้ต</p>
                  <span>เพิ่มโน้ตเพื่อบันทึกข้อมูลสำคัญเกี่ยวกับลูกค้า</span>
                </div>

                <!-- Notes List -->
                <div v-else class="notes-list">
                  <div 
                    v-for="note in customerNotes" 
                    :key="note.id"
                    class="note-item"
                    :class="{ pinned: note.is_pinned, important: note.is_important }"
                  >
                    <div class="note-header">
                      <div class="note-meta">
                        <span v-if="note.is_pinned" class="pin-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1"/>
                          </svg>
                        </span>
                        <span v-if="note.is_important" class="important-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </span>
                        <span class="note-author">{{ note.admin_name }}</span>
                        <span class="note-date">{{ formatDate(note.created_at) }}</span>
                      </div>
                      <div class="note-actions">
                        <button 
                          class="note-action-btn"
                          :class="{ active: note.is_pinned }"
                          @click="handleTogglePin(note.id, note.is_pinned)"
                          title="ปักหมุด"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1"/>
                          </svg>
                        </button>
                        <button 
                          class="note-action-btn delete"
                          @click="handleDeleteNote(note.id)"
                          title="ลบ"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p class="note-content">{{ note.note }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div v-else-if="loadingCustomer" class="modal-loading">
              <div class="spinner"></div>
              <span>กำลังโหลด...</span>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer" v-if="selectedCustomer && !loadingCustomer">
              <button 
                v-if="selectedCustomer.verification_status === 'pending'"
                class="btn btn-reject"
                @click="openVerifyModal('rejected')"
              >
                ปฏิเสธ
              </button>
              <button 
                v-if="selectedCustomer.verification_status === 'pending'"
                class="btn btn-approve"
                @click="openVerifyModal('verified')"
              >
                ยืนยันตัวตน
              </button>
              <button 
                v-if="selectedCustomer.is_active && selectedCustomer.role !== 'admin'"
                class="btn btn-reject"
                @click="handleToggleStatus(selectedCustomer); closeDetailModal()"
              >
                ระงับบัญชี
              </button>
              <button 
                v-if="!selectedCustomer.is_active"
                class="btn btn-approve"
                @click="handleToggleStatus(selectedCustomer); closeDetailModal()"
              >
                เปิดใช้งาน
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Verify Modal -->
      <Teleport to="body">
        <div 
          v-if="showVerifyModal" 
          class="modal-overlay"
          @click="showVerifyModal = false"
        >
          <div class="modal-content small" @click.stop>
            <div class="modal-header">
              <h2>{{ verifyAction === 'verified' ? 'ยืนยันตัวตน' : 'ปฏิเสธการยืนยัน' }}</h2>
              <button class="close-btn" @click="showVerifyModal = false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <p v-if="verifyAction === 'verified'">
                ยืนยันว่าต้องการอนุมัติการยืนยันตัวตนของ <strong>{{ selectedCustomer?.name }}</strong>?
              </p>
              <div v-else>
                <p>ระบุเหตุผลในการปฏิเสธ:</p>
                <textarea 
                  v-model="rejectReason"
                  placeholder="เหตุผลในการปฏิเสธ..."
                  class="reject-reason-input"
                  rows="3"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showVerifyModal = false">
                ยกเลิก
              </button>
              <button 
                :class="['btn', verifyAction === 'verified' ? 'btn-approve' : 'btn-reject']"
                @click="handleVerify"
                :disabled="verifyAction === 'rejected' && !rejectReason.trim()"
              >
                {{ verifyAction === 'verified' ? 'ยืนยัน' : 'ปฏิเสธ' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Bulk Action Modal -->
      <Teleport to="body">
        <div 
          v-if="showBulkModal" 
          class="modal-overlay"
          @click="showBulkModal = false"
        >
          <div class="modal-content small" @click.stop>
            <div class="modal-header">
              <h2>{{ getBulkActionText() }} {{ selectedCount }} รายการ</h2>
              <button class="close-btn" @click="showBulkModal = false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="bulk-confirm-content">
                <div class="bulk-icon" :class="bulkAction">
                  <svg v-if="bulkAction === 'activate'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <path d="M22 4L12 14.01l-3-3"/>
                  </svg>
                  <svg v-else-if="bulkAction === 'suspend'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M4.93 4.93l14.14 14.14"/>
                  </svg>
                  <svg v-else-if="bulkAction === 'verify'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                  <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                </div>
                <p>ยืนยันว่าต้องการ <strong>{{ getBulkActionText() }}</strong> ลูกค้าจำนวน <strong>{{ selectedCount }}</strong> รายการ?</p>
                <p class="bulk-warning" v-if="bulkAction === 'suspend' || bulkAction === 'reject'">
                  การดำเนินการนี้จะส่งผลต่อการใช้งานของลูกค้า
                </p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showBulkModal = false" :disabled="bulkActionLoading">
                ยกเลิก
              </button>
              <button 
                :class="['btn', bulkAction === 'suspend' || bulkAction === 'reject' ? 'btn-reject' : 'btn-approve']"
                @click="handleBulkAction"
                :disabled="bulkActionLoading"
              >
                <div v-if="bulkActionLoading" class="btn-spinner"></div>
                <span v-else>{{ getBulkActionText() }}</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Add Note Modal -->
      <Teleport to="body">
        <div 
          v-if="showAddNoteModal" 
          class="modal-overlay"
          @click="showAddNoteModal = false"
        >
          <div class="modal-content small" @click.stop>
            <div class="modal-header">
              <h2>เพิ่มโน้ต</h2>
              <button class="close-btn" @click="showAddNoteModal = false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <textarea 
                v-model="newNoteText"
                placeholder="เขียนโน้ตเกี่ยวกับลูกค้า..."
                class="note-textarea"
                rows="4"
              ></textarea>
              <label class="important-checkbox">
                <input type="checkbox" v-model="newNoteImportant" />
                <span class="checkmark"></span>
                <span class="checkbox-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  ทำเครื่องหมายว่าสำคัญ
                </span>
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="showAddNoteModal = false">
                ยกเลิก
              </button>
              <button 
                class="btn btn-approve"
                @click="handleAddNote"
                :disabled="!newNoteText.trim()"
              >
                บันทึกโน้ต
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Error Toast -->
      <Teleport to="body">
        <div v-if="error" class="error-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>{{ error }}</span>
          <button @click="error = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </Teleport>
    </div>
  </AdminLayout>
</template>


<style scoped>
/* Base Layout */
.admin-customers {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: #666666;
  margin-top: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  background: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #F5F5F5;
  border-color: #00A86B;
}

.refresh-btn.spinning svg {
  animation: spin 1s linear infinite;
}

/* Export Dropdown */
.export-dropdown {
  position: relative;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  background: #FFFFFF;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #F5F5F5;
  border-color: #00A86B;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
  min-width: 140px;
}

.export-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  font-size: 14px;
  color: #1A1A1A;
  cursor: pointer;
  transition: background 0.2s;
}

.export-menu-item:hover {
  background: #F5F5F5;
}

.export-menu-item svg {
  color: #666666;
}

/* Bulk Actions Bar */
.bulk-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1A1A1A 0%, #333 100%);
  border-radius: 14px;
  margin-bottom: 16px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 500;
}

.clear-selection-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.clear-selection-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.activate {
  background: #E8F5EF;
  color: #00A86B;
}

.bulk-btn.activate:hover {
  background: #00A86B;
  color: #FFFFFF;
}

.bulk-btn.suspend {
  background: #FFEBEE;
  color: #E53935;
}

.bulk-btn.suspend:hover {
  background: #E53935;
  color: #FFFFFF;
}

.bulk-btn.verify {
  background: #DBEAFE;
  color: #2563EB;
}

.bulk-btn.verify:hover {
  background: #2563EB;
  color: #FFFFFF;
}

.bulk-btn.reject {
  background: #FEF3C7;
  color: #D97706;
}

.bulk-btn.reject:hover {
  background: #D97706;
  color: #FFFFFF;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #F0F0F0;
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.total { background: #F5F5F5; color: #1A1A1A; }
.stat-icon.active { background: #E8F5EF; color: #00A86B; }
.stat-icon.pending { background: #FEF3C7; color: #F5A623; }
.stat-icon.verified { background: #DBEAFE; color: #2563EB; }
.stat-icon.new { background: #F3E8FF; color: #9C27B0; }

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #666666;
}

/* Skeleton Loading */
.stat-card.skeleton {
  pointer-events: none;
}

.skeleton-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-info {
  flex: 1;
}

.skeleton-value {
  height: 28px;
  width: 60px;
  border-radius: 6px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 8px;
}

.skeleton-label {
  height: 14px;
  width: 80px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Filters Section */
.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  padding: 0 16px;
  transition: border-color 0.2s;
}

.search-box:focus-within {
  border-color: #00A86B;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 14px 0;
  font-size: 14px;
  background: transparent;
}

.search-input::placeholder {
  color: #999999;
}

.clear-search {
  width: 28px;
  height: 28px;
  border: none;
  background: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  transition: all 0.2s;
}

.clear-search:hover {
  background: #E8E8E8;
  color: #1A1A1A;
}

.filter-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  background: #FFFFFF;
  font-size: 14px;
  min-width: 150px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #00A86B;
}

.reset-filters-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border: none;
  background: #F5F5F5;
  border-radius: 12px;
  font-size: 14px;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-filters-btn:hover {
  background: #E8E8E8;
  color: #1A1A1A;
}

/* Checkbox Styles */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.checkbox-wrapper input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: #FFFFFF;
}

.checkbox-wrapper input:checked + .checkmark {
  background: #00A86B;
  border-color: #00A86B;
}

.checkbox-wrapper input:checked + .checkmark::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid #FFFFFF;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-wrapper:hover .checkmark {
  border-color: #00A86B;
}

/* Table Header */
.table-header {
  display: grid;
  grid-template-columns: 44px 2fr 1.5fr 100px 120px 140px 100px;
  gap: 16px;
  padding: 12px 20px;
  background: #F5F5F5;
  border-radius: 12px;
  margin-bottom: 8px;
}

.th-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.th-cell {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.th-cell:hover {
  color: #1A1A1A;
}

.sort-icon {
  font-size: 14px;
  color: #00A86B;
}

/* Customer List */
.customers-list {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.customer-row {
  display: grid;
  grid-template-columns: 44px 2fr 1.5fr 100px 120px 140px 100px;
  gap: 16px;
  padding: 16px 20px;
  align-items: center;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  transition: background 0.2s;
}

.customer-row:last-child {
  border-bottom: none;
}

.customer-row:hover {
  background: #FAFAFA;
}

.customer-row.inactive {
  opacity: 0.7;
  background: #FAFAFA;
}

.customer-row.selected {
  background: #E8F5EF;
}

.customer-row.selected:hover {
  background: #D4EDE3;
}

.customer-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Customer Avatar */
.customer-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1A1A1A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Customer Info */
.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.customer-name {
  font-weight: 600;
  font-size: 14px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.customer-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: #F5F5F5;
  border-radius: 6px;
  font-weight: 500;
  color: #666666;
}

.role-badge.large {
  font-size: 13px;
  padding: 4px 12px;
}

.member-uid-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #1A1A1A 0%, #333 100%);
  color: #00A86B;
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: transform 0.2s;
}

.member-uid-badge:hover {
  transform: scale(1.02);
}

.dual-role-badge {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
  color: white;
  border-radius: 6px;
  font-weight: 600;
}

.dual-role-badge svg {
  width: 12px;
  height: 12px;
  margin-right: 4px;
}

/* Customer Contact */
.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.contact-email,
.contact-phone {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Status & Verification Badges */
.status-badge,
.verification-badge {
  display: inline-block;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 500;
  white-space: nowrap;
}

/* Customer Date */
.customer-date {
  font-size: 12px;
  color: #666666;
}

/* Customer Actions */
.customer-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn.approve {
  background: #E8F5EF;
  color: #00A86B;
}

.action-btn.approve:hover {
  background: #00A86B;
  color: #FFFFFF;
}

.action-btn.suspend {
  background: #FFEBEE;
  color: #E53935;
}

.action-btn.suspend:hover {
  background: #E53935;
  color: #FFFFFF;
}

.action-btn.activate {
  background: #E8F5EF;
  color: #00A86B;
}

.action-btn.activate:hover {
  background: #00A86B;
  color: #FFFFFF;
}

/* Loading State */
.loading-state {
  padding: 8px 0;
}

.customer-row.skeleton {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  pointer-events: none;
}

.skeleton-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-60 { width: 60%; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999999;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
  color: #666666;
}

.empty-state span {
  font-size: 14px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  margin-top: 16px;
}

.pagination-info {
  font-size: 14px;
  color: #666666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  background: #FFFFFF;
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

.page-indicator {
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: #FFFFFF;
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-content.small {
  max-width: 420px;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #F0F0F0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Modal Tabs */
.modal-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid #F0F0F0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.tab-btn:hover {
  color: #1A1A1A;
}

.tab-btn.active {
  color: #00A86B;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #00A86B;
  border-radius: 2px 2px 0 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #F5F5F5;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #E8E8E8;
}

.modal-body {
  padding: 24px;
}

.modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #666666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #1A1A1A;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

/* Member UID Card */
.member-uid-card {
  background: linear-gradient(135deg, #1A1A1A 0%, #333 100%);
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.uid-label {
  font-size: 11px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.uid-value {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 1px;
}

.copy-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Customer Stats Row */
.customer-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.mini-stat {
  background: #F5F5F5;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
}

.mini-stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.mini-stat-label {
  font-size: 11px;
  color: #666666;
}

/* Detail Sections */
.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  background: #F5F5F5;
  padding: 14px;
  border-radius: 12px;
}

.detail-label {
  display: block;
  font-size: 11px;
  color: #666666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #F0F0F0;
}

.btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: #00A86B;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-approve:hover:not(:disabled) {
  background: #008F5B;
}

.btn-reject {
  background: #F5F5F5;
  color: #E53935;
}

.btn-reject:hover:not(:disabled) {
  background: #FFEBEE;
}

.btn-secondary {
  background: #F5F5F5;
  color: #666666;
}

.btn-secondary:hover {
  background: #E8E8E8;
}

/* Customer Tags Section */
.customer-tags-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
}

.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tags-label {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-dropdown {
  position: relative;
}

.add-tag-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed #00A86B;
  border-radius: 8px;
  background: transparent;
  color: #00A86B;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-tag-btn:hover {
  background: #E8F5EF;
}

.tags-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
  min-width: 160px;
}

.tags-menu.empty {
  padding: 12px 16px;
  font-size: 13px;
  color: #999999;
}

.tag-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 13px;
  color: #1A1A1A;
  cursor: pointer;
  transition: background 0.2s;
}

.tag-menu-item:hover {
  background: #F5F5F5;
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.customer-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.remove-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.remove-tag-btn:hover {
  opacity: 1;
}

.no-tags {
  font-size: 13px;
  color: #999999;
}

/* Quick Stats Card */
.quick-stats-card {
  background: linear-gradient(135deg, #1A1A1A 0%, #333 100%);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  color: #FFFFFF;
}

.quick-stats-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
}

.quick-stats-header svg {
  color: #00A86B;
}

.quick-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-stat-item {
  text-align: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.quick-stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #00A86B;
  margin-bottom: 4px;
}

.quick-stat-value.activity-high {
  color: #00A86B;
}

.quick-stat-value.activity-medium {
  color: #F5A623;
}

.quick-stat-value.activity-low {
  color: #E53935;
}

.quick-stat-label {
  font-size: 10px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.quick-stats-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  color: #999999;
  text-align: center;
}

.quick-stats-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 24px;
  color: #666666;
  font-size: 13px;
}

.spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

/* Tab Badge */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background: #00A86B;
  color: #FFFFFF;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 6px;
}

/* Notes Tab */
.notes-tab {
  min-height: 300px;
}

.add-note-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: 2px dashed #E8E8E8;
  border-radius: 12px;
  background: transparent;
  color: #666666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 16px;
}

.add-note-btn:hover {
  border-color: #00A86B;
  color: #00A86B;
  background: #E8F5EF;
}

.notes-loading,
.notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #666666;
}

.notes-empty p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.notes-empty span {
  font-size: 12px;
  color: #999999;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  background: #F5F5F5;
  border-radius: 14px;
  padding: 16px;
  transition: all 0.2s;
}

.note-item.pinned {
  background: #FFF8DC;
  border: 1px solid #FFD700;
}

.note-item.important {
  border-left: 4px solid #E53935;
}

.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666666;
}

.pin-icon {
  color: #FFD700;
}

.important-icon {
  color: #E53935;
}

.note-author {
  font-weight: 500;
  color: #1A1A1A;
}

.note-date {
  color: #999999;
}

.note-actions {
  display: flex;
  gap: 4px;
}

.note-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  color: #666666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.note-action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.note-action-btn.active {
  background: #FFD700;
  color: #1A1A1A;
}

.note-action-btn.delete:hover {
  background: #FFEBEE;
  color: #E53935;
}

.note-content {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

/* Note Textarea */
.note-textarea {
  width: 100%;
  padding: 14px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.note-textarea:focus {
  outline: none;
  border-color: #00A86B;
}

/* Important Checkbox */
.important-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  cursor: pointer;
}

.important-checkbox input {
  display: none;
}

.important-checkbox .checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: #FFFFFF;
  flex-shrink: 0;
}

.important-checkbox input:checked + .checkmark {
  background: #E53935;
  border-color: #E53935;
}

.important-checkbox input:checked + .checkmark::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid #FFFFFF;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

.checkbox-label svg {
  color: #E53935;
}

/* Timeline Tab */
.timeline-tab {
  min-height: 300px;
}

.timeline-loading,
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #666666;
}

.timeline-empty p {
  font-size: 14px;
  color: #999999;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
  transition: background 0.2s;
}

.timeline-item:hover {
  background: #EEEEEE;
}

.timeline-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.timeline-status {
  font-size: 11px;
  font-weight: 500;
}

.timeline-description {
  font-size: 13px;
  color: #666666;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-date {
  font-size: 11px;
  color: #999999;
}

.timeline-amount {
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
}

/* Bulk Confirm Modal */
.bulk-confirm-content {
  text-align: center;
  padding: 20px 0;
}

.bulk-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.bulk-icon.activate,
.bulk-icon.verify {
  background: #E8F5EF;
  color: #00A86B;
}

.bulk-icon.suspend,
.bulk-icon.reject {
  background: #FFEBEE;
  color: #E53935;
}

.bulk-confirm-content p {
  font-size: 15px;
  color: #1A1A1A;
  margin: 0;
}

.bulk-warning {
  margin-top: 12px !important;
  font-size: 13px !important;
  color: #E53935 !important;
}

/* Button Spinner */
.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Reject Reason Input */
.reject-reason-input {
  width: 100%;
  padding: 14px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-top: 12px;
  transition: border-color 0.2s;
}

.reject-reason-input:focus {
  outline: none;
  border-color: #00A86B;
}

/* Error Toast */
.error-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #E53935;
  color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(229, 57, 53, 0.3);
  z-index: 2000;
  animation: slideUp 0.3s ease;
}

.error-toast button {
  background: none;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
  padding: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-toast button:hover {
  opacity: 1;
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .table-header {
    display: none;
  }
  
  .customer-row {
    grid-template-columns: 44px 1fr auto;
    gap: 12px;
  }
  
  .customer-contact,
  .customer-status,
  .customer-verification,
  .customer-date {
    display: none;
  }
  
  .customer-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .bulk-actions-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .bulk-buttons {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .admin-customers {
    padding: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
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
  
  .filter-select {
    flex: 1;
    min-width: 0;
  }
  
  .customer-stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    gap: 8px;
  }
  
  .export-btn span {
    display: none;
  }
  
  .export-btn {
    padding: 12px;
  }
  
  .bulk-btn span {
    display: none;
  }
  
  .bulk-btn {
    padding: 10px;
  }
  
  .quick-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-stat-value {
    font-size: 16px;
  }
}
</style>
