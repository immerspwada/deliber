<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchPromoCodes, createPromoCode } = useAdmin()

const promos = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)

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

const loadPromos = async () => {
  loading.value = true
  promos.value = await fetchPromoCodes()
  loading.value = false
}

onMounted(loadPromos)

const handleCreate = async () => {
  const promo = {
    ...newPromo.value,
    code: newPromo.value.code.toUpperCase(),
    is_active: true,
    used_count: 0,
    valid_from: new Date().toISOString()
  }
  await createPromoCode(promo)
  showModal.value = false
  resetForm()
  loadPromos()
}

const resetForm = () => {
  newPromo.value = { code: '', description: '', discount_type: 'fixed', discount_value: 0, max_discount: null, min_order_amount: 0, usage_limit: null, valid_until: '', category: 'all' }
}

const getCategoryLabel = (cat: string) => categoryOptions.find(c => c.value === cat)?.label || cat

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('th-TH') : '-'
const formatDiscount = (p: any) => p.discount_type === 'percentage' ? `${p.discount_value}%` : `฿${p.discount_value}`

// Usage tracking helpers
const getUsagePercent = (p: any) => {
  if (!p.usage_limit) return 0
  return Math.round(((p.used_count || 0) / p.usage_limit) * 100)
}

const getRemainingSlots = (p: any) => {
  if (!p.usage_limit) return Infinity
  return p.usage_limit - (p.used_count || 0)
}

const getDaysRemaining = (dateStr: string) => {
  if (!dateStr) return Infinity
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มโค้ด
        </button>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="promos-list">
        <div v-for="p in promos" :key="p.id" class="promo-card" :class="{ inactive: !p.is_active }">
          <div class="promo-header">
            <span class="promo-code">{{ p.code }}</span>
            <div class="promo-badges">
              <span v-if="p.category && p.category !== 'all'" class="promo-category">{{ getCategoryLabel(p.category) }}</span>
              <span class="promo-status" :class="{ active: p.is_active }">{{ p.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน' }}</span>
            </div>
          </div>
          <p class="promo-desc">{{ p.description }}</p>
          <div class="promo-value">{{ formatDiscount(p) }}</div>
          
          <!-- Usage Progress Bar -->
          <div v-if="p.usage_limit" class="usage-section">
            <div class="usage-header">
              <span class="usage-label">การใช้งาน</span>
              <span class="usage-count" :class="{ warning: getUsagePercent(p) >= 80, danger: getUsagePercent(p) >= 95 }">
                {{ p.used_count || 0 }}/{{ p.usage_limit }}
                <span class="usage-percent">({{ getUsagePercent(p) }}%)</span>
              </span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getUsagePercent(p) + '%' }" :class="{ warning: getUsagePercent(p) >= 80, danger: getUsagePercent(p) >= 95 }"></div>
            </div>
            <div v-if="getRemainingSlots(p) <= 10" class="usage-alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              เหลือ {{ getRemainingSlots(p) }} สิทธิ์
            </div>
          </div>
          <div v-else class="usage-section">
            <div class="usage-header">
              <span class="usage-label">การใช้งาน</span>
              <span class="usage-count unlimited">{{ p.used_count || 0 }} ครั้ง (ไม่จำกัด)</span>
            </div>
          </div>
          
          <div class="promo-meta">
            <span>หมดอายุ: {{ formatDate(p.valid_until) }}</span>
            <span v-if="getDaysRemaining(p.valid_until) <= 3 && getDaysRemaining(p.valid_until) > 0" class="expiry-warning">
              เหลือ {{ getDaysRemaining(p.valid_until) }} วัน
            </span>
          </div>
        </div>
      </div>

      <!-- Create Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>เพิ่มโค้ดโปรโมชั่น</h2>
            <button class="close-btn" @click="showModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>รหัสโค้ด</label>
              <input v-model="newPromo.code" class="form-input" placeholder="เช่น SAVE50"/>
            </div>
            <div class="form-group">
              <label>คำอธิบาย</label>
              <input v-model="newPromo.description" class="form-input" placeholder="ส่วนลดสำหรับ..."/>
            </div>
            <div class="form-group">
              <label>หมวดหมู่</label>
              <select v-model="newPromo.category" class="form-input">
                <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ประเภทส่วนลด</label>
                <select v-model="newPromo.discount_type" class="form-input">
                  <option value="fixed">จำนวนเงิน (บาท)</option>
                  <option value="percentage">เปอร์เซ็นต์ (%)</option>
                </select>
              </div>
              <div class="form-group">
                <label>มูลค่าส่วนลด</label>
                <input v-model.number="newPromo.discount_value" type="number" class="form-input"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>จำกัดการใช้</label>
                <input v-model.number="newPromo.usage_limit" type="number" class="form-input" placeholder="ไม่จำกัด"/>
              </div>
              <div class="form-group">
                <label>หมดอายุ</label>
                <input v-model="newPromo.valid_until" type="date" class="form-input"/>
              </div>
            </div>
            <button class="btn-create" @click="handleCreate">สร้างโค้ด</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

.btn-add { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-add:hover { background: #333; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.promos-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.promo-card { background: #fff; border-radius: 12px; padding: 20px; transition: all 0.2s; }
.promo-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.promo-card.inactive { opacity: 0.6; }

.promo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 8px; }
.promo-code { font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
.promo-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.promo-category { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #f0f0f0; color: #333; }
.promo-status { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: #ffebee; color: #e11900; }
.promo-status.active { background: #e6f7ed; color: #05944f; }
.promo-desc { font-size: 14px; color: #6b6b6b; margin-bottom: 12px; }
.promo-value { font-size: 28px; font-weight: 700; margin-bottom: 12px; }

/* Usage Section */
.usage-section { margin-bottom: 12px; }
.usage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.usage-label { font-size: 12px; color: #6b6b6b; }
.usage-count { font-size: 12px; font-weight: 600; color: #000; }
.usage-count.warning { color: #d97706; }
.usage-count.danger { color: #e11900; }
.usage-count.unlimited { color: #6b6b6b; font-weight: 400; }
.usage-percent { font-weight: 400; color: #999; }

.progress-bar { height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #22c55e; border-radius: 3px; transition: width 0.3s ease; }
.progress-fill.warning { background: #fbbf24; }
.progress-fill.danger { background: #e11900; }

.usage-alert { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 11px; color: #e11900; font-weight: 500; }
.usage-alert svg { flex-shrink: 0; }

.promo-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.expiry-warning { color: #d97706; font-weight: 500; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 40px; height: 40px; border: none; background: none; cursor: pointer; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.close-btn:hover { background: #f6f6f6; }
.modal-body { padding: 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; }
.form-input:focus { outline: none; border-color: #000; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.btn-create { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 8px; }
.btn-create:hover { background: #333; }
</style>
