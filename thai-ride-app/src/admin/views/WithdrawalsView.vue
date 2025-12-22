<script setup lang="ts">
/**
 * Admin Withdrawals View
 * ======================
 * Provider withdrawal requests management
 */
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()

const isLoading = ref(true)
const withdrawals = ref<any[]>([])
const totalWithdrawals = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const statusFilter = ref('')
const selectedWithdrawal = ref<any>(null)
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject'>('approve')
const actionNote = ref('')
const processing = ref(false)

async function loadWithdrawals() {
  isLoading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    let query = supabase
      .from('provider_withdrawals')
      .select(`id, provider_id, amount, status, bank_name, account_number, account_name, created_at, processed_at, notes, service_providers(provider_uid, users(first_name, last_name, phone_number))`, { count: 'exact' })
    
    if (statusFilter.value) query = query.eq('status', statusFilter.value)
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize.value - 1)

    const { data, count, error } = await query
    if (error) throw error

    withdrawals.value = (data || []).map((w: any) => ({
      id: w.id, provider_id: w.provider_id, amount: w.amount, status: w.status,
      bank_name: w.bank_name, account_number: w.account_number, account_name: w.account_name,
      provider_uid: w.service_providers?.provider_uid,
      provider_name: w.service_providers?.users ? `${w.service_providers.users.first_name || ''} ${w.service_providers.users.last_name || ''}`.trim() : '-',
      provider_phone: w.service_providers?.users?.phone_number,
      created_at: w.created_at, processed_at: w.processed_at, notes: w.notes
    }))
    totalWithdrawals.value = count || 0
    totalPages.value = Math.ceil((count || 0) / pageSize.value)
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

function openAction(withdrawal: any, type: 'approve' | 'reject') {
  selectedWithdrawal.value = withdrawal
  actionType.value = type
  actionNote.value = ''
  showActionModal.value = true
}

async function processAction() {
  if (!selectedWithdrawal.value) return
  processing.value = true
  try {
    const newStatus = actionType.value === 'approve' ? 'completed' : 'rejected'
    const { error } = await supabase.from('provider_withdrawals').update({ status: newStatus, processed_at: new Date().toISOString(), notes: actionNote.value || null }).eq('id', selectedWithdrawal.value.id)
    if (error) throw error
    showActionModal.value = false
    loadWithdrawals()
  } catch (e) { console.error(e) } finally { processing.value = false }
}

function formatCurrency(n: number) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n) }
function formatDate(d: string) { return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function getStatusColor(s: string) { return ({ pending: '#F59E0B', completed: '#10B981', rejected: '#EF4444' } as any)[s] || '#6B7280' }
function getStatusLabel(s: string) { return ({ pending: 'รอดำเนินการ', completed: 'โอนแล้ว', rejected: 'ปฏิเสธ' } as any)[s] || s }

watch([statusFilter], () => { currentPage.value = 1; loadWithdrawals() })
watch(currentPage, loadWithdrawals)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Finance' }, { label: 'ถอนเงิน' }]); loadWithdrawals() })
</script>

<template>
  <div class="withdrawals-view">
    <div class="page-header">
      <div class="header-left"><h1 class="page-title">คำขอถอนเงิน</h1><span class="total-count">{{ totalWithdrawals }} รายการ</span></div>
      <button class="refresh-btn" @click="loadWithdrawals" :disabled="isLoading"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button>
    </div>
    <div class="filters-bar">
      <select v-model="statusFilter" class="filter-select"><option value="">ทุกสถานะ</option><option value="pending">รอดำเนินการ</option><option value="completed">โอนแล้ว</option><option value="rejected">ปฏิเสธ</option></select>
    </div>
    <div class="table-container">
      <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <table v-else-if="withdrawals.length" class="data-table">
        <thead><tr><th>Provider</th><th>จำนวนเงิน</th><th>บัญชีปลายทาง</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead>
        <tbody>
          <tr v-for="w in withdrawals" :key="w.id">
            <td><div class="provider-cell"><div class="avatar">{{ (w.provider_name || 'P').charAt(0) }}</div><div class="info"><span class="name">{{ w.provider_name }}</span><code class="uid">{{ w.provider_uid }}</code></div></div></td>
            <td class="amount">{{ formatCurrency(w.amount) }}</td>
            <td><div class="bank-info"><span class="bank-name">{{ w.bank_name }}</span><span class="account">{{ w.account_number }} - {{ w.account_name }}</span></div></td>
            <td><span class="status-badge" :style="{ color: getStatusColor(w.status), background: getStatusColor(w.status) + '20' }">{{ getStatusLabel(w.status) }}</span></td>
            <td class="date">{{ formatDate(w.created_at) }}</td>
            <td>
              <div v-if="w.status === 'pending'" class="action-btns">
                <button class="btn-approve" @click="openAction(w, 'approve')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>
                <button class="btn-reject" @click="openAction(w, 'reject')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบคำขอถอนเงิน</p></div>
    </div>
    <div v-if="totalPages > 1" class="pagination"><button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span class="page-info">{{ currentPage }} / {{ totalPages }}</span><button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div>
    
    <!-- Action Modal -->
    <div v-if="showActionModal && selectedWithdrawal" class="modal-overlay" @click.self="showActionModal = false">
      <div class="modal">
        <div class="modal-header"><h2>{{ actionType === 'approve' ? 'อนุมัติการถอนเงิน' : 'ปฏิเสธการถอนเงิน' }}</h2><button class="close-btn" @click="showActionModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="summary"><span class="label">จำนวนเงิน</span><span class="value">{{ formatCurrency(selectedWithdrawal.amount) }}</span></div>
          <div class="summary"><span class="label">บัญชี</span><span class="value">{{ selectedWithdrawal.bank_name }} - {{ selectedWithdrawal.account_number }}</span></div>
          <div class="form-group"><label>หมายเหตุ</label><textarea v-model="actionNote" rows="3" placeholder="หมายเหตุ (ถ้ามี)"></textarea></div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showActionModal = false">ยกเลิก</button>
            <button :class="actionType === 'approve' ? 'btn-primary' : 'btn-danger'" @click="processAction" :disabled="processing">{{ processing ? 'กำลังดำเนินการ...' : (actionType === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.withdrawals-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.provider-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #3B82F6; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.info { display: flex; flex-direction: column; gap: 2px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.uid { font-family: monospace; font-size: 11px; padding: 2px 6px; background: #F3F4F6; border-radius: 4px; }
.amount { font-size: 16px; font-weight: 600; color: #059669; }
.bank-info { display: flex; flex-direction: column; gap: 2px; }
.bank-name { font-size: 13px; font-weight: 500; color: #1F2937; }
.account { font-size: 12px; color: #6B7280; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.date { font-size: 13px; color: #6B7280; }
.action-btns { display: flex; gap: 8px; }
.btn-approve, .btn-reject { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 8px; cursor: pointer; }
.btn-approve { background: #D1FAE5; color: #059669; }
.btn-approve:hover { background: #A7F3D0; }
.btn-reject { background: #FEE2E2; color: #DC2626; }
.btn-reject:hover { background: #FECACA; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.summary { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }
.summary .label { font-size: 13px; color: #6B7280; }
.summary .value { font-size: 14px; font-weight: 500; color: #1F2937; }
.form-group { margin-top: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group textarea { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; resize: none; }
.modal-actions { display: flex; gap: 12px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px; background: #F3F4F6; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary { flex: 1; padding: 12px; background: #00A86B; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-danger { flex: 1; padding: 12px; background: #EF4444; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:disabled, .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
