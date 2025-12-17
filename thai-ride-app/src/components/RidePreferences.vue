<script setup lang="ts">
/**
 * Feature: F308 - Ride Preferences
 * Ride preferences toggle options
 */
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'close': []
  'save': [prefs: Record<string, boolean>]
}>()

const preferences = ref({
  quietRide: false,
  acOn: true,
  petFriendly: false,
  wheelchairAccess: false,
  childSeat: false
})

const options = [
  { key: 'quietRide', label: 'เงียบสงบ', desc: 'ไม่ต้องการสนทนา' },
  { key: 'acOn', label: 'เปิดแอร์', desc: 'ต้องการให้เปิดแอร์' },
  { key: 'petFriendly', label: 'พาสัตว์เลี้ยง', desc: 'มีสัตว์เลี้ยงไปด้วย' },
  { key: 'wheelchairAccess', label: 'รถวีลแชร์', desc: 'ต้องการรถรองรับวีลแชร์' },
  { key: 'childSeat', label: 'ที่นั่งเด็ก', desc: 'ต้องการที่นั่งสำหรับเด็ก' }
]

const save = () => {
  emit('save', { ...preferences.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="title">ความต้องการพิเศษ</h3>
          
          <div class="prefs-list">
            <label v-for="opt in options" :key="opt.key" class="pref-item">
              <div class="info">
                <span class="label">{{ opt.label }}</span>
                <span class="desc">{{ opt.desc }}</span>
              </div>
              <input
                v-model="preferences[opt.key as keyof typeof preferences]"
                type="checkbox"
                class="toggle"
              />
            </label>
          </div>
          
          <button type="button" class="btn-save" @click="save">บันทึก</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
}

.prefs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pref-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #f6f6f6;
  border-radius: 8px;
  cursor: pointer;
}

.info {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 14px;
  font-weight: 500;
}

.desc {
  font-size: 12px;
  color: #6b6b6b;
}

.toggle {
  width: 44px;
  height: 24px;
  appearance: none;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle:checked {
  background: #000;
}

.toggle:checked::after {
  transform: translateX(20px);
}

.btn-save {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 20px;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
