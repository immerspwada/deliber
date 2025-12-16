<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchPromoCodes, createPromoCode, updatePromoCode } = useAdmin()

const promos = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const showEditModal = ref(false)
const editingPromo = ref<any>(null)

// Filters
const filterCategory = ref('all')
const filterStatus = ref('all')
const searchQuery = ref('')

const newPromo = ref({
  code: '',
  description: '',
  discount_type: 'fixed',
  discount_value: 0,
  max_discount: null as number | null,
  min_order_amount: 0,
  usage_limit: null as number | null,
  valid_until: '',
  category: 'all' as 'all' | 'ride' | 'delivery' | 'shopping'
})

const categoryOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'ride', label: 'เรียกรถ' },
  { value: 'delivery', label: 'ส่งของ' },
  { value: 'shopping', label: 'ซื้อของ' }
]

const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'active', label: 'ใช้งานได้' },
  { value: 'inactive', label: 'ปิดใช้งาน' },
  { value: 'expiring', label: 'ใกล้หมดอายุ' },
  { value: 'low_stock', label: 'ใกล้หมดสิทธิ์' }
]

// Analytics
const analytics = computed(() => {
  const total = promos.value.length
  const active = promos.value.filter(p => p.is_active).length
  const totalUsed = promos.value.reduce((sum, p) => sum + (p.used_count || 0), 0)
  const totalLimit = promos.value.reduce((sum, p) => sum + (p.usage_limit || 0), 0)
  const avgUsageRate = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0
  const topPromos = [...promos.value].filter(p => p.is_active).sort((a, b) => (b.used_count || 0) - (a.used_count || 0)).slice(0, 3)
  const byCategory = categoryOptions.slice(1).map(cat => ({
    ...cat,
    count: promos.value.filter(p => p.category === cat.value).length,
    used: promos.value.filter(p => p.category === cat.value).reduce((sum, p) => sum + (p.used_count || 0), 0)
  }))
  return { total, active, totalUsed, avgUsageRate, topPromos, byCategory }
})

// Filtered promos
const filteredPromos = computed(() => {
  return promos.value.filter(p => {
    if (filterCategory.value !== 'all' && p.category !== filterCategory.value) return false
    if (filterStatus.value === 'active' && !p.is_active) return false
    if (filterStatus.value === 'inactive' && p.is_active) return false
    if (filterStatus.value === 'expiring' && getDaysRemaining(p.valid_until) > 3) return false
    if (filterStatus.value === 'low_stock' && getRemainingSlots(p) > 10) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!p.code.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const loadPromos = async () => {
  loading.value = true
  promos.value = await fetchPromoCodes()
  loading.value = false
}

onMounted(loadPromos)

const handleCreate = async () => {
  const promo = { ...newPromo.value, code: newPromo.value.code.toUpperCase(), is_active: true, used_count: 0, valid_from: new Date().toISOString() }
  await createPromoCode(promo)
  showModal.value = false
  resetForm()
  loadPromos()
}

const openEditModal = (promo: any) => {
  editingPromo.value = { ...promo }
  showEditModal.value = true
}

const handleUpdate = async () => {
  if (!editingPromo.value) return
  await updatePromoCode(editingPromo.value.id, editingPromo.value)
  showEditModal.value = false
  editingPromo.value = null
  loadPromos()
}

const togglePromoStatus = async (promo: any) => {
  await updatePromoCode(promo.id, { is_active: !promo.is_active })
  loadPromos()
}

const resetForm = () => {
  newPromo.value = { code: '', description: '', discount_type: 'fixed', discount_value: 0, max_discount: null, min_order_amount: 0, usage_limit: null, valid_until: '', category: 'all' }
}

const getCategoryLabel = (cat: string) => categoryOptions.find(c => c.value === cat)?.label || cat
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('th-TH') : '-'
const formatDiscount = (p: any) => p.discount_type === 'percentage' ? `${p.discount_value}%` : `฿${p.discount_value}`
const getUsagePercent = (p: any) => !p.usage_limit ? 0 : Math.round(((p.used_count || 0) / p.usage_limit) * 100)
const getRemainingSlots = (p: any) => !p.usage_limit ? Infinity : p.usage_limit - (p.used_count || 0)
const getDaysRemaining = (dateStr: string) => !dateStr ? Infinity : Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h1>โปรโมชั่น</h1>
          <p class="subtitle">{{ promos.length }} โค้ดทั้งหมด</p>
        </div>
        <button class="btn-add" @click="showModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          เพิ่มโค้ด
        </button>
      </div>

      <!-- Analytics -->
      <div class="analytics-grid">
        <div class="stat-card">
          <div class="stat-value">{{ analytics.total }}</div>
          <div class="stat-label">โค้ดทั้งหมด</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.active }}</div>
          <div class="stat-label">ใช้งานได้</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.totalUsed.toLocaleString() }}</div>
          <div class="stat-label">ใช้แล้วทั้งหมด</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ analytics.avgUsageRate }}%</div>
          <div class="stat-label">อัตราการใช้</div>
        </div>
      </div>

      <!-- Top & Category -->
      <div class="analytics-row">
        <div class="analytics-card">
          <h3>Top Performing</h3>
          <div v-for="(p, i) in analytics.topPromos" :key="p.id" class="top-item">
            <span class="top-rank">{{ i + 1 }}</span>
            <span class="top-code">{{ p.code }}</span>
            <span class="top-used">{{ p.used_count || 0 }}</span>
            <div class="top-bar"><div class="top-fill" :style="{ width: getUsagePercent(p) + '%' }"></div></div>
          </div>
          <div v-if="analytics.topPromos.length === 0" class="empty-top">ยังไม่มีข้อมูล</div>
        </div>
        <div class="analytics-card">
          <h3>ตามหมวดหมู่</h3>
          <div v-for="cat in analytics.byCategory" :key="cat.value" class="cat-item">
            <span class="cat-label">{{ cat.label }}</span>
            <span class="cat-count">{{ cat.count }} โค้ด</span>
            <span class="cat-used">{{ cat.used }} ใช้</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input v-model="searchQuery" type="text" placeholder="ค้นหาโค้ด..." />
        </div>
        <select v-model="filterCategory" class="filter-select">
          <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
        <select v-model="filterStatus" class="filter-select">
          <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="promos-list">
        <div v-for="p in filteredPromos" :key="p.id" class="promo-card" :class="{ inactive: !p.is_active }">
          <div class="promo-header">
            <span class="promo-code">{{ p.code }}</span>
            <div class="promo-badges">
              <span v-if="p.category && p.category !== 'all'" class="promo-category">{{ getCategoryLabel(p.category) }}</span>
              <span class="promo-status" :class="{ active: p.is_active }">{{ p.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน' }}</span>
            </div>
          </div>
          <p class="promo-desc">{{ p.description }}</p>
          <div class="promo-value">{{ formatDiscount(p) }}</div>
          
          <div v-if="p.usage_limit" class="usage-section">
            <div class="usage-header">
              <span class="usage-label">การใช้งาน</span>
              <span class="usage-count" :class="{ warning: getUsagePercent(p) >= 80, danger: getUsagePercent(p) >= 95 }">{{ p.used_count || 0 }}/{{ p.usage_limit }} ({{ getUsagePercent(p) }}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: getUsagePercent(p) + '%' }" :class="{ warning: getUsagePercent(p) >= 80, danger: getUsagePercent(p) >= 95 }"></div></div>
            <div v-if="getRemainingSlots(p) <= 10" class="usage-alert">เหลือ {{ getRemainingSlots(p) }} สิทธิ์</div>
          </div>
          <div v-else class="usage-section">
            <span class="usage-count unlimited">{{ p.used_count || 0 }} ครั้ง (ไม่จำกัด)</span>
          </div>
          
          <div class="promo-meta">
            <span>หมดอายุ: {{ formatDate(p.valid_until) }}</span>
            <span v-if="getDaysRemaining(p.valid_until) <= 3 && getDaysRemaining(p.valid_until) > 0" class="expiry-warning">เหลือ {{ getDaysRemaining(p.valid_until) }} วัน</span>
          </div>

          <div class="promo-actions">
            <button class="action-btn" @click="openEditModal(p)">แก้ไข</button>
            <button class="action-btn" :class="p.is_active ? 'danger' : 'success'" @click="togglePromoStatus(p)">{{ p.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}</button>
          </div>
        </div>
        <div v-if="filteredPromos.length === 0" class="empty-state">ไม่พบโปรโมชั่นที่ตรงกับเงื่อนไข</div>
      </div>

      <!-- Create Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header"><h2>เพิ่มโค้ดโปรโมชั่น</h2><button class="close-btn" @click="showModal = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>รหัสโค้ด</label><input v-model="newPromo.code" class="form-input" placeholder="เช่น SAVE50"/></div>
            <div class="form-group"><label>คำอธิบาย</label><input v-model="newPromo.description" class="form-input"/></div>
            <div class="form-group"><label>หมวดหมู่</label><select v-model="newPromo.category" class="form-input"><option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option></select></div>
            <div class="form-row">
              <div class="form-group"><label>ประเภท</label><select v-model="newPromo.discount_type" class="form-input"><option value="fixed">บาท</option><option value="percentage">%</option></select></div>
              <div class="form-group"><label>มูลค่า</label><input v-model.number="newPromo.discount_value" type="number" class="form-input"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>จำกัดการใช้</label><input v-model.number="newPromo.usage_limit" type="number" class="form-input" placeholder="ไม่จำกัด"/></div>
              <div class="form-group"><label>หมดอายุ</label><input v-model="newPromo.valid_until" type="date" class="form-input"/></div>
            </div>
            <button class="btn-create" @click="handleCreate">สร้างโค้ด</button>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal && editingPromo" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal-content">
          <div class="modal-header"><h2>แก้ไขโปรโมชั่น</h2><button class="close-btn" @click="showEditModal = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>รหัสโค้ด</label><input v-model="editingPromo.code" class="form-input" disabled/></div>
            <div class="form-group"><label>คำอธิบาย</label><input v-model="editingPromo.description" class="form-input"/></div>
            <div class="form-group"><label>หมวดหมู่</label><select v-model="editingPromo.category" class="form-input"><option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option></select></div>
            <div class="form-row">
              <div class="form-group"><label>ประเภท</label><select v-model="editingPromo.discount_type" class="form-input"><option value="fixed">บาท</option><option value="percentage">%</option></select></div>
              <div class="form-group"><label>มูลค่า</label><input v-model.number="editingPromo.discount_value" type="number" class="form-input"/></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>จำกัดการใช้</label><input v-model.number="editingPromo.usage_limit" type="number" class="form-input"/></div>
              <div class="form-group"><label>หมดอายุ</label><input v-model="editingPromo.valid_until" type="date" class="form-input"/></div>
            </div>
            <button class="btn-create" @click="handleUpdate">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }
.btn-add { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-add:hover { background: #333; }

/* Analytics */
.analytics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; color: #6b6b6b; margin-top: 4px; }

.analytics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.analytics-card { background: #fff; border-radius: 12px; padding: 20px; }
.analytics-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.top-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.top-rank { width: 24px; height: 24px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.top-code { font-weight: 600; flex: 1; }
.top-used { font-size: 13px; color: #6b6b6b; }
.top-bar { width: 60px; height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
.top-fill { height: 100%; background: #22c55e; border-radius: 3px; }
.empty-top { color: #999; font-size: 13px; }
.cat-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.cat-label { font-weight: 500; }
.cat-count, .cat-used { font-size: 13px; color: #6b6b6b; }

/* Filters */
.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; }
.search-box input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 14px; }
.search-box svg { color: #6b6b6b; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; background: #fff; cursor: pointer; }

/* Loading */
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Promos List */
.promos-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.promo-card { background: #fff; border-radius: 12px; padding: 20px; }
.promo-card.inactive { opacity: 0.6; }
.promo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
.promo-code { font-size: 18px; font-weight: 700; font-family: monospace; }
.promo-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.promo-category { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #f0f0f0; }
.promo-status { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #ffebee; color: #e11900; }
.promo-status.active { background: #e6f7ed; color: #05944f; }
.promo-desc { font-size: 14px; color: #6b6b6b; margin-bottom: 12px; }
.promo-value { font-size: 28px; font-weight: 700; margin-bottom: 12px; }

/* Usage */
.usage-section { margin-bottom: 12px; }
.usage-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.usage-label { font-size: 12px; color: #6b6b6b; }
.usage-count { font-size: 12px; font-weight: 600; }
.usage-count.warning { color: #d97706; }
.usage-count.danger { color: #e11900; }
.usage-count.unlimited { color: #6b6b6b; font-weight: 400; }
.progress-bar { height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #22c55e; border-radius: 3px; }
.progress-fill.warning { background: #fbbf24; }
.progress-fill.danger { background: #e11900; }
.usage-alert { font-size: 11px; color: #e11900; font-weight: 500; margin-top: 6px; }
.promo-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; margin-bottom: 12px; }
.expiry-warning { color: #d97706; font-weight: 500; }

/* Actions */
.promo-actions { display: flex; gap: 8px; }
.action-btn { flex: 1; padding: 10px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; background: #fff; }
.action-btn:hover { background: #f6f6f6; }
.action-btn.danger { color: #e11900; border-color: #e11900; }
.action-btn.success { color: #05944f; border-color: #05944f; }

/* Empty */
.empty-state { text-align: center; padding: 48px; color: #6b6b6b; grid-column: 1 / -1; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 32px; height: 32px; border: none; background: none; font-size: 24px; cursor: pointer; border-radius: 8px; }
.close-btn:hover { background: #f6f6f6; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.form-input:focus { outline: none; border-color: #000; }
.form-input:disabled { background: #f6f6f6; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-create { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 8px; }
.btn-create:hover { background: #333; }

@media (max-width: 768px) {
  .analytics-grid { grid-template-columns: repeat(2, 1fr); }
  .analytics-row { grid-template-columns: 1fr; }
}
</style>
