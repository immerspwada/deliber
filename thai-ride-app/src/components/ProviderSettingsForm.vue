<script setup lang="ts">
/**
 * Feature: F349 - Provider Settings Form
 * Settings form for providers
 */
import { ref, watch } from 'vue'

interface Settings {
  notifications: { newOrders: boolean; payments: boolean; promotions: boolean }
  preferences: { autoAccept: boolean; maxDistance: number }
  privacy: { shareLocation: boolean; showProfile: boolean }
}

const props = defineProps<{ settings: Settings; loading?: boolean }>()
const emit = defineEmits<{ (e: 'save', settings: Settings): void }>()

const localSettings = ref<Settings>(JSON.parse(JSON.stringify(props.settings)))
watch(() => props.settings, (v) => { localSettings.value = JSON.parse(JSON.stringify(v)) }, { deep: true })
</script>

<template>
  <div class="provider-settings-form">
    <div class="settings-section">
      <h3 class="section-title">การแจ้งเตือน</h3>
      <label class="setting-item">
        <span class="setting-label">งานใหม่</span>
        <input v-model="localSettings.notifications.newOrders" type="checkbox" class="toggle" />
      </label>
      <label class="setting-item">
        <span class="setting-label">การชำระเงิน</span>
        <input v-model="localSettings.notifications.payments" type="checkbox" class="toggle" />
      </label>
      <label class="setting-item">
        <span class="setting-label">โปรโมชั่น</span>
        <input v-model="localSettings.notifications.promotions" type="checkbox" class="toggle" />
      </label>
    </div>
    <div class="settings-section">
      <h3 class="section-title">การตั้งค่า</h3>
      <label class="setting-item">
        <span class="setting-label">รับงานอัตโนมัติ</span>
        <input v-model="localSettings.preferences.autoAccept" type="checkbox" class="toggle" />
      </label>
      <div class="setting-item">
        <span class="setting-label">ระยะทางสูงสุด (กม.)</span>
        <input v-model="localSettings.preferences.maxDistance" type="number" class="number-input" min="1" max="50" />
      </div>
    </div>
    <div class="settings-section">
      <h3 class="section-title">ความเป็นส่วนตัว</h3>
      <label class="setting-item">
        <span class="setting-label">แชร์ตำแหน่ง</span>
        <input v-model="localSettings.privacy.shareLocation" type="checkbox" class="toggle" />
      </label>
      <label class="setting-item">
        <span class="setting-label">แสดงโปรไฟล์</span>
        <input v-model="localSettings.privacy.showProfile" type="checkbox" class="toggle" />
      </label>
    </div>
    <button type="button" class="save-btn" :disabled="loading" @click="emit('save', localSettings)">
      {{ loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
    </button>
  </div>
</template>

<style scoped>
.provider-settings-form { background: #fff; border-radius: 12px; padding: 16px; }
.settings-section { margin-bottom: 24px; }
.section-title { font-size: 14px; font-weight: 600; color: #000; margin: 0 0 12px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.setting-label { font-size: 14px; color: #000; }
.toggle { width: 44px; height: 24px; appearance: none; background: #e5e5e5; border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s; }
.toggle:checked { background: #000; }
.toggle::before { content: ''; position: absolute; width: 20px; height: 20px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: transform 0.2s; }
.toggle:checked::before { transform: translateX(20px); }
.number-input { width: 60px; padding: 8px; border: 1px solid #e5e5e5; border-radius: 8px; text-align: center; font-size: 14px; }
.save-btn { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; }
.save-btn:disabled { background: #ccc; }
</style>
