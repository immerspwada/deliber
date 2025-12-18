<script setup lang="ts">
/**
 * Admin Referrals View - F06
 * จัดการระบบแนะนำเพื่อนทั้งหมด
 * Tables: referral_codes, referrals
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ReferralCode {
  id: string
  user_id: string
  code: string
  reward_amount: number
  referee_reward: number
  usage_count: number
  max_usage: number | null
  is_active: boolean
  created_at: string
  user?: { name: string; email: string }
}

interface Referral {
  id: string
  referrer_id: string
  referee_id: string
  referral_code: string
  referrer_reward: number
  referee_reward: number
  status: string
  completed_at: string | null
  created_at: string
  referrer?: { name: string; email: string }
  referee?: { name: string; email: string }
}

const loading = ref(true)
const activeTab = ref<'codes' | 'referrals'>('codes')
const referralCodes = ref<ReferralCode[]>([])
const referrals = ref<Referral[]>([])
const searchQuery = ref('')
const statusFilter = ref('all')

// Stats
const stats = computed(() => ({
  totalCodes: referralCodes.value.length,
  activeCodes: referralCodes.value.filter(c => c.is_active).length,
  totalReferrals: referrals.value.length,
  completedReferrals: referrals.value.filter(r => r.status === 'completed').length,
  totalRewardsGiven: referrals.value
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.referrer_reward || 0) + (r.referee_reward || 0), 0)
}))

// Filtered codes
const filteredCodes = computed(() => {
  if (!searchQuery.value) return referralCodes.value
  const q = searchQuery.value.toLowerCase()
  return referralCodes.value.filter(c => 
    c.code.toLowerCase().includes(q) ||
    c.user?.name?.toLowerCase().includes(q) ||
    c.user?.email?.toLowerCase().includes(q)
  )
})

// Filtered referrals
const filteredReferrals = computed(() => {
  let result = referrals.value
  
  if (statusFilter.value !== 'all') {
    result = result.filter(r => r.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r => 
      r.referral_code.toLowerCase().includes(q) ||
      r.referrer?.name?.toLowerCase().includes(q) ||
      r.referee?.name?.toLowerCase().includes(q)
    )
  }
  
  return result
})

const fetchReferralCodes = async () => {
  try {
    const { data } = await (supabase.from('referral_codes') as any)
      .select('*, user:users!referral_codes_user_id_fkey(name, email)')
      .order('usage_count', { ascending: false })
    referralCodes.value = data || []
  } catch (err) {
    console.error('Error fetching referral codes:', err)
  }
}

const fetchReferrals = async () => {
  try {
    const { data } = await (supabase.from('referrals') as any)
      .select('*, referrer:users!referrals_referrer_id_fkey(name, email), referee:users!referrals_referee_id_fkey(name, email)')
      .order('created_at', { ascending: false })
    referrals.value = data || []
  } catch (err) {
    console.error('Error fetching referrals:', err)
  }
}

// Realtime subscriptions
let codesChannel: RealtimeChannel | null = null
let referralsChannel: RealtimeChannel | null = null

const setupRealtime = () => {
  // Subscribe to referral codes changes
  codesChannel = supabase
    .channel('admin-referral-codes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_codes' }, () => {
      fetchReferralCodes()
    })
    .subscribe()

  // Subscribe to referrals changes
  referralsChannel = supabase
    .channel('admin-referrals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
      fetchReferrals()
    })
    .subscribe()
}

onMounted(async () => {
  await Promise.all([fetchReferralCodes(), fetchReferrals()])
  loading.value = false
  setupRealtime()
})

onUnmounted(() => {
  if (codesChannel) supabase.removeChannel(codesChannel)
  if (referralsChannel) supabase.removeChannel(referralsChannel)
})

const toggleCodeStatus = async (code: ReferralCode) => {
  try {
    await (supabase.from('referral_codes') as any)
      .update({ is_active: !code.is_active })
      .eq('id', code.id)
    await fetchReferralCodes()
  } catch (err) {
    console.error('Error toggling code status:', err)
  }
}

const completeReferral = async (referralId: string) => {
  try {
    await (supabase.from('referrals') as any)
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', referralId)
    await fetchReferrals()
  } catch (err) {
    console.error('Error completing referral:', err)
  }
}

const formatDate = (date: string) => new Date(date).toLocaleDateString('th-TH', { 
  day: 'numeric', month: 'short', year: 'numeric' 
})

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { pending: 'รอดำเนินการ', completed: 'สำเร็จ', expired: 'หมดอายุ' }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = { pending: 'pending', completed: 'completed', expired: 'expired' }
  return colors[status] || 'pending'
}
</script>

<template>
  <div class="admin-page">
    <header class="page-header">
      <h1>จัดการระบบแนะนำเพื่อน</h1>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.totalCodes }}</span>
        <span class="stat-label">โค้ดทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.activeCodes }}</span>
        <span class="stat-label">โค้ดที่ใช้งานได้</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.totalReferrals }}</span>
        <span class="stat-label">การแนะนำทั้งหมด</span>
      </div>
      <div class="stat-card highlight">
        <span class="stat-value">฿{{ stats.totalRewardsGiven.toLocaleString() }}</span>
        <span class="stat-label">รางวัลที่แจกไป</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'codes' }]" @click="activeTab = 'codes'">
        โค้ดแนะนำ ({{ referralCodes.length }})
      </button>
      <button :class="['tab', { active: activeTab === 'referrals' }]" @click="activeTab = 'referrals'">
        ประวัติการแนะนำ ({{ referrals.length }})
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="filters">
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหาโค้ด, ชื่อผู้ใช้..." />
      </div>
      <div v-if="activeTab === 'referrals'" class="status-filter">
        <button :class="['filter-btn', { active: statusFilter === 'all' }]" @click="statusFilter = 'all'">ทั้งหมด</button>
        <button :class="['filter-btn', { active: statusFilter === 'pending' }]" @click="statusFilter = 'pending'">รอดำเนินการ</button>
        <button :class="['filter-btn', { active: statusFilter === 'completed' }]" @click="statusFilter = 'completed'">สำเร็จ</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <!-- Codes Tab -->
    <div v-else-if="activeTab === 'codes'" class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>โค้ด</th>
              <th>เจ้าของ</th>
              <th>รางวัลผู้แนะนำ</th>
              <th>รางวัลผู้ถูกแนะนำ</th>
              <th>ใช้แล้ว</th>
              <th>สถานะ</th>
              <th>สร้างเมื่อ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="code in filteredCodes" :key="code.id">
              <td><span class="code-badge">{{ code.code }}</span></td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ code.user?.name || '-' }}</span>
                  <span class="user-email">{{ code.user?.email }}</span>
                </div>
              </td>
              <td class="amount">฿{{ code.reward_amount }}</td>
              <td class="amount">฿{{ code.referee_reward }}</td>
              <td>{{ code.usage_count }}{{ code.max_usage ? `/${code.max_usage}` : '' }}</td>
              <td>
                <span :class="['status-badge', code.is_active ? 'active' : 'inactive']">
                  {{ code.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน' }}
                </span>
              </td>
              <td>{{ formatDate(code.created_at) }}</td>
              <td>
                <button @click="toggleCodeStatus(code)" :class="['btn-toggle', { active: code.is_active }]">
                  {{ code.is_active ? 'ปิด' : 'เปิด' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Referrals Tab -->
    <div v-else class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>โค้ดที่ใช้</th>
              <th>ผู้แนะนำ</th>
              <th>ผู้ถูกแนะนำ</th>
              <th>รางวัลผู้แนะนำ</th>
              <th>รางวัลผู้ถูกแนะนำ</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ref in filteredReferrals" :key="ref.id">
              <td><span class="code-badge">{{ ref.referral_code }}</span></td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ ref.referrer?.name || '-' }}</span>
                  <span class="user-email">{{ ref.referrer?.email }}</span>
                </div>
              </td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ ref.referee?.name || '-' }}</span>
                  <span class="user-email">{{ ref.referee?.email }}</span>
                </div>
              </td>
              <td class="amount">฿{{ ref.referrer_reward }}</td>
              <td class="amount">฿{{ ref.referee_reward }}</td>
              <td>
                <span :class="['status-badge', getStatusColor(ref.status)]">{{ getStatusLabel(ref.status) }}</span>
              </td>
              <td>{{ formatDate(ref.created_at) }}</td>
              <td>
                <button v-if="ref.status === 'pending'" @click="completeReferral(ref.id)" class="btn-complete">
                  ยืนยันสำเร็จ
                </button>
                <span v-else class="completed-text">{{ ref.completed_at ? formatDate(ref.completed_at) : '-' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
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
.stat-card.highlight { background: #000; color: #fff; }
.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: #6b6b6b; }
.stat-card.highlight .stat-label { color: rgba(255,255,255,0.7); }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 10px 20px; border: none; background: #f6f6f6; border-radius: 8px; font-size: 14px; cursor: pointer; }
.tab.active { background: #000; color: #fff; }

.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.search-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-radius: 8px; flex: 1; min-width: 250px; }
.search-bar svg { width: 20px; height: 20px; color: #6b6b6b; }
.search-bar input { flex: 1; border: none; background: none; font-size: 14px; outline: none; }

.status-filter { display: flex; gap: 8px; }
.filter-btn { padding: 8px 16px; border: 1px solid #e5e5e5; border-radius: 20px; background: #fff; font-size: 13px; cursor: pointer; }
.filter-btn.active { border-color: #000; background: #000; color: #fff; }

.loading { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-container { background: #fff; border-radius: 12px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 800px; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e5e5; }
th { background: #f6f6f6; font-size: 12px; font-weight: 600; color: #6b6b6b; text-transform: uppercase; }
td { font-size: 14px; }

.code-badge { display: inline-block; padding: 4px 10px; background: #f6f6f6; border-radius: 4px; font-family: monospace; font-weight: 600; letter-spacing: 1px; }

.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 500; }
.user-email { font-size: 12px; color: #6b6b6b; }

.amount { font-family: monospace; font-weight: 500; }

.status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #f3f4f6; color: #6b7280; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.completed { background: #dcfce7; color: #166534; }
.status-badge.expired { background: #fee2e2; color: #991b1b; }

.btn-toggle { padding: 6px 12px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fff; font-size: 12px; cursor: pointer; }
.btn-toggle.active { border-color: #ef4444; color: #ef4444; }
.btn-toggle:not(.active) { border-color: #22c55e; color: #22c55e; }

.btn-complete { padding: 6px 12px; border: none; border-radius: 6px; background: #22c55e; color: #fff; font-size: 12px; cursor: pointer; }
.completed-text { font-size: 12px; color: #6b6b6b; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
