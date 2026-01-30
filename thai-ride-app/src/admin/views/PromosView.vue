<template>
  <div class="promos-view">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1>โปรโมชั่น</h1>
        <p>จัดการโค้ดส่วนลดและแคมเปญโปรโมชั่น</p>
      </div>
      <button
        type="button"
        class="btn-create"
        @click="showCreateModal = true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>สร้างโปรโมชั่น</span>
      </button>
    </header>

    <!-- Stats -->
    <section v-if="stats" class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">ทั้งหมด</span>
        <span class="stat-value">{{ stats.total_promos }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">ใช้งานอยู่</span>
        <span class="stat-value">{{ stats.active_promos }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">ยังไม่หมดอายุ</span>
        <span class="stat-value">{{ stats.valid_promos }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">ใช้งานทั้งหมด</span>
        <span class="stat-value">{{ stats.total_usage.toLocaleString() }}</span>
      </div>
    </section>

    <!-- Filters -->
    <section class="filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาโค้ดหรือคำอธิบาย..."
        class="search-input"
        @input="handleSearch"
      />
      <select
        v-model="statusFilter"
        class="filter-select"
        @change="handleFilterChange"
      >
        <option value="all">ทั้งหมด</option>
        <option value="active">ใช้งานอยู่</option>
        <option value="inactive">ปิดใช้งาน</option>
        <option value="expired">หมดอายุ</option>
        <option value="upcoming">กำลังจะมา</option>
      </select>
      <select
        v-model="categoryFilter"
        class="filter-select"
        @change="handleFilterChange"
      >
        <option value="all">ทุกหมวดหมู่</option>
        <option value="ride">Ride</option>
        <option value="delivery">Delivery</option>
        <option value="shopping">Shopping</option>
      </select>
    </section>

    <!-- Bulk Actions -->
    <section v-if="selectedPromos.length > 0" class="bulk-actions">
      <span class="bulk-count">เลือก {{ selectedPromos.length }} รายการ</span>
      <div class="bulk-buttons">
        <button type="button" class="bulk-btn" @click="handleBulkActivate">
          เปิดใช้งาน
        </button>
        <button type="button" class="bulk-btn" @click="handleBulkDeactivate">
          ปิดใช้งาน
        </button>
        <button type="button" class="bulk-btn danger" @click="handleBulkDelete">
          ลบ
        </button>
        <button type="button" class="bulk-btn cancel" @click="selectedPromos = []">
          ยกเลิก
        </button>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <p>{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredPromos.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
      <p>ไม่พบโปรโมชั่น</p>
    </div>

    <!-- Promos List -->
    <section v-else class="promos-list">
      <PromoCard
        v-for="promo in filteredPromos"
        :key="promo.id"
        :promo="promo"
        :selected="selectedPromos.includes(promo.id)"
        @select="toggleSelection(promo.id)"
        @edit="handleEdit(promo)"
        @delete="handleDelete(promo.id)"
        @toggle-status="handleToggleStatus(promo.id, !promo.is_active)"
      />
    </section>

    <!-- Create/Edit Modal -->
    <PromoFormModal
      v-if="showCreateModal || showEditModal"
      :promo="editingPromo"
      @close="closeModals"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminPromos } from '@/admin/composables/useAdminPromos'
import PromoCard from '@/admin/components/PromoCard.vue'
import PromoFormModal from '@/admin/components/PromoFormModal.vue'
import type { Database } from '@/types/database'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

const {
  promos,
  filteredPromos,
  stats,
  loading,
  error,
  fetchPromos,
  fetchStats,
  updatePromo,
  deletePromo,
  togglePromoStatus,
  bulkUpdateStatus,
  bulkDelete
} = useAdminPromos()

const searchQuery = ref('')
const statusFilter = ref('all')
const categoryFilter = ref('all')
const selectedPromos = ref<string[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingPromo = ref<PromoCode | null>(null)

onMounted(async () => {
  await fetchPromos()
  await fetchStats()
})

function handleSearch() {
  fetchPromos({
    status: statusFilter.value as any,
    category: categoryFilter.value,
    search: searchQuery.value
  })
}

function handleFilterChange() {
  fetchPromos({
    status: statusFilter.value as any,
    category: categoryFilter.value,
    search: searchQuery.value
  })
}

function toggleSelection(id: string) {
  const index = selectedPromos.value.indexOf(id)
  if (index > -1) {
    selectedPromos.value.splice(index, 1)
  } else {
    selectedPromos.value.push(id)
  }
}

function handleEdit(promo: PromoCode) {
  editingPromo.value = promo
  showEditModal.value = true
}

async function handleDelete(id: string) {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโปรโมชั่นนี้?')) return
  
  try {
    await deletePromo(id)
  } catch (err) {
    console.error('Failed to delete promo:', err)
  }
}

async function handleToggleStatus(id: string, isActive: boolean) {
  try {
    await togglePromoStatus(id, isActive)
  } catch (err) {
    console.error('Failed to toggle status:', err)
  }
}

async function handleBulkActivate() {
  try {
    await bulkUpdateStatus(selectedPromos.value, true)
    selectedPromos.value = []
  } catch (err) {
    console.error('Failed to bulk activate:', err)
  }
}

async function handleBulkDeactivate() {
  try {
    await bulkUpdateStatus(selectedPromos.value, false)
    selectedPromos.value = []
  } catch (err) {
    console.error('Failed to bulk deactivate:', err)
  }
}

async function handleBulkDelete() {
  if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedPromos.value.length} รายการ?`)) return
  
  try {
    await bulkDelete(selectedPromos.value)
    selectedPromos.value = []
  } catch (err) {
    console.error('Failed to bulk delete:', err)
  }
}

function handleSave() {
  closeModals()
  fetchPromos()
  fetchStats()
}

function closeModals() {
  showCreateModal.value = false
  showEditModal.value = false
  editingPromo.value = null
}
</script>

<style scoped>
/* Base Layout */
.promos-view {
  min-height: 100vh;
  background: #FFFFFF;
  padding: 20px;
}

/* Header */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #000000;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 4px 0;
}

.header-content p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
}

.btn-create:hover {
  background: #1A1A1A;
}

.btn-create svg {
  width: 20px;
  height: 20px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: #FFFFFF;
  border: 2px solid #000000;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #000000;
}

/* Filters */
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  min-width: 250px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  color: #000000;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #000000;
}

.search-input::placeholder {
  color: #999999;
}

.filter-select {
  padding: 12px 16px;
  background: #FFFFFF;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #000000;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #000000;
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F5F5F5;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.bulk-count {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.bulk-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.bulk-btn {
  padding: 10px 16px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 40px;
}

.bulk-btn:hover {
  background: #1A1A1A;
}

.bulk-btn.danger {
  background: #FFFFFF;
  color: #000000;
  border: 2px solid #000000;
}

.bulk-btn.danger:hover {
  background: #000000;
  color: #FFFFFF;
}

.bulk-btn.cancel {
  background: #FFFFFF;
  color: #666666;
  border: 2px solid #E5E5E5;
}

.bulk-btn.cancel:hover {
  border-color: #CCCCCC;
  color: #000000;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 15px;
  font-weight: 500;
  color: #666666;
  margin: 0;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  background: #FFFFFF;
  border: 2px solid #000000;
  border-radius: 8px;
}

.error-state svg {
  width: 48px;
  height: 48px;
  color: #000000;
}

.error-state p {
  font-size: 15px;
  font-weight: 500;
  color: #000000;
  margin: 0;
  text-align: center;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  background: #FFFFFF;
  border: 2px dashed #E5E5E5;
  border-radius: 8px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #CCCCCC;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  color: #666666;
  margin: 0;
}

/* Promos List */
.promos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .promos-view {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-create {
    width: 100%;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters {
    flex-direction: column;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .bulk-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-buttons {
    flex-direction: column;
  }

  .bulk-btn {
    width: 100%;
  }
}
</style>
