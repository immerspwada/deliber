<script setup lang="ts">
/**
 * Component: RideMultiStop
 * เพิ่มจุดแวะระหว่างทางได้หลายจุด
 */
import { ref, computed, watch } from 'vue'

interface StopPoint {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  waitTime?: number // minutes to wait
}

const props = defineProps<{
  pickup: { lat: number; lng: number; address: string } | null
  destination: { lat: number; lng: number; address: string } | null
  maxStops?: number
}>()

const emit = defineEmits<{
  'update:stops': [stops: StopPoint[]]
  'fare-change': [additionalFare: number]
}>()

const stops = ref<StopPoint[]>([])
const showAddStop = ref(false)
const searchQuery = ref('')
const searchResults = ref<StopPoint[]>([])
const isSearching = ref(false)

const maxStopsAllowed = computed(() => props.maxStops || 3)
const canAddMore = computed(() => stops.value.length < maxStopsAllowed.value)

// Calculate additional fare for stops
const additionalFare = computed(() => {
  // Base: 20 THB per stop + 5 THB per minute wait time
  return stops.value.reduce((total, stop) => {
    return total + 20 + (stop.waitTime || 0) * 5
  }, 0)
})

// Watch for fare changes
watch(additionalFare, (newFare) => {
  emit('fare-change', newFare)
})

// Watch for stops changes
watch(stops, (newStops) => {
  emit('update:stops', newStops)
}, { deep: true })

function openAddStop(): void {
  if (!canAddMore.value) return
  showAddStop.value = true
  searchQuery.value = ''
  searchResults.value = []
}

function closeAddStop(): void {
  showAddStop.value = false
}

async function searchPlaces(): Promise<void> {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  isSearching.value = true

  try {
    // Use Nominatim for search
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery.value)}&format=json&limit=5&countrycodes=th`,
      { headers: { 'User-Agent': 'ThaiRideApp/1.0' } }
    )

    if (response.ok) {
      const data = await response.json()
      searchResults.value = data.map((place: Record<string, unknown>) => ({
        id: String(place.place_id),
        name: String(place.display_name).split(',')[0],
        address: String(place.display_name).split(',').slice(1, 3).join(',').trim(),
        lat: parseFloat(String(place.lat)),
        lng: parseFloat(String(place.lon)),
        waitTime: 5 // Default 5 minutes wait
      }))
    }
  } catch {
    // Ignore errors
  } finally {
    isSearching.value = false
  }
}

function addStop(place: StopPoint): void {
  stops.value.push({
    ...place,
    id: `stop-${Date.now()}`
  })
  closeAddStop()
}

function removeStop(index: number): void {
  stops.value.splice(index, 1)
}

function updateWaitTime(index: number, time: number): void {
  if (stops.value[index]) {
    stops.value[index].waitTime = Math.max(0, Math.min(30, time))
  }
}

function moveStop(index: number, direction: 'up' | 'down'): void {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= stops.value.length) return
  
  const temp = stops.value[index]
  stops.value[index] = stops.value[newIndex]
  stops.value[newIndex] = temp
}
</script>

<template>
  <div class="multi-stop">
    <!-- Stops List -->
    <div v-if="stops.length > 0" class="stops-list">
      <div class="stops-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>จุดแวะ ({{ stops.length }}/{{ maxStopsAllowed }})</span>
        <span class="extra-fare">+฿{{ additionalFare }}</span>
      </div>

      <TransitionGroup name="list" tag="div" class="stops-items">
        <div v-for="(stop, index) in stops" :key="stop.id" class="stop-item">
          <div class="stop-number">{{ index + 1 }}</div>
          <div class="stop-info">
            <span class="stop-name">{{ stop.name }}</span>
            <span class="stop-address">{{ stop.address }}</span>
            <div class="stop-wait">
              <button 
                class="wait-btn" 
                :disabled="(stop.waitTime || 0) <= 0"
                @click="updateWaitTime(index, (stop.waitTime || 0) - 5)"
              >
                -
              </button>
              <span>รอ {{ stop.waitTime || 0 }} นาที</span>
              <button 
                class="wait-btn" 
                :disabled="(stop.waitTime || 0) >= 30"
                @click="updateWaitTime(index, (stop.waitTime || 0) + 5)"
              >
                +
              </button>
            </div>
          </div>
          <div class="stop-actions">
            <button 
              v-if="index > 0" 
              class="action-btn" 
              aria-label="เลื่อนขึ้น"
              @click="moveStop(index, 'up')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button 
              v-if="index < stops.length - 1" 
              class="action-btn" 
              aria-label="เลื่อนลง"
              @click="moveStop(index, 'down')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button class="action-btn remove" aria-label="ลบจุดแวะ" @click="removeStop(index)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Add Stop Button -->
    <button 
      v-if="canAddMore" 
      class="add-stop-btn" 
      @click="openAddStop"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
      <span>เพิ่มจุดแวะ</span>
    </button>

    <!-- Add Stop Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddStop" class="modal-overlay" @click="closeAddStop">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>เพิ่มจุดแวะ</h3>
              <button class="close-btn" aria-label="ปิด" @click="closeAddStop">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="search-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="ค้นหาสถานที่..."
                @input="searchPlaces"
              />
            </div>

            <!-- Search Results -->
            <div class="search-results">
              <div v-if="isSearching" class="loading">
                <div class="spinner"></div>
                <span>กำลังค้นหา...</span>
              </div>

              <button
                v-for="place in searchResults"
                :key="place.id"
                class="result-item"
                @click="addStop(place)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div class="result-text">
                  <span class="result-name">{{ place.name }}</span>
                  <span class="result-address">{{ place.address }}</span>
                </div>
              </button>

              <div v-if="!isSearching && searchQuery.length >= 2 && searchResults.length === 0" class="no-results">
                ไม่พบสถานที่
              </div>
            </div>

            <div class="modal-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>ค่าบริการเพิ่ม ฿20/จุด + ฿5/นาทีที่รอ</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.multi-stop {
  margin: 16px 0;
}

/* Stops List */
.stops-list {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.stops-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
}

.stops-header svg {
  color: #00a86b;
}

.extra-fare {
  margin-left: auto;
  color: #00a86b;
  font-weight: 600;
}

.stops-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stop-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.stop-number {
  width: 24px;
  height: 24px;
  background: #00a86b;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.stop-info {
  flex: 1;
  min-width: 0;
}

.stop-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stop-address {
  display: block;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stop-wait {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}

.wait-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f0f0f0;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}

.wait-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #f0f0f0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.action-btn.remove {
  color: #e53935;
}

/* Add Stop Button */
.add-stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: 2px dashed #00a86b;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.2s;
}

.add-stop-btn:active {
  background: #e8f5ef;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.search-box svg {
  color: #999;
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  outline: none;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  cursor: pointer;
}

.result-item:active {
  background: #f5f5f5;
}

.result-item svg {
  color: #00a86b;
  flex-shrink: 0;
}

.result-text {
  flex: 1;
  min-width: 0;
}

.result-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.result-address {
  display: block;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #999;
}

.modal-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #f8f9fa;
  font-size: 12px;
  color: #666;
}

/* List Animation */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
