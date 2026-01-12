<script setup lang="ts">
/**
 * Component: RidePreferences
 * ตั้งค่าความชอบส่วนตัวสำหรับการเดินทาง
 * - โหมดเงียบ (ไม่คุยกับคนขับ)
 * - แอร์เย็น/ปกติ
 * - ไม่สูบบุหรี่
 * - ช่วยยกของ
 */
import { ref, computed, onMounted, watch } from 'vue'

export interface RidePreference {
  quietMode: boolean
  acCold: boolean
  noSmoking: boolean
  helpWithLuggage: boolean
  petFriendly: boolean
  wheelchairAccessible: boolean
}

const props = defineProps<{
  modelValue?: RidePreference
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RidePreference]
}>()

// Haptic feedback
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// Default preferences
const defaultPreferences: RidePreference = {
  quietMode: false,
  acCold: false,
  noSmoking: true,
  helpWithLuggage: false,
  petFriendly: false,
  wheelchairAccessible: false
}

// State
const isExpanded = ref(false)
const preferences = ref<RidePreference>({ ...defaultPreferences })

// Load from localStorage
onMounted(() => {
  const saved = localStorage.getItem('ride_preferences')
  if (saved) {
    try {
      preferences.value = { ...defaultPreferences, ...JSON.parse(saved) }
    } catch {
      preferences.value = { ...defaultPreferences }
    }
  }
  
  // Apply props if provided
  if (props.modelValue) {
    preferences.value = { ...preferences.value, ...props.modelValue }
  }
})

// Save and emit on change
watch(preferences, (newVal) => {
  localStorage.setItem('ride_preferences', JSON.stringify(newVal))
  emit('update:modelValue', newVal)
}, { deep: true })

// Computed
const activeCount = computed(() => {
  return Object.values(preferences.value).filter(Boolean).length
})

// Preference items config
const preferenceItems = [
  {
    key: 'quietMode' as const,
    icon: 'quiet',
    label: 'โหมดเงียบ',
    description: 'ไม่ต้องการคุยกับคนขับ',
    color: '#1976d2'
  },
  {
    key: 'acCold' as const,
    icon: 'ac',
    label: 'แอร์เย็นจัด',
    description: 'ต้องการแอร์เย็นกว่าปกติ',
    color: '#00bcd4'
  },
  {
    key: 'noSmoking' as const,
    icon: 'no-smoking',
    label: 'ไม่สูบบุหรี่',
    description: 'รถปลอดบุหรี่',
    color: '#e53935'
  },
  {
    key: 'helpWithLuggage' as const,
    icon: 'luggage',
    label: 'ช่วยยกของ',
    description: 'ต้องการให้คนขับช่วยยกกระเป๋า',
    color: '#ff9800'
  },
  {
    key: 'petFriendly' as const,
    icon: 'pet',
    label: 'พาสัตว์เลี้ยง',
    description: 'มีสัตว์เลี้ยงไปด้วย',
    color: '#8bc34a'
  },
  {
    key: 'wheelchairAccessible' as const,
    icon: 'wheelchair',
    label: 'รถวีลแชร์',
    description: 'ต้องการรถที่รองรับวีลแชร์',
    color: '#9c27b0'
  }
]

// Icon paths
const iconPaths: Record<string, string> = {
  'quiet': 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2',
  'ac': 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  'no-smoking': 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M9 12h6',
  'luggage': 'M9 3h6v2H9V3zM7 7h10v14H7V7zM5 7h2v14H5V7zM17 7h2v14h-2V7z',
  'pet': 'M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5M14 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.344-2.5M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75z',
  'wheelchair': 'M12 12a4 4 0 100-8 4 4 0 000 8zM12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z'
}

function getIconPath(icon: string): string {
  return iconPaths[icon] || iconPaths['quiet']
}

// Methods
function toggleExpand(): void {
  triggerHaptic('light')
  isExpanded.value = !isExpanded.value
}

function togglePreference(key: keyof RidePreference): void {
  triggerHaptic('medium')
  preferences.value[key] = !preferences.value[key]
}

function resetPreferences(): void {
  triggerHaptic('medium')
  preferences.value = { ...defaultPreferences }
}
</script>

<template>
  <div class="ride-preferences">
    <!-- Collapsed Header -->
    <button 
      class="preferences-header"
      :class="{ expanded: isExpanded, 'has-active': activeCount > 0 }"
      @click="toggleExpand"
    >
      <div class="header-left">
        <div class="pref-icon" :class="{ active: activeCount > 0 }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <div class="header-text">
          <span class="header-title">ความชอบส่วนตัว</span>
          <span v-if="activeCount > 0" class="header-status">
            เลือก {{ activeCount }} รายการ
          </span>
        </div>
      </div>
      <svg 
        class="expand-icon" 
        :class="{ rotated: isExpanded }"
        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      >
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>

    <!-- Expanded Content -->
    <Transition name="expand">
      <div v-if="isExpanded" class="preferences-content">
        <!-- Preference Grid -->
        <div class="preferences-grid">
          <button
            v-for="item in preferenceItems"
            :key="item.key"
            class="preference-item"
            :class="{ active: preferences[item.key] }"
            :style="{ '--accent-color': item.color }"
            @click="togglePreference(item.key)"
          >
            <div class="item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="getIconPath(item.icon)"/>
              </svg>
            </div>
            <div class="item-text">
              <span class="item-label">{{ item.label }}</span>
              <span class="item-desc">{{ item.description }}</span>
            </div>
            <div class="item-check">
              <Transition name="check">
                <svg v-if="preferences[item.key]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </Transition>
            </div>
          </button>
        </div>

        <!-- Reset Button -->
        <button 
          v-if="activeCount > 0"
          class="reset-btn"
          @click="resetPreferences"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          รีเซ็ตทั้งหมด
        </button>

        <!-- Info Note -->
        <div class="info-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>ความชอบจะถูกส่งให้คนขับเมื่อจับคู่สำเร็จ</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ride-preferences {
  background: #fff;
  border-radius: 16px;
  margin: 0 16px 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Header */
.preferences-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.preferences-header:active {
  background: #f5f5f5;
}

.preferences-header.has-active {
  background: #f3e5f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pref-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.pref-icon.active {
  background: #9c27b0;
  color: #fff;
}

.header-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-status {
  font-size: 12px;
  color: #9c27b0;
  font-weight: 500;
}

.expand-icon {
  color: #999;
  transition: transform 0.3s ease;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* Content */
.preferences-content {
  padding: 0 16px 16px;
}

/* Preferences Grid */
.preferences-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.preference-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  text-align: left;
}

.preference-item:active {
  transform: scale(0.97);
}

.preference-item.active {
  background: color-mix(in srgb, var(--accent-color) 10%, white);
  border-color: var(--accent-color);
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.preference-item.active .item-icon {
  background: var(--accent-color);
  color: #fff;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.item-desc {
  font-size: 11px;
  color: #999;
  line-height: 1.3;
}

.item-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* Check Animation */
.check-enter-active,
.check-leave-active {
  transition: all 0.2s ease;
}

.check-enter-from,
.check-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* Reset Button */
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.reset-btn:active {
  background: #e8e8e8;
  transform: scale(0.98);
}

/* Info Note */
.info-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 11px;
  color: #666;
}

.info-note svg {
  flex-shrink: 0;
  color: #999;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}
</style>
