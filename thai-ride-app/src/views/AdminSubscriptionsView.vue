<script setup lang="ts">
/**
 * Feature: F21 - Admin Subscription Plans Management
 * Tables: subscription_plans, user_subscriptions
 */
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/AdminLayout.vue'

interface SubscriptionPlan {
  id: string
  name_th: string
  name_en: string
  description_th: string
  plan_type: string
  billing_cycle: string
  price: number
  original_price: number | null
  discount_percentage: number
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
}

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  current_period_end: string
  auto_renew: boolean
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  user?: { full_name: string; phone: string }
  plan?: SubscriptionPlan
}

const loading = ref(false)
const plans = ref<SubscriptionPlan[]>([])
const subscriptions = ref<UserSubscription[]>([])
const activeTab = ref<'plans' | 'subscriptions'>('plans')
const searchQuery = ref('')
const statusFilter = ref('all')
const showPlanModal = ref(false)
const editingPlan = ref<SubscriptionPlan | null>(null)

const planForm = ref({
  name_th: '',
  name_en: '',
  description_th: '',
  plan_type: 'basic',
  billing_cycle: 'monthly',
  price: 0,
  original_price: null as number | null,
  discount_percentage: 0,
  features: [] as string[],
  is_active: true,
  sort_order: 0
})
const newFeature = ref('')

const stats = computed(() => ({
  totalPlans: plans.value.length,
  activePlans: plans.value.filter(p => p.is_active).length,
  totalSubscribers: subscriptions.value.length,
  activeSubscribers: subscriptions.value.filter(s => s.status === 'active').length,
  monthlyRevenue: subscriptions.value
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.plan?.price || 0), 0)
}))

const filteredSubscriptions = computed(() => {
  let result = subscriptions.value
  if (statusFilter.value !== 'all') {
    result = result.filter(s => s.status === statusFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.user?.full_name?.toLowerCase().includes(q) ||
      s.user?.phone?.includes(q) ||
      s.plan?.name_th?.toLowerCase().includes(q)
    )
  }
  return result
})

onMounted(() => {
  fetchPlans()
  fetchSubscriptions()
})

const fetchPlans = async () => {
  loading.value = true
  const { data } = await (supabase.from('subscription_plans') as any)
    .select('*')
    .order('sort_order', { ascending: true })
  plans.value = data || []
  loading.value = false
}

const fetchSubscriptions = async () => {
  const { data } = await (supabase.from('user_subscriptions') as any)
    .select(`*, user:users(full_name, phone), plan:subscription_plans(*)`)
    .order('created_at', { ascending: false })
  subscriptions.value = data || []
}

const openPlanModal = (plan?: SubscriptionPlan) => {
  if (plan) {
    editingPlan.value = plan
    planForm.value = { ...plan, features: [...plan.features] }
  } else {
    editingPlan.value = null
    planForm.value = {
      name_th: '', name_en: '', description_th: '', plan_type: 'basic',
      billing_cycle: 'monthly', price: 0, original_price: null,
      discount_percentage: 0, features: [], is_active: true, sort_order: plans.value.length
    }
  }
  showPlanModal.value = true
}

const addFeature = () => {
  if (newFeature.value.trim()) {
    planForm.value.features.push(newFeature.value.trim())
    newFeature.value = ''
  }
}

const removeFeature = (idx: number) => {
  planForm.value.features.splice(idx, 1)
}

const savePlan = async () => {
  loading.value = true
  if (editingPlan.value) {
    await (supabase.from('subscription_plans') as any)
      .update(planForm.value)
      .eq('id', editingPlan.value.id)
  } else {
    await (supabase.from('subscription_plans') as any).insert(planForm.value)
  }
  showPlanModal.value = false
  await fetchPlans()
  loading.value = false
}

const togglePlanStatus = async (plan: SubscriptionPlan) => {
  await (supabase.from('subscription_plans') as any)
    .update({ is_active: !plan.is_active })
    .eq('id', plan.id)
  await fetchPlans()
}

const cancelUserSubscription = async (sub: UserSubscription) => {
  if (!confirm('ยืนยันยกเลิกแพ็คเกจของผู้ใช้นี้?')) return
  await (supabase.from('user_subscriptions') as any)
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', sub.id)
  await fetchSubscriptions()
}

const formatPrice = (n: number) => new Intl.NumberFormat('th-TH').format(n)
const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH')

const getBillingLabel = (cycle: string) => {
  const labels: Record<string, string> = {
    weekly: 'รายสัปดาห์', monthly: 'รายเดือน', quarterly: 'รายไตรมาส', yearly: 'รายปี'
  }
  return labels[cycle] || cycle
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: '#22c55e', cancelled: '#ef4444', expired: '#6b7280', paused: '#f59e0b'
  }
  return colors[status] || '#6b7280'
}
</script>

<template>
  <AdminLayout>
    <div class="admin-subscriptions">
      <header class="page-header">
        <h1>จัดการแพ็คเกจสมาชิก</h1>
        <button v-if="activeTab === 'plans'" @click="openPlanModal()" class="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มแพ็คเกจ
        </button>
      </header>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalPlans }}</span>
          <span class="stat-label">แพ็คเกจทั้งหมด</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.activeSubscribers }}</span>
          <span class="stat-label">สมาชิกปัจจุบัน</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">฿{{ formatPrice(stats.monthlyRevenue) }}</span>
          <span class="stat-label">รายได้/เดือน</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'plans' }]" @click="activeTab = 'plans'">
          แพ็คเกจ ({{ plans.length }})
        </button>
        <button :class="['tab', { active: activeTab === 'subscriptions' }]" @click="activeTab = 'subscriptions'">
          สมาชิก ({{ subscriptions.length }})
        </button>
      </div>

      <!-- Plans Tab -->
      <div v-if="activeTab === 'plans'" class="plans-grid">
        <div v-for="plan in plans" :key="plan.id" :class="['plan-card', { inactive: !plan.is_active }]">
          <div class="plan-header">
            <span class="plan-type">{{ plan.plan_type }}</span>
            <span :class="['status-badge', plan.is_active ? 'active' : 'inactive']">
              {{ plan.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
            </span>
          </div>
          <h3>{{ plan.name_th }}</h3>
          <p class="plan-desc">{{ plan.description_th }}</p>
          <div class="plan-price">
            <span v-if="plan.original_price" class="original">฿{{ formatPrice(plan.original_price) }}</span>
            <span class="current">฿{{ formatPrice(plan.price) }}</span>
            <span class="cycle">/{{ getBillingLabel(plan.billing_cycle) }}</span>
          </div>
          <ul class="features-list">
            <li v-for="(f, i) in plan.features" :key="i">{{ f }}</li>
          </ul>
          <div class="plan-actions">
            <button @click="openPlanModal(plan)" class="btn-edit">แก้ไข</button>
            <button @click="togglePlanStatus(plan)" :class="plan.is_active ? 'btn-disable' : 'btn-enable'">
              {{ plan.is_active ? 'ปิด' : 'เปิด' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Subscriptions Tab -->
      <div v-if="activeTab === 'subscriptions'" class="subscriptions-section">
        <div class="filters">
          <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, เบอร์โทร..." class="search-input"/>
          <select v-model="statusFilter" class="filter-select">
            <option value="all">ทุกสถานะ</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>แพ็คเกจ</th>
                <th>ราคา</th>
                <th>สถานะ</th>
                <th>หมดอายุ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in filteredSubscriptions" :key="sub.id">
                <td>
                  <div class="user-info">
                    <span class="name">{{ sub.user?.full_name || '-' }}</span>
                    <span class="phone">{{ sub.user?.phone || '-' }}</span>
                  </div>
                </td>
                <td>{{ sub.plan?.name_th || '-' }}</td>
                <td>฿{{ formatPrice(sub.plan?.price || 0) }}</td>
                <td>
                  <span class="status-dot" :style="{ background: getStatusColor(sub.status) }"></span>
                  {{ sub.status }}
                </td>
                <td>{{ formatDate(sub.current_period_end) }}</td>
                <td>
                  <button v-if="sub.status === 'active'" @click="cancelUserSubscription(sub)" class="btn-cancel">
                    ยกเลิก
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Plan Modal -->
      <div v-if="showPlanModal" class="modal-overlay" @click="showPlanModal = false">
        <div class="modal-content" @click.stop>
          <h2>{{ editingPlan ? 'แก้ไขแพ็คเกจ' : 'เพิ่มแพ็คเกจใหม่' }}</h2>
          <form @submit.prevent="savePlan" class="plan-form">
            <div class="form-row">
              <div class="form-group">
                <label>ชื่อ (ไทย)</label>
                <input v-model="planForm.name_th" required/>
              </div>
              <div class="form-group">
                <label>ชื่อ (EN)</label>
                <input v-model="planForm.name_en"/>
              </div>
            </div>
            <div class="form-group">
              <label>รายละเอียด</label>
              <textarea v-model="planForm.description_th" rows="2"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ประเภท</label>
                <select v-model="planForm.plan_type">
                  <option value="basic">Basic</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
              <div class="form-group">
                <label>รอบบิล</label>
                <select v-model="planForm.billing_cycle">
                  <option value="weekly">รายสัปดาห์</option>
                  <option value="monthly">รายเดือน</option>
                  <option value="quarterly">รายไตรมาส</option>
                  <option value="yearly">รายปี</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ราคา (บาท)</label>
                <input v-model.number="planForm.price" type="number" min="0" required/>
              </div>
              <div class="form-group">
                <label>ราคาเดิม</label>
                <input v-model.number="planForm.original_price" type="number" min="0"/>
              </div>
              <div class="form-group">
                <label>ส่วนลด %</label>
                <input v-model.number="planForm.discount_percentage" type="number" min="0" max="100"/>
              </div>
            </div>

            <div class="form-group">
              <label>สิทธิประโยชน์</label>
              <div class="features-input">
                <input v-model="newFeature" @keyup.enter.prevent="addFeature" placeholder="เพิ่มสิทธิประโยชน์"/>
                <button type="button" @click="addFeature" class="btn-add">+</button>
              </div>
              <div class="features-tags">
                <span v-for="(f, i) in planForm.features" :key="i" class="feature-tag">
                  {{ f }}
                  <button type="button" @click="removeFeature(i)">&times;</button>
                </span>
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.is_active"/>
                <span>เปิดใช้งาน</span>
              </label>
            </div>
            <div class="modal-actions">
              <button type="button" @click="showPlanModal = false" class="btn-secondary">ยกเลิก</button>
              <button type="submit" class="btn-primary" :disabled="loading">บันทึก</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-subscriptions { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }
.btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
.stat-value { display: block; font-size: 28px; font-weight: 700; }
.stat-label { font-size: 14px; color: #6b6b6b; }
.tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.tab { padding: 10px 20px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.tab.active { background: #000; color: #fff; }

.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.plan-card { background: #fff; border-radius: 12px; padding: 20px; border: 2px solid #e5e5e5; }
.plan-card.inactive { opacity: 0.6; }
.plan-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.plan-type { font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 4px 8px; background: #f0f0f0; border-radius: 4px; }
.status-badge { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.inactive { background: #fee2e2; color: #991b1b; }
.plan-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.plan-desc { font-size: 14px; color: #6b6b6b; margin-bottom: 12px; }
.plan-price { margin-bottom: 16px; }
.plan-price .original { font-size: 14px; color: #999; text-decoration: line-through; margin-right: 8px; }
.plan-price .current { font-size: 24px; font-weight: 700; }
.plan-price .cycle { font-size: 14px; color: #6b6b6b; }
.features-list { list-style: none; padding: 0; margin: 0 0 16px; }
.features-list li { padding: 6px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
.features-list li::before { content: "✓ "; color: #22c55e; }
.plan-actions { display: flex; gap: 8px; }
.btn-edit, .btn-disable, .btn-enable { flex: 1; padding: 10px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; cursor: pointer; background: #fff; }
.btn-disable { color: #ef4444; }
.btn-enable { color: #22c55e; }
.subscriptions-section { background: #fff; border-radius: 12px; padding: 20px; }
.filters { display: flex; gap: 12px; margin-bottom: 16px; }
.search-input { flex: 1; padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.filter-select { padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
.data-table th { font-weight: 600; font-size: 12px; color: #6b6b6b; text-transform: uppercase; }
.user-info { display: flex; flex-direction: column; }
.user-info .name { font-weight: 500; }
.user-info .phone { font-size: 12px; color: #6b6b6b; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.btn-cancel { padding: 6px 12px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-content h2 { font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.plan-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 14px; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.features-input { display: flex; gap: 8px; }
.features-input input { flex: 1; }
.btn-add { width: 40px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; }
.features-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.feature-tag { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f0f0f0; border-radius: 16px; font-size: 13px; }
.feature-tag button { background: none; border: none; font-size: 16px; cursor: pointer; color: #666; }
.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.modal-actions { display: flex; gap: 12px; margin-top: 8px; }
.btn-secondary { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.modal-actions .btn-primary { flex: 1; justify-content: center; }
</style>
