<script setup lang="ts">
/**
 * Feature: F319 - Store Selector
 * Component for selecting store/shop for shopping service
 */
import { ref, computed } from 'vue'

interface Store {
  id: string
  name: string
  category: string
  address: string
  distance: string
  rating: number
  isOpen: boolean
  closingTime?: string
}

const props = withDefaults(defineProps<{
  stores: Store[]
  selectedId?: string
  loading?: boolean
}>(), {
  stores: () => [],
  loading: false
})

const emit = defineEmits<{
  'select': [store: Store]
  'search': [query: string]
}>()

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'convenience', label: 'ร้านสะดวกซื้อ' },
  { key: 'supermarket', label: 'ซูเปอร์มาร์เก็ต' },
  { key: 'pharmacy', label: 'ร้านยา' },
  { key: 'restaurant', label: 'ร้านอาหาร' }
]

const filteredStores = computed(() => {
  return props.stores.filter(store => {
    const matchCategory = selectedCategory.value === 'all' || store.category === selectedCategory.value
    const matchSearch = !searchQuery.value || 
      store.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchSearch
  })
})

const handleSearch = () => {
  emit('search', searchQuery.value)
}
</script>

<template>
  <div class="store-selector">
    <div class="search-box">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="ค้นหาร้านค้า..."
        @input="handleSearch"
      />
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        type="button"
        class="tab-btn"
        :class="{ active: selectedCategory === cat.key }"
        @click="selectedCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <span>กำลังโหลด...</span>
    </div>

    <div v-else-if="filteredStores.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <path d="M9 22V12h6v10"/>
      </svg>
      <p>ไม่พบร้านค้า</p>
    </div>

    <div v-else class="stores-list">
      <button
        v-for="store in filteredStores"
        :key="store.id"
        type="button"
        class="store-card"
        :class="{ selected: selectedId === store.id, closed: !store.isOpen }"
        @click="emit('select', store)"
      >
        <div class="store-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div class="store-info">
          <div class="store-header">
            <h3 class="store-name">{{ store.name }}</h3>
            <span v-if="!store.isOpen" class="closed-badge">ปิด</span>
          </div>
          <p class="store-address">{{ store.address }}</p>
          <div class="store-meta">
            <span class="store-distance">{{ store.distance }}</span>
            <span class="store-rating">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {{ store.rating.toFixed(1) }}
            </span>
            <span v-if="store.isOpen && store.closingTime" class="store-hours">
              ปิด {{ store.closingTime }}
            </span>
          </div>
        </div>
        <div class="select-indicator">
          <svg v-if="selectedId === store.id" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div v-else class="radio-circle" />
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.store-selector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 12px;
}

.search-box svg {
  color: #6b6b6b;
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
}

.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  padding: 8px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e5e5e5;
}

.tab-btn.active {
  background: #000;
  color: #fff;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #6b6b6b;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stores-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.store-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.store-card:hover {
  border-color: #000;
}

.store-card.selected {
  border-color: #000;
  background: #f6f6f6;
}

.store-card.closed {
  opacity: 0.6;
}

.store-icon {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  flex-shrink: 0;
}

.store-info {
  flex: 1;
  min-width: 0;
}

.store-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.closed-badge {
  font-size: 11px;
  font-weight: 500;
  color: #e11900;
  background: #ffeae6;
  padding: 2px 6px;
  border-radius: 4px;
}

.store-address {
  font-size: 13px;
  color: #6b6b6b;
  margin: 2px 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6b6b6b;
}

.store-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #000;
}

.store-rating svg {
  color: #ffc107;
}

.select-indicator {
  flex-shrink: 0;
}

.radio-circle {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
}

.store-card.selected .select-indicator svg {
  color: #000;
}
</style>
