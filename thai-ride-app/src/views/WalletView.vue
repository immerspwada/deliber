<template>
  <div class="wallet-page">
    <header class="wallet-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <h1>กระเป๋าเงิน</h1>
      <div class="header-spacer"></div>
    </header>

    <section class="balance-section">
      <div class="balance-card">
        <div class="balance-label">ยอดเงินคงเหลือ</div>
        <div class="balance-amount">
          <span v-if="!loading">฿{{ formatNumber(currentBalance) }}</span>
          <span v-else class="loading-text">กำลังโหลด...</span>
        </div>
        <div class="balance-actions">
          <button class="action-btn topup-btn" @click="showTopupModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6v12M6 12h12"/></svg>
            <span>เติมเงิน</span>
          </button>
          <button class="action-btn withdraw-btn" @click="showWithdrawModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span>ถอนเงิน</span>
          </button>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <div class="stat-card">
        <div class="stat-icon earned">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-label">รายรับทั้งหมด</span>
          <span class="stat-value">฿{{ formatNumber(totalEarned) }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon spent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-label">รายจ่ายทั้งหมด</span>
          <span class="stat-value">฿{{ formatNumber(totalSpent) }}</span>
        </div>
      </div>
    </section>

    <section class="tabs-section">
      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'transactions' }]" @click="activeTab = 'transactions'">ประวัติ</button>
        <button :class="['tab', { active: activeTab === 'topup' }]" @click="activeTab = 'topup'">เติมเงิน</button>
        <button :class="['tab', { active: activeTab === 'withdraw' }]" @click="activeTab = 'withdraw'">ถอนเงิน</button>
      </div>
    </section>

    <section class="tab-content">
      <div v-if="activeTab === 'transactions'" class="list">
        <div v-if="transactions.length === 0" class="empty-state"><p>ยังไม่มีรายการ</p></div>
        <div v-for="txn in transactions" :key="txn.id" class="txn-item">
          <div class="txn-info">
            <span class="txn-type">{{ formatTransactionType(txn.type) }}</span>
            <span class="txn-date">{{ formatDate(txn.created_at) }}</span>
          </div>
          <div :class="['txn-amount', { positive: isPositiveTransaction(txn.type) }]">
            {{ isPositiveTransaction(txn.type) ? '+' : '-' }}฿{{ formatNumber(Math.abs(txn.amount)) }}
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'topup'" class="list">
        <div v-if="topupRequests.length === 0" class="empty-state"><p>ยังไม่มีคำขอเติมเงิน</p></div>
        <div v-for="req in topupRequests" :key="req.id" class="req-item">
          <div class="req-info">
            <span class="req-amount">฿{{ formatNumber(req.amount) }}</span>
            <span class="req-date">{{ formatDate(req.created_at) }}</span>
          </div>
          <span :class="['badge', formatTopupStatus(req.status).color]">{{ formatTopupStatus(req.status).label }}</span>
        </div>
      </div>

      <div v-if="activeTab === 'withdraw'" class="list">
        <div v-if="withdrawals.length === 0" class="empty-state"><p>ยังไม่มีคำขอถอนเงิน</p></div>
        <div v-for="wd in withdrawals" :key="wd.id" class="req-item">
          <div class="req-info">
            <span class="req-amount">฿{{ formatNumber(wd.amount) }}</span>
            <span class="req-date">{{ formatDate(wd.created_at) }}</span>
          </div>
          <span :class="['badge', formatWithdrawalStatus(wd.status).color]">{{ formatWithdrawalStatus(wd.status).label }}</span>
        </div>
      </div>
    </section>

    <div v-if="showTopupModal" class="modal-overlay" @click.self="closeTopupModal">
      <div class="modal topup-modal">
        <!-- Step 1: เลือกจำนวนเงินและวิธีชำระ -->
        <template v-if="topupStep === 'amount'">
          <h2>เติมเงิน</h2>
          <div class="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <input v-model.number="topupAmount" type="number" min="20" placeholder="ระบุจำนวนเงิน"/>
            <div class="quick-amounts">
              <button v-for="amt in [100, 200, 500, 1000]" :key="amt" @click="topupAmount = amt">฿{{ amt }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>วิธีชำระเงิน</label>
            <select v-model="topupMethod">
              <option value="promptpay">พร้อมเพย์</option>
              <option value="bank_transfer">โอนเงินผ่านธนาคาร</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeTopupModal">ยกเลิก</button>
            <button class="btn-primary" @click="goToPaymentStep" :disabled="topupAmount < 20">ถัดไป</button>
          </div>
        </template>

        <!-- Step 2: แสดงข้อมูลการชำระเงิน (QR/บัญชีธนาคาร) -->
        <template v-else-if="topupStep === 'payment'">
          <div class="payment-header">
            <button class="back-step-btn" @click="topupStep = 'amount'" aria-label="กลับ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2>ข้อมูลการชำระเงิน</h2>
          </div>

          <div class="payment-amount-display">
            <span class="label">จำนวนเงินที่ต้องโอน</span>
            <span class="amount">฿{{ formatNumber(topupAmount) }}</span>
          </div>

          <!-- Payment Account Info -->
          <div v-if="currentPaymentAccount" class="payment-account-info">
            <!-- PromptPay QR -->
            <template v-if="topupMethod === 'promptpay'">
              <div class="payment-type-badge promptpay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                <span>พร้อมเพย์</span>
              </div>
              
              <!-- QR Code Image -->
              <div v-if="currentPaymentAccount.qr_code_url" class="qr-code-container">
                <img :src="currentPaymentAccount.qr_code_url" :alt="'QR Code ' + currentPaymentAccount.display_name" class="qr-code-image"/>
              </div>
              <div v-else class="qr-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                <p>สแกน QR Code เพื่อชำระเงิน</p>
              </div>

              <!-- PromptPay Number -->
              <div class="account-details">
                <div class="detail-row">
                  <span class="detail-label">เบอร์พร้อมเพย์</span>
                  <span class="detail-value copyable" @click="copyToClipboard(currentPaymentAccount.account_number)">
                    {{ currentPaymentAccount.account_number }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ชื่อบัญชี</span>
                  <span class="detail-value">{{ currentPaymentAccount.account_name }}</span>
                </div>
              </div>
            </template>

            <!-- Bank Transfer -->
            <template v-else-if="topupMethod === 'bank_transfer'">
              <div class="payment-type-badge bank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                <span>โอนเงินผ่านธนาคาร</span>
              </div>

              <div class="bank-info">
                <div class="bank-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                </div>
                <span class="bank-name">{{ currentPaymentAccount.bank_name || currentPaymentAccount.display_name }}</span>
              </div>

              <div class="account-details">
                <div class="detail-row">
                  <span class="detail-label">เลขบัญชี</span>
                  <span class="detail-value copyable" @click="copyToClipboard(currentPaymentAccount.account_number)">
                    {{ currentPaymentAccount.account_number }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ชื่อบัญชี</span>
                  <span class="detail-value">{{ currentPaymentAccount.account_name }}</span>
                </div>
                <div v-if="currentPaymentAccount.bank_name" class="detail-row">
                  <span class="detail-label">ธนาคาร</span>
                  <span class="detail-value">{{ currentPaymentAccount.bank_name }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- No Payment Account -->
          <div v-else class="no-payment-account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <p>ไม่พบข้อมูลบัญชีรับเงิน</p>
            <span>กรุณาติดต่อผู้ดูแลระบบ</span>
          </div>

          <!-- Instructions -->
          <div class="payment-instructions">
            <h4>ขั้นตอนการเติมเงิน</h4>
            <ol>
              <li>โอนเงินตามจำนวนที่ระบุไปยังบัญชีด้านบน</li>
              <li>กดปุ่ม "ยืนยันการโอนเงิน" ด้านล่าง</li>
              <li>รอการตรวจสอบจากทีมงาน (ภายใน 5-15 นาที)</li>
              <li>เงินจะเข้ากระเป๋าอัตโนมัติเมื่อตรวจสอบเรียบร้อย</li>
            </ol>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="closeTopupModal">ยกเลิก</button>
            <button class="btn-primary" @click="handleTopup" :disabled="topupLoading || !currentPaymentAccount">
              {{ topupLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการโอนเงิน' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal">
        <h2>ถอนเงิน</h2>
        <div class="available-balance">ยอดที่ถอนได้: <strong>฿{{ formatNumber(availableForWithdrawal) }}</strong></div>
        <div class="form-group">
          <label>บัญชีธนาคาร</label>
          <div v-if="bankAccounts.length === 0" class="no-bank">
            <p>ยังไม่มีบัญชีธนาคาร</p>
            <button class="btn-link" @click="showAddBankModal = true">+ เพิ่มบัญชี</button>
          </div>
          <select v-else v-model="selectedBankAccountId">
            <option value="">เลือกบัญชี</option>
            <option v-for="acc in bankAccounts" :key="acc.id" :value="acc.id">{{ acc.bank_name }} - {{ acc.account_number }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input v-model.number="withdrawAmount" type="number" min="100" placeholder="ขั้นต่ำ 100 บาท"/>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showWithdrawModal = false">ยกเลิก</button>
          <button class="btn-primary" @click="handleWithdraw" :disabled="withdrawLoading || withdrawAmount < 100 || !selectedBankAccountId">{{ withdrawLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}</button>
        </div>
      </div>
    </div>

    <div v-if="showAddBankModal" class="modal-overlay" @click.self="showAddBankModal = false">
      <div class="modal">
        <h2>เพิ่มบัญชีธนาคาร</h2>
        <div class="form-group">
          <label>ธนาคาร</label>
          <select v-model="newBankCode">
            <option value="">เลือกธนาคาร</option>
            <option v-for="bank in THAI_BANKS" :key="bank.code" :value="bank.code">{{ bank.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>เลขบัญชี</label>
          <input v-model="newAccountNumber" type="text" placeholder="เลขบัญชี"/>
        </div>
        <div class="form-group">
          <label>ชื่อบัญชี</label>
          <input v-model="newAccountName" type="text" placeholder="ชื่อ-นามสกุล"/>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddBankModal = false">ยกเลิก</button>
          <button class="btn-primary" @click="handleAddBank" :disabled="addBankLoading || !newBankCode || !newAccountNumber || !newAccountName">{{ addBankLoading ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWallet } from '@/composables/useWallet'

const router = useRouter()
const {
  balance, transactions, topupRequests, loading,
  fetchBalance, fetchTransactions, fetchTopupRequests, createTopupRequest,
  formatTransactionType, formatTopupStatus, isPositiveTransaction,
  bankAccounts, withdrawals, availableForWithdrawal,
  fetchBankAccounts, fetchWithdrawals, addBankAccount, requestWithdrawal,
  formatWithdrawalStatus, subscribeToWallet, subscribeToWithdrawals, THAI_BANKS,
  paymentAccounts, fetchPaymentAccounts
} = useWallet()

import type { PaymentReceivingAccount } from '@/composables/useWallet'

const activeTab = ref<'transactions' | 'topup' | 'withdraw'>('transactions')
const showTopupModal = ref(false)
const showWithdrawModal = ref(false)
const showAddBankModal = ref(false)

const topupAmount = ref(100)
const topupMethod = ref<'promptpay' | 'bank_transfer'>('promptpay')
const topupLoading = ref(false)
const topupStep = ref<'amount' | 'payment'>('amount') // Step: เลือกจำนวน -> แสดงข้อมูลชำระเงิน

// Current payment account based on selected method
const currentPaymentAccount = computed((): PaymentReceivingAccount | null => {
  return paymentAccounts.value.find(acc => acc.account_type === topupMethod.value) || null
})

const withdrawAmount = ref(100)
const selectedBankAccountId = ref('')
const withdrawLoading = ref(false)

const newBankCode = ref('')
const newAccountNumber = ref('')
const newAccountName = ref('')
const addBankLoading = ref(false)

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

let walletSub: { unsubscribe: () => void } | null = null
let withdrawalSub: { unsubscribe: () => void } | null = null

const currentBalance = computed(() => balance.value?.balance ?? 0)
const totalEarned = computed(() => balance.value?.total_earned ?? 0)
const totalSpent = computed(() => balance.value?.total_spent ?? 0)

const goBack = () => router.back()
const formatNumber = (num: number) => num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// Copy to clipboard
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('คัดลอกแล้ว')
  } catch {
    showToast('ไม่สามารถคัดลอกได้', 'error')
  }
}

// Go to payment step (fetch payment accounts first)
const goToPaymentStep = async (): Promise<void> => {
  if (topupAmount.value < 20) {
    showToast('จำนวนเงินขั้นต่ำ 20 บาท', 'error')
    return
  }
  // Fetch payment accounts if not loaded
  if (paymentAccounts.value.length === 0) {
    await fetchPaymentAccounts()
  }
  topupStep.value = 'payment'
}

// Close topup modal and reset
const closeTopupModal = (): void => {
  showTopupModal.value = false
  topupStep.value = 'amount'
  topupAmount.value = 100
}

const handleTopup = async (): Promise<void> => {
  if (topupAmount.value < 20) { showToast('จำนวนเงินขั้นต่ำ 20 บาท', 'error'); return }
  topupLoading.value = true
  try {
    const result = await createTopupRequest(topupAmount.value, topupMethod.value)
    if (result.success) { 
      showToast(result.message || 'สร้างคำขอเติมเงินสำเร็จ รอการตรวจสอบ')
      closeTopupModal()
    }
    else { showToast(result.message || 'เกิดข้อผิดพลาด', 'error') }
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    showToast(errorMessage, 'error') 
  }
  finally { topupLoading.value = false }
}

const handleWithdraw = async (): Promise<void> => {
  if (withdrawAmount.value < 100) { showToast('จำนวนเงินขั้นต่ำ 100 บาท', 'error'); return }
  if (!selectedBankAccountId.value) { showToast('กรุณาเลือกบัญชีธนาคาร', 'error'); return }
  withdrawLoading.value = true
  try {
    const result = await requestWithdrawal(selectedBankAccountId.value, withdrawAmount.value)
    if (result.success) { showToast(result.message || 'สร้างคำขอถอนเงินสำเร็จ'); showWithdrawModal.value = false; withdrawAmount.value = 100; selectedBankAccountId.value = '' }
    else { showToast(result.message || 'เกิดข้อผิดพลาด', 'error') }
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    showToast(errorMessage, 'error') 
  }
  finally { withdrawLoading.value = false }
}

const handleAddBank = async (): Promise<void> => {
  if (!newBankCode.value || !newAccountNumber.value || !newAccountName.value) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return }
  addBankLoading.value = true
  try {
    const result = await addBankAccount(newBankCode.value, newAccountNumber.value, newAccountName.value, bankAccounts.value.length === 0)
    if (result.success) { showToast(result.message || 'เพิ่มบัญชีสำเร็จ'); showAddBankModal.value = false; newBankCode.value = ''; newAccountNumber.value = ''; newAccountName.value = '' }
    else { showToast(result.message || 'เกิดข้อผิดพลาด', 'error') }
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    showToast(errorMessage, 'error') 
  }
  finally { addBankLoading.value = false }
}

onMounted(async () => {
  await Promise.all([
    fetchBalance(), 
    fetchTransactions(), 
    fetchTopupRequests(), 
    fetchBankAccounts(), 
    fetchWithdrawals(),
    fetchPaymentAccounts() // Fetch admin payment accounts for topup
  ])
  walletSub = subscribeToWallet()
  withdrawalSub = subscribeToWithdrawals()
})

onUnmounted(() => { walletSub?.unsubscribe(); withdrawalSub?.unsubscribe() })
</script>

<style scoped>
.wallet-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 100px; }
.wallet-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #fff; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 10; }
.wallet-header h1 { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0; }
.back-btn, .header-spacer { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
.back-btn svg { width: 24px; height: 24px; color: #1a1a1a; }
.balance-section { padding: 16px; }
.balance-card { background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); border-radius: 20px; padding: 24px; color: #fff; box-shadow: 0 8px 24px rgba(0, 168, 107, 0.3); }
.balance-label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
.balance-amount { font-size: 36px; font-weight: 700; margin-bottom: 24px; }
.loading-text { font-size: 20px; opacity: 0.7; }
.balance-actions { display: flex; gap: 12px; }
.action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.action-btn svg { width: 20px; height: 20px; }
.topup-btn { background: rgba(255,255,255,0.2); color: #fff; }
.topup-btn:hover { background: rgba(255,255,255,0.3); }
.withdraw-btn { background: #fff; color: #00A86B; }
.withdraw-btn:hover { background: #f0f0f0; }
.stats-section { display: flex; gap: 12px; padding: 0 16px 16px; }
.stat-card { flex: 1; display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #f0f0f0; }
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-icon svg { width: 22px; height: 22px; }
.stat-icon.earned { background: #e8f5ef; color: #00A86B; }
.stat-icon.spent { background: #fff3e0; color: #f5a623; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 12px; color: #999; }
.stat-value { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.tabs-section { padding: 0 16px; }
.tabs { display: flex; background: #fff; border-radius: 12px; padding: 4px; border: 1px solid #e8e8e8; }
.tab { flex: 1; padding: 10px; border: none; background: none; font-size: 14px; font-weight: 500; color: #666; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.tab.active { background: #00A86B; color: #fff; }
.tab-content { padding: 16px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.empty-state { text-align: center; padding: 48px 24px; color: #999; }
.txn-item, .req-item { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 14px; padding: 16px; border: 1px solid #f0f0f0; }
.txn-info, .req-info { display: flex; flex-direction: column; gap: 4px; }
.txn-type { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.txn-date, .req-date { font-size: 12px; color: #999; }
.txn-amount { font-size: 16px; font-weight: 600; color: #e53935; }
.txn-amount.positive { color: #00A86B; }
.req-amount { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.badge.warning { background: #fff3e0; color: #e65100; }
.badge.success { background: #e8f5ef; color: #00A86B; }
.badge.error { background: #ffebee; color: #e53935; }
.badge.gray { background: #f5f5f5; color: #666; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 20px 20px 0 0; padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal h2 { font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #666; margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; padding: 12px 16px; border: 2px solid #e8e8e8; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #00A86B; }
.quick-amounts { display: flex; gap: 8px; margin-top: 8px; }
.quick-amounts button { flex: 1; padding: 8px; border: 1px solid #e8e8e8; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.quick-amounts button:hover { background: #f5f5f5; }
.available-balance { background: #e8f5ef; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 14px; color: #00A86B; }
.available-balance strong { font-size: 18px; }
.no-bank { text-align: center; padding: 16px; color: #999; }
.btn-link { background: none; border: none; color: #00A86B; font-size: 14px; font-weight: 500; cursor: pointer; }
.modal-actions { display: flex; gap: 12px; margin-top: 24px; }
.btn-secondary { flex: 1; padding: 14px; border: 2px solid #e8e8e8; border-radius: 12px; background: #fff; font-size: 16px; font-weight: 600; color: #666; cursor: pointer; }
.btn-primary { flex: 1; padding: 14px; border: none; border-radius: 12px; background: #00A86B; font-size: 16px; font-weight: 600; color: #fff; cursor: pointer; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 200; }
.toast.success { background: #00A86B; color: #fff; }
.toast.error { background: #e53935; color: #fff; }

/* Topup Modal - Payment Info Styles */
.topup-modal { max-height: 85vh; }
.payment-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.payment-header h2 { margin: 0; flex: 1; }
.back-step-btn { width: 36px; height: 36px; border: none; background: #f5f5f5; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.back-step-btn svg { width: 20px; height: 20px; color: #666; }
.back-step-btn:hover { background: #e8e8e8; }

.payment-amount-display { background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); border-radius: 14px; padding: 16px; text-align: center; color: #fff; margin-bottom: 16px; }
.payment-amount-display .label { font-size: 13px; opacity: 0.9; display: block; margin-bottom: 4px; }
.payment-amount-display .amount { font-size: 28px; font-weight: 700; }

.payment-account-info { background: #f9f9f9; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.payment-type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; margin-bottom: 12px; }
.payment-type-badge svg { width: 16px; height: 16px; }
.payment-type-badge.promptpay { background: #e3f2fd; color: #1565c0; }
.payment-type-badge.bank { background: #fff3e0; color: #e65100; }

.qr-code-container { display: flex; justify-content: center; margin: 16px 0; }
.qr-code-image { width: 180px; height: 180px; border-radius: 12px; border: 2px solid #e8e8e8; object-fit: contain; background: #fff; }
.qr-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 180px; height: 180px; margin: 16px auto; background: #fff; border: 2px dashed #ccc; border-radius: 12px; color: #999; }
.qr-placeholder svg { width: 48px; height: 48px; margin-bottom: 8px; }
.qr-placeholder p { font-size: 12px; margin: 0; }

.bank-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.bank-logo { width: 44px; height: 44px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #e8e8e8; }
.bank-logo svg { width: 24px; height: 24px; color: #666; }
.bank-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }

.account-details { background: #fff; border-radius: 10px; padding: 12px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-size: 13px; color: #666; }
.detail-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.detail-value.copyable { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #00A86B; }
.detail-value.copyable:hover { text-decoration: underline; }
.detail-value.copyable svg { width: 14px; height: 14px; }

.no-payment-account { text-align: center; padding: 32px 16px; color: #999; }
.no-payment-account svg { width: 48px; height: 48px; margin-bottom: 12px; color: #ccc; }
.no-payment-account p { font-size: 16px; font-weight: 500; margin: 0 0 4px; color: #666; }
.no-payment-account span { font-size: 13px; }

.payment-instructions { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
.payment-instructions h4 { font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 10px; }
.payment-instructions ol { margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.6; }
.payment-instructions li { margin-bottom: 4px; }
</style>
