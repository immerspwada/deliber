<script setup lang="ts">
/**
 * Feature: F20 - Admin Insurance Plans Management
 * Tables: insurance_plans, user_insurance, insurance_claims
 * 
 * Memory Optimization: Task 36
 * - Cleans up plans, claims, and user insurances on unmount
 * - Resets filters and modals
 */
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

interface InsurancePlan {
  id: string
  name_th: string
  name_en: string
  description_th: string
  coverage_type: string
  coverage_amount: number
  price_per_ride: number
  price_monthly: number | null
  coverage_details: string[]
  is_active: boolean
  created_at: string
}

interface UserInsurance {
  id: string
  user_id: string
  plan_id: string
  subscription_type: string
  status: string
  valid_until: string | null
  auto_renew: boolean
  created_at: string
  user?: { full_name: string; phone: string }
  plan?: InsurancePlan
}

interface InsuranceClaim {
  id: string
  user_insurance_id: string
  user_id: string
  claim_type: string
  description: string
  incident_date: string
  claimed_amount: number
  approved_amount: number | null
  status: string
  created_at: string
  user?: { full_name: string; phone: string }
}

const loading = ref(false)
const plans = ref<InsurancePlan[]>([])
const userInsurances = ref<UserInsurance[]>([])
const claims = ref<InsuranceClaim[]>([])
const activeTab = ref<'plans' | 'users' | 'claims'>('plans')

const searchQuery = ref('')
const statusFilter = ref('all')
const showPlanModal = ref(false)
const showClaimModal = ref(false)
const editingPlan = ref<InsurancePlan | null>(null)
const selectedClaim = ref<InsuranceClaim | null>(null)

const planForm = ref({
  name_th: '', name_en: '', description_th: '', coverage_type: 'basic',
  coverage_amount: 0, price_per_ride: 0, price_monthly: null as number | null,
  coverage_details: [] as string[], is_active: true
})
const newDetail = ref('')
const approvedAmount = ref(0)
const claimNote = ref('')

const stats = computed(() => ({
  totalPlans: plans.value.length,
  activePlans: plans.value.filter(p => p.is_active).length,
  totalInsured: userInsurances.value.filter(u => u.status === 'active').length,
  pendingClaims: claims.value.filter(c => c.status === 'pending').length,
  totalCoverage: userInsurances.value
    .filter(u => u.status === 'active')
    .reduce((sum, u) => sum + (u.plan?.coverage_amount || 0), 0)
}))

const filteredClaims = computed(() => {
  let result = claims.value
  if (statusFilter.value !== 'all') result = result.filter(c => c.status === statusFilter.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c => c.user?.full_name?.toLowerCase().includes(q) || c.user?.phone?.includes(q))
  }
  return result
})

onMounted(() => { fetchPlans(); fetchUserInsurances(); fetchClaims() })

// Cleanup on unmount - Task 36
addCleanup(() => {
  plans.value = []
  userInsurances.value = []
  claims.value = []
  showPlanModal.value = false
  showClaimModal.value = false
  editingPlan.value = null
  selectedClaim.value = null
  searchQuery.value = ''
  statusFilter.value = 'all'
  activeTab.value = 'plans'
  console.log('[AdminInsuranceView] Cleanup complete')
})

const fetchPlans = async () => {
  loading.value = true
  const { data } = await (supabase.from('insurance_plans') as any).select('*').order('price_per_ride')
  plans.value = data || []
  loading.value = false
}

const fetchUserInsurances = async () => {
  const { data } = await (supabase.from('user_insurance') as any)
    .select(`*, user:users(full_name, phone), plan:insurance_plans(*)`)
    .order('created_at', { ascending: false })
  userInsurances.value = data || []
}

const fetchClaims = async () => {
  const { data } = await (supabase.from('insurance_claims') as any)
    .select(`*, user:users(full_name, phone)`)
    .order('created_at', { ascending: false })
  claims.value = data || []
}

const openPlanModal = (plan?: InsurancePlan) => {
  if (plan) {
    editingPlan.value = plan
    planForm.value = { ...plan, coverage_details: [...plan.coverage_details] }
  } else {
    editingPlan.value = null
    planForm.value = { name_th: '', name_en: '', description_th: '', coverage_type: 'basic',
      coverage_amount: 0, price_per_ride: 0, price_monthly: null, coverage_details: [], is_active: true }
  }
  showPlanModal.value = true
}

const addDetail = () => { if (newDetail.value.trim()) { planForm.value.coverage_details.push(newDetail.value.trim()); newDetail.value = '' } }
const removeDetail = (i: number) => { planForm.value.coverage_details.splice(i, 1) }

const savePlan = async () => {
  loading.value = true
  if (editingPlan.value) {
    await (supabase.from('insurance_plans') as any).update(planForm.value).eq('id', editingPlan.value.id)
  } else {
    await (supabase.from('insurance_plans') as any).insert(planForm.value)
  }
  showPlanModal.value = false
  await fetchPlans()
  loading.value = false
}

const togglePlanStatus = async (plan: InsurancePlan) => {
  await (supabase.from('insurance_plans') as any).update({ is_active: !plan.is_active }).eq('id', plan.id)
  await fetchPlans()
}

const openClaimModal = (claim: InsuranceClaim) => {
  selectedClaim.value = claim
  approvedAmount.value = claim.claimed_amount
  claimNote.value = ''
  showClaimModal.value = true
}

const updateClaimStatus = async (status: 'approved' | 'rejected') => {
  if (!selectedClaim.value) return
  await (supabase.from('insurance_claims') as any).update({
    status, approved_amount: status === 'approved' ? approvedAmount.value : 0,
    admin_notes: claimNote.value, reviewed_at: new Date().toISOString()
  }).eq('id', selectedClaim.value.id)
  showClaimModal.value = false
  await fetchClaims()
}

const formatPrice = (n: number) => new Intl.NumberFormat('th-TH').format(n)
const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH')
const getStatusColor = (s: string) => {
  const c: Record<string, string> = { active: '#22c55e', pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', expired: '#6b7280' }
  return c[s] || '#6b7280'
}
</script>

<template>
  <AdminLayout>
    <div class="admin-insurance">
      <header class="page-header">
        <h1>จัดการประกันภัย</h1>
        <button v-if="activeTab === 'plans'" @click="openPlanModal()" class="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          เพิ่มแผนประกัน
        </button>
      </header>

      <div class="stats-grid">
        <div class="stat-card"><span class="stat-value">{{ stats.activePlans }}</span><span class="stat-label">แผนประกัน</span></div>
        <div class="stat-card"><span class="stat-value">{{ stats.totalInsured }}</span><span class="stat-label">ผู้เอาประกัน</span></div>
        <div class="stat-card"><span class="stat-value">{{ stats.pendingClaims }}</span><span class="stat-label">เคลมรอดำเนินการ</span></div>
        <div class="stat-card"><span class="stat-value">฿{{ formatPrice(stats.totalCoverage) }}</span><span class="stat-label">วงเงินคุ้มครองรวม</span></div>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'plans' }]" @click="activeTab = 'plans'">แผนประกัน ({{ plans.length }})</button>
        <button :class="['tab', { active: activeTab === 'users' }]" @click="activeTab = 'users'">ผู้เอาประกัน ({{ userInsurances.length }})</button>
        <button :class="['tab', { active: activeTab === 'claims' }]" @click="activeTab = 'claims'">
          เคลม ({{ claims.length }})
          <span v-if="stats.pendingClaims" class="badge">{{ stats.pendingClaims }}</span>
        </button>
      </div>

      <!-- Plans Tab -->
      <div v-if="activeTab === 'plans'" class="plans-grid">
        <div v-for="plan in plans" :key="plan.id" :class="['plan-card', { inactive: !plan.is_active }]">
          <div class="plan-header">
            <span class="coverage-type">{{ plan.coverage_type }}</span>
            <span :class="['status-badge', plan.is_active ? 'active' : 'inactive']">{{ plan.is_active ? 'เปิด' : 'ปิด' }}</span>
          </div>
          <h3>{{ plan.name_th }}</h3>
          <p class="plan-desc">{{ plan.description_th }}</p>
          <div class="coverage-amount">
            <span class="label">คุ้มครองสูงสุด</span>
            <span class="value">฿{{ formatPrice(plan.coverage_amount) }}</span>
          </div>
          <div class="plan-price">
            <span class="price">฿{{ plan.price_per_ride }}</span><span class="unit">/เที่ยว</span>
          </div>
          <ul class="details-list">
            <li v-for="(d, i) in plan.coverage_details" :key="i">{{ d }}</li>
          </ul>
          <div class="plan-actions">
            <button @click="openPlanModal(plan)" class="btn-edit">แก้ไข</button>
            <button @click="togglePlanStatus(plan)" :class="plan.is_active ? 'btn-disable' : 'btn-enable'">{{ plan.is_active ? 'ปิด' : 'เปิด' }}</button>
          </div>
        </div>
      </div>

      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="table-section">
        <table class="data-table">
          <thead><tr><th>ผู้ใช้</th><th>แผนประกัน</th><th>ประเภท</th><th>สถานะ</th><th>หมดอายุ</th></tr></thead>
          <tbody>
            <tr v-for="ins in userInsurances" :key="ins.id">
              <td><div class="user-info"><span class="name">{{ ins.user?.full_name || '-' }}</span><span class="phone">{{ ins.user?.phone || '-' }}</span></div></td>
              <td>{{ ins.plan?.name_th || '-' }}</td>
              <td>{{ ins.subscription_type }}</td>
              <td><span class="status-dot" :style="{ background: getStatusColor(ins.status) }"></span>{{ ins.status }}</td>
              <td>{{ ins.valid_until ? formatDate(ins.valid_until) : 'ไม่จำกัด' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Claims Tab -->
      <div v-if="activeTab === 'claims'" class="claims-section">
        <div class="filters">
          <input v-model="searchQuery" type="text" placeholder="ค้นหา..." class="search-input"/>
          <select v-model="statusFilter" class="filter-select">
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>
        <div class="claims-list">
          <div v-for="claim in filteredClaims" :key="claim.id" class="claim-card">
            <div class="claim-header">
              <div class="user-info"><span class="name">{{ claim.user?.full_name || '-' }}</span><span class="phone">{{ claim.user?.phone || '-' }}</span></div>
              <span class="status-badge" :style="{ background: getStatusColor(claim.status) + '20', color: getStatusColor(claim.status) }">{{ claim.status }}</span>
            </div>
            <div class="claim-body">
              <div class="claim-type">{{ claim.claim_type }}</div>
              <p class="claim-desc">{{ claim.description }}</p>
              <div class="claim-meta">
                <span>วันเกิดเหตุ: {{ formatDate(claim.incident_date) }}</span>
                <span>ยอดเคลม: ฿{{ formatPrice(claim.claimed_amount) }}</span>
              </div>
            </div>
            <div v-if="claim.status === 'pending'" class="claim-actions">
              <button @click="openClaimModal(claim)" class="btn-review">ตรวจสอบ</button>
            </div>
            <div v-else-if="claim.approved_amount" class="approved-info">อนุมัติ: ฿{{ formatPrice(claim.approved_amount) }}</div>
          </div>
        </div>
      </div>

      <!-- Plan Modal -->
      <div v-if="showPlanModal" class="modal-overlay" @click="showPlanModal = false">
        <div class="modal-content" @click.stop>
          <h2>{{ editingPlan ? 'แก้ไขแผนประกัน' : 'เพิ่มแผนประกันใหม่' }}</h2>
          <form @submit.prevent="savePlan" class="plan-form">
            <div class="form-row">
              <div class="form-group"><label>ชื่อ (ไทย)</label><input v-model="planForm.name_th" required/></div>
              <div class="form-group"><label>ชื่อ (EN)</label><input v-model="planForm.name_en"/></div>
            </div>
            <div class="form-group"><label>รายละเอียด</label><textarea v-model="planForm.description_th" rows="2"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>ประเภท</label>
                <select v-model="planForm.coverage_type"><option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option><option value="comprehensive">Comprehensive</option></select>
              </div>
              <div class="form-group"><label>วงเงินคุ้มครอง</label><input v-model.number="planForm.coverage_amount" type="number" min="0" required/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>ราคา/เที่ยว</label><input v-model.number="planForm.price_per_ride" type="number" min="0" required/></div>
              <div class="form-group"><label>ราคา/เดือน</label><input v-model.number="planForm.price_monthly" type="number" min="0"/></div>
            </div>

            <div class="form-group">
              <label>รายละเอียดความคุ้มครอง</label>
              <div class="details-input"><input v-model="newDetail" @keyup.enter.prevent="addDetail" placeholder="เพิ่มรายละเอียด"/><button type="button" @click="addDetail" class="btn-add">+</button></div>
              <div class="details-tags"><span v-for="(d, i) in planForm.coverage_details" :key="i" class="detail-tag">{{ d }}<button type="button" @click="removeDetail(i)">&times;</button></span></div>
            </div>
            <div class="form-group"><label class="checkbox-label"><input type="checkbox" v-model="planForm.is_active"/><span>เปิดใช้งาน</span></label></div>
            <div class="modal-actions"><button type="button" @click="showPlanModal = false" class="btn-secondary">ยกเลิก</button><button type="submit" class="btn-primary" :disabled="loading">บันทึก</button></div>
          </form>
        </div>
      </div>

      <!-- Claim Review Modal -->
      <div v-if="showClaimModal && selectedClaim" class="modal-overlay" @click="showClaimModal = false">
        <div class="modal-content" @click.stop>
          <h2>ตรวจสอบเคลม</h2>
          <div class="claim-review">
            <div class="review-row"><span class="label">ผู้เคลม:</span><span>{{ selectedClaim.user?.full_name }}</span></div>
            <div class="review-row"><span class="label">ประเภท:</span><span>{{ selectedClaim.claim_type }}</span></div>
            <div class="review-row"><span class="label">วันเกิดเหตุ:</span><span>{{ formatDate(selectedClaim.incident_date) }}</span></div>
            <div class="review-row"><span class="label">รายละเอียด:</span><span>{{ selectedClaim.description }}</span></div>
            <div class="review-row"><span class="label">ยอดเคลม:</span><span class="amount">฿{{ formatPrice(selectedClaim.claimed_amount) }}</span></div>
            <div class="form-group"><label>ยอดอนุมัติ (บาท)</label><input v-model.number="approvedAmount" type="number" min="0" :max="selectedClaim.claimed_amount"/></div>
            <div class="form-group"><label>หมายเหตุ</label><textarea v-model="claimNote" rows="2" placeholder="หมายเหตุสำหรับ Admin"></textarea></div>
          </div>
          <div class="modal-actions">
            <button @click="updateClaimStatus('rejected')" class="btn-reject">ปฏิเสธ</button>
            <button @click="updateClaimStatus('approved')" class="btn-approve">อนุมัติ</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<style scoped>
.admin-insurance { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }
.btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
.stat-value { display: block; font-size: 28px; font-weight: 700; }
.stat-label { font-size: 14px; color: #6b6b6b; }
.tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.tab { padding: 10px 20px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; position: relative; }
.tab.active { background: #000; color: #fff; }
.tab .badge { position: absolute; top: -6px; right: -6px; background: #ef4444; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; }
.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.plan-card { background: #fff; border-radius: 12px; padding: 20px; border: 2px solid #e5e5e5; }
.plan-card.inactive { opacity: 0.6; }
.plan-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.coverage-type { font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; }
.status-badge { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #fee2e2; color: #991b1b; }
.plan-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.plan-desc { font-size: 14px; color: #6b6b6b; margin-bottom: 12px; }
.coverage-amount { display: flex; justify-content: space-between; padding: 12px; background: #f6f6f6; border-radius: 8px; margin-bottom: 12px; }
.coverage-amount .label { font-size: 14px; color: #6b6b6b; }
.coverage-amount .value { font-size: 18px; font-weight: 600; }
.plan-price { text-align: center; margin-bottom: 12px; }
.plan-price .price { font-size: 24px; font-weight: 700; }
.plan-price .unit { font-size: 14px; color: #6b6b6b; }
.details-list { list-style: none; padding: 0; margin: 0 0 16px; }
.details-list li { padding: 6px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
.details-list li::before { content: "✓ "; color: #22c55e; }
.plan-actions { display: flex; gap: 8px; }
.btn-edit, .btn-disable, .btn-enable { flex: 1; padding: 10px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; cursor: pointer; background: #fff; }
.btn-disable { color: #ef4444; }
.btn-enable { color: #22c55e; }

.table-section { background: #fff; border-radius: 12px; padding: 20px; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
.data-table th { font-weight: 600; font-size: 12px; color: #6b6b6b; text-transform: uppercase; }
.user-info { display: flex; flex-direction: column; }
.user-info .name { font-weight: 500; }
.user-info .phone { font-size: 12px; color: #6b6b6b; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.claims-section { background: #fff; border-radius: 12px; padding: 20px; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
.search-input { flex: 1; padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.filter-select { padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.claims-list { display: flex; flex-direction: column; gap: 12px; }
.claim-card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
.claim-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.claim-type { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #6b6b6b; margin-bottom: 4px; }
.claim-desc { font-size: 14px; margin-bottom: 8px; }
.claim-meta { display: flex; gap: 16px; font-size: 12px; color: #6b6b6b; }
.claim-actions { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5; }
.btn-review { width: 100%; padding: 10px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.approved-info { margin-top: 12px; padding: 8px 12px; background: #dcfce7; color: #166534; border-radius: 8px; font-size: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-content h2 { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.plan-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 14px; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.details-input { display: flex; gap: 8px; }
.details-input input { flex: 1; }
.btn-add { width: 40px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; }
.details-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.detail-tag { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f0f0f0; border-radius: 16px; font-size: 13px; }
.detail-tag button { background: none; border: none; font-size: 16px; cursor: pointer; color: #666; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.modal-actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-secondary { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.modal-actions .btn-primary { flex: 1; justify-content: center; }
.claim-review { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.review-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.review-row .label { color: #6b6b6b; }
.review-row .amount { font-weight: 600; }
.btn-reject { flex: 1; padding: 12px; background: #fee2e2; color: #991b1b; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-approve { flex: 1; padding: 12px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
</style>
