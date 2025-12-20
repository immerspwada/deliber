<script setup lang="ts">
/**
 * Admin Wallets View - F05
 * จัดการ Wallet ของผู้ใช้ทั้งหมด
 * Tables: user_wallets, wallet_transactions
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup, addSubscription } = useAdminCleanup()

interface UserWallet {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  created_at: string
  user?: { name: string; email: string; phone: string }
}

interface WalletTransaction {
  id: string
  user_id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  status: string
  created_at: string
  user?: { name: string; email: string }
}

const loading = ref(true)
const wallets = ref<UserWallet[]>([])
const transactions = ref<WalletTransaction[]>([])
const activeTab = ref<'wallets' | 'transactions'>('wallets')
const searchQuery = ref('')
const selectedWallet = ref<UserWallet | null>(null)
const showAdjustModal = ref(false)
const adjustAmount = ref(0)
const adjustType = ref<'add' | 'deduct'>('add')
const adjustReason = ref('')
const processing = ref(false)

// Stats
const stats = computed(() => ({
  totalBalance: wallets.value.reduce((sum, w) => sum + (w.balance || 0), 0),
  totalEarned: wallets.value.reduce((sum, w) => sum + (w.total_earned || 0), 0),
  totalSpent: wallets.value.reduce((sum, w) => sum + (w.total_spent || 0), 0),
  activeWallets: wallets.value.filter(w => w.balance > 0).length
}))

// Filtered wallets
const filteredWallets = computed(() => {
  if (!searchQuery.value) return wallets.value
  const q = searchQuery.value.toLowerCase()
  return wallets.value.filter(w => 
    w.user?.name?.toLowerCase().includes(q) ||
    w.user?.email?.toLowerCase().includes(q) ||
    w.user?.phone?.includes(q)
  )
})

// Filtered transactions
const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const q = searchQuery.value.toLowerCase()
  return transactions.value.filter(t => 
    t.user?.name?.toLowerCase().includes(q) ||
    t.user?.email?.toLowerCase().includes(q) ||
    t.type.toLowerCase().includes(q) ||
    t.description?.toLowerCase().includes(q)
  )
})

const fetchWallets = async () => {
  try {
    const { data } = await (supabase.from('user_wallets') as any)
      .select('*, user:users(name, email, phone)')
      .order('balance', { ascending: false })
    wallets.value = data || []
  } catch (err) {
    console.error('Error fetching wallets:', err)
  }
}

const fetchTransactions = async () => {
  try {
    const { data } = await (supabase.from('wallet_transactions') as any)
      .select('*, user:users(name, email)')
      .order('created_at', { ascending: false })
      .limit(200)
    transactions.value = data || []
  } catch (err) {
    console.error('Error fetching transactions:', err)
  }
}

// Realtime subscriptions
let walletsChannel: RealtimeChannel | null = null
let transactionsChannel: RealtimeChannel | null = null

const setupRealtime = () => {
  // Subscribe to wallet changes
  walletsChannel = supabase
    .channel('admin-wallets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets' }, () => {
      fetchWallets()
    })
    .subscribe()

  // Subscribe to transaction changes
  transactionsChannel = supabase
    .channel('admin-wallet-transactions')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, () => {
      fetchTransactions()
      fetchWallets() // Update balances too
    })
    .subscribe()

  // Track subscriptions for cleanup
  if (walletsChannel) addSubscription(walletsChannel)
  if (transactionsChannel) addSubscription(transactionsChannel)
}

onMounted(async () => {
  await Promise.all([fetchWallets(), fetchTransactions()])
  loading.value = false
  setupRealtime()
})

// Register cleanup - replaces manual onUnmounted
addCleanup(() => {
  wallets.value = []
  transactions.value = []
  searchQuery.value = ''
  selectedWallet.value = null
  showAdjustModal.value = false
  adjustAmount.value = 0
  adjustReason.value = ''
  activeTab.value = 'wallets'
  loading.value = false
  console.log('[AdminWalletsView] Cleanup complete')
})

// Remove manual onUnmounted since useAdminCleanup handles it

const openAdjustModal = (wallet: UserWallet) => {
  selectedWallet.value = wallet
  adjustAmount.value = 0
  adjustType.value = 'add'
  adjustReason.value = ''
  showAdjustModal.value = true
}

const handleAdjust = async () => {
  if (!selectedWallet.value || adjustAmount.value <= 0 || !adjustReason.value) return
  
  processing.value = true
  try {
    const type = adjustType.value === 'add' ? 'refund' : 'payment'
    await (supabase.rpc as any)('add_wallet_transaction', {
      p_user_id: selectedWallet.value.user_id,
      p_type: type,
      p_amount: adjustAmount.value,
      p_description: `[Admin] ${adjustReason.value}`
    })
    
    await Promise.all([fetchWallets(), fetchTransactions()])
    showAdjustModal.value = false
  } catch (err) {
    console.error('Error adjusting wallet:', err)
  } finally {
    processing.value = false
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { 
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
})

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    topup: 'เติมเงิน', payment: 'ชำระเงิน', refund: 'คืนเงิน',
    cashback: 'เงินคืน', referral: 'โบนัสแนะนำ', promo: 'โปรโมชั่น', withdrawal: 'ถอนเงิน'
  }
  return labels[type] || type
}

const getTypeColor = (type: string) => {
  if (['topup', 'refund', 'cashback', 'referral', 'promo'].includes(type)) return 'positive'
  return 'negative'
}
</script>

<template>
  <div class="admin-page">
    <header class="page-header">
      <h1>จัดการ Wallet</h1>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">฿{{ stats.totalBalance.toLocaleString() }}</span>
        <span class="stat-label">ยอดรวมทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">฿{{ stats.totalEarned.toLocaleString() }}</span>
        <span class="stat-label">รับเข้าทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">฿{{ stats.totalSpent.toLocaleString() }}</span>
        <span class="stat-label">ใช้ไปทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.activeWallets }}</span>
        <span class="stat-label">Wallet ที่มียอด</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'wallets' }]" @click="activeTab = 'wallets'">
        Wallets ({{ wallets.length }})
      </button>
      <button :class="['tab', { active: activeTab === 'transactions' }]" @click="activeTab = 'transactions'">
        Transactions ({{ transactions.length }})
      </button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <!-- Wallets Tab -->
    <div v-else-if="activeTab === 'wallets'" class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>ยอดคงเหลือ</th>
              <th>รับเข้า</th>
              <th>ใช้ไป</th>
              <th>สร้างเมื่อ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wallet in filteredWallets" :key="wallet.id">
              <td>
                <div class="user-info">
                  <span class="user-name">{{ wallet.user?.name || '-' }}</span>
                  <span class="user-email">{{ wallet.user?.email }}</span>
                </div>
              </td>
              <td class="amount">฿{{ wallet.balance.toLocaleString() }}</td>
              <td class="amount positive">฿{{ wallet.total_earned.toLocaleString() }}</td>
              <td class="amount negative">฿{{ wallet.total_spent.toLocaleString() }}</td>
              <td>{{ formatDate(wallet.created_at) }}</td>
              <td>
                <button @click="openAdjustModal(wallet)" class="btn-action">ปรับยอด</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transactions Tab -->
    <div v-else class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>ประเภท</th>
              <th>จำนวน</th>
              <th>ยอดก่อน</th>
              <th>ยอดหลัง</th>
              <th>รายละเอียด</th>
              <th>วันที่</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in filteredTransactions" :key="tx.id">
              <td>
                <div class="user-info">
                  <span class="user-name">{{ tx.user?.name || '-' }}</span>
                  <span class="user-email">{{ tx.user?.email }}</span>
                </div>
              </td>
              <td><span :class="['type-badge', getTypeColor(tx.type)]">{{ getTypeLabel(tx.type) }}</span></td>
              <td :class="['amount', getTypeColor(tx.type)]">
                {{ getTypeColor(tx.type) === 'positive' ? '+' : '-' }}฿{{ Math.abs(tx.amount).toLocaleString() }}
              </td>
              <td class="amount">฿{{ tx.balance_before?.toLocaleString() || 0 }}</td>
              <td class="amount">฿{{ tx.balance_after?.toLocaleString() || 0 }}</td>
              <td class="description">{{ tx.description || '-' }}</td>
              <td>{{ formatDate(tx.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Adjust Modal -->
    <div v-if="showAdjustModal" class="modal-overlay" @click.self="showAdjustModal = false">
      <div class="modal-content">
        <h3>ปรับยอด Wallet</h3>
        <p class="modal-subtitle">{{ selectedWallet?.user?.name }} - ยอดปัจจุบัน: ฿{{ selectedWallet?.balance.toLocaleString() }}</p>
        
        <div class="form-group">
          <label>ประเภท</label>
          <div class="type-toggle">
            <button :class="['toggle-btn', { active: adjustType === 'add' }]" @click="adjustType = 'add'">เพิ่มเงิน</button>
            <button :class="['toggle-btn', { active: adjustType === 'deduct' }]" @click="adjustType = 'deduct'">หักเงิน</button>
          </div>
        </div>
        
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input v-model.number="adjustAmount" type="number" min="1" placeholder="0" />
        </div>
        
        <div class="form-group">
          <label>เหตุผล</label>
          <textarea v-model="adjustReason" placeholder="ระบุเหตุผลในการปรับยอด..."></textarea>
        </div>
        
        <div class="modal-actions">
          <button @click="showAdjustModal = false" class="btn-secondary">ยกเลิก</button>
          <button @click="handleAdjust" :disabled="processing || adjustAmount <= 0 || !adjustReason" class="btn-primary">
            {{ processing ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: #6b6b6b; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 10px 20px; border: none; background: #f6f6f6; border-radius: 8px; font-size: 14px; cursor: pointer; }
.tab.active { background: #000; color: #fff; }

.search-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f6f6f6; border-radius: 8px; margin-bottom: 16px; }
.search-bar svg { width: 20px; height: 20px; color: #6b6b6b; }
.search-bar input { flex: 1; border: none; background: none; font-size: 14px; outline: none; }

.loading { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-container { background: #fff; border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e5e5; }
th { background: #f6f6f6; font-size: 12px; font-weight: 600; color: #6b6b6b; text-transform: uppercase; }
td { font-size: 14px; }

.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 500; }
.user-email { font-size: 12px; color: #6b6b6b; }

.amount { font-family: monospace; }
.amount.positive { color: #22c55e; }
.amount.negative { color: #ef4444; }

.type-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.type-badge.positive { background: #dcfce7; color: #166534; }
.type-badge.negative { background: #fee2e2; color: #991b1b; }

.description { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.btn-action { padding: 6px 12px; background: #f6f6f6; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-action:hover { background: #e5e5e5; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; }
.modal-content h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.modal-subtitle { font-size: 14px; color: #6b6b6b; margin-bottom: 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.form-group textarea { height: 80px; resize: none; }

.type-toggle { display: flex; gap: 8px; }
.toggle-btn { flex: 1; padding: 10px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.toggle-btn.active { border-color: #000; background: #000; color: #fff; }

.modal-actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-secondary { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.btn-primary { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #000; color: #fff; font-size: 14px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .table-container { overflow-x: auto; }
}
</style>
