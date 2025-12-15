<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'

const router = useRouter()
const {
  favoriteDrivers,
  driverPreferences,
  loading,
  fetchFavoriteDrivers,
  removeFavoriteDriver,
  updateDriverPreferences
} = useAdvancedFeatures()

const activeTab = ref<'favorites' | 'preferences'>('favorites')
const showRemoveConfirm = ref(false)
const selectedDriverId = ref<string | null>(null)

// Preferences form
const preferences = ref({
  prefer_female_driver: false,
  prefer_high_rated: true,
  min_rating: 4.0,
  prefer_experienced: false,
  min_trips: 100
})

onMounted(async () => {
  await fetchFavoriteDrivers()
  if (driverPreferences.value) {
    preferences.value = {
      prefer_female_driver: driverPreferences.value.prefer_female_driver ?? false,
      prefer_high_rated: driverPreferences.value.prefer_high_rated ?? false,
      min_rating: driverPreferences.value.min_rating ?? 4.0,
      prefer_experienced: driverPreferences.value.prefer_experienced ?? false,
      min_trips: (driverPreferences.value as any).min_trips ?? 100
    }
  }
})

const confirmRemove = (providerId: string) => {
  selectedDriverId.value = providerId
  showRemoveConfirm.value = true
}

const handleRemove = async () => {
  if (selectedDriverId.value) {
    await removeFavoriteDriver(selectedDriverId.value)
    showRemoveConfirm.value = false
    selectedDriverId.value = null
  }
}

const savePreferences = async () => {
  await updateDriverPreferences(preferences.value)
}

const ratingOptions = [3.5, 4.0, 4.5, 4.8]
const tripOptions = [0, 50, 100, 500, 1000]
</script>

<template>
  <div class="drivers-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="router.back()" class="back-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>คนขับที่ชอบ</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        :class="['tab', { active: activeTab === 'favorites' }]"
        @click="activeTab = 'favorites'"
      >
        คนขับโปรด
      </button>
      <button 
        :class="['tab', { active: activeTab === 'preferences' }]"
        @click="activeTab = 'preferences'"
      >
        ตั้งค่าความชอบ
      </button>
    </div>

    <!-- Favorites Tab -->
    <div v-if="activeTab === 'favorites'" class="tab-content">
      <!-- Empty State -->
      <div v-if="favoriteDrivers.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </div>
        <h3>ยังไม่มีคนขับโปรด</h3>
        <p>กดหัวใจหลังจบการเดินทางเพื่อเพิ่มคนขับโปรด</p>
      </div>

      <!-- Drivers List -->
      <div v-else class="drivers-list">
        <div v-for="driver in favoriteDrivers" :key="driver.id" class="driver-card">
          <div class="driver-avatar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="driver-info">
            <div class="driver-name">
              {{ (driver as any).nickname || (driver as any).driver_name || 'คนขับ' }}
              <span v-if="(driver as any).nickname" class="real-name">({{ (driver as any).driver_name }})</span>
            </div>
            <div class="driver-stats">
              <span class="rating">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                {{ ((driver as any).rating || 4.5)?.toFixed(2) }}
              </span>
              <span class="trips">{{ ((driver as any).total_trips || 0)?.toLocaleString() }} เที่ยว</span>
            </div>
            <div class="driver-vehicle">
              {{ (driver as any).vehicle_type || 'รถยนต์' }} · {{ (driver as any).vehicle_plate || '-' }}
            </div>
          </div>
          <button @click="confirmRemove(driver.provider_id || '')" class="remove-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Preferences Tab -->
    <div v-if="activeTab === 'preferences'" class="tab-content">
      <div class="preferences-form">
        <div class="pref-section">
          <h3>ความชอบทั่วไป</h3>
          
          <label class="pref-toggle">
            <span>ต้องการคนขับหญิง</span>
            <input type="checkbox" v-model="preferences.prefer_female_driver" />
            <span class="toggle-switch"></span>
          </label>
        </div>

        <div class="pref-section">
          <h3>คะแนนขั้นต่ำ</h3>
          
          <label class="pref-toggle">
            <span>เลือกคนขับคะแนนสูง</span>
            <input type="checkbox" v-model="preferences.prefer_high_rated" />
            <span class="toggle-switch"></span>
          </label>

          <div v-if="preferences.prefer_high_rated" class="pref-options">
            <label>คะแนนขั้นต่ำ</label>
            <div class="rating-options">
              <button 
                v-for="rating in ratingOptions" 
                :key="rating"
                :class="['rating-option', { active: preferences.min_rating === rating }]"
                @click="preferences.min_rating = rating"
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                {{ rating }}+
              </button>
            </div>
          </div>
        </div>

        <div class="pref-section">
          <h3>ประสบการณ์</h3>
          
          <label class="pref-toggle">
            <span>เลือกคนขับมีประสบการณ์</span>
            <input type="checkbox" v-model="preferences.prefer_experienced" />
            <span class="toggle-switch"></span>
          </label>

          <div v-if="preferences.prefer_experienced" class="pref-options">
            <label>จำนวนเที่ยวขั้นต่ำ</label>
            <div class="trip-options">
              <button 
                v-for="trips in tripOptions" 
                :key="trips"
                :class="['trip-option', { active: preferences.min_trips === trips }]"
                @click="preferences.min_trips = trips"
              >
                {{ trips === 0 ? 'ไม่จำกัด' : `${trips}+` }}
              </button>
            </div>
          </div>
        </div>

        <button @click="savePreferences" :disabled="loading" class="btn-primary">
          {{ loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
        </button>
      </div>
    </div>

    <!-- Remove Confirm Modal -->
    <div v-if="showRemoveConfirm" class="modal-overlay" @click="showRemoveConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>ลบคนขับโปรด?</h3>
        <p>คุณแน่ใจหรือไม่ที่จะลบคนขับนี้ออกจากรายการโปรด?</p>
        <div class="modal-actions">
          <button @click="showRemoveConfirm = false" class="btn-secondary">ยกเลิก</button>
          <button @click="handleRemove" class="btn-danger">ลบ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drivers-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn, .header-spacer {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.tab {
  flex: 1;
  padding: 16px;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #000;
  border-bottom-color: #000;
}

.tab-content {
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #999;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #6b6b6b;
}

.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  padding: 16px;
  border-radius: 12px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.driver-avatar svg {
  width: 28px;
  height: 28px;
  color: #999;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.real-name {
  font-size: 12px;
  font-weight: 400;
  color: #6b6b6b;
}

.driver-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating svg {
  width: 12px;
  height: 12px;
  color: #fbbf24;
}

.driver-vehicle {
  font-size: 12px;
  color: #6b6b6b;
}

.remove-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ef4444;
}

.remove-btn svg {
  width: 20px;
  height: 20px;
}

.preferences-form {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.pref-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e5e5;
}

.pref-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.pref-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.pref-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.pref-toggle input {
  display: none;
}

.toggle-switch {
  width: 48px;
  height: 28px;
  background: #e5e5e5;
  border-radius: 14px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.pref-toggle input:checked + .toggle-switch {
  background: #000;
}

.pref-toggle input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.pref-options {
  margin-top: 16px;
}

.pref-options label {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.rating-options, .trip-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rating-option, .trip-option {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  background: #fff;
  font-size: 14px;
}

.rating-option.active, .trip-option.active {
  border-color: #000;
  background: #000;
  color: #fff;
}

.rating-option svg {
  width: 14px;
  height: 14px;
  color: #fbbf24;
}

.rating-option.active svg {
  color: #fbbf24;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 24px;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-content p {
  font-size: 14px;
  color: #6b6b6b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 14px;
}
</style>
