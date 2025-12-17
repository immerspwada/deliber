<script setup lang="ts">
/**
 * Feature: F268 - Location Picker
 * Map-based location picker with pin
 */
import { ref, computed } from 'vue'

interface Location {
  lat: number
  lng: number
  address: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  label?: string
  type?: 'pickup' | 'destination'
}>(), {
  modelValue: '',
  placeholder: 'เลือกตำแหน่งบนแผนที่',
  type: 'pickup'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'confirm': [location: Location]
  'location-selected': [location: Location]
}>()

const showMap = ref(false)
const searchQuery = ref('')
const tempLocation = ref<Location | null>(null)
const loading = ref(false)

const displayAddress = computed(() => props.modelValue || '')

const openPicker = () => {
  tempLocation.value = { lat: 13.7563, lng: 100.5018, address: props.modelValue || '' }
  showMap.value = true
}

const closePicker = () => {
  showMap.value = false
}

const getCurrentLocation = () => {
  if (!navigator.geolocation) return
  
  loading.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      tempLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      loading.value = false
    },
    () => {
      loading.value = false
    }
  )
}

const confirmLocation = () => {
  if (tempLocation.value) {
    const loc: Location = {
      lat: tempLocation.value.lat,
      lng: tempLocation.value.lng,
      address: tempLocation.value.address || `${tempLocation.value.lat.toFixed(6)}, ${tempLocation.value.lng.toFixed(6)}`
    }
    emit('update:modelValue', loc.address)
    emit('confirm', loc)
    emit('location-selected', loc)
  }
  showMap.value = false
}

const clearLocation = () => {
  emit('update:modelValue', '')
}

const handleMapClick = () => {
  // Simulate map click - in real app would use actual map coordinates
  if (tempLocation.value) {
    tempLocation.value = {
      ...tempLocation.value,
      lat: tempLocation.value.lat + (Math.random() - 0.5) * 0.01,
      lng: tempLocation.value.lng + (Math.random() - 0.5) * 0.01
    }
  }
}
</script>

<template>
  <div class="location-picker">
    <label v-if="label" class="label">{{ label }}</label>
    
    <div class="input-wrapper" @click="openPicker">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span v-if="displayAddress" class="address">{{ displayAddress }}</span>
      <span v-else class="placeholder">{{ placeholder }}</span>
      <button v-if="modelValue" type="button" class="clear-btn" @click.stop="clearLocation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- Map Modal -->
    <Teleport to="body">
      <div v-if="showMap" class="map-modal">
        <div class="modal-header">
          <button type="button" class="close-btn" @click="closePicker">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <h3 class="modal-title">เลือกตำแหน่ง</h3>
          <div style="width: 40px"></div>
        </div>
        
        <div class="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="ค้นหาสถานที่..." />
        </div>
        
        <div class="map-container" @click="handleMapClick">
          <div class="map-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <p>แตะเพื่อเลือกตำแหน่ง</p>
          </div>
          
          <!-- Center Pin -->
          <div class="center-pin">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#000" stroke="none">
              <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
            </svg>
          </div>
        </div>
        
        <div class="location-info">
          <button type="button" class="current-location-btn" :disabled="loading" @click="getCurrentLocation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
            </svg>
            <span v-if="loading">กำลังค้นหา...</span>
            <span v-else>ใช้ตำแหน่งปัจจุบัน</span>
          </button>
          
          <div v-if="tempLocation" class="coords">
            <span>{{ tempLocation.lat.toFixed(6) }}, {{ tempLocation.lng.toFixed(6) }}</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn-confirm" @click="confirmLocation">
            ยืนยันตำแหน่ง
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.location-picker {
  width: 100%;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 6px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.input-wrapper:hover {
  border-color: #000;
}

.address {
  flex: 1;
  font-size: 14px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.placeholder {
  flex: 1;
  font-size: 14px;
  color: #999;
}

.clear-btn {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
}

.map-modal {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
}

.close-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 16px;
  padding: 10px 14px;
  background: #f6f6f6;
  border-radius: 8px;
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.map-container {
  flex: 1;
  position: relative;
  background: #f0f0f0;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b6b6b;
}

.map-placeholder p {
  margin: 12px 0 0;
  font-size: 14px;
}

.center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  pointer-events: none;
}

.location-info {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.current-location-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.current-location-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.coords {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #6b6b6b;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.btn-confirm {
  width: 100%;
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
</style>
