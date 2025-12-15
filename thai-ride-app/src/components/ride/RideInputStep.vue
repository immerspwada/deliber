<script setup lang="ts">
import { ref, computed } from 'vue'
import MultiStopInput from '../MultiStopInput.vue'

interface SavedPlace {
  name: string
  address: string
  lat: number
  lng: number
}

interface RecentPlace {
  name: string
  address: string
  lat?: number
  lng?: number
}

interface Stop {
  id: string
  address: string
  lat?: number
  lng?: number
  contactName?: string
  contactPhone?: string
}

const props = defineProps<{
  pickup: string
  destination: string
  selectedService: 'ride' | 'delivery' | 'shopping'
  homePlace: SavedPlace | null
  workPlace: SavedPlace | null
  recentPlaces: RecentPlace[]
}>()

const emit = defineEmits<{
  'update:pickup': [value: string]
  'update:destination': [value: string]
  'update:selectedService': [value: 'ride' | 'delivery' | 'shopping']
  'confirm': []
  'select-saved-place': [type: 'home' | 'work']
  'select-recent-place': [place: RecentPlace]
  'update:multiStops': [stops: Stop[]]
}>()

const showRecentPlaces = ref(false)
const showMultiStop = ref(false)
const multiStops = ref<Stop[]>([])

const services = [
  { id: 'ride', name: 'เรียกรถ', icon: 'car' },
  { id: 'delivery', name: 'ส่งพัสดุ', icon: 'package' },
  { id: 'shopping', name: 'ซื้อของ', icon: 'shopping' }
]

const canConfirm = computed(() => props.pickup && props.destination)

const selectService = (id: string) => {
  emit('update:selectedService', id as 'ride' | 'delivery' | 'shopping')
}

const selectRecentPlace = (place: RecentPlace) => {
  emit('select-recent-place', place)
  showRecentPlaces.value = false
}

const handleMultiStopsUpdate = (stops: Stop[]) => {
  multiStops.value = stops
  emit('update:multiStops', stops)
}

const destinationPlaceholder = computed(() => 
  props.selectedService === 'ride' ? 'ไปไหน?' : 'ส่งที่ไหน?'
)
</script>

<template>
  <!-- Service tabs -->
  <div class="service-tabs">
    <button 
      v-for="service in services" 
      :key="service.id"
      @click="selectService(service.id)"
      :class="['service-tab', { active: selectedService === service.id }]"
    >
      <div class="tab-icon">
        <svg v-if="service.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
        </svg>
        <svg v-else-if="service.icon === 'package'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
      </div>
      <span>{{ service.name }}</span>
    </button>
  </div>

  <!-- Location inputs -->
  <div class="location-card">
    <div class="location-row">
      <div class="location-dot pickup"></div>
      <div class="location-line"></div>
      <input 
        :value="pickup" 
        @input="$emit('update:pickup', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="จุดรับ" 
        readonly 
        class="location-input" 
      />
    </div>
    <div class="location-divider"></div>
    <div class="location-row">
      <div class="location-dot destination"></div>
      <input 
        :value="destination" 
        @input="$emit('update:destination', ($event.target as HTMLInputElement).value)"
        type="text" 
        :placeholder="destinationPlaceholder"
        class="location-input destination-input"
      />
    </div>
  </div>

  <!-- Multi-stop toggle -->
  <button 
    v-if="selectedService === 'ride'" 
    @click="showMultiStop = !showMultiStop" 
    class="multi-stop-toggle"
  >
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
    </svg>
    <span>{{ showMultiStop ? 'ซ่อนจุดแวะ' : 'เพิ่มจุดแวะ' }}</span>
  </button>

  <!-- Multi-stop input -->
  <MultiStopInput 
    v-if="showMultiStop && selectedService === 'ride'"
    :model-value="multiStops"
    @update:model-value="handleMultiStopsUpdate"
    :max-stops="3"
  />

  <!-- Quick destinations -->
  <div class="quick-places">
    <button class="quick-place" @click="$emit('select-saved-place', 'home')">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      </div>
      <span>{{ homePlace?.name || 'บ้าน' }}</span>
    </button>
    <button class="quick-place" @click="$emit('select-saved-place', 'work')">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <span>{{ workPlace?.name || 'ที่ทำงาน' }}</span>
    </button>
    <button class="quick-place" @click="showRecentPlaces = true">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span>ล่าสุด</span>
    </button>
  </div>

  <!-- Recent places modal -->
  <div v-if="showRecentPlaces" class="modal-overlay" @click="showRecentPlaces = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>สถานที่ล่าสุด</h3>
        <button @click="showRecentPlaces = false" class="modal-close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="recent-list">
        <button 
          v-for="place in recentPlaces" 
          :key="place.name"
          @click="selectRecentPlace(place)"
          class="recent-item"
        >
          <div class="recent-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="recent-text">
            <span class="recent-name">{{ place.name }}</span>
            <span class="recent-address">{{ place.address }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <button @click="$emit('confirm')" :disabled="!canConfirm" class="btn-primary">
    ยืนยันจุดหมาย
  </button>
</template>

<style scoped>
/* Service Tabs */
.service-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.service-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.service-tab:hover {
  background: #EBEBEB;
}

.service-tab:active {
  transform: scale(0.97);
}

.service-tab.active {
  background: white;
  border-color: #000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.tab-icon {
  width: 28px;
  height: 28px;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

.service-tab span {
  font-size: 12px;
  font-weight: 500;
}

/* Location Card */
.location-card {
  background: #F6F6F6;
  border-radius: 12px;
  padding: 4px 0;
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  position: relative;
}

.location-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #000;
}

.location-dot.destination {
  background: transparent;
  border: 2px solid #000;
}

.location-line {
  position: absolute;
  left: 20px;
  top: 28px;
  width: 2px;
  height: 24px;
  background: #DDD;
}

.location-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
  color: #000;
}

.location-input::placeholder {
  color: #999;
}

.destination-input {
  font-weight: 500;
}

.location-divider {
  height: 1px;
  background: #E5E5E5;
  margin-left: 38px;
}

/* Multi-stop toggle */
.multi-stop-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  background: none;
  border: 1px dashed #E5E5E5;
  border-radius: 8px;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  transition: all 0.2s ease;
}

.multi-stop-toggle:hover {
  border-color: #000;
  color: #000;
}

/* Quick Places */
.quick-places {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-place {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: none;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
}

.quick-icon {
  width: 24px;
  height: 24px;
}

.quick-icon svg {
  width: 100%;
  height: 100%;
}

.quick-place span {
  font-size: 12px;
  color: #666;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 100%;
  max-height: 70vh;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

/* Recent Places */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-text {
  flex: 1;
}

.recent-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
}

.recent-address {
  font-size: 13px;
  color: #666;
}

/* Button */
.btn-primary {
  width: 100%;
  padding: 16px;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>
