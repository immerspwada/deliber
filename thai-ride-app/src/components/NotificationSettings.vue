<script setup lang="ts">
/**
 * Feature: F146 - Notification Settings
 * Manage notification preferences
 */

interface NotificationSetting {
  key: string
  label: string
  description?: string
  enabled: boolean
}

interface Props {
  settings: NotificationSetting[]
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: [key: string, enabled: boolean]
}>()
</script>

<template>
  <div class="notification-settings">
    <div
      v-for="setting in settings"
      :key="setting.key"
      class="setting-item"
    >
      <div class="setting-info">
        <span class="setting-label">{{ setting.label }}</span>
        <span v-if="setting.description" class="setting-desc">{{ setting.description }}</span>
      </div>
      <button
        type="button"
        class="toggle-switch"
        :class="{ active: setting.enabled }"
        @click="emit('toggle', setting.key, !setting.enabled)"
      >
        <span class="toggle-thumb" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification-settings {
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}


.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
  display: block;
}

.setting-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 2px;
  display: block;
}

.toggle-switch {
  width: 52px;
  height: 32px;
  background: #e5e5e5;
  border: none;
  border-radius: 16px;
  padding: 2px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: #000;
}

.toggle-thumb {
  display: block;
  width: 28px;
  height: 28px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);
}
</style>
