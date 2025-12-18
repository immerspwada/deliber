<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AddressSearchInput from '../components/AddressSearchInput.vue'
import MapView from '../components/MapView.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useShopping } from '../composables/useShopping'
import { useServices } from '../composables/useServices'
import { useFavoriteShoppingLists, type ShoppingFavoriteList } from '../composables/useFavoriteShoppingLists'
import { useShoppingImages } from '../composables/useShoppingImages'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const { calculateDistance, currentLocation } = useLocation()
const { createShoppingRequest, calculateServiceFee, loading } = useShopping()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()
const { favorites, fetchFavorites, saveFavorite, useFavorite, deleteFavorite } = useFavoriteShoppingLists()
const { images, uploading: _uploading, addImage, removeImage, uploadImages, MAX_IMAGES } = useShoppingImages()
void _uploading // Suppress unused variable warning

// Current step
const currentStep = ref(1)
const totalSteps = 3

// Modals
const showFavoritesModal = ref(false)
const showSaveFavoriteModal = ref(false)
const newFavoriteName = ref('')
const savingFavorite = ref(false)

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

// Fetch saved places and favorites
onMounted(() => {
  fetchSavedPlaces()
  fetchRecentPlaces()
  fetchFavorites()
})

// Store info
const storeName = ref('')
const storeAddress = ref('')
const storeLocation = ref<GeoLocation | null>(null)

// Delivery info
const deliveryAddress = ref('')
const deliveryLocation = ref<GeoLocation | null>(null)

// Shopping info
const itemList = ref('')
const budgetLimit = ref('')
const specialInstructions = ref('')

// Results
const serviceFee = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const isCalculating = ref(false)
const showResult = ref(false)

// Quick budget options
const budgetOptions = [500, 1000, 2000, 5000]

const canProceedStep1 = computed(() => storeLocation.value !== null)
const canProceedStep2 = computed(() => deliveryLocation.value !== null)
const canCalculate = computed(() => itemList.value.trim() && budgetLimit.value)

const itemCount = computed(() => {
  if (!itemList.value.trim()) return 0
  return itemList.value.split('\n').filter(line => line.trim()).length
})

// Handle search result selection
const handleStoreSearchSelect = (place: PlaceResult) => {
  storeAddress.value = place.name
  storeLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

const handleDeliverySearchSelect = (place: PlaceResult) => {
  deliveryAddress.value = place.name
  deliveryLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

// Handle saved place selection
const handleDeliveryHome = () => {
  if (homePlace.value) {
    deliveryAddress.value = homePlace.value.name
    deliveryLocation.value = { lat: homePlace.value.lat, lng: homePlace.value.lng, address: homePlace.value.address }
  }
}

const handleDeliveryWork = () => {
  if (workPlace.value) {
    deliveryAddress.value = workPlace.value.name
    deliveryLocation.value = { lat: workPlace.value.lat, lng: workPlace.value.lng, address: workPlace.value.address }
  }
}

const handleRecentSelect = (place: { name: string; address: string; lat?: number; lng?: number }, target: 'store' | 'delivery') => {
  if (target === 'store') {
    storeAddress.value = place.name
    if (place.lat && place.lng) {
      storeLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  } else {
    deliveryAddress.value = place.name
    if (place.lat && place.lng) {
      deliveryLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  }
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration + 30
}

const selectBudget = (amount: number) => {
  budgetLimit.value = amount.toString()
}

// Favorites functions
const applyFavorite = (fav: ShoppingFavoriteList) => {
  itemList.value = fav.items
  if (fav.estimated_budget) {
    budgetLimit.value = fav.estimated_budget.toString()
  }
  if (fav.store_name) {
    storeName.value = fav.store_name
  }
  if (fav.store_address && fav.store_lat && fav.store_lng) {
    storeAddress.value = fav.store_address
    storeLocation.value = { lat: fav.store_lat, lng: fav.store_lng, address: fav.store_address }
  }
  useFavorite(fav.id)
  showFavoritesModal.value = false
}

const handleSaveFavorite = async () => {
  if (!newFavoriteName.value.trim() || !itemList.value.trim()) return
  
  savingFavorite.value = true
  await saveFavorite({
    name: newFavoriteName.value,
    items: itemList.value,
    storeName: storeName.value || undefined,
    storeAddress: storeAddress.value || undefined,
    storeLat: storeLocation.value?.lat,
    storeLng: storeLocation.value?.lng,
    estimatedBudget: budgetLimit.value ? parseFloat(budgetLimit.value) : undefined
  })
  savingFavorite.value = false
  newFavoriteName.value = ''
  showSaveFavoriteModal.value = false
}

const handleDeleteFavorite = async (id: string) => {
  await deleteFavorite(id)
}

// Image functions
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    Array.from(input.files).forEach(file => addImage(file))
  }
  input.value = ''
}

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    showResult.value = false
  }
}

const calculateFee = async () => {
  if (!canCalculate.value || !storeLocation.value || !deliveryLocation.value) return
  
  isCalculating.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      storeLocation.value.lat, storeLocation.value.lng,
      deliveryLocation.value.lat, deliveryLocation.value.lng
    )
    estimatedTime.value = Math.ceil((estimatedDistance.value / 20) * 60) + 30
  }
  
  serviceFee.value = calculateServiceFee(parseFloat(budgetLimit.value) || 0, estimatedDistance.value)
  showResult.value = true
  isCalculating.value = false
}

const handleCreateShopping = async () => {
  if (!storeLocation.value || !deliveryLocation.value) return
  
  // Upload images first if any
  let imageUrls: string[] = []
  if (images.value.length > 0) {
    imageUrls = await uploadImages()
  }
  
  const result = await createShoppingRequest({
    storeName: storeName.value,
    storeAddress: storeAddress.value,
    storeLocation: storeLocation.value,
    deliveryAddress: deliveryAddress.value,
    deliveryLocation: deliveryLocation.value,
    itemList: itemList.value,
    budgetLimit: parseFloat(budgetLimit.value) || 0,
    specialInstructions: specialInstructions.value,
    distanceKm: estimatedDistance.value,
    referenceImages: imageUrls.length > 0 ? imageUrls : undefined
  })
  
  if (result) {
    router.push(`/tracking/${result.tracking_id}`)
  }
}
</script>

<template>
  <div class="shopping-page">
    <!-- Progress Steps -->
    <div class="progress-container">
      <div class="progress-steps">
        <div v-for="step in totalSteps" :key="step" 
             :class="['step', { active: step <= currentStep, current: step === currentStep }]">
          <div class="step-dot">
            <svg v-if="step < currentStep" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span v-else>{{ step }}</span>
          </div>
          <span class="step-label">{{ step === 1 ? 'ร้านค้า' : step === 2 ? 'ที่อยู่' : 'รายการ' }}</span>
        </div>
        <div class="progress-line">
          <div class="progress-fill" :style="{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }"></div>
        </div>
      </div>
    </div>

    <main class="page-content">
      <!-- Step 1: Store Selection -->
      <div v-show="currentStep === 1" class="step-content">
        <div class="section-header">
          <div class="section-icon store">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div>
            <h2>เลือกร้านค้า</h2>
            <p>ระบุร้านที่ต้องการให้ไปซื้อของ</p>
          </div>
        </div>

        <div class="form-card">
          <label class="input-label">ชื่อร้าน (ถ้าทราบ)</label>
          <input v-model="storeName" type="text" placeholder="เช่น 7-Eleven, Big C, Lotus's" class="input-field" />
        </div>

        <div class="form-card">
          <label class="input-label">ที่อยู่ร้านค้า</label>
          <AddressSearchInput
            v-model="storeAddress"
            placeholder="ค้นหาร้านค้าหรือสถานที่..."
            icon="pickup"
            :show-saved-places="false"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleStoreSearchSelect"
            @select-recent="(p) => handleRecentSelect(p, 'store')"
          />
        </div>

        <!-- Store Selected Indicator -->
        <div v-if="storeLocation" class="selected-indicator">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span>{{ storeAddress || 'เลือกร้านค้าแล้ว' }}</span>
        </div>
      </div>

      <!-- Step 2: Delivery Address -->
      <div v-show="currentStep === 2" class="step-content">
        <div class="section-header">
          <div class="section-icon delivery">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </div>
          <div>
            <h2>ส่งถึงที่ไหน?</h2>
            <p>ระบุที่อยู่สำหรับจัดส่งสินค้า</p>
          </div>
        </div>

        <div class="form-card">
          <label class="input-label">ที่อยู่จัดส่ง</label>
          <AddressSearchInput
            v-model="deliveryAddress"
            placeholder="ค้นหาที่อยู่จัดส่ง..."
            icon="destination"
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleDeliverySearchSelect"
            @select-home="handleDeliveryHome"
            @select-work="handleDeliveryWork"
            @select-recent="(p) => handleRecentSelect(p, 'delivery')"
          />
        </div>

        <!-- Map Preview -->
        <div v-if="storeLocation && deliveryLocation" class="map-preview">
          <MapView
            :pickup="storeLocation"
            :destination="deliveryLocation"
            :show-route="true"
            height="180px"
            @route-calculated="handleRouteCalculated"
          />
          <div class="route-info">
            <div class="route-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
              </svg>
              <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
            </div>
            <div class="route-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>~{{ estimatedTime }} นาที</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Items & Budget -->
      <div v-show="currentStep === 3" class="step-content">
        <div class="section-header">
          <div class="section-icon items">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <div>
            <h2>รายการสินค้า</h2>
            <p>ระบุสิ่งที่ต้องการให้ซื้อ</p>
          </div>
        </div>

        <!-- Favorites Quick Access -->
        <div v-if="favorites.length > 0" class="favorites-row">
          <button class="favorites-btn" @click="showFavoritesModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            รายการโปรด ({{ favorites.length }})
          </button>
        </div>

        <div class="form-card">
          <div class="label-row">
            <label class="input-label">รายการที่ต้องการ</label>
            <span v-if="itemCount > 0" class="item-badge">{{ itemCount }} รายการ</span>
          </div>
          <textarea 
            v-model="itemList" 
            placeholder="พิมพ์รายการสินค้า (บรรทัดละ 1 รายการ)&#10;&#10;ตัวอย่าง:&#10;• นมสด 1 กล่อง&#10;• ขนมปัง 2 ห่อ&#10;• ไข่ไก่ 1 แผง" 
            rows="5" 
            class="input-field textarea"
          ></textarea>
          
          <!-- Save as Favorite -->
          <button v-if="itemList.trim()" class="save-favorite-btn" @click="showSaveFavoriteModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            บันทึกเป็นรายการโปรด
          </button>
        </div>

        <!-- Image Upload Section -->
        <div class="form-card">
          <div class="label-row">
            <label class="input-label">รูปภาพอ้างอิง (ไม่บังคับ)</label>
            <span class="image-count">{{ images.length }}/{{ MAX_IMAGES }}</span>
          </div>
          
          <div class="images-grid">
            <!-- Uploaded Images -->
            <div v-for="img in images" :key="img.id" class="image-item">
              <img :src="img.preview" alt="Reference" />
              <button class="remove-image-btn" @click="removeImage(img.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
              <div v-if="img.uploading" class="image-uploading">
                <span class="spinner-small"></span>
              </div>
            </div>
            
            <!-- Add Image Button -->
            <button 
              v-if="images.length < MAX_IMAGES" 
              class="add-image-btn"
              @click="triggerFileInput"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span>เพิ่มรูป</span>
            </button>
          </div>
          
          <input 
            ref="fileInputRef"
            type="file" 
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="hidden-input"
            @change="handleFileSelect"
          />
          <p class="image-hint">ถ่ายรูปสินค้าที่ต้องการ ช่วยให้ไรเดอร์หาได้ง่ายขึ้น</p>
        </div>

        <div class="form-card">
          <label class="input-label">งบประมาณสูงสุด</label>
          <div class="budget-options">
            <button 
              v-for="amount in budgetOptions" 
              :key="amount"
              :class="['budget-btn', { active: budgetLimit === amount.toString() }]"
              @click="selectBudget(amount)"
            >
              ฿{{ amount.toLocaleString() }}
            </button>
          </div>
          <div class="input-with-icon">
            <span class="input-prefix">฿</span>
            <input 
              v-model="budgetLimit" 
              type="number" 
              placeholder="หรือระบุจำนวนเอง" 
              class="input-field with-prefix" 
            />
          </div>
        </div>

        <div class="form-card">
          <label class="input-label">หมายเหตุเพิ่มเติม (ไม่บังคับ)</label>
          <textarea 
            v-model="specialInstructions" 
            placeholder="เช่น ถ้าไม่มียี่ห้อนี้ให้เอายี่ห้ออื่นแทน..." 
            rows="2" 
            class="input-field textarea"
          ></textarea>
        </div>

        <!-- Result Card -->
        <div v-if="showResult" class="result-card">
          <div class="result-header">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>สรุปค่าบริการ</span>
          </div>
          
          <div class="result-details">
            <div class="detail-row">
              <span>ระยะทาง</span>
              <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
            </div>
            <div class="detail-row">
              <span>เวลาโดยประมาณ</span>
              <span>{{ estimatedTime }} นาที</span>
            </div>
            <div class="detail-row">
              <span>งบประมาณสินค้า</span>
              <span>฿{{ parseInt(budgetLimit).toLocaleString() }}</span>
            </div>
          </div>
          
          <div class="result-total">
            <span>ค่าบริการ</span>
            <span class="total-amount">฿{{ serviceFee.toLocaleString() }}</span>
          </div>
          <p class="result-note">* ไม่รวมราคาสินค้า จ่ายเพิ่มตามจริง</p>
        </div>
      </div>
    </main>

    <!-- Favorites Modal -->
    <div v-if="showFavoritesModal" class="modal-overlay" @click.self="showFavoritesModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>รายการโปรด</h3>
          <button class="close-btn" @click="showFavoritesModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="favorites-list">
          <div v-for="fav in favorites" :key="fav.id" class="favorite-item">
            <div class="favorite-info" @click="applyFavorite(fav)">
              <div class="favorite-name">{{ fav.name }}</div>
              <div class="favorite-meta">
                <span>{{ fav.items.split('\n').filter(l => l.trim()).length }} รายการ</span>
                <span v-if="fav.estimated_budget">฿{{ fav.estimated_budget.toLocaleString() }}</span>
              </div>
              <div v-if="fav.use_count > 0" class="favorite-usage">ใช้แล้ว {{ fav.use_count }} ครั้ง</div>
            </div>
            <button class="delete-favorite-btn" @click.stop="handleDeleteFavorite(fav.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
          <div v-if="favorites.length === 0" class="empty-favorites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <p>ยังไม่มีรายการโปรด</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Favorite Modal -->
    <div v-if="showSaveFavoriteModal" class="modal-overlay" @click.self="showSaveFavoriteModal = false">
      <div class="modal-content small">
        <div class="modal-header">
          <h3>บันทึกรายการโปรด</h3>
          <button class="close-btn" @click="showSaveFavoriteModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <label class="input-label">ชื่อรายการ</label>
          <input 
            v-model="newFavoriteName" 
            type="text" 
            placeholder="เช่น ของใช้ประจำสัปดาห์"
            class="input-field"
          />
          <p class="save-hint">จะบันทึกรายการสินค้า {{ itemCount }} รายการ</p>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showSaveFavoriteModal = false">ยกเลิก</button>
          <button 
            class="btn-primary" 
            :disabled="!newFavoriteName.trim() || savingFavorite"
            @click="handleSaveFavorite"
          >
            <span v-if="savingFavorite" class="spinner"></span>
            {{ savingFavorite ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="bottom-actions">
      <button v-if="currentStep > 1" @click="prevStep" class="btn-secondary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        ย้อนกลับ
      </button>
      
      <button 
        v-if="currentStep === 1" 
        @click="nextStep" 
        :disabled="!canProceedStep1"
        class="btn-primary"
      >
        ถัดไป
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      
      <button 
        v-else-if="currentStep === 2" 
        @click="nextStep" 
        :disabled="!canProceedStep2"
        class="btn-primary"
      >
        ถัดไป
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      
      <button 
        v-else-if="!showResult" 
        @click="calculateFee" 
        :disabled="!canCalculate || isCalculating"
        class="btn-primary"
      >
        <span v-if="isCalculating" class="spinner"></span>
        {{ isCalculating ? 'กำลังคำนวณ...' : 'คำนวณค่าบริการ' }}
      </button>
      
      <button 
        v-else 
        @click="handleCreateShopping" 
        :disabled="loading"
        class="btn-primary confirm"
      >
        <span v-if="loading" class="spinner"></span>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        {{ loading ? 'กำลังสร้าง...' : 'ยืนยันคำสั่งซื้อ' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.shopping-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
}

/* Progress Steps */
.progress-container {
  background: #FFFFFF;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  max-width: 320px;
  margin: 0 auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #999999;
  transition: all 0.3s ease;
}

.step.active .step-dot {
  background: #00A86B;
  color: #FFFFFF;
}

.step.active .step-dot svg {
  width: 16px;
  height: 16px;
}

.step-label {
  font-size: 11px;
  color: #999999;
  font-weight: 500;
}

.step.active .step-label {
  color: #1A1A1A;
}

.progress-line {
  position: absolute;
  top: 16px;
  left: 40px;
  right: 40px;
  height: 3px;
  background: #E8E8E8;
  border-radius: 2px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Page Content */
.page-content {
  flex: 1;
  padding: 20px;
  padding-bottom: 100px;
  overflow-y: auto;
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Section Header */
.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-icon svg {
  width: 24px;
  height: 24px;
}

.section-icon.store {
  background: #E8F5EF;
  color: #00A86B;
}

.section-icon.delivery {
  background: #FFF3E0;
  color: #F5A623;
}

.section-icon.items {
  background: #E3F2FD;
  color: #2196F3;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.section-header p {
  font-size: 14px;
  color: #666666;
  margin: 2px 0 0;
}

/* Form Card */
.form-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-badge {
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
  background: #E8F5EF;
  padding: 4px 10px;
  border-radius: 12px;
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  background: #FFFFFF;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #00A86B;
}

.input-field::placeholder {
  color: #999999;
}

.textarea {
  resize: none;
  line-height: 1.5;
}

/* Budget Options */
.budget-options {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.budget-btn {
  padding: 10px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  background: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.budget-btn:active {
  transform: scale(0.96);
}

.budget-btn.active {
  border-color: #00A86B;
  background: #E8F5EF;
  color: #00A86B;
}

.input-with-icon {
  position: relative;
}

.input-prefix {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  font-weight: 600;
  color: #666666;
}

.input-field.with-prefix {
  padding-left: 36px;
}

/* Selected Indicator */
.selected-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #E8F5EF;
  border-radius: 12px;
  margin-top: 12px;
}

.selected-indicator svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
}

.selected-indicator span {
  font-size: 14px;
  color: #00A86B;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Map Preview */
.map-preview {
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  margin-top: 12px;
}

.route-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px;
  background: #F5F5F5;
}

.route-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.route-item svg {
  width: 18px;
  height: 18px;
}

/* Result Card */
.result-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
  border: 2px solid #00A86B;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: #00A86B;
  font-weight: 600;
}

.result-header svg {
  width: 22px;
  height: 22px;
}

.result-details {
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666666;
}

.detail-row span:last-child {
  font-weight: 500;
  color: #1A1A1A;
}

.result-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px dashed #E8E8E8;
}

.result-total span:first-child {
  font-size: 14px;
  color: #666666;
}

.total-amount {
  font-size: 28px;
  font-weight: 700;
  color: #00A86B;
}

.result-note {
  font-size: 12px;
  color: #999999;
  text-align: right;
  margin-top: 8px;
}

/* Bottom Actions */
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
  z-index: 100;
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 20px;
  background: #F5F5F5;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary svg {
  width: 20px;
  height: 20px;
}

.btn-secondary:active {
  transform: scale(0.98);
  background: #E8E8E8;
}

.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-primary.confirm {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Favorites Row */
.favorites-row {
  margin-bottom: 12px;
}

.favorites-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #FFF0F5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #E91E63;
  cursor: pointer;
  width: 100%;
  justify-content: center;
}

.favorites-btn svg {
  width: 18px;
  height: 18px;
}

.save-favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px;
  background: none;
  border: 1px dashed #E91E63;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #E91E63;
  cursor: pointer;
  width: 100%;
}

.save-favorite-btn svg {
  width: 16px;
  height: 16px;
}

/* Image Upload */
.image-count {
  font-size: 12px;
  color: #999999;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
  color: #FFFFFF;
}

.image-uploading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.add-image-btn {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #F5F5F5;
  border: 2px dashed #E8E8E8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-image-btn:active {
  background: #E8E8E8;
}

.add-image-btn svg {
  width: 24px;
  height: 24px;
  color: #999999;
}

.add-image-btn span {
  font-size: 11px;
  color: #999999;
}

.hidden-input {
  display: none;
}

.image-hint {
  font-size: 12px;
  color: #999999;
  margin: 0;
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
  padding: 20px;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.modal-content.small {
  max-height: auto;
  border-radius: 20px;
  margin-bottom: auto;
  margin-top: auto;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #F0F0F0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.modal-body {
  padding: 20px;
}

.save-hint {
  font-size: 13px;
  color: #666666;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #F0F0F0;
}

.modal-actions .btn-secondary,
.modal-actions .btn-primary {
  flex: 1;
  padding: 14px;
}

/* Favorites List */
.favorites-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px 20px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #F5F5F5;
  border-radius: 12px;
  margin-bottom: 10px;
}

.favorite-info {
  flex: 1;
  cursor: pointer;
}

.favorite-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.favorite-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666666;
}

.favorite-usage {
  font-size: 11px;
  color: #999999;
  margin-top: 4px;
}

.delete-favorite-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.delete-favorite-btn svg {
  width: 18px;
  height: 18px;
  color: #E53935;
}

.empty-favorites {
  text-align: center;
  padding: 40px 20px;
  color: #999999;
}

.empty-favorites svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.empty-favorites p {
  font-size: 14px;
  margin: 0;
}
</style>
