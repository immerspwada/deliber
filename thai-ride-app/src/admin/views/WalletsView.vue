<script setup lang="ts">
/**
 * Admin Wallets View
 * ==================
 * User wallet management
 */
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()

const isLoading = ref(true)
const wallets = ref<any[]>([])
const totalWallets = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const selectedWallet = ref<any>(null)
const showDetailModal = ref(false)
const transactions = ref<any[]>([])
const loadingTx = ref(false)

async function loadWallets() {
  isLoading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    const { data, count, error } = await supabase
      .from('user_wallets')
      .select(`id, user_id, balance, created_at, updated_at, users(first_name, last_name, phone_number, member_uid)`, { count: 'exact' })
      .order('balance', { ascending: false })
      .range(offset, offset + pageSize.value - 1)

    if (error) throw error
    wallets.value = (data || []).map((w: any) => ({
      id: w.id, user_id: w.user_id, balance: w.balance || 0,
      name: w.users ? `${w.users.first_name || ''} ${w.users.last_name || ''}`.trim() : '-',
      phone: w.users?.phone_number, member_uid: w.users?.member_uid,
      created_at: w.created_at, updated_at: w.updated_at
    }))
    totalWallets.value = count || 0
    totalPages.value = Math.ceil((count || 0) / pageSize.value)
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

async function viewWallet(wallet: any) {
  selectedWallet.value = wallet
  showDetailModal.value = true
  loadingTx.value = true
  try {
    const { data } = await supabase.from('wallet_transactions').select('*').eq('user_id', wallet.user_id).order('created_at', { ascending: false }).limit(20)
    transactions.value = data || []
  } catch (e) { console.error(e) } finally { loadingTx.value = false }
}

function formatCurrency(n: number) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n) }
function formatDate(d: string) { return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function getTypeLabel(t: string) { return ({ topup: 'เติมเงิน', payment: 'ชำระเงิน', refund: 'คืนเงิน', bonus: 'โบนัส' } as any)[t] || t }
function getTypeColor(t: string) { return ({ topup: '#10B981', payment: '#EF4444', refund: '#3B82F6', bonus: '#8B5CF6' } as any)[t] || '#6B7280' }

watch([searchQuery], () => { currentPage.value = 1; loadWallets() })
watch(currentPage, loadWallets)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Finance' }, { label: 'Wallets' }]); loadWallets() })
</script>

<template>
  <div class="wallets-view">
    <div class="page-header">
      <div class="header-left"><h1 class="page-title">Wallets</h1><span class="total-count">{{ totalWallets }} บัญชี</span></div>
      <button class="refresh-btn" @click="loadWallets" :disabled="isLoading"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button>
    </div>
    <div class="filters-bar"><div class="search-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input v-model="searchQuery" type="text" placeholder="ค้นหา..." class="search-input" /></div></div>
    <div class="table-container">
      <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <table v-else-if="wallets.length" class="data-table">
        <thead><tr><th>ลูกค้า</th><th>Member UID</th><th>ยอดเงิน</th><th>อัพเดท</th><th></th></tr></thead>
        <tbody>
          <tr v-for="w in wallets" :key="w.id" @click="viewWallet(w)">
            <td><div class="cell"><div class="avatar">{{ (w.name || 'U').charAt(0) }}</div><div class="info"><span class="name">{{ w.name }}</span><span class="phone">{{ w.phone || '-' }}</span></div></div></td>
            <td><code class="uid">{{ w.member_uid || '-' }}</code></td>
            <td class="balance">{{ formatCurrency(w.balance) }}</td>
            <td class="date">{{ formatDate(w.updated_at || w.created_at) }}</td>
            <td><button class="action-btn" @click.stop="viewWallet(w)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบ Wallet</p></div>
    </div>
    <div v-if="totalPages > 1" class="pagination"><button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span class="page-info">{{ currentPage }} / {{ totalPages }}</span><button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div>
    <div v-if="showDetailModal && selectedWallet" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header"><h2>Wallet Details</h2><button class="close-btn" @click="showDetailModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="wallet-header"><div class="avatar lg">{{ (selectedWallet.name || 'U').charAt(0) }}</div><div><h3>{{ selectedWallet.name }}</h3><code class="uid">{{ selectedWallet.member_uid }}</code></div><div class="balance-display">{{ formatCurrency(selectedWallet.balance) }}</div></div>
          <h4 class="section-title">ประวัติธุรกรรม</h4>
          <div v-if="loadingTx" class="loading-tx"><div class="skeleton sm" v-for="i in 5" :key="i" /></div>
          <div v-else-if="transactions.length" class="tx-list">
            <div v-for="tx in transactions" :key="tx.id" class="tx-item">
              <div class="tx-info"><span class="tx-type" :style="{ color: getTypeColor(tx.type) }">{{ getTypeLabel(tx.type) }}</span><span class="tx-desc">{{ tx.description || '-' }}</span></div>
              <div class="tx-meta"><span class="tx-amount" :class="{ positive: tx.amount > 0, negative: tx.amount < 0 }">{{ tx.amount > 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}</span><span class="tx-date">{{ formatDate(tx.created_at) }}</span></div>
            </div>
          </div>
          <div v-else class="empty-tx"><p>ไม่มีประวัติ</p></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallets-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; max-width: 400px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
.skeleton.sm { height: 48px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #F9FAFB; }
.cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #00A86B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.info { display: flex; flex-direction: column; gap: 2px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .phone { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.balance { font-size: 16px; font-weight: 600; color: #059669; }
.date { font-size: 13px; color: #6B7280; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.action-btn:hover { background: #F3F4F6; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; overflow-y: auto; }
.wallet-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.wallet-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.balance-display { margin-left: auto; font-size: 24px; font-weight: 700; color: #059669; }
.section-title { font-size: 14px; font-weight: 600; color: #6B7280; margin: 0 0 12px 0; }
.loading-tx { display: flex; flex-direction: column; gap: 8px; }
.tx-list { display: flex; flex-direction: column; gap: 8px; }
.tx-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #F9FAFB; border-radius: 10px; }
.tx-info { display: flex; flex-direction: column; gap: 2px; }
.tx-type { font-size: 13px; font-weight: 500; }
.tx-desc { font-size: 12px; color: #6B7280; }
.tx-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.tx-amount { font-size: 14px; font-weight: 600; }
.tx-amount.positive { color: #10B981; }
.tx-amount.negative { color: #EF4444; }
.tx-date { font-size: 11px; color: #9CA3AF; }
.empty-tx { display: flex; align-items: center; justify-content: center; padding: 40px; color: #9CA3AF; }
</style>
