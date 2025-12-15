<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useServices } from '../composables/useServices'
import { useLocation } from '../composables/useLocation'
import AddressSearchInput from '../components/AddressSearchInput.vue'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const { savedPlaces, recentPlaces, fetchSavedPlaces, fetchRecentPlaces, savePlace: savePlaceToDb } = useServices()
const { currentLocation } = useLocation()

const loading = ref(true)
const activeTab = ref<'saved' | 'recent'>('saved')
const showAddModal = ref(false)
const editingPlace = ref<any>(null)

const newPlace = ref({
  name: '',
  address: '',
  type: 'other' as 'home' | 'work' | 'other',
  lat: 13.7563,
  lng: 100.5018
})

const placeTypes = [
  { id: 'home', label: 'บ้าน', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'work', label: 'ที่ทำงาน', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'other', label: 'อื่นๆ', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }
]

const homePlace = computed(() => savedPlaces.value.find(p => p.place_type === 'home'))
const workPlace = computed(() => savedPlaces.value.find(p => p.place_type === 'work'))
const otherPlaces = computed(() => savedPlaces.value.filter(p => p.place_type === 'other'))

onMounted(async () => {
  await Promise.all([fetchSavedPlaces(), fetchRecentPlaces()])
  loading.value = false
})

const openAddModal = (type?: 'home' | 'work' | 'other') => {
  newPlace.value = {
    name: '',
    address: '',
    type: type || 'other',
    lat: 13.7563,
    lng: 100.5018
  }
  editingPlace.value = null
  showAddModal.value = true
}

const openEditModal = (place: any) => {
  newPlace.value = { ...place }
  editingPlace.value = place
  showAddModal.value = true
}

const savePlace = async () => {
  if (!newPlace.value.name || !newPlace.value.address) return
  
  await savePlaceToDb({
    name: newPlace.value.name,
    address: newPlace.value.address,
    lat: newPlace.value.lat,
    lng: newPlace.value.lng,
    place_type: newPlace.value.type
  })
  
  await fetchSavedPlaces()
  showAddModal.value = false
}

// Handle search result selection in modal
const handleSearchSelect = (place: PlaceResult) => {
  newPlace.value.name = place.name
  newPlace.value.address = place.address
  newPlace.value.lat = place.lat
  newPlace.value.lng = place.lng
}

const deletePlace = async (id: string) => {
  if (confirm('ต้องการลบสถานที่นี้?')) {
    console.log('Deleting place:', id)
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
        <h1>สถานที่ของฉัน</h1>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button @click="activeTab = 'saved'" :class="['tab', { active: activeTab === 'saved' }]">
          สถานที่บันทึก
        </button>
        <button @click="activeTab = 'recent'" :class="['tab', { active: activeTab === 'recent' }]">
          ล่าสุด
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <!-- Saved Places Tab -->
      <div v-else-if="activeTab === 'saved'" class="tab-content">
        <!-- Home -->
        <div class="place-section">
          <div class="section-header">
            <h3>บ้าน</h3>
          </div>
          <div v-if="homePlace" class="place-card" @click="openEditModal(homePlace)">
            <div class="place-icon home">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
            </div>
            <div class="place-info">
              <span class="place-name">{{ homePlace.name }}</span>
              <span class="place-address">{{ homePlace.address }}</span>
            </div>
            <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
          <button v-else class="add-place-btn" @click="openAddModal('home')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>เพิ่มที่อยู่บ้าน</span>
          </button>
        </div>

        <!-- Work -->
        <div class="place-section">
          <div class="section-header">
            <h3>ที่ทำงาน</h3>
          </div>
          <div v-if="workPlace" class="place-card" @click="openEditModal(workPlace)">
            <div class="place-icon work">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <div class="place-info">
              <span class="place-name">{{ workPlace.name }}</span>
              <span class="place-address">{{ workPlace.address }}</span>
            </div>
            <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
          <button v-else class="add-place-btn" @click="openAddModal('work')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>เพิ่มที่อยู่ที่ทำงาน</span>
          </button>
        </div>

        <!-- Other Places -->
        <div class="place-section">
          <div class="section-header">
            <h3>สถานที่อื่นๆ</h3>
          </div>
          <div v-for="place in otherPlaces" :key="place.id" class="place-card" @click="openEditModal(place)">
            <div class="place-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div class="place-info">
              <span class="place-name">{{ place.name }}</span>
              <span class="place-address">{{ place.address }}</span>
            </div>
            <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
          <button class="add-place-btn" @click="openAddModal('other')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <span>เพิ่มสถานที่</span>
          </button>
        </div>
      </div>

      <!-- Recent Places Tab -->
      <div v-else-if="activeTab === 'recent'" class="tab-content">
        <div v-if="recentPlaces.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>ยังไม่มีสถานที่ล่าสุด</p>
        </div>
        <div v-else class="recent-list">
          <div v-for="place in recentPlaces" :key="place.name" class="place-card">
            <div class="place-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="place-info">
              <span class="place-name">{{ place.name }}</span>
              <span class="place-address">{{ place.address }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPlace ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่' }}</h3>
          <button @click="showAddModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="form-group">
          <label>ประเภท</label>
          <div class="type-options">
            <button 
              v-for="type in placeTypes" 
              :key="type.id"
              @click="newPlace.type = type.id as any"
              :class="['type-btn', { active: newPlace.type === type.id }]"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="type.icon"/>
              </svg>
              <span>{{ type.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>ชื่อสถานที่</label>
          <input v-model="newPlace.name" type="text" placeholder="เช่น บ้านแม่, ออฟฟิศ" />
        </div>

        <div class="form-group">
          <label>ค้นหาที่อยู่</label>
          <AddressSearchInput
            v-model="newPlace.address"
            placeholder="ค้นหาสถานที่หรือที่อยู่..."
            :show-saved-places="false"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleSearchSelect"
          />
        </div>

        <div class="modal-actions">
          <button v-if="editingPlace" @click="deletePlace(editingPlace.id)" class="btn-delete">
            ลบสถานที่
          </button>
          <button @click="savePlace" class="btn-primary">
            บันทึก
          </button>
        </div>
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

.tabs {
  display: flex;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  padding: 14px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #000;
  border-bottom-color: #000;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.place-section {
  margin-bottom: 24px;
}

.section-header {
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
}

.place-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.place-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.place-icon svg {
  width: 22px;
  height: 22px;
}

.place-icon.home svg { color: #000; }
.place-icon.work svg { color: #000; }

.place-info {
  flex: 1;
}

.place-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
}

.place-address {
  font-size: 13px;
  color: #6B6B6B;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.add-place-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: none;
  border: 2px dashed #E5E5E5;
  border-radius: 12px;
  font-size: 14px;
  color: #6B6B6B;
  cursor: pointer;
}

.add-place-btn svg {
  width: 24px;
  height: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B6B6B;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.form-group input:focus {
  border-color: #000;
}

.type-options {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
}

.type-btn.active {
  border-color: #000;
  background: #fff;
}

.type-btn svg {
  width: 24px;
  height: 24px;
}

.type-btn span {
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary {
  flex: 1;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-delete {
  padding: 14px 20px;
  background: #FEE2E2;
  color: #E11900;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
</style>
