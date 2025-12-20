<template>
  <AdminLayout>
    <div class="p-4 space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">ประวัติธุรกรรม Wallet</h1>
        <button @click="exportData" class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium">
          Export CSV
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">ประเภท</label>
            <select v-model="filters.type" class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
              <option value="">ทั้งหมด</option>
              <option value="topup">เติมเงิน</option>
              <option value="payment">ชำระเงิน</option>
              <option value="refund">คืนเงิน</option>
              <option value="cashback">เงินคืน</option>
              <option value="referral">โบนัสแนะนำ</option>
              <option value="withdrawal">ถอนเงิน</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">ค้นหา Member UID</label>
            <input v-model="filters.memberUid" type="text" placeholder="TRD-XXXXXXXX"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 mb-1 block">วันที่เริ่ม</label>
            <input v-model="filters.startDate" type="date"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-xs text-gray-500 mb-1 block">วันที่สิ้นสุด</label>
            <input v-model="filters.endDate" type="date"
              class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <button @click="fetchTransactions" class="w-full py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
          ค้นหา
        </button>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-green-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-green-600">฿{{ formatNumber(stats.totalIn) }}</p>
          <p class="text-xs text-green-600">เงินเข้า</p>
        </div>
        <div class="bg-red-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-red-600">฿{{ formatNumber(stats.totalOut) }}</p>
          <p class="text-xs text-red-600">เงินออก</p>
        </div>
        <div class="bg-blue-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.totalCount }}</p>
          <p class="text-xs text-blue-600">รายการ</p>
        </div>
      </div>

      <!-- Transactions List -->
      <div class="bg-white rounded-2xl divide-y divide-gray-100">
        <div v-if="loading" class="p-8 text-center text-gray-500">กำลังโหลด...</div>
        <div v-else-if="transactions.length === 0" class="p-8 text-center text-gray-500">ไม่พบรายการ</div>
        <div v-else v-for="txn in transactions" :key="txn.id" class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span :class="getTypeBadgeClass(txn.type)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ formatType(txn.type) }}
                </span>
                <span class="text-xs text-gray-400">{{ txn.member_uid || 'N/A' }}</span>
              </div>
              <p class="text-sm text-gray-700 mt-1">{{ txn.description || '-' }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatDate(txn.created_at) }}</p>
            </div>
            <div class="text-right">
              <p :class="txn.amount > 0 ? 'text-green-600' : 'text-red-600'" class="font-bold">
                {{ txn.amount > 0 ? '+' : '' }}฿{{ formatNumber(Math.abs(txn.amount)) }}
              </p>
              <p class="text-xs text-gray-400">ยอดคงเหลือ: ฿{{ formatNumber(txn.balance_after) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-2">
        <button v-for="page in totalPages" :key="page" @click="currentPage = page; fetchTransactions()"
          :class="currentPage === page ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'"
          class="w-10 h-10 rounded-xl text-sm font-medium">
          {{ page }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin Wallet Transactions View - F05
 * ประวัติธุรกรรม Wallet
 * 
 * Memory Optimization: Task 15
 * - Cleans up transactions array on unmount
 * - Resets filters and stats
 */
import { ref, reactive, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

interface Transaction {
  id: string
  user_id: string
  member_uid?: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  created_at: string
}

const transactions = ref<Transaction[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = 20
const totalCount = ref(0)

const filters = reactive({
  type: '',
  memberUid: '',
  startDate: '',
  endDate: ''
})

const stats = reactive({
  totalIn: 0,
  totalOut: 0,
  totalCount: 0
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

const fetchTransactions = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('wallet_transactions')
      .select(`
        *,
        users!inner(member_uid)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize, currentPage.value * pageSize - 1)

    if (filters.type) query = query.eq('type', filters.type)
    if (filters.startDate) query = query.gte('created_at', filters.startDate)
    if (filters.endDate) query = query.lte('created_at', filters.endDate + 'T23:59:59')

    const { data, count, error } = await query

    if (!error && data) {
      transactions.value = data.map((t: any) => ({
        ...t,
        member_uid: t.users?.member_uid,
        amount: ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(t.type) ? t.amount : -t.amount
      }))
      totalCount.value = count || 0
      calculateStats()
    }
  } catch (err) {
    console.error('Error fetching transactions:', err)
  } finally {
    loading.value = false
  }
}

const calculateStats = () => {
  stats.totalIn = transactions.value.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  stats.totalOut = transactions.value.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  stats.totalCount = transactions.value.length
}

const formatNumber = (num: number) => num?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) || '0'
const formatDate = (date: string) => new Date(date).toLocaleString('th-TH')
const formatType = (type: string) => {
  const types: Record<string, string> = {
    topup: 'เติมเงิน', payment: 'ชำระเงิน', refund: 'คืนเงิน',
    cashback: 'เงินคืน', referral: 'โบนัสแนะนำ', withdrawal: 'ถอนเงิน', promo: 'โปรโมชั่น'
  }
  return types[type] || type
}
const getTypeBadgeClass = (type: string) => {
  const classes: Record<string, string> = {
    topup: 'bg-green-100 text-green-700', payment: 'bg-red-100 text-red-700',
    refund: 'bg-blue-100 text-blue-700', cashback: 'bg-yellow-100 text-yellow-700',
    referral: 'bg-purple-100 text-purple-700', withdrawal: 'bg-orange-100 text-orange-700'
  }
  return classes[type] || 'bg-gray-100 text-gray-700'
}

const exportData = () => {
  const csv = transactions.value.map(t => 
    `${t.member_uid},${t.type},${t.amount},${t.balance_after},${t.description},${t.created_at}`
  ).join('\n')
  const blob = new Blob([`Member UID,Type,Amount,Balance,Description,Date\n${csv}`], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wallet_transactions_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

// Register cleanup - Task 15
addCleanup(() => {
  transactions.value = []
  totalCount.value = 0
  currentPage.value = 1
  filters.type = ''
  filters.memberUid = ''
  filters.startDate = ''
  filters.endDate = ''
  stats.totalIn = 0
  stats.totalOut = 0
  stats.totalCount = 0
  loading.value = false
  console.log('[AdminWalletTransactionsView] Cleanup complete')
})

onMounted(fetchTransactions)
</script>
