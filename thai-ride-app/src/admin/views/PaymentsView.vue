<script setup lang="ts">
/**
 * Admin Payments View
 * ===================
 * Payment transactions management
 */
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()

const isLoading = ref(true)
const payments = ref<any[]>([])
const totalPayments = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const methodFilter = ref('')

async function loadPayments() {
  isLoading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value

    let query = supabase
      .from('ride_requests')
      .select(`
        id, tracking_id, final_fare, payment_method, payment_status, 
        created_at, completed_at, user_id,
        users!ride_requests_user_id_fkey(first_name, last_name, phone_number)
      `, { count: 'exact' })
      .not('final_fare', 'is', null)

    if (searchQuery.value) {
      query = query.or(`tracking_id.ilike.%${searchQuery.value}%`)
    }
    if (statusFilter.value) {
      query = query.eq('payment_status', statusFilter.value)
    }
    if (methodFilter.value) {
      query = query.eq('payment_method', methodFilter.value)
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + pageSize.value - 1)

    const { data, count, error } = await query

    if (error) throw error

    payments.value = (data || []).map((p: any) => ({
      id: p.id,
      tracking_id: p.tracking_id || p.id.slice(0, 8).toUpperCase(),
      amount: p.final_fare || 0,
      method: p.payment_method || 'cash',
      status: p.payment_status || 'pending',
      customer_name: p.users ? `${p.users.first_name || ''} ${p.users.last_name || ''}`.trim() : '-',
      customer_phone: p.users?.phone_number,
      created_at: p.created_at
    }))

    totalPayments.value = count || 0
    totalPages.value = Math.ceil((count || 0) / pageSize.value)
  } catch (e) {
    console.error('Failed to load payments:', e)
  } finally {
    isLoading.value = false
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = { paid: '#10B981', pending: '#F59E0B', failed: '#EF4444', refunded: '#6B7280' }
  return colors[status] || '#6B7280'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = { paid: 'ชำระแล้ว', pending: 'รอชำระ', failed: 'ล้มเหลว', refunded: 'คืนเงินแล้ว' }
  return labels[status] || status
}

function getMethodLabel(method: string) {
  const labels: Record<string, string> = { cash: 'เงินสด', wallet: 'Wallet', card: 'บัตรเครดิต', promptpay: 'PromptPay' }
  return labels[method] || method
}

watch([searchQuery, statusFilter, methodFilter], () => { currentPage.value = 1; loadPayments() })
watch(currentPage, loadPayments)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Finance', path: '/admin/revenue' }, { label: 'การชำระเงิน' }])
  loadPayments()
})
</script>

<template>
  <div class="payments-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">การชำระเงิน</h1>
        <span class="total-count">{{ totalPayments.toLocaleString() }} รายการ</span>
      </div>
      <button class="refresh-btn" @click="loadPayments" :disabled="isLoading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหา Tracking ID..." class="search-input" />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="paid">ชำระแล้ว</option>
        <option value="pending">รอชำระ</option>
      </select>
      <select v-model="methodFilter" class="filter-select">
        <option value="">ทุกช่องทาง</option>
        <option value="cash">เงินสด</option>
        <option value="wallet">Wallet</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <table v-else-if="payments.length > 0" class="data-table">
        <thead><tr><th>Tracking ID</th><th>ลูกค้า</th><th>จำนวนเงิน</th><th>ช่องทาง</th><th>สถานะ</th><th>วันที่</th></tr></thead>
        <tbody>
          <tr v-for="payment in payments" :key="payment.id">
            <td><code class="tracking-id">{{ payment.tracking_id }}</code></td>
            <td><div class="customer-info"><span class="name">{{ payment.customer_name }}</span><span class="phone">{{ payment.customer_phone || '-' }}</span></div></td>
            <td class="amount">{{ formatCurrency(payment.amount) }}</td>
            <td>{{ getMethodLabel(payment.method) }}</td>
            <td><span class="status-badge" :style="{ color: getStatusColor(payment.status), background: getStatusColor(payment.status) + '20' }">{{ getStatusLabel(payment.status) }}</span></td>
            <td class="date">{{ formatDate(payment.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบรายการชำระเงิน</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>
  </div>
</template>

<style scoped>
.payments-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.tracking-id { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.customer-info { display: flex; flex-direction: column; gap: 2px; }
.customer-info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.customer-info .phone { font-size: 12px; color: #6B7280; }
.amount { font-weight: 600; color: #059669; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.date { font-size: 13px; color: #6B7280; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
</style>
