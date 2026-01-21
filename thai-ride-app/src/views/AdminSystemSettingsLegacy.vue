<script setup lang="ts">
/**
 * Admin Settings View
 * ===================
 * Comprehensive system settings management
 */

import { ref, computed, onMounted } from 'vue'
import { useSystemSettings } from '@/admin/composables/useSystemSettings'
import { useSystemSettingsMock } from '@/admin/composables/useSystemSettings.mock'
import type { SystemSetting } from '@/admin/composables/useSystemSettings'

// Use mock data for now (until Supabase is running)
const USE_MOCK = true

// Choose between real and mock implementation
const settingsImpl = USE_MOCK ? useSystemSettingsMock() : useSystemSettings()

const {
  settings,
  categories,
  auditLog,
  isLoading,
  error,
  settingsByCategory,
  fetchCategories,
  fetchAllSettings,
  updateSetting,
  fetchAuditLog,
  getCategoryDisplayName,
  getCategoryIcon
} = settingsImpl

// UI State
const selectedCategory = ref<string>('general')
const editingSettings = ref<Record<string, string>>({})
const savingKeys = ref<Set<string>>(new Set())
const searchQuery = ref('')
const showAuditLog = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Filtered settings based on search
const filteredSettings = computed(() => {
  const categorySettings = settingsByCategory.value[selectedCategory.value] || []
  
  if (!searchQuery.value) return categorySettings

  const query = searchQuery.value.toLowerCase()
  return categorySettings.filter(s =>
    s.display_name.toLowerCase().includes(query) ||
    s.display_name_th?.toLowerCase().includes(query) ||
    s.setting_key.toLowerCase().includes(query) ||
    s.description?.toLowerCase().includes(query)
  )
})

// Initialize editing values
function initializeEditingValues() {
  editingSettings.value = {}
  settings.value.forEach(s => {
    editingSettings.value[s.setting_key] = s.setting_value
  })
}

// Handle setting update
async function handleUpdateSetting(setting: SystemSetting) {
  const newValue = editingSettings.value[setting.setting_key]
  
  if (newValue === setting.setting_value) {
    showMessage('No changes made', 'info')
    return
  }

  savingKeys.value.add(setting.setting_key)

  try {
    const result = await updateSetting(setting.setting_key, newValue, setting.category)
    
    if (result.success) {
      showMessage(`✅ ${setting.display_name} updated successfully`, 'success')
      // Refresh to get updated values
      await fetchAllSettings()
      initializeEditingValues()
    } else {
      showMessage(`❌ ${result.message}`, 'error')
      // Revert to original value
      editingSettings.value[setting.setting_key] = setting.setting_value
    }
  } catch (e) {
    showMessage(`❌ Failed to update setting`, 'error')
    editingSettings.value[setting.setting_key] = setting.setting_value
  } finally {
    savingKeys.value.delete(setting.setting_key)
  }
}

// Bulk save all changes in category
async function handleSaveAll() {
  const categorySettings = settingsByCategory.value[selectedCategory.value] || []
  const changedSettings = categorySettings.filter(
    s => editingSettings.value[s.setting_key] !== s.setting_value
  )

  if (changedSettings.length === 0) {
    showMessage('No changes to save', 'info')
    return
  }

  let successCount = 0
  let failCount = 0

  for (const setting of changedSettings) {
    savingKeys.value.add(setting.setting_key)
    const result = await updateSetting(
      setting.setting_key,
      editingSettings.value[setting.setting_key],
      setting.category
    )
    
    if (result.success) successCount++
    else failCount++
    
    savingKeys.value.delete(setting.setting_key)
  }

  if (failCount === 0) {
    showMessage(`✅ Successfully saved ${successCount} settings`, 'success')
  } else {
    showMessage(`⚠️ Saved ${successCount}, failed ${failCount}`, 'error')
  }

  await fetchAllSettings()
  initializeEditingValues()
}

// Reset to original values
function handleReset() {
  initializeEditingValues()
  showMessage('Reset to original values', 'info')
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' | 'info') {
  if (type === 'success') {
    successMessage.value = message
    setTimeout(() => successMessage.value = null, 4000)
  } else if (type === 'error') {
    errorMessage.value = message
    setTimeout(() => errorMessage.value = null, 4000)
  } else {
    successMessage.value = message
    setTimeout(() => successMessage.value = null, 3000)
  }
}

// Get input type based on data type
function getInputType(setting: SystemSetting): string {
  switch (setting.data_type) {
    case 'number':
      return 'number'
    case 'boolean':
      return 'checkbox'
    default:
      return 'text'
  }
}

// Check if setting has changes
function hasChanges(settingKey: string, originalValue: string): boolean {
  return editingSettings.value[settingKey] !== originalValue
}

// Load audit log
async function loadAuditLog() {
  showAuditLog.value = true
  await fetchAuditLog(100)
}

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchCategories(),
    fetchAllSettings()
  ])

  initializeEditingValues()
})
</script>

<template>
  <div class="admin-settings-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>System Settings</h1>
        <p class="subtitle">Configure system-wide settings and preferences</p>
      </div>
      <div class="header-actions">
        <button
          class="btn-secondary"
          @click="loadAuditLog"
          :disabled="isLoading"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Audit Log
        </button>
        <button
          class="btn-secondary"
          @click="handleReset"
          :disabled="isLoading"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
        <button
          class="btn-primary"
          @click="handleSaveAll"
          :disabled="isLoading"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Save All Changes
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="USE_MOCK" class="message message-info">
      ℹ️ Using mock data (Supabase not running). Start Supabase to use real database.
    </div>
    <div v-if="successMessage" class="message message-success">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="message message-error">
      {{ errorMessage }}
    </div>
    <div v-if="error" class="message message-error">
      {{ error }}
    </div>

    <!-- Main Content -->
    <div class="settings-container">
      <!-- Sidebar - Categories -->
      <aside class="settings-sidebar">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search settings..."
            class="search-input"
          />
        </div>

        <nav class="category-nav">
          <button
            v-for="cat in Object.keys(settingsByCategory)"
            :key="cat"
            :class="['category-item', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat"
          >
            <span class="category-icon">{{ getCategoryIcon(cat) }}</span>
            <span class="category-name">{{ getCategoryDisplayName(cat) }}</span>
            <span class="category-count">{{ settingsByCategory[cat].length }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main Settings Panel -->
      <main class="settings-main">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading settings...</p>
        </div>

        <div v-else-if="filteredSettings.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <p>No settings found</p>
        </div>

        <div v-else class="settings-list">
          <div
            v-for="setting in filteredSettings"
            :key="setting.id"
            :class="['setting-item', { 'has-changes': hasChanges(setting.setting_key, setting.setting_value) }]"
          >
            <div class="setting-header">
              <div class="setting-info">
                <h3 class="setting-title">
                  {{ setting.display_name }}
                  <span v-if="setting.display_name_th" class="setting-title-th">
                    ({{ setting.display_name_th }})
                  </span>
                </h3>
                <p v-if="setting.description" class="setting-description">
                  {{ setting.description }}
                  <span v-if="setting.description_th" class="description-th">
                    • {{ setting.description_th }}
                  </span>
                </p>
                <div class="setting-meta">
                  <span class="meta-badge">{{ setting.data_type }}</span>
                  <span v-if="!setting.is_editable" class="meta-badge readonly">Read-only</span>
                  <span v-if="setting.is_public" class="meta-badge public">Public</span>
                  <code class="setting-key">{{ setting.setting_key }}</code>
                </div>
              </div>
            </div>

            <div class="setting-control">
              <!-- Boolean Toggle -->
              <label
                v-if="setting.data_type === 'boolean'"
                class="toggle-switch"
              >
                <input
                  type="checkbox"
                  :checked="editingSettings[setting.setting_key] === 'true'"
                  @change="editingSettings[setting.setting_key] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
                  :disabled="!setting.is_editable || savingKeys.has(setting.setting_key)"
                />
                <span class="toggle-slider"></span>
              </label>

              <!-- Number/Text Input -->
              <div v-else class="input-group">
                <input
                  v-model="editingSettings[setting.setting_key]"
                  :type="getInputType(setting)"
                  :disabled="!setting.is_editable || savingKeys.has(setting.setting_key)"
                  :min="setting.validation_rules?.min"
                  :max="setting.validation_rules?.max"
                  class="setting-input"
                />
                <button
                  v-if="setting.is_editable"
                  class="btn-save"
                  @click="handleUpdateSetting(setting)"
                  :disabled="savingKeys.has(setting.setting_key) || !hasChanges(setting.setting_key, setting.setting_value)"
                >
                  <svg v-if="savingKeys.has(setting.setting_key)" class="spinner-small" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" />
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Audit Log Modal -->
    <div v-if="showAuditLog" class="modal-overlay" @click.self="showAuditLog = false">
      <div class="modal-content audit-log-modal">
        <div class="modal-header">
          <h2>Settings Audit Log</h2>
          <button class="btn-close" @click="showAuditLog = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="auditLog.length === 0" class="empty-state">
            <p>No audit log entries</p>
          </div>
          <div v-else class="audit-log-list">
            <div v-for="entry in auditLog" :key="entry.id" class="audit-log-entry">
              <div class="audit-header">
                <strong>{{ entry.setting_key }}</strong>
                <span class="audit-time">{{ new Date(entry.changed_at).toLocaleString() }}</span>
              </div>
              <div class="audit-changes">
                <span class="old-value">{{ entry.old_value }}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span class="new-value">{{ entry.new_value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-settings-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.btn-primary {
  background: #00a86b;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #008f5a;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Messages */
.message {
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}

.message-success {
  background: #dcfce7;
  color: #166534;
}

.message-error {
  background: #fee2e2;
  color: #991b1b;
}

.message-info {
  background: #dbeafe;
  color: #1e40af;
  border-left: 4px solid #3b82f6;
}

/* Settings Container */
.settings-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  min-height: 600px;
}

/* Sidebar */
.settings-sidebar {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: fit-content;
  position: sticky;
  top: 24px;
}

.search-box {
  position: relative;
  margin-bottom: 16px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #00a86b;
}

.category-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  min-height: 44px;
}

.category-item:hover {
  background: #f9fafb;
}

.category-item.active {
  background: #e8f5ef;
  color: #00a86b;
  font-weight: 500;
}

.category-icon {
  font-size: 20px;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.category-count {
  font-size: 12px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 12px;
}

.category-item.active .category-count {
  background: #d1fae5;
  color: #00a86b;
}

/* Main Settings Panel */
.settings-main {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Settings List */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 20px;
  border: 2px solid #f3f4f6;
  border-radius: 12px;
  transition: all 0.2s;
}

.setting-item:hover {
  border-color: #e5e7eb;
}

.setting-item.has-changes {
  border-color: #fbbf24;
  background: #fffbeb;
}

.setting-header {
  flex: 1;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.setting-title-th {
  font-weight: 400;
  color: #6b7280;
  font-size: 14px;
}

.setting-description {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.description-th {
  color: #9ca3af;
}

.setting-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
}

.meta-badge.readonly {
  background: #fee2e2;
  color: #991b1b;
}

.meta-badge.public {
  background: #dbeafe;
  color: #1e40af;
}

.setting-key {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f9fafb;
  color: #6b7280;
  font-family: 'Monaco', 'Courier New', monospace;
}

/* Setting Controls */
.setting-control {
  display: flex;
  align-items: center;
  min-width: 300px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e5e7eb;
  border-radius: 28px;
  transition: 0.3s;
}

.toggle-slider:before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #00a86b;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Input Group */
.input-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.setting-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  min-height: 44px;
}

.setting-input:focus {
  border-color: #00a86b;
}

.setting-input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.btn-save {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5ef;
  color: #00a86b;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #d1fae5;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  animation: spin 1s linear infinite;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
}

.btn-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

/* Audit Log */
.audit-log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-log-entry {
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.audit-header strong {
  font-size: 14px;
  color: #1f2937;
}

.audit-time {
  font-size: 12px;
  color: #9ca3af;
}

.audit-changes {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.old-value {
  padding: 4px 8px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
}

.new-value {
  padding: 4px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
}

.audit-changes svg {
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 1024px) {
  .settings-container {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    position: static;
  }

  .setting-item {
    flex-direction: column;
  }

  .setting-control {
    width: 100%;
  }
}
</style>
