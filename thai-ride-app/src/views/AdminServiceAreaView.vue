<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useServiceArea, type ServiceArea } from '../composables/useServiceArea'

const { 
  loading, 
  areas, 
  areaStats, 
  fetchAreas, 
  updateArea, 
  fetchAreaStats 
} = useServiceArea()

// Edit modal state
const showEditModal = ref(false)
const editingArea = ref<ServiceArea | null>(null)
const editForm = ref({
  name: '',
  is_active: true,
  surge_multiplier: 1.0,
  min_fare: 35,
  base_fare: 35,
  per_km_rate: 6.5
})

// Load data
onMounted(async () => {
  await Promise.all([
    fetchAreas(),
    fetchAreaStats()
  ])
})

// Open edit modal
const openEditModal = (area: ServiceArea) => {
  editingArea.value = area
  editForm.value = {
    name: area.name,
    is_active: area.is_active,
    surge_multiplier: area.surge_multiplier,
    min_fare: area.min_fare,
    base_fare: area.base_fare,
    per_km_rate: area.per_km_rate
  }
  showEditModal.value = true
}

// Save changes
const saveChanges = async () => {
  if (!editingArea.value) return

  await updateArea(editingArea.value.id, editForm.value)
  showEditModal.value = false
  editingArea.value = null
}

// Toggle area active status
const toggleAreaStatus = async (area: ServiceArea) => {
  await updateArea(area.id, { is_active: !area.is_active })
}

// Get stats for area
const getStatsForArea = (areaId: string) => {
  return areaStats.value.find(s => s.area_id === areaId)
}

// Get demand color
const getDemandColor = (level: string) => {
  switch (level) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    default: return '#22c55e'
  }
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH').format(amount)
}
</script>

<template>
  <AdminLayout>
    <div class="service-area-view">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Service Areas</h1>
          <p class="subtitle">จัดการพื้นที่ให้บริการและราคา</p>
        </div>
      </div>

      <!-- Map placeholder -->
      <div class="map-section">
        <div class="map-placeholder">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <p>แผนที่พื้นที่ให้บริการ</p>
          <span class="map-note">แสดงขอบเขตพื้นที่ทั้งหมด</span>
        </div>

        <!-- Area legend -->
        <div class="area-legend">
          <div v-for="area in areas" :key="area.id" class="legend-item">
            <span class="legend-color" :style="{ background: area.color }"></span>
            <span class="legend-name">{{ area.name }}</span>
            <span class="legend-status" :class="{ active: area.is_active }">
              {{ area.is_active ? 'เปิด' : 'ปิด' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Areas list -->
      <div class="areas-grid" v-if="!loading">
        <div 
          v-for="area in areas" 
          :key="area.id" 
          class="area-card"
          :class="{ inactive: !area.is_active }"
        >
          <div class="area-header">
            <div class="area-color" :style="{ background: area.color }"></div>
            <div class="area-info">
              <h3>{{ area.name }}</h3>
              <span class="area-status" :class="{ active: area.is_active }">
                {{ area.is_active ? 'เปิดให้บริการ' : 'ปิดให้บริการ' }}
              </span>
            </div>
            <button class="toggle-btn" @click="toggleAreaStatus(area)">
              <svg v-if="area.is_active" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>

          <!-- Pricing info -->
          <div class="pricing-grid">
            <div class="pricing-item">
              <span class="pricing-label">ค่าเริ่มต้น</span>
              <span class="pricing-value">฿{{ area.base_fare }}</span>
            </div>
            <div class="pricing-item">
              <span class="pricing-label">ต่อ กม.</span>
              <span class="pricing-value">฿{{ area.per_km_rate }}</span>
            </div>
            <div class="pricing-item">
              <span class="pricing-label">ขั้นต่ำ</span>
              <span class="pricing-value">฿{{ area.min_fare }}</span>
            </div>
            <div class="pricing-item">
              <span class="pricing-label">Surge</span>
              <span class="pricing-value" :class="{ surge: area.surge_multiplier > 1 }">
                {{ area.surge_multiplier }}x
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="area-stats" v-if="getStatsForArea(area.id)">
            <div class="stat-row">
              <span class="stat-label">เที่ยววันนี้</span>
              <span class="stat-value">{{ getStatsForArea(area.id)?.total_rides }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">รายได้</span>
              <span class="stat-value">฿{{ formatCurrency(getStatsForArea(area.id)?.total_revenue || 0) }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">คนขับออนไลน์</span>
              <span class="stat-value">{{ getStatsForArea(area.id)?.active_providers }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">ความต้องการ</span>
              <span 
                class="demand-badge"
                :style="{ background: getDemandColor(getStatsForArea(area.id)?.demand_level || 'low') }"
              >
                {{ getStatsForArea(area.id)?.demand_level === 'high' ? 'สูง' : 
                   getStatsForArea(area.id)?.demand_level === 'medium' ? 'ปานกลาง' : 'ต่ำ' }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="area-actions">
            <button class="edit-btn" @click="openEditModal(area)">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              แก้ไข
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-else class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>แก้ไขพื้นที่</h3>
            <button class="close-btn" @click="showEditModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>ชื่อพื้นที่</label>
              <input v-model="editForm.name" type="text" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ค่าเริ่มต้น (฿)</label>
                <input v-model.number="editForm.base_fare" type="number" />
              </div>
              <div class="form-group">
                <label>ต่อ กม. (฿)</label>
                <input v-model.number="editForm.per_km_rate" type="number" step="0.5" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ขั้นต่ำ (฿)</label>
                <input v-model.number="editForm.min_fare" type="number" />
              </div>
              <div class="form-group">
                <label>Surge Multiplier</label>
                <input v-model.number="editForm.surge_multiplier" type="number" step="0.1" min="1" max="3" />
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="editForm.is_active" />
                <span>เปิดให้บริการ</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showEditModal = false">ยกเลิก</button>
            <button class="btn-save" @click="saveChanges">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.service-area-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #6B6B6B;
  margin: 0;
}

/* Map section */
.map-section {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  margin-bottom: 24px;
  overflow: hidden;
}

.map-placeholder {
  height: 300px;
  background: #F6F6F6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6B6B6B;
}

.map-placeholder svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.map-placeholder p {
  margin: 0;
  font-weight: 500;
}

.map-note {
  font-size: 12px;
  margin-top: 4px;
}

.area-legend {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  border-top: 1px solid #E5E5E5;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-name {
  font-size: 13px;
  color: #000;
}

.legend-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #fee2e2;
  color: #991b1b;
}

.legend-status.active {
  background: #dcfce7;
  color: #166534;
}

/* Areas grid */
.areas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.area-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  padding: 20px;
}

.area-card.inactive {
  opacity: 0.6;
}

.area-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.area-color {
  width: 8px;
  height: 40px;
  border-radius: 4px;
  flex-shrink: 0;
}

.area-info {
  flex: 1;
}

.area-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.area-status {
  font-size: 12px;
  color: #991b1b;
}

.area-status.active {
  color: #166534;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6B6B6B;
}

/* Pricing grid */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  background: #F6F6F6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.pricing-item {
  text-align: center;
}

.pricing-label {
  display: block;
  font-size: 11px;
  color: #6B6B6B;
  margin-bottom: 4px;
}

.pricing-value {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.pricing-value.surge {
  color: #ef4444;
}

/* Area stats */
.area-stats {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #F6F6F6;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

.stat-value {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.demand-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
}

/* Actions */
.area-actions {
  display: flex;
  justify-content: flex-end;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px;
  color: #6B6B6B;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6B6B6B;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #000;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #E5E5E5;
}

.btn-cancel {
  padding: 10px 20px;
  background: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-save {
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 640px) {
  .service-area-view {
    padding: 16px;
  }

  .areas-grid {
    grid-template-columns: 1fr;
  }

  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
