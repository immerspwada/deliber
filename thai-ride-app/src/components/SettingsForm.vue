<script setup lang="ts">
/**
 * Feature: F202 - Settings Form
 * Admin form for app settings management
 */
import { ref } from 'vue'

interface SettingItem {
  key: string
  label: string
  type: 'text' | 'number' | 'toggle' | 'select'
  value: string | number | boolean
  options?: { value: string; label: string }[]
  description?: string
}

interface SettingsGroup {
  title: string
  icon: string
  settings: SettingItem[]
}

const props = defineProps<{
  groups: SettingsGroup[]
}>()

const emit = defineEmits<{
  save: [settings: Record<string, string | number | boolean>]
}>()

const localSettings = ref<Record<string, string | number | boolean>>({})

// Initialize local settings from props
props.groups.forEach(group => {
  group.settings.forEach(setting => {
    localSettings.value[setting.key] = setting.value
  })
})

const handleSave = () => {
  emit('save', localSettings.value)
}
</script>

<template>
  <div class="settings-form">
    <div v-for="group in groups" :key="group.title" class="settings-group">
      <div class="group-header">
        <span class="group-icon" v-html="group.icon" />
        <h3 class="group-title">{{ group.title }}</h3>
      </div>

      <div class="settings-list">
        <div v-for="setting in group.settings" :key="setting.key" class="setting-item">
          <div class="setting-info">
            <span class="setting-label">{{ setting.label }}</span>
            <span v-if="setting.description" class="setting-desc">{{ setting.description }}</span>
          </div>

          <div class="setting-control">
            <!-- Toggle -->
            <label v-if="setting.type === 'toggle'" class="toggle">
              <input 
                v-model="localSettings[setting.key]" 
                type="checkbox" 
                class="toggle-input"
              />
              <span class="toggle-switch" />
            </label>

            <!-- Text Input -->
            <input 
              v-else-if="setting.type === 'text'"
              v-model="localSettings[setting.key]"
              type="text"
              class="setting-input"
            />

            <!-- Number Input -->
            <input 
              v-else-if="setting.type === 'number'"
              v-model.number="localSettings[setting.key]"
              type="number"
              class="setting-input setting-input-number"
            />

            <!-- Select -->
            <select 
              v-else-if="setting.type === 'select'"
              v-model="localSettings[setting.key]"
              class="setting-select"
            >
              <option 
                v-for="opt in setting.options" 
                :key="opt.value" 
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-primary" @click="handleSave">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        บันทึกการตั้งค่า
      </button>
    </div>
  </div>
</template>

<style scoped>
.settings-form {
  background: #fff;
  border-radius: 16px;
}

.settings-group {
  padding: 24px;
  border-bottom: 1px solid #e5e5e5;
}

.settings-group:last-of-type {
  border-bottom: none;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.group-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #000;
}

.group-title {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}

.setting-control {
  flex-shrink: 0;
  margin-left: 16px;
}

.toggle {
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  display: block;
  width: 48px;
  height: 28px;
  background: #e5e5e5;
  border-radius: 14px;
  position: relative;
  transition: background 0.2s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-input:checked + .toggle-switch {
  background: #000;
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

.setting-input,
.setting-select {
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  min-width: 120px;
}

.setting-input:focus,
.setting-select:focus {
  outline: none;
  border-color: #000;
}

.setting-input-number {
  width: 100px;
  text-align: right;
}

.form-actions {
  padding: 24px;
  border-top: 1px solid #e5e5e5;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #333;
}
</style>
