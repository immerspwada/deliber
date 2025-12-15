<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const balance = ref(250)
const loading = ref(false)
const showTopUpModal = ref(false)
const selectedAmount = ref(100)

const topUpAmounts = [100, 200, 500, 1000, 2000]

const transactions = ref([
  { id: 1, type: 'topup', amount: 500, date: '14 ธ.ค. 2567', desc: 'เติมเงินผ่านพร้อมเพย์' },
  { id: 2, type: 'ride', amount: -85, date: '14 ธ.ค. 2567', desc: 'เรียกรถ สยาม → อโศก' },
  { id: 3, type: 'promo', amount: 50, date: '13 ธ.ค. 2567', desc: 'โบนัสผู้ใช้ใหม่' },
  { id: 4, type: 'ride', amount: -120, date: '12 ธ.ค. 2567', desc: 'เรียกรถ บ้าน → ออฟฟิศ' },
  { id: 5, type: 'refund', amount: 45, date: '11 ธ.ค. 2567', desc: 'คืนเงินจากการยกเลิก' }
])

const handleTopUp = async () => {
  loading.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))
  balance.value += selectedAmount.value
  transactions.value.unshift({
    id: Date.now(),
    type: 'topup',
    amount: selectedAmount.value,
    date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
    desc: 'เติมเงินผ่านพร้อมเพย์'
  })
  loading.value = false
  showTopUpModal.value = false
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'topup': return 'M12 6v6m0 0v6m0-6h6m-6 0H6'
    case 'ride': return 'M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14'
    case 'promo': return 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    case 'refund': return 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
    default: return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>ThaiRide Wallet</h1>
      </div>

      <!-- Balance Card -->
      <div class="balance-card">
        <span class="balance-label">ยอดเงินคงเหลือ</span>
        <div class="balance-amount">
          <span class="currency">฿</span>
          <span class="amount">{{ balance.toLocaleString() }}</span>
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
        <button class="action-card">
          <div class="action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <span>ประวัติ</span>
        </button>
      </div>

      <!-- Transactions -->
      <div class="transactions-section">
        <h2 class="section-title">รายการล่าสุด</h2>
        <div class="transactions-list">
          <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
            <div :class="['tx-icon', tx.type]">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTransactionIcon(tx.type)"/>
              </svg>
            </div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.desc }}</span>
              <span class="tx-date">{{ tx.date }}</span>
            </div>
            <span :class="['tx-amount', { positive: tx.amount > 0 }]">
              {{ tx.amount > 0 ? '+' : '' }}฿{{ Math.abs(tx.amount) }}
            </span>
          </div>
        </div>
      </div>
    </div>

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

        <button @click="handleTopUp" :disabled="loading || selectedAmount < 20" class="btn-primary">
          {{ loading ? 'กำลังดำเนินการ...' : `เติมเงิน ฿${selectedAmount}` }}
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
  background: #000;
  color: #fff;
  border-radius: 20px;
  padding: 28px 24px;
  margin-bottom: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.balance-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
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
  padding: 12px 28px;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.topup-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.topup-btn:active {
  transform: scale(0.98);
}

.topup-btn svg {
  width: 20px;
  height: 20px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
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
}

.action-card:hover {
  background: #F6F6F6;
}

.action-card:active {
  transform: scale(0.97);
}

.action-icon {
  width: 44px;
  height: 44px;
  background: #fff;
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

/* Transactions */
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
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
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-icon svg {
  width: 20px;
  height: 20px;
}

.tx-icon svg { color: #000; }

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
  color: #000;
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
  padding: 12px 20px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.amount-btn.active {
  border-color: #000;
  background: #fff;
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
  border-color: #000;
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
  border-color: #000;
  background: #fff;
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
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  background: #CCC;
}
</style>
