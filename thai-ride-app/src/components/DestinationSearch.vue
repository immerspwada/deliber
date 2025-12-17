<script setup lang="ts">
/**
 * Feature: F170 - Destination Search
 * Search input for pickup/dropoff locations
 */
// import { ref } from 'vue'

interface Props {
  pickupValue?: string
  dropoffValue?: string
  pickupPlaceholder?: string
  dropoffPlaceholder?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  pickupPlaceholder: 'จุดรับ',
  dropoffPlaceholder: 'ไปที่ไหน?',
  loading: false
})

const emit = defineEmits<{
  pickupFocus: []
  dropoffFocus: []
  pickupChange: [value: string]
  dropoffChange: [value: string]
  swap: []
  currentLocation: []
}>()

// Template refs for future use
// const pickupInput = ref<HTMLInputElement>()
// const dropoffInput = ref<HTMLInputElement>()
</script>

<template>
  <div class="destination-search">
    <div class="search-inputs">
      <div class="input-row pickup">
        <div class="input-dot pickup"></div>
        <input
          ref="pickupInput"
          type="text"
          class="search-input"
          :value="pickupValue"
          :placeholder="pickupPlaceholder"
          @focus="emit('pickupFocus')"
          @input="emit('pickupChange', ($event.target as HTMLInputElement).value)"
        />
        <button type="button" class="location-btn" @click="emit('currentLocation')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
          </svg>
        </button>
      </div>
      
      <div class="input-connector">
        <div class="connector-line"></div>
        <button type="button" class="swap-btn" @click="emit('swap')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4"/>
          </svg>
        </button>
      </div>
</template>

      <div class="input-row dropoff">
        <div class="input-dot dropoff"></div>
        <input
          ref="dropoffInput"
          type="text"
          class="search-input"
          :value="dropoffValue"
          :placeholder="dropoffPlaceholder"
          @focus="emit('dropoffFocus')"
          @input="emit('dropoffChange', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="loading" class="loading-spinner"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.destination-search {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 12px;
}

.search-inputs {
  display: flex;
  flex-direction: column;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.input-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.input-dot.pickup {
  background: #276ef1;
}

.input-dot.dropoff {
  background: #e11900;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  color: #000;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}

.location-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
}

.location-btn:hover {
  background: #000;
  color: #fff;
}

.input-connector {
  display: flex;
  align-items: center;
  padding-left: 4px;
}

.connector-line {
  width: 2px;
  height: 20px;
  background: #e5e5e5;
}

.swap-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #6b6b6b;
  cursor: pointer;
  margin-left: 8px;
}

.swap-btn:hover {
  background: #000;
  color: #fff;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>