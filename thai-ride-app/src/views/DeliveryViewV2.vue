<script setup lang="ts">
/**
 * DeliveryViewV2 - Enhanced UX with Delightful Map Details
 * Feature: F03 - Delivery Service
 * 
 * Design Philosophy: "Feel Good Delivery"
 * - Animated markers with pulse effects
 * - Smooth route animations
 * - Micro-interactions on every touch
 * - Visual feedback for every action
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useDelivery } from '../composables/useDelivery'
import { useServices } from '../composables/useServices'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { calculateDistance, getCurrentPosition } = useLocation()
const { createDeliveryRequest, calculateFee, calculateTimeRange, loading, error: deliveryError, clearError } = useDelivery()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// Flow state - simplified to 2 main states
type FlowState = 'location' | 'details'
const flowState = ref<FlowState>('location')

// Location state
const pickupLocation = ref<GeoLocation | null>(null)
const pickupAddress = ref('')
const dropoffLocation = ref<GeoLocation | null>(null)
const dropoffAddress = ref('')
const activeInput = ref<'pickup' | 'dropoff'>('pickup')

// Details state
const recipientPhone = ref('')
const packageType = ref<'document' | 'small' | 'medium' | 'large'>('small')
const specialNote = ref('')

// UI state
const isGettingLocation = ref(false)
const showLocationPicker = ref(false)
const mapReady = ref(false)
const routeAnimating = ref(false)

// Calculated values
const estimatedDistance = ref(0)
const estimatedTime = ref({ min: 15, max: 30 })
const deliveryFee = ref(0)

// Nearby riders count (simulated for delight)
const nearbyRiders = ref(Math.floor(Math.random() * 5) + 3)

// Package types
const packageTypes = [
  { value: 'document', label: 'เอกสาร', icon: 'document', price: '฿25+' },
  { value: 'small', label: 'เล็ก', icon: 'small', price: '฿35+' },
  { value: 'medium', label: 'กลาง', icon: 'medium', price: '฿55+' },
  { value: 'large', label: 'ใหญ่', icon: 'large', price: '฿85+' }
] as const

// Haptic feedback
const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    navigator.vibrate({ light: 10, medium: 25, heavy: 50 }[type])
  }
}

// Auto-calculate when both locations set
watch([pickupLocation, dropoffLocation], () => {
  if (pickupLocation.value && dropoffLocation.value) {
    routeAnimating.value = true
    
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat, pickupLocation.value.lng,
      dropoffLocation.value.lat, dropoffLocation.value.lng
    )
    estimatedTime.value = calculateTimeRange(estimatedDistance.value)
    deliveryFee.value = calculateFee(estimatedDistance.value, packageType.value)
    
    // Animate route drawing
    setTimeout(() => {
      routeAnimating.value = false
    }, 800)
  }
})

// Recalculate fee when package type changes
watch(packageType, () => {
  if (estimatedDistance.value > 0) {
    deliveryFee.value = calculateFee(estimatedDistance.value, packageType.value)
  }
})

const hasRoute = computed(() => !!(pickupLocation.value && dropoffLocation.value))

const canProceed = computed(() => {
  if (flowState.value === 'location') {
    return pickupLocation.value && dropoffLocation.value
  }
  return recipientPhone.value.length >= 9
})

// Get current location
const useCurrentLocation = async () => {
  isGettingLocation.value = true
  haptic('medium')
  
  try {
    const loc = await getCurrentPosition()
    if (loc) {
      pickupLocation.value = loc
      pickupAddress.value = loc.address || 'ตำแหน่งปัจจุบัน'
      activeInput.value = 'dropoff'
      haptic('heavy')
    }
  } catch {
    alert('ไม่สามารถระบุตำแหน่งได้')
  } finally {
    isGettingLocation.value = false
  }
}

// Select saved place
const selectPlace = (place: any, type: 'pickup' | 'dropoff') => {
  haptic('light')
  const location = { lat: place.lat, lng: place.lng, address: place.address }
  
  if (type === 'pickup') {
    pickupLocation.value = location
    pickupAddress.value = place.name
    activeInput.value = 'dropoff'
  } else {
    dropoffLocation.value = location
    dropoffAddress.value = place.name
  }
}

// Clear location
const clearLocation = (type: 'pickup' | 'dropoff') => {
  haptic('light')
  if (type === 'pickup') {
    pickupLocation.value = null
    pickupAddress.value = ''
  } else {
    dropoffLocation.value = null
    dropoffAddress.value = ''
  }
}

// Proceed to next step
const proceed = () => {
  haptic('medium')
  if (flowState.value === 'location' && canProceed.value) {
    flowState.value = 'details'
  }
}

// Go back
const goBack = () => {
  haptic('light')
  if (flowState.value === 'details') {
    flowState.value = 'location'
  } else {
    router.push('/customer')
  }
}

// Submit delivery
const submitDelivery = async () => {
  if (!pickupLocation.value || !dropoffLocation.value) return
  
  haptic('heavy')
  
  const result = await createDeliveryRequest({
    senderName: authStore.user?.name || 'ผู้ส่ง',
    senderPhone: (authStore.user as any)?.phone_number || '',
    senderAddress: pickupAddress.value,
    senderLocation: pickupLocation.value,
    recipientName: 'ผู้รับ',
    recipientPhone: recipientPhone.value,
    recipientAddress: dropoffAddress.value,
    recipientLocation: dropoffLocation.value,
    packageType: packageType.value,
    packageWeight: 1,
    packageDescription: specialNote.value,
    distanceKm: estimatedDistance.value
  })
  
  if (result) {
    router.push(`/tracking/${result.tracking_id}`)
  }
}

onMounted(() => {
  fetchSavedPlaces()
  fetchRecentPlaces()
  
  // Simulate map ready
  setTimeout(() => {
    mapReady.value = true
  }, 500)
})
</script>

<template>
  <div class="delivery-v2">
    <!-- Animated Map Section -->
    <div class="map-container" :class="{ 'map-expanded': flowState === 'location' }">
      <!-- Map Background with Gradient Overlay -->
      <div class="map-bg">
        <div class="map-grid"></div>
        
        <!-- Animated Pulse Ring at Center (when no location) -->
        <div v-if="!pickupLocation && mapReady" class="center-pulse">
          <div class="pulse-ring pulse-1"></div>
          <div class="pulse-ring pulse-2"></div>
          <div class="pulse-ring pulse-3"></div>
          <div class="center-dot"></div>
        </div>
        
        <!-- Pickup Marker -->
        <Transition name="marker-pop">
          <div v-if="pickupLocation" class="map-marker pickup-marker" :style="{ left: '35%', top: '40%' }">
            <div class="marker-pulse"></div>
            <div class="marker-pin">
              <div class="marker-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
            <div class="marker-shadow"></div>
            <div class="marker-label">รับพัสดุ</div>
          </div>
        </Transition>
        
        <!-- Dropoff Marker -->
        <Transition name="marker-pop">
          <div v-if="dropoffLocation" class="map-marker dropoff-marker" :style="{ left: '65%', top: '55%' }">
            <div class="marker-pulse red"></div>
            <div class="marker-pin red">
              <div class="marker-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                </svg>
              </div>
            </div>
            <div class="marker-shadow"></div>
            <div class="marker-label red">ส่งพัสดุ</div>
          </div>
        </Transition>
        
        <!-- Animated Route Line -->
        <svg v-if="hasRoute" class="route-line" :class="{ animating: routeAnimating }">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#00A86B"/>
              <stop offset="100%" style="stop-color:#E53935"/>
            </linearGradient>
          </defs>
          <path 
            class="route-path"
            d="M 140 160 Q 200 120 260 220"
            fill="none"
            stroke="url(#routeGradient)"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="8 4"
          />
          <!-- Animated dot on route -->
          <circle class="route-dot" r="6" fill="#00A86B">
            <animateMotion dur="2s" repeatCount="indefinite" path="M 140 160 Q 200 120 260 220"/>
          </circle>
        </svg>
        
        <!-- Nearby Riders Animation -->
        <div v-if="mapReady && !hasRoute" class="nearby-riders">
          <div v-for="i in 3" :key="i" class="rider-dot" :style="{ 
            left: `${20 + i * 25}%`, 
            top: `${30 + (i % 2) * 30}%`,
            animationDelay: `${i * 0.5}s`
          }">
            <svg viewBox="0 0 24 24" fill="#00A86B">
              <circle cx="12" cy="12" r="8"/>
            </svg>
          </div>
        </div>
        
        <!-- Distance Badge -->
        <Transition name="badge-pop">
          <div v-if="hasRoute && estimatedDistance > 0" class="distance-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
            </svg>
            <span>{{ estimatedDistance.toFixed(1) }} km</span>
          </div>
        </Transition>
      </div>
      
      <!-- Map Overlay Info -->
      <div class="map-overlay-top">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="page-title">ส่งพัสดุ</span>
        <div class="riders-badge" v-if="!hasRoute">
          <div class="riders-dot"></div>
          <span>{{ nearbyRiders }} ไรเดอร์ใกล้คุณ</span>
        </div>
      </div>
    </div>

    <!-- Bottom Panel -->
    <div class="bottom-panel" :class="{ expanded: flowState === 'details' }">
      <div class="panel-handle"></div>
      
      <!-- Location Flow -->
      <template v-if="flowState === 'location'">
        <div class="location-section">
          <!-- Route Card -->
          <div class="route-card">
            <!-- Pickup Input -->
            <div class="location-input" :class="{ active: activeInput === 'pickup', filled: pickupLocation }">
              <div class="input-dot green">
                <div class="dot-inner" :class="{ pulse: !pickupLocation }"></div>
              </div>
              <div class="input-content" @click="activeInput = 'pickup'">
                <span class="input-label">รับพัสดุที่</span>
                <span class="input-value" v-if="pickupAddress">{{ pickupAddress }}</span>
                <span class="input-placeholder" v-else>เลือกจุดรับ</span>
              </div>
              <button v-if="pickupLocation" class="clear-btn" @click.stop="clearLocation('pickup')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- Connector Line -->
            <div class="route-connector">
              <div class="connector-line"></div>
              <div class="connector-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            
            <!-- Dropoff Input -->
            <div class="location-input" :class="{ active: activeInput === 'dropoff', filled: dropoffLocation }">
              <div class="input-dot red">
                <div class="dot-inner"></div>
              </div>
              <div class="input-content" @click="activeInput = 'dropoff'">
                <span class="input-label">ส่งพัสดุที่</span>
                <span class="input-value" v-if="dropoffAddress">{{ dropoffAddress }}</span>
                <span class="input-placeholder" v-else>เลือกจุดส่ง</span>
              </div>
              <button v-if="dropoffLocation" class="clear-btn" @click.stop="clearLocation('dropoff')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="quick-actions" v-if="activeInput === 'pickup' && !pickupLocation">
            <button class="action-btn primary" @click="useCurrentLocation" :disabled="isGettingLocation">
              <div class="action-icon">
                <div v-if="isGettingLocation" class="spinner"></div>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                </svg>
              </div>
              <span>{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ตำแหน่งปัจจุบัน' }}</span>
            </button>
          </div>
          
          <!-- Saved Places -->
          <div class="saved-places" v-if="(homePlace || workPlace) && !pickupLocation">
            <h4 class="section-title">สถานที่บันทึกไว้</h4>
            <div class="places-row">
              <button v-if="homePlace" class="place-chip" @click="selectPlace(homePlace, activeInput)">
                <div class="chip-icon home">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <span>บ้าน</span>
              </button>
              <button v-if="workPlace" class="place-chip" @click="selectPlace(workPlace, activeInput)">
                <div class="chip-icon work">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                  </svg>
                </div>
                <span>ที่ทำงาน</span>
              </button>
            </div>
          </div>
          
          <!-- Recent Places -->
          <div class="recent-places" v-if="recentPlaces.length > 0 && !dropoffLocation">
            <h4 class="section-title">ล่าสุด</h4>
            <div class="places-list">
              <button 
                v-for="place in recentPlaces.slice(0, 3)" 
                :key="place.id"
                class="place-item"
                @click="selectPlace(place, activeInput)"
              >
                <div class="place-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div class="place-info">
                  <span class="place-name">{{ place.name }}</span>
                  <span class="place-address">{{ place.address }}</span>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Continue Button -->
          <Transition name="slide-up">
            <button v-if="canProceed" class="continue-btn" @click="proceed">
              <span>เลือกประเภทพัสดุ</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </Transition>
        </div>
      </template>
      
      <!-- Details Flow -->
      <template v-else>
        <div class="details-section">
          <!-- Summary Card -->
          <div class="summary-card">
            <div class="summary-route">
              <div class="summary-point">
                <div class="point-dot green"></div>
                <span>{{ pickupAddress }}</span>
              </div>
              <div class="summary-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <div class="summary-point">
                <div class="point-dot red"></div>
                <span>{{ dropoffAddress }}</span>
              </div>
            </div>
            <div class="summary-stats">
              <div class="stat">
                <span class="stat-value">{{ estimatedDistance.toFixed(1) }}</span>
                <span class="stat-label">กม.</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat">
                <span class="stat-value">{{ estimatedTime.min }}-{{ estimatedTime.max }}</span>
                <span class="stat-label">นาที</span>
              </div>
            </div>
          </div>
          
          <!-- Package Type -->
          <div class="package-section">
            <h4 class="section-title">ประเภทพัสดุ</h4>
            <div class="package-grid">
              <button 
                v-for="pkg in packageTypes" 
                :key="pkg.value"
                :class="['package-card', { selected: packageType === pkg.value }]"
                @click="packageType = pkg.value; haptic('light')"
              >
                <div class="package-icon">
                  <svg v-if="pkg.value === 'document'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <span class="package-label">{{ pkg.label }}</span>
                <span class="package-price">{{ pkg.price }}</span>
                <div v-if="packageType === pkg.value" class="selected-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Recipient Phone -->
          <div class="input-section">
            <label class="input-label-text">เบอร์ผู้รับ</label>
            <div class="phone-input">
              <div class="phone-prefix">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <input 
                v-model="recipientPhone" 
                type="tel" 
                placeholder="0812345678"
                maxlength="10"
              />
            </div>
          </div>
          
          <!-- Special Note -->
          <div class="input-section">
            <label class="input-label-text">หมายเหตุ (ไม่บังคับ)</label>
            <textarea 
              v-model="specialNote" 
              placeholder="เช่น ฝากไว้หน้าบ้าน, โทรก่อนส่ง"
              rows="2"
            ></textarea>
          </div>
          
          <!-- Price Summary -->
          <div class="price-card">
            <div class="price-row">
              <span>ค่าส่ง</span>
              <span class="price-value">฿{{ deliveryFee }}</span>
            </div>
            <div class="price-note">ชำระเงินสดกับไรเดอร์</div>
          </div>
          
          <!-- Submit Button -->
          <button 
            class="submit-btn" 
            :disabled="!canProceed || loading"
            @click="submitDelivery"
          >
            <span v-if="loading">กำลังสร้างออเดอร์...</span>
            <span v-else>ส่งเลย ฿{{ deliveryFee }}</span>
          </button>
        </div>
      </template>
    </div>
    
    <!-- Error Toast -->
    <Transition name="toast">
      <div v-if="deliveryError" class="error-toast" @click="clearError">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4m0 4h.01"/>
        </svg>
        <span>{{ deliveryError }}</span>
      </div>
    </Transition>
  </div>
</template>


<style scoped>
/* ========================================
   DeliveryViewV2 - Delightful Map Styles
   ======================================== */

.delivery-v2 {
  min-height: 100vh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========================================
   Map Container
   ======================================== */
.map-container {
  position: relative;
  height: 45vh;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.map-container.map-expanded {
  height: 50vh;
}

.map-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #E8F5EF 0%, #F0F7F4 50%, #F5F5F5 100%);
  overflow: hidden;
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(0, 168, 107, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 168, 107, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}

/* ========================================
   Center Pulse Animation
   ======================================== */
.center-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.pulse-ring {
  position: absolute;
  width: 100px;
  height: 100px;
  border: 2px solid #00A86B;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulseRing 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.pulse-1 { animation-delay: 0s; }
.pulse-ring.pulse-2 { animation-delay: 0.6s; }
.pulse-ring.pulse-3 { animation-delay: 1.2s; }

@keyframes pulseRing {
  0% {
    width: 20px;
    height: 20px;
    opacity: 0.8;
  }
  100% {
    width: 120px;
    height: 120px;
    opacity: 0;
  }
}

.center-dot {
  position: absolute;
  width: 16px;
  height: 16px;
  background: #00A86B;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px rgba(0, 168, 107, 0.5);
}

/* ========================================
   Map Markers
   ======================================== */
.map-marker {
  position: absolute;
  transform: translate(-50%, -100%);
  z-index: 10;
}

.marker-pulse {
  position: absolute;
  bottom: -8px;
  left: 50%;
  width: 40px;
  height: 40px;
  background: rgba(0, 168, 107, 0.3);
  border-radius: 50%;
  transform: translateX(-50%);
  animation: markerPulse 1.5s ease-out infinite;
}

.marker-pulse.red {
  background: rgba(229, 57, 53, 0.3);
}

@keyframes markerPulse {
  0% { transform: translateX(-50%) scale(0.5); opacity: 1; }
  100% { transform: translateX(-50%) scale(1.5); opacity: 0; }
}

.marker-pin {
  position: relative;
  width: 44px;
  height: 44px;
  background: #00A86B;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.4);
}

.marker-pin.red {
  background: #E53935;
  box-shadow: 0 4px 12px rgba(229, 57, 53, 0.4);
}

.marker-icon {
  transform: rotate(45deg);
  width: 24px;
  height: 24px;
  color: white;
}

.marker-shadow {
  position: absolute;
  bottom: -12px;
  left: 50%;
  width: 30px;
  height: 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  transform: translateX(-50%);
}

.marker-label {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.marker-label.red {
  color: #E53935;
}

/* Marker Pop Animation */
.marker-pop-enter-active {
  animation: markerPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.marker-pop-leave-active {
  animation: markerPop 0.3s ease-in reverse;
}

@keyframes markerPop {
  0% { transform: translate(-50%, -100%) scale(0); opacity: 0; }
  100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
}

/* ========================================
   Route Line Animation
   ======================================== */
.route-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.route-path {
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.8s ease-out;
}

.route-line.animating .route-path {
  stroke-dasharray: 200;
  animation: drawRoute 0.8s ease-out forwards;
}

@keyframes drawRoute {
  0% { stroke-dashoffset: 200; }
  100% { stroke-dashoffset: 0; }
}

.route-dot {
  filter: drop-shadow(0 2px 4px rgba(0, 168, 107, 0.5));
}

/* ========================================
   Nearby Riders Animation
   ======================================== */
.nearby-riders {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.rider-dot {
  position: absolute;
  width: 24px;
  height: 24px;
  animation: riderFloat 3s ease-in-out infinite;
}

.rider-dot svg {
  filter: drop-shadow(0 2px 4px rgba(0, 168, 107, 0.3));
}

@keyframes riderFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* ========================================
   Distance Badge
   ======================================== */
.distance-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-weight: 600;
  color: #1A1A1A;
}

.distance-badge svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.badge-pop-enter-active {
  animation: badgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes badgePop {
  0% { transform: translate(-50%, -50%) scale(0); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

/* ========================================
   Map Overlay Top
   ======================================== */
.map-overlay-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, transparent 100%);
  padding-top: max(16px, env(safe-area-inset-top));
}

.back-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.riders-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  color: #666;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.riders-dot {
  width: 8px;
  height: 8px;
  background: #00A86B;
  border-radius: 50%;
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ========================================
   Bottom Panel
   ======================================== */
.bottom-panel {
  flex: 1;
  background: white;
  border-radius: 24px 24px 0 0;
  margin-top: -20px;
  position: relative;
  z-index: 20;
  padding: 12px 20px 32px;
  padding-bottom: max(32px, env(safe-area-inset-bottom));
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.bottom-panel.expanded {
  margin-top: -40vh;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* ========================================
   Location Section
   ======================================== */
.location-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.route-card {
  background: #F8F8F8;
  border-radius: 16px;
  padding: 16px;
}

.location-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.location-input.active {
  border-color: #00A86B;
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.1);
}

.location-input.filled {
  background: #E8F5EF;
}

.input-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-dot.green {
  background: rgba(0, 168, 107, 0.15);
}

.input-dot.red {
  background: rgba(229, 57, 53, 0.15);
}

.dot-inner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00A86B;
}

.input-dot.red .dot-inner {
  background: #E53935;
}

.dot-inner.pulse {
  animation: dotInnerPulse 1.5s ease-in-out infinite;
}

@keyframes dotInnerPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.input-content {
  flex: 1;
  min-width: 0;
}

.input-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}

.input-value {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-placeholder {
  display: block;
  font-size: 15px;
  color: #999;
}

.clear-btn {
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  color: #999;
}

.route-connector {
  display: flex;
  align-items: center;
  padding: 4px 0 4px 26px;
}

.connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(180deg, #00A86B 0%, #E53935 100%);
  border-radius: 1px;
}

.connector-dots {
  display: none;
}

/* ========================================
   Quick Actions
   ======================================== */
.quick-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #E8F5EF;
  color: #00A86B;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 168, 107, 0.2);
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========================================
   Saved & Recent Places
   ======================================== */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
}

.places-row {
  display: flex;
  gap: 12px;
}

.place-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.place-chip:active {
  transform: scale(0.98);
  background: #E8E8E8;
}

.chip-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-icon.home {
  background: rgba(0, 168, 107, 0.15);
  color: #00A86B;
}

.chip-icon.work {
  background: rgba(59, 130, 246, 0.15);
  color: #3B82F6;
}

.chip-icon svg {
  width: 16px;
  height: 16px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F8F8F8;
  border: none;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.place-item:active {
  background: #F0F0F0;
}

.place-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.place-icon svg {
  width: 18px;
  height: 18px;
  color: #666;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.place-address {
  display: block;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========================================
   Continue Button
   ======================================== */
.continue-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s;
}

.continue-btn:active {
  transform: scale(0.98);
}

.continue-btn svg {
  width: 20px;
  height: 20px;
}

.slide-up-enter-active {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* ========================================
   Details Section
   ======================================== */
.details-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-card {
  background: #F8F8F8;
  border-radius: 16px;
  padding: 16px;
}

.summary-route {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.summary-point {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.summary-point span {
  font-size: 13px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.green { background: #00A86B; }
.point-dot.red { background: #E53935; }

.summary-arrow {
  flex-shrink: 0;
}

.summary-arrow svg {
  width: 16px;
  height: 16px;
}

.summary-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: #E8E8E8;
}

/* ========================================
   Package Section
   ======================================== */
.package-section {
  margin-top: 4px;
}

.package-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.package-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: #F8F8F8;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.package-card.selected {
  background: #E8F5EF;
  border-color: #00A86B;
}

.package-card:active {
  transform: scale(0.98);
}

.package-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.package-icon svg {
  width: 28px;
  height: 28px;
  color: #666;
}

.package-card.selected .package-icon svg {
  color: #00A86B;
}

.package-label {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

.package-price {
  font-size: 11px;
  color: #999;
}

.selected-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-check svg {
  width: 12px;
  height: 12px;
  color: white;
}

/* ========================================
   Input Section
   ======================================== */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label-text {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.phone-input {
  display: flex;
  align-items: center;
  background: #F8F8F8;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.phone-input:focus-within {
  border-color: #00A86B;
}

.phone-prefix {
  padding: 14px;
  border-right: 1px solid #E8E8E8;
}

.phone-prefix svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.phone-input input {
  flex: 1;
  padding: 14px;
  background: transparent;
  border: none;
  font-size: 16px;
  color: #1A1A1A;
  outline: none;
}

.phone-input input::placeholder {
  color: #999;
}

.input-section textarea {
  padding: 14px;
  background: #F8F8F8;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  resize: none;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.input-section textarea:focus {
  border-color: #00A86B;
}

.input-section textarea::placeholder {
  color: #999;
}

/* ========================================
   Price Card
   ======================================== */
.price-card {
  background: #F8F8F8;
  border-radius: 14px;
  padding: 16px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row span:first-child {
  font-size: 15px;
  color: #666;
}

.price-value {
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
}

.price-note {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* ========================================
   Submit Button
   ======================================== */
.submit-btn {
  width: 100%;
  padding: 18px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn:disabled {
  background: #CCC;
  box-shadow: none;
  cursor: not-allowed;
}

/* ========================================
   Error Toast
   ======================================== */
.error-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #E53935;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(229, 57, 53, 0.3);
  cursor: pointer;
  z-index: 100;
}

.error-toast svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastIn 0.2s ease-in reverse;
}

@keyframes toastIn {
  0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0); opacity: 1; }
}

/* ========================================
   Responsive
   ======================================== */
@media (max-width: 360px) {
  .package-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .package-card {
    padding: 12px;
  }
}
</style>
