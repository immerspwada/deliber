<script setup lang="ts">
/**
 * Customers Filters Bar Component
 * ================================
 * Advanced filters สำหรับ Admin Customers
 */
import { ref, computed } from 'vue'
import { useCustomerFilters, type CustomerStatus } from '@/admin/composables/useCustomerFilters'

const emit = defineEmits<{
  apply: []
}>()

const {
  filters,
  showAdvancedFilters,
  hasActiveFilters,
  filterStats,
  filterSummary,
  toggleStatus,
  setDateRange,
  setWalletRange,
  setOrderRange,
  setRatingRange,
  clearFilters,
  clearFilter,
  toggleAdvancedFilters,
  debouncedSearch
} = useCustomerFilters()

// Date range
const dateStart = ref<string>('')
const dateEnd = ref<string>('')

// Wallet range
const walletMin = ref<number | null>(null)
const walletMax = ref<number | null>(null)

// Order range
const orderMin = ref<number | null>(null)
const orderMax = ref<number | null>(null)

// Rating range
const ratingMin = ref<number | null>(null)
const ratingMax = ref<number | null>(null)

function applyDateRange() {
  if (dateStart.value && dateEnd.value) {
    setDateRange(new Date(dateStart.value), new Date(dateEnd.value))
  } else {
    setDateRange(null, null)
  }
  emit('apply')
}

function applyWalletRange() {
  setWalletRange(walletMin.value, walletMax.value)
  emit('apply')
}

function applyOrderRange() {
  setOrderRange(orderMin.value, orderMax.value)
  emit('apply')
}

function applyRatingRange() {
  setRatingRange(ratingMin.value, ratingMax.value)
  emit('apply')
}

function handleClearFilters() {
  clearFilters()
  dateStart.value = ''
  dateEnd.value = ''
  walletMin.value = null
  walletMax.value = null
  orderMin.value = null
  orderMax.value = null
  ratingMin.value = null
  ratingMax.value = null
  emit('apply')
}

</script>

<template>
  <div class="filters-bar">
    <!-- Main Filters Row -->
    <div class="filters-main">
      <!-- Search -->
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input 
          :value="filters.searchTerm"
          type="text"
          placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." 
          class="search-input" 
          aria-label="ค้นหาลูกค้า"
          @input="e => debouncedSearch((e.target as HTMLInputElement).value)"
        />
        <button 
          v-if="filters.searchTerm"
          class="clear-search-btn"
          aria-label="ล้างการค้นหา"
          @click="() => { debouncedSearch(''); emit('apply') }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <button 
          :class="['filter-chip', { active: filters.status.includes('active') }]"
          aria-label="กรองลูกค้าที่ใช้งานปกติ"
          @click="() => { toggleStatus('active'); emit('apply') }"
        >
          <span class="chip-dot active"></span>
          ใช้งานปกติ
        </button>
        <button 
          :class="['filter-chip', { active: filters.status.includes('suspended') }]"
          aria-label="กรองลูกค้าที่ถูกระงับ"
          @click="() => { toggleStatus('suspended'); emit('apply') }"
        >
          <span class="chip-dot suspended"></span>
          ระงับแล้ว
        </button>
        <button 
          :class="['filter-chip', { active: filters.status.includes('banned') }]"
          aria-label="กรองลูกค้าที่ถูกแบน"
          @click="() => { toggleStatus('banned'); emit('apply') }"
        >
          <span class="chip-dot banned"></span>
          แบนถาวร
        </button>
      </div>

      <!-- Advanced Filters Toggle -->
      <button 
        :class="['advanced-toggle', { active: showAdvancedFilters }]"
        aria-label="แสดง/ซ่อนตัวกรองขั้นสูง"
        @click="toggleAdvancedFilters"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        ตัวกรองขั้นสูง
        <span v-if="filterStats.totalFilters > 0" class="filter-count">{{ filterStats.totalFilters }}</span>
      </button>

      <!-- Clear All -->
      <button 
        v-if="hasActiveFilters"
        class="clear-all-btn"
        aria-label="ล้างตัวกรองทั้งหมด"
        @click="handleClearFilters"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        ล้างทั้งหมด
      </button>
    </div>

    <!-- Active Filters Summary -->
    <div v-if="hasActiveFilters && filterSummary" class="filters-summary">
      <span class="summary-label">ตัวกรองที่ใช้:</span>
      <span class="summary-text">{{ filterSummary }}</span>
    </div>

    <!-- Advanced Filters Panel -->
    <Transition name="slide-down">
      <div v-if="showAdvancedFilters" class="advanced-filters">
        <!-- Date Range -->
        <div class="filter-section">
          <label class="filter-label">วันที่สมัคร</label>
          <div class="date-range">
            <input 
              v-model="dateStart"
              type="date"
              class="date-input"
              aria-label="วันที่เริ่มต้น"
              @change="applyDateRange"
            />
            <span class="range-separator">ถึง</span>
            <input 
              v-model="dateEnd"
              type="date"
              class="date-input"
              aria-label="วันที่สิ้นสุด"
              @change="applyDateRange"
            />
          </div>
        </div>

        <!-- Wallet Range -->
        <div class="filter-section">
          <label class="filter-label">ยอดเงินใน Wallet (฿)</label>
          <div class="number-range">
            <input 
              v-model.number="walletMin"
              type="number"
              placeholder="ต่ำสุด"
              class="number-input"
              aria-label="ยอดเงินต่ำสุด"
              @change="applyWalletRange"
            />
            <span class="range-separator">-</span>
            <input 
              v-model.number="walletMax"
              type="number"
              placeholder="สูงสุด"
              class="number-input"
              aria-label="ยอดเงินสูงสุด"
              @change="applyWalletRange"
            />
          </div>
        </div>

        <!-- Order Range -->
        <div class="filter-section">
          <label class="filter-label">จำนวนออเดอร์</label>
          <div class="number-range">
            <input 
              v-model.number="orderMin"
              type="number"
              placeholder="ต่ำสุด"
              class="number-input"
              aria-label="จำนวนออเดอร์ต่ำสุด"
              @change="applyOrderRange"
            />
            <span class="range-separator">-</span>
            <input 
              v-model.number="orderMax"
              type="number"
              placeholder="สูงสุด"
              class="number-input"
              aria-label="จำนวนออเดอร์สูงสุด"
              @change="applyOrderRange"
            />
          </div>
        </div>

        <!-- Rating Range -->
        <div class="filter-section">
          <label class="filter-label">คะแนนเฉลี่ย ⭐</label>
          <div class="number-range">
            <input 
              v-model.number="ratingMin"
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="ต่ำสุด"
              class="number-input"
              aria-label="คะแนนต่ำสุด"
              @change="applyRatingRange"
            />
            <span class="range-separator">-</span>
            <input 
              v-model.number="ratingMax"
              type="number"
              min="0"
              max="5"
              step="0.1"
              placeholder="สูงสุด"
              class="number-input"
              aria-label="คะแนนสูงสุด"
              @change="applyRatingRange"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.filters-bar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.filters-main { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.search-box { flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; position: relative; }
.search-box svg { color: #9CA3AF; flex-shrink: 0; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.clear-search-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 50%; cursor: pointer; color: #9CA3AF; transition: all 0.15s; }
.clear-search-btn:hover { background: #F3F4F6; color: #6B7280; }
.filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-chip { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #fff; border: 1px solid #E5E7EB; border-radius: 20px; font-size: 13px; font-weight: 500; color: #6B7280; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { background: #F9FAFB; border-color: #D1D5DB; }
.filter-chip.active { background: #00A86B; border-color: #00A86B; color: #fff; }
.chip-dot { width: 8px; height: 8px; border-radius: 50%; }
.chip-dot.active { background: #10B981; }
.chip-dot.suspended { background: #EF4444; }
.chip-dot.banned { background: #F59E0B; }
.filter-chip.active .chip-dot { background: #fff; }
.advanced-toggle { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 500; color: #6B7280; cursor: pointer; transition: all 0.15s; position: relative; }
.advanced-toggle:hover { background: #F9FAFB; }
.advanced-toggle.active { background: #00A86B; border-color: #00A86B; color: #fff; }
.filter-count { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: #EF4444; color: #fff; font-size: 11px; font-weight: 600; border-radius: 50%; }
.clear-all-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 10px; font-size: 14px; font-weight: 500; color: #DC2626; cursor: pointer; transition: all 0.15s; }
.clear-all-btn:hover { background: #FEF2F2; }
.filters-summary { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; font-size: 13px; }
.summary-label { font-weight: 600; color: #166534; }
.summary-text { color: #15803D; }
.advanced-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; padding: 20px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; }
.filter-section { display: flex; flex-direction: column; gap: 8px; }
.filter-label { font-size: 13px; font-weight: 600; color: #374151; }
.date-range, .number-range { display: flex; align-items: center; gap: 8px; }
.date-input, .number-input { flex: 1; padding: 10px 12px; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; }
.date-input:focus, .number-input:focus { outline: none; border-color: #00A86B; box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1); }
.range-separator { font-size: 13px; color: #9CA3AF; }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
