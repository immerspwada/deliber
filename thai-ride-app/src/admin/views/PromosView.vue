<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()
const isLoading = ref(true)
const promos = ref<any[]>([])
const totalPromos = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const showCreateModal = ref(false)
const saving = ref(false)
const newPromo = ref({ code: '', description: '', discount_type: 'percentage', discount_value: 10, usage_limit: 100, is_active: true })

async function loadPromos() {
  isLoading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    let query = supabase.from('promo_codes').select('*', { count: 'exact' })
    if (searchQuery.value) query = query.ilike('code', `%${searchQuery.value}%`)
    if (statusFilter.value === 'active') query = query.eq('is_active', true)
    if (statusFilter.value === 'inactive') query = query.eq('is_active', false)
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize.value - 1)
    const { data, count } = await query
    promos.value = data || []
    totalPromos.value = count || 0
    totalPages.value = Math.ceil((count || 0) / pageSize.value)
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

async function createPromo() {
  saving.value = true
  try {
    await supabase.from('promo_codes').insert([newPromo.value])
    showCreateModal.value = false
    newPromo.value = { code: '', description: '', discount_type: 'percentage', discount_value: 10, usage_limit: 100, is_active: true }
    loadPromos()
  } catch (e) { console.error(e) } finally { saving.value = false }
}

async function toggleStatus(p: any) {
  await supabase.from('promo_codes').update({ is_active: !p.is_active }).eq('id', p.id)
  loadPromos()
}

function formatCurrency(n: number) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(n) }

watch([searchQuery, statusFilter], () => { currentPage.value = 1; loadPromos() })
watch(currentPage, loadPromos)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Marketing' }, { label: 'โปรโมชั่น' }]); loadPromos() })
</script>

<template>
  <div class="promos-view">
    <div class="page-header">
      <div class="header-left"><h1 class="page-title">โปรโมชั่น</h1><span class="total-count">{{ totalPromos }}</span></div>
      <button class="create-btn" @click="showCreateModal = true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>สร้างโปรโม</button>
    </div>
    <div class="filters-bar">
      <div class="search-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input v-model="searchQuery" type="text" placeholder="ค้นหาโค้ด..." class="search-input" /></div>
      <select v-model="statusFilter" class="filter-select"><option value="">ทุกสถานะ</option><option value="active">ใช้งาน</option><option value="inactive">ปิด</option></select>
    </div>
    <div class="table-container">
      <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 8" :key="i" /></div>
      <table v-else-if="promos.length" class="data-table">
        <thead><tr><th>โค้ด</th><th>ส่วนลด</th><th>ใช้แล้ว/จำกัด</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in promos" :key="p.id">
            <td><code class="promo-code">{{ p.code }}</code><div class="desc">{{ p.description || '-' }}</div></td>
            <td class="discount">{{ p.discount_type === 'percentage' ? `${p.discount_value}%` : formatCurrency(p.discount_value) }}</td>
            <td>{{ p.usage_count || 0 }} / {{ p.usage_limit || '∞' }}</td>
            <td><button class="status-toggle" :class="{ active: p.is_active }" @click="toggleStatus(p)">{{ p.is_active ? 'ใช้งาน' : 'ปิด' }}</button></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบโปรโมชั่น</p></div>
    </div>
    <div v-if="totalPages > 1" class="pagination"><button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span>{{ currentPage }} / {{ totalPages }}</span><button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div>
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header"><h2>สร้างโปรโมชั่น</h2><button class="close-btn" @click="showCreateModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="form-row"><label>โค้ด</label><input v-model="newPromo.code" type="text" placeholder="SAVE20" /></div>
          <div class="form-row"><label>คำอธิบาย</label><input v-model="newPromo.description" type="text" /></div>
          <div class="form-row"><label>ส่วนลด</label><input v-model.number="newPromo.discount_value" type="number" /></div>
          <div class="form-row"><label>จำกัด</label><input v-model.number="newPromo.usage_limit" type="number" /></div>
          <div class="modal-actions"><button class="btn-cancel" @click="showCreateModal = false">ยกเลิก</button><button class="btn-primary" @click="createPromo" :disabled="saving || !newPromo.code">สร้าง</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promos-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.create-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #00A86B; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; max-width: 300px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.promo-code { font-family: monospace; font-size: 14px; font-weight: 600; padding: 4px 8px; background: #FEF3C7; color: #92400E; border-radius: 4px; }
.desc { font-size: 12px; color: #6B7280; margin-top: 4px; }
.discount { font-weight: 600; color: #059669; }
.status-toggle { padding: 6px 12px; border: none; border-radius: 16px; font-size: 12px; font-weight: 500; cursor: pointer; background: #FEE2E2; color: #DC2626; }
.status-toggle.active { background: #D1FAE5; color: #059669; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.form-row { margin-bottom: 16px; }
.form-row label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-row input { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.modal-actions { display: flex; gap: 12px; margin-top: 24px; }
.btn-cancel { flex: 1; padding: 12px; background: #F3F4F6; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary { flex: 1; padding: 12px; background: #00A86B; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; }
</style>
