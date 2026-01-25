<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'
import { useAdminUIStore } from '../stores/adminUI.store'
import { useToast } from '@/composables/useToast'
import type { Provider, ProviderStatus } from '@/admin/types/provider.types'

const uiStore = useAdminUIStore()
const toast = useToast()

const {
  providers,
  totalCount,
  loading,
  fetchProviders,
  approveProvider,
  rejectProvider,
  suspendProvider,
} = useAdminProviders()

// State
const currentPage = ref(1)
const pageSize = ref(20)
const searchQuery = ref('')
const statusFilter = ref<ProviderStatus | ''>('')

const isProcessing = ref(false)

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const filteredProviders = computed(() => {
  let result = providers.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.first_name?.toLowerCase().includes(query) ||
      p.last_name?.toLowerCase().includes(query) ||
      p.phone_number?.includes(query)
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(p => p.status === statusFilter.value)
  }
  
  return result
})

// Actions
async function handleApprove(provider: Provider) {
  if (!confirm(`อนุมัติ ${provider.first_name} ${provider.last_name}?`)) return
  
  try {
    await approveProvider(provider.id, 'อนุมัติโดยแอดมิน')
    toast.success('อนุมัติสำเร็จ')
    await loadProviders()
  } catch (e) {
    toast.error('ไม่สามารถอนุมัติได้')
  }
}

async function handleReject(provider: Provider) {
  const reason = prompt(`ปฏิเสธ ${provider.first_name} ${provider.last_name}\n\nระบุเหตุผล:`)
  if (!reason) return
  
  try {
    await rejectProvider(provider.id, reason)
    toast.success('ปฏิเสธสำเร็จ')
    await loadProviders()
  } catch (e) {
    toast.error('ไม่สามารถปฏิเสธได้')
  }
}

async function handleSuspend(provider: Provider) {
  const reason = prompt(`ระงับ ${provider.first_name} ${provider.last_name}\n\nระบุเหตุผล:`)
  if (!reason) return
  
  try {
    await suspendProvider(provider.id, reason)
    toast.success('ระงับสำเร็จ')
    await loadProviders()
  } catch (e) {
    toast.error('ไม่สามารถระงับได้')
  }
}


async function handleRestore(provider: Provider) {
  console.log('🔄 [handleRestore] Called', { id: provider.id, status: provider.status })
  
  if (provider.status !== 'suspended' && provider.status !== 'rejected') {
    console.log('❌ [handleRestore] Invalid status')
    toast.error('สามารถคืนสถานะได้เฉพาะผู้ให้บริการที่ถูกระงับหรือปฏิเสธเท่านั้น')
    return
  }
  
  if (!confirm(`คืนสถานะ ${provider.first_name} ${provider.last_name}?`)) {
    console.log('⏹️ [handleRestore] Cancelled by user')
    return
  }
  
  isProcessing.value = true
  console.log('🔄 [handleRestore] Processing...')
  
  try {
    const restoreNote = provider.status === 'suspended' 
      ? 'คืนสถานะจากการระงับโดยแอดมิน' 
      : 'คืนสถานะจากการปฏิเสธโดยแอดมิน'
    
    console.log('🔄 [handleRestore] Calling approveProvider')
    await approveProvider(provider.id, restoreNote)
    console.log('✅ [handleRestore] Success!')
    
    toast.success(`คืนสถานะ ${provider.first_name} ${provider.last_name} เรียบร้อยแล้ว`)
    await loadProviders()
  } catch (e) {
    console.error('❌ [handleRestore] Error:', e)
    handleError(e, 'handleRestore')
    toast.error('ไม่สามารถคืนสถานะผู้ให้บริการได้')
  } finally {
    isProcessing.value = false
    console.log('🔄 [handleRestore] Done')
  }
}
async function loadProviders() {
  await fetchProviders({
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value
  })
}

// Lifecycle
onMounted(() => {
  uiStore.setBreadcrumbs([
    { label: 'Admin', path: '/admin' },
    { label: 'Providers' }
  ])
  loadProviders()
})

watch([currentPage, statusFilter], loadProviders)
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="title">Providers</h1>
        <p class="subtitle">{{ totalCount }} providers</p>
      </div>
      <button class="btn-icon" :disabled="loading" @click="loadProviders">
        <svg class="icon" :class="{ spin: loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search..." 
        class="input"
      />
      <select v-model="statusFilter" class="select">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <table v-else-if="filteredProviders.length > 0" class="table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Phone</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredProviders" :key="p.id">
            <td>
              <div class="provider">
                <div class="avatar">{{ (p.first_name || 'P')[0] }}</div>
                <div>
                  <div class="name">{{ p.first_name }} {{ p.last_name }}</div>
                  <div class="email">{{ p.email }}</div>
                </div>
              </div>
            </td>
            <td>{{ p.phone_number || '-' }}</td>
            <td>
              <span class="badge" :class="`badge-${p.status}`">
                {{ p.status }}
              </span>
            </td>
            <td class="text-right">
              <div class="actions">
                <button 
                  v-if="p.status === 'pending'" 
                  class="btn btn-approve"
                  title="Approve"
                  @click.stop="handleApprove(p)"
                >
                  ✓
                </button>
                <button 
                  v-if="p.status === 'pending'" 
                  class="btn btn-reject"
                  title="Reject"
                  @click.stop="handleReject(p)"
                >
                  ✕
                </button>
                <button 
                  v-if="p.status === 'approved'" 
                  class="btn btn-suspend"
                  title="Suspend"
                  @click.stop="handleSuspend(p)"
                >
                  ⏸
                </button>
                <button 
                  v-if="p.status === 'suspended' || p.status === 'rejected'" 
                  class="btn btn-restore"
                  title="คืนสถานะ (Restore)"
                  @click.stop="handleRestore(p)"
                >
                  ↻
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">
        <p>No providers found</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        :disabled="currentPage === 1" 
        class="btn-page"
        @click="currentPage--"
      >
        ←
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        :disabled="currentPage === totalPages" 
        class="btn-page"
        @click="currentPage++"
      >
        →
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Layout */
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 600;
  color: #000;
  margin: 0;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 0.875rem;
  color: #666;
  margin: 0.25rem 0 0 0;
}

/* Filters */
.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.input,
.select {
  height: 44px;
  padding: 0 1rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
  transition: border-color 0.2s;
}

.input {
  flex: 1;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: #000;
}

.select {
  min-width: 150px;
  cursor: pointer;
}

/* Card */
.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table thead {
  background: #fafafa;
  border-bottom: 1px solid #e5e5e5;
}

.table th {
  padding: 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  padding: 1rem;
  border-bottom: 1px solid #f5f5f5;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:hover {
  background: #fafafa;
}

.text-right {
  text-align: right;
}

/* Provider */
.provider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #000;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.name {
  font-weight: 500;
  color: #000;
}

.email {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.125rem;
}

/* Badge */
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.badge-pending {
  background: #fffbeb;
  color: #92400e;
}

.badge-approved {
  background: #f0fdf4;
  color: #166534;
}

.badge-rejected {
  background: #fef2f2;
  color: #991b1b;
}

.badge-suspended {
  background: #f5f5f5;
  color: #666;
}

/* Actions */
.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-approve {
  background: #fff;
  border-color: #22c55e;
  color: #22c55e;
}

.btn-approve:hover {
  background: #22c55e;
  color: #fff;
}

.btn-reject {
  background: #fff;
  border-color: #ef4444;
  color: #ef4444;
}

.btn-reject:hover {
  background: #ef4444;
  color: #fff;
}

.btn-suspend {
  background: #fff;
  border-color: #f59e0b;
  color: #f59e0b;
}

.btn-suspend:hover {
  background: #f59e0b;
  color: #fff;
}

/* Button Icon */
.btn-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #000;
  border-color: #000;
}

.btn-icon:hover:not(:disabled) .icon {
  color: #fff;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 20px;
  height: 20px;
  color: #000;
  stroke-width: 2;
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #f5f5f5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty */
.empty {
  padding: 4rem;
  text-align: center;
  color: #666;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-page {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  background: #000;
  border-color: #000;
  color: #fff;
}

.btn-page:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #666;
  min-width: 80px;
  text-align: center;
}
</style>

.btn-restore {
  background: #fff;
  color: #10b981;
  border: 1px solid #10b981;
}

.btn-restore:hover {
  background: #10b981;
  color: #fff;
}
