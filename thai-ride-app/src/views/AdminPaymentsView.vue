<script setup lang="ts">
/**
 * Admin Payments View - F08
 * จัดการการเงินและการชำระเงิน
 * 
 * Memory Optimization: Task 12
 * - Cleans up payments array on unmount
 * - Resets filters and totals
 */
import { ref, onMounted, computed, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'
import { useAdminPaymentMethods } from '../composables/useAdminPaymentMethods'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { fetchPayments } = useAdmin()
const { 
  fetchPaymentMethods, 
  fetchPaymentMethodsStats,
  togglePaymentMethodStatus,
  deletePaymentMethod,
  formatPaymentType,
  getPaymentDetail
} = useAdminPaymentMethods()
const { addCleanup } = useAdminCleanup()

// Tab state
const activeTab = ref<'transactions' | 'methods'>('transactions')

// Transactions state
const payments = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const statusFilter = ref('')
const methodFilter = ref('')
const selectedPayment = ref<any>(null)

// Payment Methods state
const paymentMethods = ref<any[]>([])
const methodsTotal = ref(0)
const methodsLoading = ref(false)
const methodsStats = ref({ total: 0, active: 0, inactive: 0, byType: { promptpay: 0, card: 0, mobileBanking: 0 } })
const methodTypeFilter = ref('')
const methodActiveFilter = ref('')

const loadPayments = async () => {
  loading.value = true
  const result = await fetchPayments(1, 100, { status: statusFilter.value || undefined, method: methodFilter.value || undefined })
  payments.value = result.data
  total.value = result.total
  loading.value = false
}

const loadPaymentMethods = async () => {
  methodsLoading.value = true
  const filter: any = {}
  if (methodTypeFilter.value) filter.type = methodTypeFilter.value
  if (methodActiveFilter.value !== '') filter.isActive = methodActiveFilter.value === 'true'
  
  const [result, stats] = await Promise.all([
    fetchPaymentMethods(1, 100, filter),
    fetchPaymentMethodsStats()
  ])
  
  paymentMethods.value = result.data
  methodsTotal.value = result.total
  methodsStats.value = stats
  methodsLoading.value = false
}

const handleToggleMethodStatus = async (method: any) => {
  const newStatus = !method.is_active
  const result = await togglePaymentMethodStatus(method.id, newStatus)
  if (result.success) {
    method.is_active = newStatus
    loadPaymentMethods()
  }
}

const handleDeleteMethod = async (method: any) => {
  if (!confirm(`ต้องการลบวิธีการชำระเงินนี้?\n${method.name} - ${getPaymentDetail(method)}`)) return
  
  const result = await deletePaymentMethod(method.id)
  if (result.success) {
    loadPaymentMethods()
  }
}

// Watch tab changes
watch(activeTab, (tab) => {
  if (tab === 'methods' && paymentMethods.value.length === 0) {
    loadPaymentMethods()
  }
})

// Register cleanup
addCleanup(() => {
  payments.value = []
  paymentMethods.value = []
  total.value = 0
  methodsTotal.value = 0
  selectedPayment.value = null
  statusFilter.value = ''
  methodFilter.value = ''
  methodTypeFilter.value = ''
  methodActiveFilter.value = ''
  loading.value = false
  methodsLoading.value = false
  console.log('[AdminPaymentsView] Cleanup complete')
})

onMounted(loadPayments)

const totalRevenue = computed(() => payments.value.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0))

const getStatusColor = (s: string) => ({ completed: '#05944f', pending: '#ffc043', processing: '#276ef1', failed: '#e11900', refunded: '#6b6b6b' }[s] || '#6b6b6b')
const getStatusText = (s: string) => ({ completed: 'สำเร็จ', pending: 'รอชำระ', processing: 'กำลังดำเนินการ', failed: 'ล้มเหลว', refunded: 'คืนเงินแล้ว' }[s] || s)
const getMethodText = (m: string) => ({ promptpay: 'PromptPay', credit_card: 'บัตรเครดิต', cash: 'เงินสด', mobile_banking: 'Mobile Banking' }[m] || m)
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
const formatCurrency = (n: number) => `฿${n?.toLocaleString('th-TH') || 0}`
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการการเงิน</h1>
        <p class="subtitle">{{ activeTab === 'transactions' ? total : methodsTotal }} รายการ</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'transactions' }]"
          @click="activeTab = 'transactions'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          รายการชำระเงิน
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'methods' }]"
          @click="activeTab = 'methods'"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          วิธีการชำระเงิน
        </button>
      </div>

      <!-- Transactions Tab -->
      <template v-if="activeTab === 'transactions'">
        <div class="summary-cards">
          <div class="summary-card">
            <span class="summary-label">รายได้รวม</span>
            <span class="summary-value">{{ formatCurrency(totalRevenue) }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">รายการทั้งหมด</span>
            <span class="summary-value">{{ total }}</span>
          </div>
        </div>

        <div class="filters">
          <select v-model="statusFilter" @change="loadPayments" class="filter-select">
            <option value="">ทุกสถานะ</option>
            <option value="completed">สำเร็จ</option>
            <option value="pending">รอชำระ</option>
            <option value="failed">ล้มเหลว</option>
            <option value="refunded">คืนเงินแล้ว</option>
          </select>
          <select v-model="methodFilter" @change="loadPayments" class="filter-select">
            <option value="">ทุกช่องทาง</option>
            <option value="promptpay">PromptPay</option>
            <option value="credit_card">บัตรเครดิต</option>
            <option value="cash">เงินสด</option>
            <option value="mobile_banking">Mobile Banking</option>
          </select>
        </div>

        <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

        <div v-else class="payments-list">
          <div v-for="p in payments" :key="p.id" class="payment-card">
            <div class="payment-main">
              <div class="payment-info">
                <span class="payment-id">{{ p.tracking_id }}</span>
                <span class="payment-user">{{ p.users?.name || 'ไม่ระบุ' }}</span>
              </div>
              <span class="payment-amount">{{ formatCurrency(p.amount) }}</span>
            </div>
            <div class="payment-meta">
              <span class="payment-method">{{ getMethodText(p.payment_method) }}</span>
              <span class="payment-status" :style="{ color: getStatusColor(p.status) }">{{ getStatusText(p.status) }}</span>
              <span class="payment-date">{{ formatDate(p.created_at) }}</span>
            </div>
          </div>
          
          <div v-if="payments.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p>ไม่มีรายการชำระเงิน</p>
          </div>
        </div>
      </template>

      <!-- Payment Methods Tab -->
      <template v-else>
        <div class="summary-cards four-cols">
          <div class="summary-card">
            <span class="summary-label">ทั้งหมด</span>
            <span class="summary-value">{{ methodsStats.total }}</span>
          </div>
          <div class="summary-card green">
            <span class="summary-label">ใช้งานอยู่</span>
            <span class="summary-value">{{ methodsStats.active }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">พร้อมเพย์</span>
            <span class="summary-value">{{ methodsStats.byType.promptpay }}</span>
          </div>
          <div class="summary-card">
            <span class="summary-label">บัตร</span>
            <span class="summary-value">{{ methodsStats.byType.card }}</span>
          </div>
        </div>

        <div class="filters">
          <select v-model="methodTypeFilter" @change="loadPaymentMethods" class="filter-select">
            <option value="">ทุกประเภท</option>
            <option value="promptpay">พร้อมเพย์</option>
            <option value="credit_card">บัตรเครดิต</option>
            <option value="debit_card">บัตรเดบิต</option>
            <option value="mobile_banking">Mobile Banking</option>
          </select>
          <select v-model="methodActiveFilter" @change="loadPaymentMethods" class="filter-select">
            <option value="">ทุกสถานะ</option>
            <option value="true">ใช้งานอยู่</option>
            <option value="false">ปิดใช้งาน</option>
          </select>
        </div>

        <div v-if="methodsLoading" class="loading-state"><div class="spinner"></div></div>

        <div v-else class="methods-list">
          <div v-for="m in paymentMethods" :key="m.id" class="method-card">
            <div class="method-icon">
              <svg v-if="m.type === 'promptpay'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <div class="method-info">
              <div class="method-header">
                <span class="method-name">{{ formatPaymentType(m.type) }}</span>
                <span v-if="m.is_default" class="default-badge">ค่าเริ่มต้น</span>
                <span :class="['status-badge', m.is_active ? 'active' : 'inactive']">
                  {{ m.is_active ? 'ใช้งาน' : 'ปิด' }}
                </span>
              </div>
              <span class="method-detail">{{ getPaymentDetail(m) }}</span>
              <div class="method-user">
                <span class="user-name">{{ m.user?.name || 'ไม่ระบุ' }}</span>
                <span v-if="m.user?.member_uid" class="user-uid">{{ m.user.member_uid }}</span>
              </div>
            </div>
            <div class="method-actions">
              <button @click="handleToggleMethodStatus(m)" class="action-btn" :title="m.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'">
                <svg v-if="m.is_active" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
                <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
              <button @click="handleDeleteMethod(m)" class="action-btn delete" title="ลบ">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div v-if="paymentMethods.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <p>ไม่มีวิธีการชำระเงิน</p>
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

/* Tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.tab-btn { 
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; 
  background: #fff; font-size: 14px; font-weight: 500; cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { background: #f6f6f6; }
.tab-btn.active { background: #00A86B; color: #fff; border-color: #00A86B; }

.summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.summary-cards.four-cols { grid-template-columns: repeat(4, 1fr); }
.summary-card { background: #000; color: #fff; border-radius: 12px; padding: 16px; }
.summary-card.green { background: #00A86B; }
.summary-label { display: block; font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
.summary-value { font-size: 20px; font-weight: 700; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #00A86B; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.payments-list, .methods-list { display: flex; flex-direction: column; gap: 12px; }
.payment-card { background: #fff; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; }
.payment-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

.payment-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.payment-info { }
.payment-id { display: block; font-family: monospace; font-size: 12px; color: #6b6b6b; }
.payment-user { display: block; font-weight: 600; font-size: 15px; margin-top: 2px; }
.payment-amount { font-size: 18px; font-weight: 700; }

.payment-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.payment-method { font-size: 12px; padding: 4px 10px; background: #f6f6f6; border-radius: 20px; }
.payment-status { font-size: 12px; font-weight: 500; }
.payment-date { font-size: 12px; color: #999; margin-left: auto; }

/* Payment Methods */
.method-card { 
  display: flex; align-items: center; gap: 12px;
  background: #fff; border-radius: 12px; padding: 16px; 
  transition: box-shadow 0.2s;
}
.method-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

.method-icon { 
  width: 44px; height: 44px; 
  display: flex; align-items: center; justify-content: center;
  background: #f6f6f6; border-radius: 10px;
}
.method-icon svg { width: 22px; height: 22px; }

.method-info { flex: 1; }
.method-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.method-name { font-weight: 600; font-size: 15px; }
.default-badge { 
  font-size: 10px; font-weight: 500; padding: 2px 6px; 
  background: #00A86B; color: #fff; border-radius: 20px;
}
.status-badge { 
  font-size: 10px; font-weight: 500; padding: 2px 6px; 
  border-radius: 20px;
}
.status-badge.active { background: #E8F5EF; color: #00A86B; }
.status-badge.inactive { background: #f6f6f6; color: #999; }

.method-detail { display: block; font-size: 13px; color: #6b6b6b; }
.method-user { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.user-name { font-size: 12px; color: #333; }
.user-uid { font-size: 11px; font-family: monospace; color: #999; }

.method-actions { display: flex; gap: 8px; }
.action-btn { 
  width: 36px; height: 36px; 
  display: flex; align-items: center; justify-content: center;
  background: #f6f6f6; border: none; border-radius: 8px; cursor: pointer;
  transition: background 0.2s;
}
.action-btn:hover { background: #e5e5e5; }
.action-btn svg { width: 18px; height: 18px; }
.action-btn.delete { color: #e11900; }
.action-btn.delete:hover { background: #fee; }

.empty-state { 
  display: flex; flex-direction: column; align-items: center; 
  padding: 48px 20px; color: #999;
}
.empty-state svg { margin-bottom: 12px; opacity: 0.5; }

@media (max-width: 640px) {
  .summary-cards.four-cols { grid-template-columns: repeat(2, 1fr); }
  .tabs { flex-wrap: wrap; }
}
</style>
