<script setup lang="ts">
/**
 * ProviderWalletNew - หน้า Wallet ใหม่
 * Design: Green theme
 * 
 * Features:
 * - Balance display
 * - Withdraw button
 * - Transaction history
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

// State
const loading = ref(true)
const balance = ref(0)
const pendingWithdrawals = ref(0)
const totalWithdrawn = ref(0)

const transactions = ref<Array<{
  id: string
  type: 'earning' | 'withdrawal' | 'tip'
  amount: number
  description: string
  date: string
  status: 'completed' | 'pending'
}>>([])

// Methods
async function loadWalletData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id, total_earnings')
      .eq('user_id', user.id)
      .single()

    if (!provider) return

    // Get wallet balance
    const { data: wallet } = await (supabase
      .from('wallets' as any)
      .select('balance, pending_amount')
      .eq('user_id', user.id)
      .single() as any)

    if (wallet) {
      balance.value = wallet.balance || 0
      pendingWithdrawals.value = wallet.pending_amount || 0
    }

    // Get recent transactions
    const { data: txData } = await (supabase
      .from('wallet_transactions' as any)
      .select('id, type, amount, description, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20) as any)

    if (txData) {
      transactions.value = txData.map((tx: any) => ({
        id: tx.id,
        type: tx.type as 'earning' | 'withdrawal' | 'tip',
        amount: tx.amount,
        description: tx.description || getDefaultDescription(tx.type),
        date: tx.created_at,
        status: tx.status as 'completed' | 'pending'
      }))
    }

    // Calculate total withdrawn
    const { data: withdrawals } = await (supabase
      .from('wallet_transactions' as any)
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .eq('status', 'completed') as any)

    if (withdrawals) {
      totalWithdrawn.value = withdrawals.reduce((sum: number, w: any) => sum + Math.abs(w.amount), 0)
    }
  } catch (err) {
    console.error('[Wallet] Error:', err)
  } finally {
    loading.value = false
  }
}

function getDefaultDescription(type: string): string {
  const descriptions: Record<string, string> = {
    earning: 'รายได้จากการส่ง',
    withdrawal: 'ถอนเงิน',
    tip: 'ทิปจากลูกค้า',
    topup: 'เติมเงิน',
    refund: 'คืนเงิน'
  }
  return descriptions[type] || type
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTransactionIcon(type: string): string {
  const icons: Record<string, string> = {
    earning: '💰',
    withdrawal: '🏦',
    tip: '💵',
    topup: '➕',
    refund: '↩️'
  }
  return icons[type] || '💳'
}

function requestWithdrawal() {
  // TODO: Implement withdrawal modal
  alert('ฟีเจอร์ถอนเงินกำลังมาเร็วๆ นี้!')
}

// Lifecycle
onMounted(loadWalletData)
</script>

<template>
  <div class="wallet-page">
    <!-- Header -->
    <header class="header">
      <h1 class="title">กระเป๋าเงิน</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-header">
          <span class="balance-label">ยอดเงินคงเหลือ</span>
          <button class="withdraw-btn" @click="requestWithdrawal">
            ถอนเงิน
          </button>
        </div>
        <div class="balance-amount">
          ฿{{ balance.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}
        </div>
        
        <div class="balance-details">
          <div class="detail-item">
            <span class="detail-label">รอดำเนินการ</span>
            <span class="detail-value">฿{{ pendingWithdrawals.toFixed(2) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ถอนไปแล้ว</span>
            <span class="detail-value">฿{{ totalWithdrawn.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="action-btn">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <span>เพิ่มบัญชี</span>
        </button>
        <button class="action-btn">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <span>ประวัติ</span>
        </button>
        <button class="action-btn">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <span>ช่วยเหลือ</span>
        </button>
      </div>

      <!-- Transactions -->
      <section class="transactions-section">
        <h2 class="section-title">รายการล่าสุด</h2>
        
        <div v-if="transactions.length === 0" class="empty-state">
          <p>ยังไม่มีรายการ</p>
        </div>

        <div v-else class="transactions-list">
          <div 
            v-for="tx in transactions" 
            :key="tx.id"
            class="transaction-item"
          >
            <div class="tx-icon">
              {{ getTransactionIcon(tx.type) }}
            </div>
            <div class="tx-content">
              <h4>{{ tx.description }}</h4>
              <span class="tx-date">{{ formatDate(tx.date) }}</span>
            </div>
            <div class="tx-amount" :class="tx.type">
              {{ tx.type === 'withdrawal' ? '-' : '+' }}฿{{ Math.abs(tx.amount).toFixed(2) }}
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.header {
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

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.content {
  padding: 16px;
}

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
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.withdraw-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

.balance-amount {
  font-size: 40px;
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

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #FFFFFF;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  width: 44px;
  height: 44px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.action-icon svg {
  width: 22px;
  height: 22px;
}

.action-btn span {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

/* Transactions Section */
.transactions-section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B7280;
}

.transactions-list {
  display: flex;
  flex-direction: column;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #F3F4F6;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  width: 44px;
  height: 44px;
  background: #F3F4F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.tx-content {
  flex: 1;
}

.tx-content h4 {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  margin: 0 0 2px 0;
}

.tx-date {
  font-size: 13px;
  color: #6B7280;
}

.tx-amount {
  font-size: 16px;
  font-weight: 600;
}

.tx-amount.earning,
.tx-amount.tip {
  color: #00A86B;
}

.tx-amount.withdrawal {
  color: #EF4444;
}
</style>
