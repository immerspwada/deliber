<script setup lang="ts">
/**
 * Feature: F150 - App Version
 * Display app version and update info
 */

interface Props {
  version: string
  buildNumber?: string
  hasUpdate?: boolean
  updateVersion?: string
}

withDefaults(defineProps<Props>(), {
  hasUpdate: false
})

const emit = defineEmits<{
  checkUpdate: []
  update: []
}>()
</script>

<template>
  <div class="app-version">
    <div class="version-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
      </svg>
    </div>
    
    <div class="version-info">
      <span class="version-label">เวอร์ชัน</span>
      <span class="version-number">{{ version }}</span>
      <span v-if="buildNumber" class="build-number">({{ buildNumber }})</span>
    </div>
    
    <div v-if="hasUpdate" class="update-available">
      <span class="update-badge">อัพเดทใหม่ {{ updateVersion }}</span>
      <button type="button" class="update-btn" @click="emit('update')">อัพเดท</button>
    </div>
    <button v-else type="button" class="check-btn" @click="emit('checkUpdate')">
      ตรวจสอบอัพเดท
    </button>
  </div>
</template>

<style scoped>
.app-version {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
}


.version-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #6b6b6b;
}

.version-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.version-label {
  font-size: 14px;
  color: #6b6b6b;
}

.version-number {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.build-number {
  font-size: 12px;
  color: #999;
}

.update-available {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.update-badge {
  font-size: 11px;
  font-weight: 500;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 4px 8px;
  border-radius: 6px;
}

.update-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.update-btn:hover {
  background: #333;
}

.check-btn {
  padding: 8px 16px;
  background: #f6f6f6;
  color: #6b6b6b;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.check-btn:hover {
  background: #e5e5e5;
  color: #000;
}
</style>
