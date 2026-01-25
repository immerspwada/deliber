<script setup lang="ts">
import { ref, h } from 'vue'
import { useNearbyPlaces, type NearbyPlace, type PlaceCategory } from '../composables/useNearbyPlaces'

const props = defineProps<{
  show: boolean
  currentLat?: number
  currentLng?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', place: NearbyPlace): void
}>()

const { places, loading, error, categories, searchNearby, clearPlaces, formatDistance } = useNearbyPlaces()
const activeCategory = ref<PlaceCategory | null>(null)

const handleCategoryClick = async (categoryId: PlaceCategory) => {
  if (!props.currentLat || !props.currentLng) return
  activeCategory.value = categoryId
  await searchNearby(props.currentLat, props.currentLng, categoryId)
}

const handlePlaceSelect = (place: NearbyPlace) => {
  emit('select', place)
  handleClose()
}

const handleClose = () => {
  clearPlaces()
  activeCategory.value = null
  emit('close')
}

const handleBack = () => {
  clearPlaces()
  activeCategory.value = null
}

// Helper functions
const getCategoryName = (id: string): string => {
  const names: Record<string, string> = {
    restaurant: 'ร้านอาหาร', cafe: 'คาเฟ่', gas_station: 'ปั๊มน้ำมัน', atm: 'ATM',
    hospital: 'โรงพยาบาล', pharmacy: 'ร้านยา', convenience: 'ร้านสะดวกซื้อ',
    shopping: 'ห้างสรรพสินค้า', hotel: 'โรงแรม', parking: 'ที่จอดรถ'
  }
  return names[id] || id
}


// SVG Icon components
const RestaurantIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 6v6m0 0v6m0-6h6m-6 0H6' })
])
const CafeIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zm0-4h14' })
])
const GasIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 14v6m-3-3h6M5 3h8a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 6h2' })
])
const AtmIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' })
])
const HospitalIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })
])
const PharmacyIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4v16m8-8H4' })
])
const StoreIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' })
])
const ShoppingIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' })
])
const HotelIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' })
])
const ParkingIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 17V7h4a3 3 0 010 6H9' })
])

 
const getCategoryIcon = (id: string): any => {
  const icons: Record<string, any> = {
    restaurant: RestaurantIcon, cafe: CafeIcon, gas_station: GasIcon, atm: AtmIcon,
    hospital: HospitalIcon, pharmacy: PharmacyIcon, convenience: StoreIcon,
    shopping: ShoppingIcon, hotel: HotelIcon, parking: ParkingIcon
  }
  return icons[id] || StoreIcon
}
</script>


<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-overlay" @click.self="handleClose">
        <div class="sheet-content">
          <div class="sheet-header">
            <button v-if="activeCategory" class="back-btn" @click="handleBack">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h3>{{ activeCategory ? getCategoryName(activeCategory) : 'สถานที่ใกล้เคียง' }}</h3>
            <button class="close-btn" @click="handleClose">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div v-if="!activeCategory" class="categories-grid">
            <button v-for="cat in categories" :key="cat.id" class="category-item" @click="handleCategoryClick(cat.id)">
              <div class="category-icon"><component :is="getCategoryIcon(cat.id)" /></div>
              <span>{{ cat.name }}</span>
            </button>
          </div>

          <div v-else class="results-section">
            <div v-if="loading" class="loading-state">
              <div class="loading-spinner"></div>
              <span>กำลังค้นหา...</span>
            </div>
            <div v-else-if="error" class="error-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>{{ error }}</span>
              <button @click="handleCategoryClick(activeCategory!)">ลองใหม่</button>
            </div>
            <div v-else-if="places.length === 0" class="empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>ไม่พบสถานที่ในบริเวณนี้</span>
            </div>
            <div v-else class="results-list">
              <button v-for="place in places" :key="place.id" class="place-item" @click="handlePlaceSelect(place)">
                <div class="place-icon"><component :is="getCategoryIcon(place.category)" /></div>
                <div class="place-info">
                  <span class="place-name">{{ place.name }}</span>
                  <span class="place-address">{{ place.address }}</span>
                </div>
                <div v-if="place.distance" class="place-distance">{{ formatDistance(place.distance) }}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>


<style scoped>
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 2000; }
.sheet-content { background: #fff; border-radius: 24px 24px 0 0; width: 100%; max-width: 480px; max-height: 80vh; overflow-y: auto; }
.sheet-header { display: flex; align-items: center; gap: 12px; padding: 20px; border-bottom: 1px solid #E5E5E5; position: sticky; top: 0; background: #fff; z-index: 10; }
.sheet-header h3 { flex: 1; font-size: 18px; font-weight: 700; margin: 0; }
.back-btn, .close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #F6F6F6; border: none; border-radius: 50%; cursor: pointer; }
.back-btn:hover, .close-btn:hover { background: #E5E5E5; }
.back-btn svg, .close-btn svg { width: 20px; height: 20px; }
.categories-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 20px; }
.category-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; background: #F6F6F6; border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.category-item:hover { background: #E5E5E5; }
.category-item:active { transform: scale(0.95); }
.category-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 50%; }
.category-icon svg { width: 20px; height: 20px; }
.category-item span { font-size: 11px; font-weight: 500; color: #333; text-align: center; }
.results-section { padding: 16px; }
.loading-state, .error-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 20px; color: #6B6B6B; }
.loading-spinner { width: 32px; height: 32px; border: 3px solid #E5E5E5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-state svg, .empty-state svg { width: 48px; height: 48px; opacity: 0.5; }
.error-state button { padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.results-list { display: flex; flex-direction: column; gap: 8px; }
.place-item { display: flex; align-items: center; gap: 14px; padding: 14px; background: #F6F6F6; border: none; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; }
.place-item:hover { background: #E5E5E5; }
.place-item:active { transform: scale(0.98); }
.place-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 12px; flex-shrink: 0; }
.place-icon svg { width: 22px; height: 22px; }
.place-info { flex: 1; min-width: 0; }
.place-name { display: block; font-size: 15px; font-weight: 600; color: #000; }
.place-address { display: block; font-size: 12px; color: #6B6B6B; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.place-distance { font-size: 13px; font-weight: 500; color: #6B6B6B; flex-shrink: 0; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.3s; }
.sheet-enter-active .sheet-content, .sheet-leave-active .sheet-content { transition: transform 0.3s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-content, .sheet-leave-to .sheet-content { transform: translateY(100%); }
</style>
