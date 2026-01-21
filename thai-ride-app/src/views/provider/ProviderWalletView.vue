<script setup lang="ts">
/**
 * ProviderWalletView - Provider Wallet Page (Production Ready)
 * 
 * Role Impact (3 บริบท):
 * - 👤 Customer: ไม่เข้าถึงหน้านี้
 * - 🚗 Provider: ดูยอดเงิน, ถอนเงิน, จัดการบัญชีธนาคาร
 * - 👑 Admin: ไม่เข้าถึงหน้านี้ (ใช้ Admin Panel แทน)
 * 
 * Features:
 * - Balance display with earnings breakdown
 * - Withdrawal request
 * - Bank account management
 * - Transaction history
 * - Weekly earnings chart
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useProviderStore } from '../../stores/providerStore'
import { useProviderWallet } from '../../composables/useProviderWallet'

const providerStore = useProviderStore()
const wallet = useProviderWallet()

// State
const activeTab = ref<'overview' | 'withdraw' | 'history' | 'banks'>('overview')
const showWithdrawModal = ref(false)
const showAddBankModal = ref(false)
const withdrawAmount = ref('')
const selectedBankId = ref('')

// New bank account form
const newBank = ref({
  bankCode: '',
  accountNumber: '',
  accountName: '',
  isDefault: false
})

// Computed
const providerId = computed(() => providerStore.provider?.id)
const canWithdraw = computed(() => {
  const amount = parseFloat(withdrawAmount.value) || 0
  return amount >= 100 && 
         amount <= wallet.availableBalance.value && 
         selectedBankId.value !== ''
})

// Load data
async function loadData() {
  if (!providerId.value) return
  
  await Promise.all([
    wallet.fetchEarningsSummary(providerId.value),
    wallet.fetchBankAccounts(providerId.value),
    wallet.fetchWithdrawals(providerId.value),
    wallet.fetchWeeklyStats(providerId.value)
  ])
  
  // Set default bank
  if (wallet.defaultBankAccount.value) {
    selectedBankId.value = wallet.defaultBankAccount.value.id
  }
}

// Withdraw
async function handleWithdraw() {
  if (!providerId.value || !canWithdraw.value) return
  
  const amount = parseFloat(withdrawAmount.value)
  const result = await wallet.requestWithdrawal(providerId.value, selectedBankId.value, amount)
  
  if (result.success) {
    showWithdrawModal.value = false
    withdrawAmount.value = ''
  }
}

// Add bank account
async function handleAddBank() {
  if (!providerId.value) return
  
  const result = await wallet.addBankAccount(
    providerId.value,
    newBank.value.bankCode,
    newBank.value.accountNumber,
    newBank.value.accountName,
    newBank.value.isDefault
  )
  
  if (result) {
    showAddBankModal.value = false
    newBank.value = { bankCode: '', accountNumber: '', accountName: '', isDefault: false }
    if (!selectedBankId.value) {
      selectedBankId.value = result.id
    }
  }
}

// Delete bank account
async function handleDeleteBank(accountId: string) {
  if (!confirm('ต้องการลบบัญชีนี้?')) return
  await wallet.deleteBankAccount(accountId)
}

// Set default bank
async function handleSetDefault(accountId: string) {
  if (!providerId.value) return
  await wallet.setDefaultBankAccount(providerId.value, accountId)
}

// Cancel withdrawal
async function handleCancelWithdrawal(withdrawalId: string) {
  if (!providerId.value || !confirm('ต้องการยกเลิกคำขอนี้?')) return
  await wallet.cancelWithdrawal(withdrawalId, providerId.value)
}

// Quick amount buttons
function setQuickAmount(amount: number) {
  withdrawAmount.value = amount.toString()
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(async () => {
  await providerStore.loadProfile()
  await loadData()
})

watch(providerId, (newId) => {
  if (newId) loadData()
})
</script>

<template>
  <div class="wallet-page">
    <!-- Header -->
    <header class="header">
      <h1 class="title">กระเป๋าเงิน</h1>
      <button class="refresh-btn" @click="loadData" :disabled="wallet.loading.value" aria-label="รีเฟรช">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </header>

    <!-- Loading -->
    <div v-if="wallet.loading.value && !wallet.earningsSummary.value" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-header">
          <span class="balance-label">ยอดเงินที่ถอนได้</span>
          <button 
            class="withdraw-btn" 
            @click="showWithdrawModal = true"
            :disabled="!wallet.hasBankAccount.value || wallet.availableBalance.value < 100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ถอนเงิน
          </button>
        </div>
        <div class="balance-amount">
          {{ wallet.formatCurrency(wallet.availableBalance.value) }}
        </div>
        
        <div class="balance-details">
          <div class="detail-item">
            <span class="detail-label">รอดำเนินการ</span>
            <span class="detail-value pending">
              {{ wallet.formatCurrency(wallet.earningsSummary.value?.pending_withdrawals || 0) }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ถอนไปแล้ว</span>
            <span class="detail-value">
              {{ wallet.formatCurrency(wallet.earningsSummary.value?.total_withdrawn || 0) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon today">💰</div>
          <div class="stat-content">
            <span class="stat-label">วันนี้</span>
            <span class="stat-value">{{ wallet.formatCurrency(wallet.earningsSummary.value?.today_earnings || 0) }}</span>
            <span class="stat-sub">{{ wallet.earningsSummary.value?.today_trips || 0 }} เที่ยว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon week">📊</div>
          <div class="stat-content">
            <span class="stat-label">สัปดาห์นี้</span>
            <span class="stat-value">{{ wallet.formatCurrency(wallet.earningsSummary.value?.week_earnings || 0) }}</span>
            <span class="stat-sub">{{ wallet.earningsSummary.value?.week_trips || 0 }} เที่ยว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon month">📈</div>
          <div class="stat-content">
            <span class="stat-label">เดือนนี้</span>
            <span class="stat-value">{{ wallet.formatCurrency(wallet.earningsSummary.value?.month_earnings || 0) }}</span>
            <span class="stat-sub">{{ wallet.earningsSummary.value?.month_trips || 0 }} เที่ยว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon total">🏆</div>
          <div class="stat-content">
            <span class="stat-label">รายได้รวม</span>
            <span class="stat-value">{{ wallet.formatCurrency(wallet.earningsSummary.value?.total_earnings || 0) }}</span>
            <span class="stat-sub">ทั้งหมด</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          ภาพรวม
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          ประวัติถอนเงิน
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'banks' }"
          @click="activeTab = 'banks'"
        >
          บัญชีธนาคาร
        </button>
      </div>

      <!-- Tab Content: Overview -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <!-- Weekly Chart -->
        <section class="section">
          <h3 class="section-title">รายได้ 7 วันล่าสุด</h3>
          <div class="weekly-chart">
            <div 
              v-for="day in wallet.weeklyStats.value" 
              :key="day.stat_date"
              class="chart-bar"
            >
              <div 
                class="bar-fill" 
                :style="{ 
                  height: `${Math.min((day.earnings / (Math.max(...wallet.weeklyStats.value.map(d => d.earnings)) || 1)) * 100, 100)}%` 
                }"
              >
                <span class="bar-value" v-if="day.earnings > 0">
                  {{ Math.round(day.earnings) }}
                </span>
              </div>
              <span class="bar-label">{{ day.day_name }}</span>
            </div>
          </div>
        </section>

        <!-- Recent Withdrawals -->
        <section class="section">
          <div class="section-header">
            <h3 class="section-title">การถอนเงินล่าสุด</h3>
            <button class="see-all-btn" @click="activeTab = 'history'">ดูทั้งหมด</button>
          </div>
          
          <div v-if="wallet.withdrawals.value.length === 0" class="empty-state">
            <p>ยังไม่มีประวัติการถอนเงิน</p>
          </div>
          
          <div v-else class="withdrawal-list">
            <div 
              v-for="w in wallet.withdrawals.value.slice(0, 5)" 
              :key="w.id"
              class="withdrawal-item"
            >
              <div class="withdrawal-icon">🏦</div>
              <div class="withdrawal-content">
                <span class="withdrawal-amount">{{ wallet.formatCurrency(w.amount) }}</span>
                <span class="withdrawal-date">{{ formatDate(w.created_at) }}</span>
              </div>
              <span 
                class="withdrawal-status"
                :style="{ color: wallet.getStatusColor(w.status), background: wallet.getStatusColor(w.status) + '20' }"
              >
                {{ wallet.getStatusLabel(w.status) }}
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- Tab Content: History -->
      <div v-if="activeTab === 'history'" class="tab-content">
        <div v-if="wallet.withdrawals.value.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <p>ยังไม่มีประวัติการถอนเงิน</p>
        </div>
        
        <div v-else class="withdrawal-list full">
          <div 
            v-for="w in wallet.withdrawals.value" 
            :key="w.id"
            class="withdrawal-item detailed"
          >
            <div class="withdrawal-main">
              <div class="withdrawal-icon">🏦</div>
              <div class="withdrawal-content">
                <span class="withdrawal-amount">{{ wallet.formatCurrency(w.amount) }}</span>
                <span class="withdrawal-bank" v-if="w.bank_account">
                  {{ w.bank_account.bank_name }} - {{ w.bank_account.account_number }}
                </span>
                <span class="withdrawal-date">{{ formatDate(w.created_at) }}</span>
              </div>
              <div class="withdrawal-right">
                <span 
                  class="withdrawal-status"
                  :style="{ color: wallet.getStatusColor(w.status), background: wallet.getStatusColor(w.status) + '20' }"
                >
                  {{ wallet.getStatusLabel(w.status) }}
                </span>
                <button 
                  v-if="w.status === 'pending'"
                  class="cancel-btn"
                  @click="handleCancelWithdrawal(w.id)"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
            <div v-if="w.failed_reason" class="withdrawal-reason">
              <span class="reason-label">เหตุผล:</span> {{ w.failed_reason }}
            </div>
            <div v-if="w.transaction_ref && w.status === 'completed'" class="withdrawal-ref">
              <span class="ref-label">อ้างอิง:</span> {{ w.transaction_ref }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Banks -->
      <div v-if="activeTab === 'banks'" class="tab-content">
        <button class="add-bank-btn" @click="showAddBankModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          เพิ่มบัญชีธนาคาร
        </button>

        <div v-if="wallet.bankAccounts.value.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18" />
          </svg>
          <p>ยังไม่มีบัญชีธนาคาร</p>
          <p class="empty-hint">เพิ่มบัญชีเพื่อถอนเงิน</p>
        </div>

        <div v-else class="bank-list">
          <div 
            v-for="bank in wallet.bankAccounts.value" 
            :key="bank.id"
            class="bank-item"
            :style="{ borderLeftColor: wallet.getBankColor(bank.bank_code) }"
          >
            <div class="bank-main">
              <div class="bank-icon" :style="{ background: wallet.getBankColor(bank.bank_code) }">
                🏦
              </div>
              <div class="bank-content">
                <span class="bank-name">{{ bank.bank_name }}</span>
                <span class="bank-account">{{ bank.account_number }}</span>
                <span class="bank-holder">{{ bank.account_name }}</span>
              </div>
              <div class="bank-actions">
                <span v-if="bank.is_default" class="default-badge">หลัก</span>
                <button 
                  v-else 
                  class="set-default-btn"
                  @click="handleSetDefault(bank.id)"
                >
                  ตั้งเป็นหลัก
                </button>
                <button 
                  class="delete-btn"
                  @click="handleDeleteBank(bank.id)"
                  aria-label="ลบบัญชี"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal" role="dialog" aria-labelledby="withdraw-title">
        <div class="modal-header">
          <h2 id="withdraw-title">ถอนเงิน</h2>
          <button class="close-btn" @click="showWithdrawModal = false" aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="available-balance">
            <span class="label">ยอดที่ถอนได้</span>
            <span class="value">{{ wallet.formatCurrency(wallet.availableBalance.value) }}</span>
          </div>

          <div class="form-group">
            <label for="withdraw-amount">จำนวนเงิน (บาท)</label>
            <input 
              id="withdraw-amount"
              v-model="withdrawAmount"
              type="number"
              min="100"
              :max="wallet.availableBalance.value"
              placeholder="ขั้นต่ำ 100 บาท"
              class="form-input"
            />
            <div class="quick-amounts">
              <button 
                v-for="amt in [100, 500, 1000, 2000]" 
                :key="amt"
                class="quick-btn"
                :disabled="amt > wallet.availableBalance.value"
                @click="setQuickAmount(amt)"
              >
                {{ amt }}
              </button>
              <button 
                class="quick-btn all"
                @click="setQuickAmount(wallet.availableBalance.value)"
              >
                ทั้งหมด
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="bank-select">บัญชีปลายทาง</label>
            <select id="bank-select" v-model="selectedBankId" class="form-select">
              <option value="" disabled>เลือกบัญชี</option>
              <option 
                v-for="bank in wallet.bankAccounts.value" 
                :key="bank.id" 
                :value="bank.id"
              >
                {{ bank.bank_name }} - {{ bank.account_number }}
              </option>
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showWithdrawModal = false">ยกเลิก</button>
            <button 
              class="btn-primary" 
              :disabled="!canWithdraw || wallet.loading.value"
              @click="handleWithdraw"
            >
              {{ wallet.loading.value ? 'กำลังดำเนินการ...' : 'ยืนยันถอนเงิน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Bank Modal -->
    <div v-if="showAddBankModal" class="modal-overlay" @click.self="showAddBankModal = false">
      <div class="modal" role="dialog" aria-labelledby="add-bank-title">
        <div class="modal-header">
          <h2 id="add-bank-title">เพิ่มบัญชีธนาคาร</h2>
          <button class="close-btn" @click="showAddBankModal = false" aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="bank-code">ธนาคาร</label>
            <select id="bank-code" v-model="newBank.bankCode" class="form-select">
              <option value="" disabled>เลือกธนาคาร</option>
              <option 
                v-for="bank in wallet.THAI_BANKS" 
                :key="bank.code" 
                :value="bank.code"
              >
                {{ bank.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="account-number">เลขบัญชี</label>
            <input 
              id="account-number"
              v-model="newBank.accountNumber"
              type="text"
              maxlength="20"
              placeholder="เลขบัญชี 10-12 หลัก"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="account-name">ชื่อบัญชี</label>
            <input 
              id="account-name"
              v-model="newBank.accountName"
              type="text"
              maxlength="200"
              placeholder="ชื่อ-นามสกุล ตามบัญชี"
              class="form-input"
            />
          </div>

          <div class="form-group checkbox">
            <input 
              id="is-default"
              v-model="newBank.isDefault"
              type="checkbox"
            />
            <label for="is-default">ตั้งเป็นบัญชีหลัก</label>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showAddBankModal = false">ยกเลิก</button>
            <button 
              class="btn-primary" 
              :disabled="!newBank.bankCode || !newBank.accountNumber || !newBank.accountName || wallet.loading.value"
              @click="handleAddBank"
            >
              {{ wallet.loading.value ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 100px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border: none;
  border-radius: 10px;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover { background: #E5E7EB; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 12px;
  color: #6B7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Content */
.content { padding: 16px; }

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 24px;
  color: #FFFFFF;
  margin-bottom: 20px;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
}

.withdraw-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.withdraw-btn:hover { background: rgba(255, 255, 255, 0.3); }
.withdraw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 20px;
}

.balance-details {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  opacity: 0.8;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
}

.detail-value.pending { color: #FEF3C7; }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 20px;
}

.stat-icon.today { background: #ECFDF5; }
.stat-icon.week { background: #EEF2FF; }
.stat-icon.month { background: #FEF3C7; }
.stat-icon.total { background: #FCE7F3; }

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.stat-sub {
  font-size: 11px;
  color: #9CA3AF;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-btn {
  flex-shrink: 0;
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.tab-content {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section */
.section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
  color: #111827;
  margin: 0 0 16px 0;
}

.section-header .section-title { margin: 0; }

.see-all-btn {
  padding: 6px 12px;
  background: none;
  border: none;
  font-size: 13px;
  color: #00A86B;
  cursor: pointer;
}

/* Weekly Chart */
.weekly-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  gap: 8px;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-fill {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #00A86B 0%, #00C77B 100%);
  border-radius: 6px 6px 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.3s;
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #00A86B;
  white-space: nowrap;
}

.bar-label {
  margin-top: 8px;
  font-size: 12px;
  color: #6B7280;
}

/* Withdrawal List */
.withdrawal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.withdrawal-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 12px;
}

.withdrawal-item.detailed {
  flex-direction: column;
  align-items: stretch;
}

.withdrawal-main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.withdrawal-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 10px;
  font-size: 18px;
}

.withdrawal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.withdrawal-amount {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.withdrawal-bank {
  font-size: 12px;
  color: #6B7280;
}

.withdrawal-date {
  font-size: 12px;
  color: #9CA3AF;
}

.withdrawal-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.withdrawal-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.cancel-btn {
  padding: 4px 10px;
  background: #FEE2E2;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: #DC2626;
  cursor: pointer;
}

.withdrawal-reason,
.withdrawal-ref {
  padding: 8px 12px;
  background: #FEF3C7;
  border-radius: 8px;
  font-size: 12px;
  color: #92400E;
  margin-top: 8px;
}

.withdrawal-ref {
  background: #ECFDF5;
  color: #065F46;
}

.reason-label,
.ref-label {
  font-weight: 600;
}

/* Bank List */
.add-bank-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #FFFFFF;
  border: 2px dashed #D1D5DB;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.add-bank-btn:hover {
  border-color: #00A86B;
  color: #00A86B;
}

.bank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bank-item {
  background: #FFFFFF;
  border-radius: 12px;
  border-left: 4px solid #00A86B;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.bank-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.bank-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 20px;
  color: #FFFFFF;
}

.bank-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.bank-account {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  font-family: monospace;
}

.bank-holder {
  font-size: 12px;
  color: #6B7280;
}

.bank-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-badge {
  padding: 4px 10px;
  background: #ECFDF5;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #059669;
}

.set-default-btn {
  padding: 6px 12px;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
}

.delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FEE2E2;
  border: none;
  border-radius: 8px;
  color: #DC2626;
  cursor: pointer;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #E5E7EB;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border: none;
  border-radius: 50%;
  color: #6B7280;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(90vh - 140px);
}

.available-balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ECFDF5;
  border-radius: 12px;
  margin-bottom: 20px;
}

.available-balance .label {
  font-size: 14px;
  color: #065F46;
}

.available-balance .value {
  font-size: 20px;
  font-weight: 700;
  color: #059669;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 14px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 16px;
  color: #111827;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #00A86B;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.form-input::placeholder {
  color: #9CA3AF;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  padding-right: 44px;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group.checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #00A86B;
  cursor: pointer;
}

.form-group.checkbox label {
  margin: 0;
  cursor: pointer;
}

/* Quick Amounts */
.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.quick-btn {
  flex: 1;
  min-width: 60px;
  padding: 10px 12px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover:not(:disabled) {
  background: #E5E7EB;
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-btn.all {
  background: #ECFDF5;
  border-color: #00A86B;
  color: #059669;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #F3F4F6;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #E5E7EB;
}

.btn-primary {
  flex: 2;
  padding: 14px;
  background: #00A86B;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #6B7280;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.empty-hint {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #9CA3AF !important;
}

/* Responsive */
@media (min-width: 640px) {
  .modal {
    border-radius: 24px;
    margin: auto;
  }
  
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>