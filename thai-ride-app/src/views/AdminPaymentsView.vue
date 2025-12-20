<script setup lang="ts">
/**
 * Admin Payments View - F08
 * จัดการการเงินและการชำระเงิน
 * 
 * Memory Optimization: Task 12
 * - Cleans up payments array on unmount
 * - Resets filters and totals
 */
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { fetchPayments } = useAdmin()
const { addCleanup } = useAdminCleanup()

const payments = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const statusFilter = ref('')
const methodFilter = ref('')
const selectedPayment = ref<any>(null)

const loadPayments = async () => {
  loading.value = true
  const result = await fetchPayments(1, 100, { status: statusFilter.value || undefined, method: methodFilter.value || undefined })
  payments.value = result.data
  total.value = result.total
  loading.value = false
}

// Register cleanup
addCleanup(() => {
  payments.value = []
  total.value = 0
  selectedPayment.value = null
  statusFilter.value = ''
  methodFilter.value = ''
  loading.value = false
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
        <p class="subtitle">{{ total }} รายการ</p>
      </div>

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
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

.summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.summary-card { background: #000; color: #fff; border-radius: 12px; padding: 20px; }
.summary-label { display: block; font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
.summary-value { font-size: 24px; font-weight: 700; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.payments-list { display: flex; flex-direction: column; gap: 12px; }
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
</style>
