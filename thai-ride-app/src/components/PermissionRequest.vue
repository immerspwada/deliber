<script setup lang="ts">
/**
 * Feature: F277 - Permission Request
 * System permission request UI
 */
defineProps<{
  type: 'location' | 'camera' | 'notification' | 'microphone' | 'contacts'
  title?: string
  description?: string
  required?: boolean
}>()

const emit = defineEmits<{
  'allow': []
  'deny': []
  'skip': []
}>()

const icons = {
  location: `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  camera: `<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>`,
  notification: `<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>`,
  microphone: `<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>`,
  contacts: `<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>`
}

const defaultTitles = {
  location: 'อนุญาตเข้าถึงตำแหน่ง',
  camera: 'อนุญาตใช้กล้อง',
  notification: 'อนุญาตการแจ้งเตือน',
  microphone: 'อนุญาตใช้ไมโครโฟน',
  contacts: 'อนุญาตเข้าถึงรายชื่อ'
}

const defaultDescs = {
  location: 'เพื่อแสดงตำแหน่งของคุณบนแผนที่และค้นหาคนขับใกล้เคียง',
  camera: 'เพื่อถ่ายรูปเอกสารและสแกน QR Code',
  notification: 'เพื่อแจ้งเตือนสถานะการเดินทางและโปรโมชั่น',
  microphone: 'เพื่อโทรหาคนขับหรือฝ่ายบริการลูกค้า',
  contacts: 'เพื่อแชร์การเดินทางกับเพื่อนและครอบครัว'
}
</script>

<template>
  <div class="permission-request">
    <div class="icon-wrapper">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" v-html="icons[type]"/>
    </div>
    
    <h2 class="title">{{ title || defaultTitles[type] }}</h2>
    <p class="description">{{ description || defaultDescs[type] }}</p>
    
    <div class="actions">
      <button type="button" class="btn-allow" @click="$emit('allow')">
        อนุญาต
      </button>
      <button v-if="!required" type="button" class="btn-skip" @click="$emit('skip')">
        ไว้ทีหลัง
      </button>
      <button v-if="!required" type="button" class="btn-deny" @click="$emit('deny')">
        ไม่อนุญาต
      </button>
    </div>
  </div>
</template>

<style scoped>
.permission-request {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.icon-wrapper {
  width: 100px;
  height: 100px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 12px;
}

.description {
  font-size: 15px;
  color: #6b6b6b;
  line-height: 1.6;
  margin: 0 0 32px;
  max-width: 300px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 300px;
}

.btn-allow {
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-skip {
  padding: 14px 24px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-deny {
  padding: 8px;
  background: transparent;
  color: #6b6b6b;
  border: none;
  font-size: 14px;
  cursor: pointer;
}
</style>
