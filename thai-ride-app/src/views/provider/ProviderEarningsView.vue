<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProvider } from '../../composables/useProvider'
import { useProviderEarnings, THAI_BANKS } from '../../composables/useProviderEarnings'
import ProviderLayout from '../../components/ProviderLayout.vue'

const { profile, fetchProfile } = useProvider()
const {
  loading,
  bankAccounts,
  withdrawals,
  earningsSummary,
  weeklyStats,
  fetchBankAccounts,
  fetchWithdrawals,
  fetchEarningsSummary,
  fetchWeeklyStats,
  addBankAccount,
  deleteBankAccount,
  requestWithdrawal,
  formatMinutesToHours
} = useProviderEarnings()

const isLoading = ref(true)
const selectedPeriod = ref<'today' | 'week' | 'month'>('week')
const showWithdrawModal = ref(false)
const showAddBankModal = ref(false)
const showWithdrawHistoryModal = ref(false)

// Withdrawal form
const withdrawAmount = ref('')
const selectedBankId = ref('')

// Add bank form
const newBank = ref({
  bankCode: '',
  accountNumber: '',
  accountName: '',
  isDefault: false
})

// Initialize
onMounted(async () => {
  await fetchProfile()
  if (profile.value?.id) {
    await Promise.all([
      fetchEarningsSummary(profile.value.id),
      fetchWeeklyStats(profile.value.id),
      fetchBankAccounts(profile.value.id),
      fetchWithdrawals(profile.value.id)
    ])
  }
  isLoading.value = false
})

// Get period data
const periodData = computed(() => {
  if (!earningsSummary.value) {
    return { amount: 0, trips: 0, label: 'สัปดาห์นี้' }
  }
  switch (selectedPeriod.value) {
    case 'today':
      return { 
        amount: earningsSummary.value.today_earnings, 
        trips: earningsSummary.value.today_trips, 
        label: 'วันนี้' 
      }
    case 'week':
      return { 
        amount: earningsSummary.value.week_earnings, 
        trips: earningsSummary.value.week_trips, 
        label: 'สัปดาห์นี้' 
      }
    case 'month':
      return { 
        amount: earningsSummary.value.month_earnings, 
        trips: earningsSummary.value.month_trips, 
        label: 'เดือนนี้' 
      }
  }
})

// Max weekly stat for chart
const maxWeeklyStat = computed(() => {
  return Math.max(...weeklyStats.value.map(s => s.earnings), 1)
})

// Handle withdrawal
const handleWithdraw = async () => {
  if (!profile.value?.id || !selectedBankId.value || !withdrawAmount.value) return
  
  const amount = parseFloat(withdrawAmount.value)
  if (isNaN(amount) || amount < 100) return
  
  const result = await requestWithdrawal(profile.value.id, selectedBankId.value, amount)
  if (result) {
    showWithdrawModal.value = false
    withdrawAmount.value = ''
    selectedBankId.value = ''
  }
}

// Handle add bank
const handleAddBank = async () => {
  if (!profile.value?.id) return
  if (!newBank.value.bankCode || !newBank.value.accountNumber || !newBank.value.accountName) return
  
  const result = await addBankAccount(
    profile.value.id,
    newBank.value.bankCode,
    newBank.value.accountNumber,
    newBank.value.accountName,
    newBank.value.isDefault
  )
  
  if (result) {
    showAddBankModal.value = false
    newBank.value = { bankCode: '', accountNumber: '', accountName: '', isDefault: false }
  }
}

// Handle delete bank
const handleDeleteBank = async (accountId: string) => {
  if (confirm('ต้องการลบบัญชีนี้?')) {
    await deleteBankAccount(accountId)
  }
}

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#22C55E'
    case 'pending': return '#F59E0B'
    case 'processing': return '#3B82F6'
    case 'failed': return '#EF4444'
    case 'cancelled': return '#6B7280'
    default: return '#6B7280'
  }
}

// Get status text
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'สำเร็จ'
    case 'pending': return 'รอดำเนินการ'
    case 'processing': return 'กำลังดำเนินการ'
    case 'failed': return 'ล้มเหลว'
    case 'cancelled': return 'ยกเลิก'
    default: return status
  }
}

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
</script>

<template>
  <ProviderLayout>
    <div class="earnings-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <h1>รายได้</h1>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <template v-else>
          <!-- Balance Card -->
          <div class="balance-card">
            <div class="balance-row">
              <div class="balance-info">
                <span class="balance-label">ยอดเงินคงเหลือ</span>
                <div class="balance-amount">฿{{ (earningsSummary?.available_balance || 0).toLocaleString() }}</div>
                <div v-if="earningsSummary?.pending_withdrawals" class="pending-text">
                  รอถอน ฿{{ earningsSummary.pending_withdrawals.toLocaleString() }}
                </div>
              </div>
              <button 
                class="withdraw-btn"
                @click="showWithdrawModal = true"
                :disabled="!earningsSummary?.available_balance || earningsSummary.available_balance < 100"
              >
                ถอนเงิน
              </button>
            </div>
          </div>

          <!-- Period Selector -->
          <div class="period-tabs">
            <button 
              @click="selectedPeriod = 'today'"
              :class="['period-tab', { active: selectedPeriod === 'today' }]"
            >
              วันนี้
            </button>
            <button 
              @click="selectedPeriod = 'week'"
              :class="['period-tab', { active: selectedPeriod === 'week' }]"
            >
              สัปดาห์นี้
            </button>
            <button 
              @click="selectedPeriod = 'month'"
              :class="['period-tab', { active: selectedPeriod === 'month' }]"
            >
              เดือนนี้
            </button>
          </div>

          <!-- Main Earnings Card -->
          <div class="earnings-card">
            <span class="earnings-label">{{ periodData.label }}</span>
            <div class="earnings-amount">฿{{ periodData.amount.toLocaleString() }}</div>
            <div class="earnings-trips">{{ periodData.trips }} เที่ยว</div>
          </div>

          <!-- Online Hours Today -->
          <div v-if="earningsSummary?.today_online_minutes" class="online-hours-card">
            <div class="online-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="online-info">
              <span class="online-label">ออนไลน์วันนี้</span>
              <span class="online-value">{{ formatMinutesToHours(earningsSummary.today_online_minutes) }}</span>
            </div>
          </div>

          <!-- Weekly Chart -->
          <div class="chart-card">
            <h3 class="chart-title">รายได้รายวัน</h3>
            <div class="chart-container">
              <div 
                v-for="stat in weeklyStats" 
                :key="stat.stat_date"
                class="chart-bar-wrapper"
              >
                <div class="chart-bar-bg">
                  <div 
                    class="chart-bar"
                    :style="{ height: `${(stat.earnings / maxWeeklyStat) * 100}%` }"
                  ></div>
                </div>
                <span class="chart-label">{{ stat.day_name }}</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-value">{{ earningsSummary?.month_trips || 0 }}</span>
                <span class="summary-label">เที่ยวเดือนนี้</span>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-value">฿{{ Math.round((earningsSummary?.month_earnings || 0) / Math.max(earningsSummary?.month_trips || 1, 1)).toLocaleString() }}</span>
                <span class="summary-label">เฉลี่ย/เที่ยว</span>
              </div>
            </div>
          </div>

          <!-- Bank Accounts Section -->
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title">บัญชีธนาคาร</h3>
              <button class="add-btn" @click="showAddBankModal = true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                เพิ่ม
              </button>
            </div>
            
            <div v-if="bankAccounts.length === 0" class="empty-state">
              <p>ยังไม่มีบัญชีธนาคาร</p>
              <button class="link-btn" @click="showAddBankModal = true">เพิ่มบัญชี</button>
            </div>
            
            <div v-else class="bank-list">
              <div v-for="account in bankAccounts" :key="account.id" class="bank-item">
                <div class="bank-info">
                  <span class="bank-name">{{ account.bank_name }}</span>
                  <span class="bank-number">{{ account.account_number }}</span>
                  <span class="bank-holder">{{ account.account_name }}</span>
                </div>
                <div class="bank-actions">
                  <span v-if="account.is_default" class="default-badge">หลัก</span>
                  <button class="icon-btn" @click="handleDeleteBank(account.id)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Withdrawal History -->
          <div class="section-card">
            <div class="section-header">
              <h3 class="section-title">ประวัติการถอน</h3>
              <button v-if="withdrawals.length > 3" class="link-btn" @click="showWithdrawHistoryModal = true">
                ดูทั้งหมด
              </button>
            </div>
            
            <div v-if="withdrawals.length === 0" class="empty-state">
              <p>ยังไม่มีประวัติการถอน</p>
            </div>
            
            <div v-else class="withdrawal-list">
              <div v-for="wd in withdrawals.slice(0, 3)" :key="wd.id" class="withdrawal-item">
                <div class="withdrawal-info">
                  <span class="withdrawal-amount">฿{{ wd.amount.toLocaleString() }}</span>
                  <span class="withdrawal-date">{{ formatDate(wd.created_at) }}</span>
                </div>
                <span 
                  class="withdrawal-status"
                  :style="{ color: getStatusColor(wd.status) }"
                >
                  {{ getStatusText(wd.status) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <Teleport to="body">
      <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>ถอนเงิน</h2>
            <button class="close-btn" @click="showWithdrawModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="available-balance">
              <span>ยอดที่ถอนได้</span>
              <span class="balance">฿{{ (earningsSummary?.available_balance || 0).toLocaleString() }}</span>
            </div>
            
            <div class="form-group">
              <label>เลือกบัญชี</label>
              <select v-model="selectedBankId" class="form-select">
                <option value="">เลือกบัญชีธนาคาร</option>
                <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
                  {{ account.bank_name }} - {{ account.account_number }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>จำนวนเงิน (ขั้นต่ำ 100 บาท)</label>
              <input 
                v-model="withdrawAmount"
                type="number"
                class="form-input"
                placeholder="0"
                min="100"
                :max="earningsSummary?.available_balance || 0"
              />
            </div>
            
            <div class="quick-amounts">
              <button 
                v-for="amt in [500, 1000, 2000, 5000]" 
                :key="amt"
                class="quick-btn"
                @click="withdrawAmount = String(Math.min(amt, earningsSummary?.available_balance || 0))"
                :disabled="(earningsSummary?.available_balance || 0) < amt"
              >
                ฿{{ amt.toLocaleString() }}
              </button>
              <button 
                class="quick-btn"
                @click="withdrawAmount = String(earningsSummary?.available_balance || 0)"
              >
                ทั้งหมด
              </button>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showWithdrawModal = false">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="handleWithdraw"
              :disabled="loading || !selectedBankId || !withdrawAmount || parseFloat(withdrawAmount) < 100"
            >
              {{ loading ? 'กำลังดำเนินการ...' : 'ยืนยันถอนเงิน' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Bank Modal -->
    <Teleport to="body">
      <div v-if="showAddBankModal" class="modal-overlay" @click.self="showAddBankModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>เพิ่มบัญชีธนาคาร</h2>
            <button class="close-btn" @click="showAddBankModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>ธนาคาร</label>
              <select v-model="newBank.bankCode" class="form-select">
                <option value="">เลือกธนาคาร</option>
                <option v-for="bank in THAI_BANKS" :key="bank.code" :value="bank.code">
                  {{ bank.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>เลขบัญชี</label>
              <input 
                v-model="newBank.accountNumber"
                type="text"
                class="form-input"
                placeholder="xxx-x-xxxxx-x"
                maxlength="20"
              />
            </div>
            
            <div class="form-group">
              <label>ชื่อบัญชี</label>
              <input 
                v-model="newBank.accountName"
                type="text"
                class="form-input"
                placeholder="ชื่อ-นามสกุล ตามบัญชี"
              />
            </div>
            
            <label class="checkbox-label">
              <input type="checkbox" v-model="newBank.isDefault" />
              <span>ตั้งเป็นบัญชีหลัก</span>
            </label>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showAddBankModal = false">ยกเลิก</button>
            <button 
              class="btn-primary"
              @click="handleAddBank"
              :disabled="loading || !newBank.bankCode || !newBank.accountNumber || !newBank.accountName"
            >
              {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Withdrawal History Modal -->
    <Teleport to="body">
      <div v-if="showWithdrawHistoryModal" class="modal-overlay" @click.self="showWithdrawHistoryModal = false">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h2>ประวัติการถอนเงิน</h2>
            <button class="close-btn" @click="showWithdrawHistoryModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="withdrawal-list full">
              <div v-for="wd in withdrawals" :key="wd.id" class="withdrawal-item">
                <div class="withdrawal-info">
                  <span class="withdrawal-amount">฿{{ wd.amount.toLocaleString() }}</span>
                  <span class="withdrawal-date">{{ formatDate(wd.created_at) }}</span>
                  <span v-if="wd.transaction_ref" class="withdrawal-ref">Ref: {{ wd.transaction_ref }}</span>
                </div>
                <span 
                  class="withdrawal-status"
                  :style="{ color: getStatusColor(wd.status) }"
                >
                  {{ getStatusText(wd.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </ProviderLayout>
</template>


<style scoped>
.earnings-page {
  min-height: 100vh;
  background-color: #F6F6F6;
}

.page-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Balance Card */
.balance-card {
  background-color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-info {
  display: flex;
  flex-direction: column;
}

.balance-label {
  font-size: 13px;
  color: #6B6B6B;
}

.balance-amount {
  font-size: 32px;
  font-weight: 700;
  margin: 4px 0;
}

.pending-text {
  font-size: 12px;
  color: #F59E0B;
}

.withdraw-btn {
  padding: 12px 24px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.withdraw-btn:disabled {
  background-color: #CCCCCC;
  cursor: not-allowed;
}

/* Period Tabs */
.period-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.period-tab {
  flex: 1;
  padding: 12px;
  background-color: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab.active {
  border-color: #000000;
  background-color: #000000;
  color: #FFFFFF;
}

/* Earnings Card */
.earnings-card {
  background-color: #000000;
  color: #FFFFFF;
  padding: 28px 24px;
  border-radius: 20px;
  text-align: center;
  margin-bottom: 16px;
}

.earnings-label {
  font-size: 14px;
  opacity: 0.7;
}

.earnings-amount {
  font-size: 44px;
  font-weight: 700;
  margin: 8px 0;
  letter-spacing: -1px;
}

.earnings-trips {
  font-size: 16px;
  opacity: 0.8;
}

/* Online Hours Card */
.online-hours-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #FFFFFF;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.online-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.online-info {
  display: flex;
  flex-direction: column;
}

.online-label {
  font-size: 12px;
  color: #6B6B6B;
}

.online-value {
  font-size: 18px;
  font-weight: 600;
}

/* Chart Card */
.chart-card {
  background-color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.chart-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  gap: 8px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.chart-bar-bg {
  width: 100%;
  height: 100px;
  background-color: #F6F6F6;
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.chart-bar {
  width: 100%;
  background-color: #000000;
  border-radius: 6px;
  min-height: 4px;
  transition: height 0.3s ease;
}

.chart-label {
  font-size: 12px;
  color: #6B6B6B;
  font-weight: 500;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
}

.summary-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.summary-icon svg {
  width: 22px;
  height: 22px;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
}

.summary-label {
  font-size: 12px;
  color: #6B6B6B;
}

/* Section Card */
.section-card {
  background-color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background-color: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.link-btn {
  background: none;
  border: none;
  color: #000000;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #6B6B6B;
}

.empty-state p {
  margin-bottom: 8px;
}

/* Bank List */
.bank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.bank-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-name {
  font-size: 14px;
  font-weight: 600;
}

.bank-number {
  font-size: 13px;
  color: #6B6B6B;
}

.bank-holder {
  font-size: 12px;
  color: #6B6B6B;
}

.bank-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-badge {
  padding: 4px 8px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.icon-btn {
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6B6B6B;
}

.icon-btn:hover {
  color: #EF4444;
}

/* Withdrawal List */
.withdrawal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.withdrawal-list.full {
  max-height: 400px;
  overflow-y: auto;
}

.withdrawal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.withdrawal-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.withdrawal-amount {
  font-size: 16px;
  font-weight: 600;
}

.withdrawal-date {
  font-size: 12px;
  color: #6B6B6B;
}

.withdrawal-ref {
  font-size: 11px;
  color: #6B6B6B;
}

.withdrawal-status {
  font-size: 13px;
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background-color: #FFFFFF;
  border-radius: 20px 20px 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-large {
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #E5E5E5;
}

.available-balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: #F6F6F6;
  border-radius: 10px;
  margin-bottom: 20px;
}

.available-balance .balance {
  font-size: 20px;
  font-weight: 700;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  font-size: 16px;
  background-color: #FFFFFF;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #000000;
}

.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.quick-btn {
  padding: 10px 16px;
  background-color: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.btn-primary {
  flex: 1;
  padding: 14px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  background-color: #CCCCCC;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  padding: 14px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
