<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWallet } from '../composables/useWallet'
import PullToRefresh from '../components/PullToRefresh.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const { 
  balance, 
  transactions, 
  loading, 
  fetchBalance, 
  fetchTransactions, 
  topUp,
  subscribeToWallet,
  getTransactionIcon 
} = useWallet()

const showTopUpModal = ref(false)
const selectedAmount = ref(100)
const topUpLoading = ref(false)
const isRefreshing = ref(false)

const topUpAmounts = [100, 200, 500, 1000, 2000]

let subscription: { unsubscribe: () => void } | null = null

onMounted(async () => {
  await Promise.all([fetchBalance(), fetchTransactions()])
  subscription = subscribeToWallet()
})

onUnmounted(() => {
  subscription?.unsubscribe()
})

const handleRefresh = async () => {
  isRefreshing.value = true
  await Promise.all([fetchBalance(), fetchTransactions()])
  isRefreshing.value = false
}

const handleTopUp = async () => {
  topUpLoading.value = true
  const result = await topUp(selectedAmount.value, 'promptpay')
  topUpLoading.value = false
  if (result) {
    showTopUpModal.value = false
  }
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <PullToRefresh :loading="isRefreshing || loading" @refresh="handleRefresh">
      <div class="content-container">
        <!-- Header -->
        <div class="page-header">
          <button @click="goBack" class="back-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>กระเป๋าเงิน GOBEAR</h1>
        </div>

        <!-- Balance Card Skeleton -->
        <SkeletonLoader v-if="loading && !isRefreshing" type="balance" />

        <!-- Balance Card -->
        <div v-else class="balance-card">
          <span class="balance-label">ยอดเงินคงเหลือ</span>
        <div class="balance-amount">
          <span class="currency">฿</span>
          <span class="amount">{{ balance.balance.toLocaleString() }}</span>
        </div>
        <button @click="showTopUpModal = true" class="topup-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          เติมเงิน
        </button>
      </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
        <button class="action-card">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </div>
          <span>โอนเงิน</span>
        </button>
        <button class="action-card">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
            </svg>
          </div>
          <span>สแกนจ่าย</span>
        </button>
        <button class="action-card" @click="router.push('/customer/history')">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <span>ประวัติ</span>
        </button>
      </div>

        <!-- Stats -->
        <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">รับเข้าทั้งหมด</span>
          <span class="stat-value">฿{{ balance.total_earned.toLocaleString() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">ใช้ไปทั้งหมด</span>
          <span class="stat-value">฿{{ balance.total_spent.toLocaleString() }}</span>
        </div>
      </div>

        <!-- Transactions -->
        <div class="transactions-section">
          <h2 class="section-title">รายการล่าสุด</h2>
          
          <!-- Skeleton Loading -->
          <SkeletonLoader v-if="loading && !isRefreshing" type="transaction" :count="4" />
          
          <div v-else-if="transactions.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>ยังไม่มีรายการ</p>
        </div>
        
        <div v-else class="transactions-list">
          <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
            <div class="tx-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTransactionIcon(tx.type)"/>
              </svg>
            </div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.description || tx.type }}</span>
              <span class="tx-date">{{ formatDate(tx.created_at) }}</span>
            </div>
            <span :class="['tx-amount', { positive: ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(tx.type) }]">
              {{ ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(tx.type) ? '+' : '-' }}฿{{ Math.abs(tx.amount).toLocaleString() }}
            </span>
          </div>
          </div>
        </div>
      </div>
    </PullToRefresh>

    <!-- Top Up Modal -->
    <div v-if="showTopUpModal" class="modal-overlay" @click.self="showTopUpModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>เติมเงิน</h3>
          <button @click="showTopUpModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="amount-options">
          <button 
            v-for="amt in topUpAmounts" 
            :key="amt"
            @click="selectedAmount = amt"
            :class="['amount-btn', { active: selectedAmount === amt }]"
          >
            ฿{{ amt }}
          </button>
        </div>

        <div class="custom-amount">
          <label>หรือใส่จำนวนเอง</label>
          <input v-model.number="selectedAmount" type="number" min="20" placeholder="฿" />
        </div>

        <div class="payment-methods">
          <h4>ชำระผ่าน</h4>
          <div class="method-options">
            <label class="method-option active">
              <input type="radio" name="method" checked />
              <div class="method-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                </svg>
              </div>
              <span>พร้อมเพย์</span>
            </label>
            <label class="method-option">
              <input type="radio" name="method" />
              <div class="method-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <span>บัตรเครดิต</span>
            </label>
          </div>
        </div>

        <button @click="handleTopUp" :disabled="topUpLoading || selectedAmount < 20" class="btn-primary">
          {{ topUpLoading ? 'กำลังดำเนินการ...' : `เติมเงิน ฿${selectedAmount}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border-radius: 20px;
  padding: 28px 24px;
  margin-bottom: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.3);
}

.balance-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  pointer-events: none;
}

.balance-label {
  font-size: 14px;
  opacity: 0.8;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin: 8px 0 20px;
}

.currency {
  font-size: 24px;
  font-weight: 500;
}

.amount {
  font-size: 48px;
  font-weight: 700;
}

.topup-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: #fff;
  color: #00A86B;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 48px;
}

.topup-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.topup-btn:active {
  transform: scale(0.95);
}

.topup-btn svg {
  width: 20px;
  height: 20px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 88px;
}

.action-card:hover {
  background: #F6F6F6;
}

.action-card:active {
  transform: scale(0.94);
  background: #EBEBEB;
}

.action-icon {
  width: 44px;
  height: 44px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon svg {
  width: 22px;
  height: 22px;
}

.action-card span {
  font-size: 13px;
  font-weight: 500;
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-item {
  flex: 1;
  background: #F6F6F6;
  border-radius: 12px;
  padding: 14px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

/* Transactions */
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B6B6B;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.transaction-item:hover {
  background: #FAFAFA;
}

.tx-icon {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-icon svg {
  width: 20px;
  height: 20px;
}

.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tx-desc {
  font-size: 14px;
  font-weight: 500;
}

.tx-date {
  font-size: 12px;
  color: #6B6B6B;
}

.tx-amount {
  font-size: 15px;
  font-weight: 600;
  color: #6B6B6B;
}

.tx-amount.positive {
  color: #00A86B;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.amount-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.amount-btn {
  padding: 14px 20px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 48px;
  transition: all 0.2s ease;
}

.amount-btn:active {
  transform: scale(0.95);
}

.amount-btn.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.custom-amount {
  margin-bottom: 20px;
}

.custom-amount label {
  display: block;
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 8px;
}

.custom-amount input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
}

.custom-amount input:focus {
  border-color: #00A86B;
}

.payment-methods h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.method-options {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.method-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
}

.method-option input {
  display: none;
}

.method-option.active,
.method-option:has(input:checked) {
  border-color: #00A86B;
  background: #E8F5EF;
}

.method-icon {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.method-option.active .method-icon,
.method-option:has(input:checked) .method-icon {
  background: #F6F6F6;
}

.method-icon svg {
  width: 20px;
  height: 20px;
}

.method-option span {
  font-size: 13px;
  font-weight: 500;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #008F5B;
}

.btn-primary:disabled {
  background: #CCC;
  box-shadow: none;
}
</style>
