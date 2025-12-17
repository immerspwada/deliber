<script setup lang="ts">
/**
 * Feature: F147 - Privacy Settings
 * Manage privacy preferences
 */

interface PrivacySetting {
  key: string
  label: string
  description?: string
  value: boolean | string
  type: 'toggle' | 'select'
  options?: Array<{ value: string; label: string }>
}

interface Props {
  settings: PrivacySetting[]
}

defineProps<Props>()

const emit = defineEmits<{
  change: [key: string, value: boolean | string]
}>()
</script>

<template>
  <div class="privacy-settings">
    <div v-for="setting in settings" :key="setting.key" class="setting-item">
      <div class="setting-info">
        <span class="setting-label">{{ setting.label }}</span>
        <span v-if="setting.description" class="setting-desc">{{ setting.description }}</span>
      </div>
      
      <button
        v-if="setting.type === 'toggle'"
        type="button"
        class="toggle-switch"
        :class="{ active: setting.value }"
        @click="emit('change', setting.key, !setting.value)"
      >
        <span class="toggle-thumb" />
      </button>
      
      <select
        v-else-if="setting.type === 'select'"
        class="select-field"
        :value="setting.value"
        @change="emit('change', setting.key, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in setting.options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>
  </div>
</template>


<style scoped>
.privacy-settings {
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

.select-field {
  padding: 10px 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  color: #000;
  cursor: pointer;
  min-width: 120px;
}
</style>
