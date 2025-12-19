<script setup lang="ts">
/**
 * WalletViewV2 - Complete Wallet with Top-up Approval System
 * Feature: F05 - Wallet/Balance (Enhanced)
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletV2 } from '../composables/useWalletV2'
import PullToRefresh from '../components/PullToRefresh.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const {
  balance, transactions, topupRequests, loading, hasPendingTopup, pendingTopupAmount,
  fetchBalance, fetchTransactions, fetchTopupRequests, createTopupRequest, cancelTopupRequest,
  subscribeToWallet, getTransactionIcon, formatTopupStatus, formatPaymentMethod, isPositiveTransaction
} = useWalletV2()

const activeTab = ref<'balance' | 'history' | 'topups'>('balance')
const showTopUpModal = ref(false)
const selectedAmount = ref(100)
const customAmount = ref('')
const selectedMethod = ref<'promptpay' | 'bank_transfer'>('promptpay')
const paymentReference = ref('')
const topUpLoading = ref(false)
const isRefreshing = ref(false)
const showCancelConfirm = ref(false)
const cancelRequestId = ref('')
const resultMessage = ref({ show: false, success: false, text: '' })

const topUpAmounts = [100, 200, 500, 1000, 2000, 5000]
let subscription: { unsubscribe: () => void } | null = null

onMounted(async () => {
  await Promise.all([fetchBalance(), fetchTransactions(), fetchTopupRequests()])
  subscription = subscribeToWallet()
})
onUnmounted(() => subscription?.unsubscribe())

const handleRefresh = async () => {
  isRefreshing.value = true
  await Promise.all([fetchBalance(), fetchTransactions(), fetchTopupRequests()])
  isRefreshing.value = false
}

const finalAmount = () => customAmount.value ? Number(customAmount.value) : selectedAmount.value

const handleTopUp = async () => {
  const amount = finalAmount()
  if (amount < 20 || amount > 50000) {
    showResult(false, 'จำนวนเงินต้องอยู่ระหว่าง 20 - 50,000 บาท')
    return
  }
  topUpLoading.value = true
  const result = await createTopupRequest(amount, selectedMethod.value, paymentReference.value || undefined)
  topUpLoading.value = false
  if (result.success) {
    showTopUpModal.value = false
    resetForm()
    showResult(true, `สร้างคำขอเติมเงินสำเร็จ รหัส: ${result.trackingId}`)
  } else {
    showResult(false, result.message)
  }
}

const handleCancelRequest = async () => {
  const result = await cancelTopupRequest(cancelRequestId.value)
  showCancelConfirm.value = false
  showResult(result.success, result.message)
}

const openCancelConfirm = (id: string) => {
  cancelRequestId.value = id
  showCancelConfirm.value = true
}

const resetForm = () => {
  selectedAmount.value = 100
  customAmount.value = ''
  selectedMethod.value = 'promptpay'
  paymentReference.value = ''
}

const showResult = (success: boolean, text: string) => {
  resultMessage.value = { show: true, success, text }
  setTimeout(() => { resultMessage.value.show = false }, 4000)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${formatDate(dateStr)} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
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
          <h1>กระเป๋าเงิน</h1>
        </div>

        <!-- Result Message -->
        <div v-if="resultMessage.show" :class="['result-toast', resultMessage.success ? 'success' : 'error']">
          {{ resultMessage.text }}
        </div>

        <!-- Balance Card -->
        <SkeletonLoader v-if="loading && !isRefreshing" type="balance" />
        <div v-else class="balance-card">
          <span class="balance-label">ยอดเงินคงเหลือ</span>
          <div class="balance-amount">
            <span class="currency">฿</span>
            <span class="amount">{{ balance.balance.toLocaleString() }}</span>
          </div>
          
          <!-- Pending Alert -->
          <div v-if="hasPendingTopup" class="pending-alert">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>รอดำเนินการ ฿{{ pendingTopupAmount.toLocaleString() }}</span>
          </div>
          
          <button @click="showTopUpModal = true" class="topup-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            เติมเงิน
          </button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'balance' }]" @click="activeTab = 'balance'">ภาพรวม</button>
          <button :class="['tab', { active: activeTab === 'history' }]" @click="activeTab = 'history'">ประวัติ</button>
          <button :class="['tab', { active: activeTab === 'topups' }]" @click="activeTab = 'topups'">
            คำขอเติมเงิน
            <span v-if="topupRequests.filter(r => r.status === 'pending').length" class="badge">
              {{ topupRequests.filter(r => r.status === 'pending').length }}
            </span>
          </button>
        </div>

        <!-- Balance Tab -->
        <div v-if="activeTab === 'balance'" class="tab-content">
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">รับเข้าทั้งหมด</span>
              <span class="stat-value positive">฿{{ balance.total_earned.toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">ใช้ไปทั้งหมด</span>
              <span class="stat-value negative">฿{{ balance.total_spent.toLocaleString() }}</span>
            </div>
          </div>

          <h3 class="section-title">รายการล่าสุด</h3>
          <div v-if="transactions.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p>ยังไม่มีรายการ</p>
          </div>
          <div v-else class="transactions-list">
            <div v-for="tx in transactions.slice(0, 5)" :key="tx.id" class="transaction-item">
              <div class="tx-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTransactionIcon(tx.type)"/>
                </svg>
              </div>
              <div class="tx-info">
                <span class="tx-desc">{{ tx.description || tx.type }}</span>
                <span class="tx-date">{{ formatDate(tx.created_at) }}</span>
              </div>
              <span :class="['tx-amount', { positive: isPositiveTransaction(tx.type) }]">
                {{ isPositiveTransaction(tx.type) ? '+' : '-' }}฿{{ Math.abs(tx.amount).toLocaleString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="tab-content">
          <SkeletonLoader v-if="loading" type="transaction" :count="5" />
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
                <span class="tx-date">{{ formatDateTime(tx.created_at) }}</span>
              </div>
              <span :class="['tx-amount', { positive: isPositiveTransaction(tx.type) }]">
                {{ isPositiveTransaction(tx.type) ? '+' : '-' }}฿{{ Math.abs(tx.amount).toLocaleString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Topups Tab -->
        <div v-if="activeTab === 'topups'" class="tab-content">
          <div v-if="topupRequests.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <p>ยังไม่มีคำขอเติมเงิน</p>
            <button @click="showTopUpModal = true" class="btn-outline">เติมเงินเลย</button>
          </div>
          <div v-else class="topup-list">
            <div v-for="req in topupRequests" :key="req.id" class="topup-item">
              <div class="topup-header">
                <span class="topup-tracking">{{ req.tracking_id }}</span>
                <span :class="['topup-status', formatTopupStatus(req.status).color]">
                  {{ formatTopupStatus(req.status).label }}
                </span>
              </div>
              <div class="topup-body">
                <div class="topup-amount">฿{{ req.amount.toLocaleString() }}</div>
                <div class="topup-method">{{ formatPaymentMethod(req.payment_method) }}</div>
                <div class="topup-date">{{ formatDateTime(req.created_at) }}</div>
              </div>
              <div v-if="req.admin_note" class="topup-note">
                <strong>หมายเหตุ:</strong> {{ req.admin_note }}
              </div>
              <button v-if="req.status === 'pending'" @click="openCancelConfirm(req.id)" class="btn-cancel">
                ยกเลิกคำขอ
              </button>
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

        <div class="modal-body">
          <!-- Amount Selection -->
          <div class="form-section">
            <label>เลือกจำนวนเงิน</label>
            <div class="amount-grid">
              <button v-for="amt in topUpAmounts" :key="amt" @click="selectedAmount = amt; customAmount = ''"
                :class="['amount-btn', { active: selectedAmount === amt && !customAmount }]">
                ฿{{ amt.toLocaleString() }}
              </button>
            </div>
            <div class="custom-input">
              <label>หรือใส่จำนวนเอง</label>
              <input v-model="customAmount" type="number" min="20" max="50000" placeholder="20 - 50,000 บาท" />
            </div>
          </div>

          <!-- Payment Method -->
          <div class="form-section">
            <label>ช่องทางชำระเงิน</label>
            <div class="method-grid">
              <label :class="['method-option', { active: selectedMethod === 'promptpay' }]">
                <input type="radio" v-model="selectedMethod" value="promptpay" />
                <div class="method-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                  </svg>
                </div>
                <span>พร้อมเพย์</span>
              </label>
              <label :class="['method-option', { active: selectedMethod === 'bank_transfer' }]">
                <input type="radio" v-model="selectedMethod" value="bank_transfer" />
                <div class="method-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
                  </svg>
                </div>
                <span>โอนเงิน</span>
              </label>
            </div>
          </div>

          <!-- Payment Reference -->
          <div class="form-section">
            <label>เลขอ้างอิง/หมายเหตุ (ถ้ามี)</label>
            <input v-model="paymentReference" type="text" placeholder="เช่น เลขอ้างอิงการโอน" />
          </div>

          <!-- Info Box -->
          <div class="info-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p>หลังจากสร้างคำขอ กรุณาโอนเงินและรอการอนุมัติจากทีมงาน (ปกติไม่เกิน 30 นาที)</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="handleTopUp" :disabled="topUpLoading || finalAmount() < 20" class="btn-primary">
            {{ topUpLoading ? 'กำลังดำเนินการ...' : `สร้างคำขอเติมเงิน ฿${finalAmount().toLocaleString()}` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Confirm Modal -->
    <div v-if="showCancelConfirm" class="modal-overlay" @click.self="showCancelConfirm = false">
      <div class="modal-content small">
        <h3>ยืนยันยกเลิก?</h3>
        <p>คุณต้องการยกเลิกคำขอเติมเงินนี้หรือไม่?</p>
        <div class="modal-actions">
          <button @click="showCancelConfirm = false" class="btn-secondary">ไม่ใช่</button>
          <button @click="handleCancelRequest" class="btn-danger">ยกเลิก</button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
.back-btn { width: 40px; height: 40px; background: none; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.back-btn svg { width: 24px; height: 24px; }
.page-header h1 { font-size: 20px; font-weight: 600; }

.result-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 1001; animation: slideDown 0.3s ease; }
.result-toast.success { background: #dcfce7; color: #166534; }
.result-toast.error { background: #fee2e2; color: #991b1b; }
@keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

.balance-card { background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); color: #fff; border-radius: 20px; padding: 28px 24px; margin-bottom: 20px; text-align: center; box-shadow: 0 8px 24px rgba(0, 168, 107, 0.3); }
.balance-label { font-size: 14px; opacity: 0.8; }
.balance-amount { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin: 8px 0 16px; }
.currency { font-size: 24px; font-weight: 500; }
.amount { font-size: 48px; font-weight: 700; }

.pending-alert { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
.pending-alert svg { width: 16px; height: 16px; }

.topup-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: #fff; color: #00A86B; border: none; border-radius: 24px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 48px; }
.topup-btn svg { width: 20px; height: 20px; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; background: #f5f5f5; padding: 4px; border-radius: 12px; }
.tab { flex: 1; padding: 10px 16px; border: none; background: transparent; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.tab.active { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.badge { background: #ef4444; color: #fff; font-size: 11px; padding: 2px 6px; border-radius: 10px; }

.tab-content { min-height: 200px; }

.stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
.stat-item { flex: 1; background: #fff; border-radius: 12px; padding: 16px; }
.stat-label { display: block; font-size: 12px; color: #6B6B6B; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 600; }
.stat-value.positive { color: #00A86B; }
.stat-value.negative { color: #ef4444; }

.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }

.empty-state { text-align: center; padding: 40px 20px; color: #6B6B6B; }
.empty-state svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5; }
.empty-state p { margin-bottom: 16px; }

.transactions-list { display: flex; flex-direction: column; gap: 8px; }
.transaction-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: #fff; border-radius: 12px; }
.tx-icon { width: 40px; height: 40px; background: #F6F6F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.tx-icon svg { width: 20px; height: 20px; }
.tx-info { flex: 1; display: flex; flex-direction: column; }
.tx-desc { font-size: 14px; font-weight: 500; }
.tx-date { font-size: 12px; color: #6B6B6B; }
.tx-amount { font-size: 15px; font-weight: 600; color: #6B6B6B; }
.tx-amount.positive { color: #00A86B; }

.topup-list { display: flex; flex-direction: column; gap: 12px; }
.topup-item { background: #fff; border-radius: 12px; padding: 16px; }
.topup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.topup-tracking { font-family: monospace; font-size: 13px; color: #6B6B6B; }
.topup-status { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; }
.topup-status.warning { background: #fef3c7; color: #92400e; }
.topup-status.success { background: #dcfce7; color: #166534; }
.topup-status.error { background: #fee2e2; color: #991b1b; }
.topup-status.gray { background: #f3f4f6; color: #6b7280; }
.topup-body { display: flex; flex-direction: column; gap: 4px; }
.topup-amount { font-size: 24px; font-weight: 700; }
.topup-method { font-size: 13px; color: #6B6B6B; }
.topup-date { font-size: 12px; color: #999; }
.topup-note { margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 8px; font-size: 13px; }
.btn-cancel { margin-top: 12px; width: 100%; padding: 10px; background: #fee2e2; color: #991b1b; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 1000; }
.modal-content { width: 100%; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto; }
.modal-content.small { border-radius: 16px; margin: auto; padding: 24px; text-align: center; }
.modal-content.small h3 { margin-bottom: 8px; }
.modal-content.small p { color: #6B6B6B; margin-bottom: 20px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #f0f0f0; }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { width: 36px; height: 36px; background: #F6F6F6; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.close-btn svg { width: 20px; height: 20px; }
.modal-body { padding: 20px; }
.modal-footer { padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); border-top: 1px solid #f0f0f0; }
.modal-actions { display: flex; gap: 12px; }

.form-section { margin-bottom: 20px; }
.form-section > label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 10px; }
.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.amount-btn { padding: 14px; background: #F6F6F6; border: 2px solid transparent; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; }
.amount-btn.active { border-color: #00A86B; background: #E8F5EF; color: #00A86B; }
.custom-input label { display: block; font-size: 13px; color: #6B6B6B; margin-bottom: 6px; }
.custom-input input, .form-section > input { width: 100%; padding: 14px 16px; border: 1px solid #E5E5E5; border-radius: 10px; font-size: 16px; outline: none; }
.custom-input input:focus, .form-section > input:focus { border-color: #00A86B; }

.method-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.method-option { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; background: #F6F6F6; border: 2px solid transparent; border-radius: 12px; cursor: pointer; }
.method-option input { display: none; }
.method-option.active { border-color: #00A86B; background: #E8F5EF; }
.method-icon { width: 40px; height: 40px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.method-option.active .method-icon { background: #F6F6F6; }
.method-icon svg { width: 20px; height: 20px; }
.method-option span { font-size: 13px; font-weight: 500; }

.info-box { display: flex; gap: 12px; padding: 14px; background: #E8F5EF; border-radius: 10px; }
.info-box svg { width: 20px; height: 20px; flex-shrink: 0; color: #00A86B; }
.info-box p { font-size: 13px; color: #166534; margin: 0; }

.btn-primary { width: 100%; padding: 16px; background: #00A86B; color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { background: #CCC; }
.btn-secondary { flex: 1; padding: 12px; border: 1px solid #E5E5E5; border-radius: 10px; background: #fff; font-size: 14px; cursor: pointer; }
.btn-danger { flex: 1; padding: 12px; border: none; border-radius: 10px; background: #ef4444; color: #fff; font-size: 14px; cursor: pointer; }
.btn-outline { padding: 12px 24px; background: transparent; border: 2px solid #00A86B; color: #00A86B; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
</style>
