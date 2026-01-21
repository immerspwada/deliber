<script setup lang="ts">
/**
 * Auto-Accept Settings Component
 * UI สำหรับตั้งค่ากฎรับงานอัตโนมัติ
 */
import { ref, computed } from 'vue'
import { useAutoAcceptRules, type AutoAcceptRule } from '../../composables/useAutoAcceptRules'

const {
  rules,
  autoAcceptEnabled,
  activeRulesCount,
  toggleAutoAccept,
  addRule,
  updateRule,
  deleteRule,
  toggleRule
} = useAutoAcceptRules()

// State
const showAddModal = ref(false)
const editingRule = ref<AutoAcceptRule | null>(null)

// Form state
const formName = ref('')
const formMaxDistance = ref<number | undefined>(undefined)
const formMinFare = ref<number | undefined>(undefined)
const formJobTypes = ref<('ride' | 'delivery' | 'shopping')[]>([])
const formPriority = ref(1)

// Reset form
function resetForm() {
  formName.value = ''
  formMaxDistance.value = undefined
  formMinFare.value = undefined
  formJobTypes.value = []
  formPriority.value = 1
  editingRule.value = null
}

// Open add modal
function openAddModal() {
  resetForm()
  showAddModal.value = true
}

// Open edit modal
function openEditModal(rule: AutoAcceptRule) {
  editingRule.value = rule
  formName.value = rule.name
  formMaxDistance.value = rule.conditions.maxDistance
  formMinFare.value = rule.conditions.minFare
  formJobTypes.value = rule.conditions.jobTypes || []
  formPriority.value = rule.priority
  showAddModal.value = true
}

// Save rule
function saveRule() {
  if (!formName.value.trim()) return
  
  const conditions: AutoAcceptRule['conditions'] = {}
  if (formMaxDistance.value !== undefined && formMaxDistance.value > 0) {
    conditions.maxDistance = formMaxDistance.value
  }
  if (formMinFare.value !== undefined && formMinFare.value > 0) {
    conditions.minFare = formMinFare.value
  }
  if (formJobTypes.value.length > 0) {
    conditions.jobTypes = formJobTypes.value
  }
  
  if (editingRule.value) {
    updateRule(editingRule.value.id, {
      name: formName.value,
      conditions,
      priority: formPriority.value
    })
  } else {
    addRule({
      name: formName.value,
      enabled: true,
      conditions,
      priority: formPriority.value
    })
  }
  
  showAddModal.value = false
  resetForm()
}

// Delete with confirmation
function confirmDelete(rule: AutoAcceptRule) {
  if (confirm(`ลบกฎ "${rule.name}" ?`)) {
    deleteRule(rule.id)
  }
}

// Toggle job type
function toggleJobType(type: 'ride' | 'delivery' | 'shopping') {
  const index = formJobTypes.value.indexOf(type)
  if (index === -1) {
    formJobTypes.value.push(type)
  } else {
    formJobTypes.value.splice(index, 1)
  }
}

// Format conditions for display
function formatConditions(rule: AutoAcceptRule): string {
  const parts: string[] = []
  if (rule.conditions.maxDistance) {
    parts.push(`≤ ${rule.conditions.maxDistance} กม.`)
  }
  if (rule.conditions.minFare) {
    parts.push(`≥ ฿${rule.conditions.minFare}`)
  }
  if (rule.conditions.jobTypes?.length) {
    const labels = rule.conditions.jobTypes.map(t => 
      t === 'ride' ? 'เรียกรถ' : t === 'delivery' ? 'ส่งของ' : 'ซื้อของ'
    )
    parts.push(labels.join(', '))
  }
  return parts.join(' • ') || 'ไม่มีเงื่อนไข'
}

const hasConditions = computed(() => 
  (formMaxDistance.value !== undefined && formMaxDistance.value > 0) ||
  (formMinFare.value !== undefined && formMinFare.value > 0) ||
  formJobTypes.value.length > 0
)
</script>

<template>
  <div class="auto-accept-settings">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-left">
        <h3>รับงานอัตโนมัติ</h3>
        <span v-if="activeRulesCount > 0" class="active-count">
          {{ activeRulesCount }} กฎเปิดใช้งาน
        </span>
      </div>
      <button 
        class="master-toggle" 
        :class="{ active: autoAcceptEnabled }"
        @click="toggleAutoAccept"
        type="button"
        :aria-pressed="autoAcceptEnabled"
        aria-label="เปิด/ปิดรับงานอัตโนมัติ"
      >
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
      </button>
    </div>

    <!-- Description -->
    <p class="settings-desc">
      ตั้งกฎเพื่อรับงานอัตโนมัติตามเงื่อนไขที่กำหนด
    </p>

    <!-- Rules List -->
    <div class="rules-list">
      <div 
        v-for="rule in rules" 
        :key="rule.id" 
        class="rule-card"
        :class="{ disabled: !rule.enabled }"
      >
        <div class="rule-main" @click="openEditModal(rule)">
          <div class="rule-info">
            <span class="rule-name">{{ rule.name }}</span>
            <span class="rule-conditions">{{ formatConditions(rule) }}</span>
          </div>
          <div class="rule-priority">
            <span class="priority-label">ลำดับ</span>
            <span class="priority-value">{{ rule.priority }}</span>
          </div>
        </div>
        <div class="rule-actions">
          <button 
            class="rule-toggle"
            :class="{ active: rule.enabled }"
            @click.stop="toggleRule(rule.id)"
            type="button"
            :aria-pressed="rule.enabled"
            :aria-label="rule.enabled ? 'ปิดกฎ' : 'เปิดกฎ'"
          >
            <span class="mini-toggle-track">
              <span class="mini-toggle-thumb"></span>
            </span>
          </button>
          <button 
            class="delete-btn"
            @click.stop="confirmDelete(rule)"
            type="button"
            aria-label="ลบกฎ"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="rules.length === 0" class="empty-state">
        <span class="empty-icon">📋</span>
        <p>ยังไม่มีกฎ</p>
      </div>
    </div>

    <!-- Add Button -->
    <button class="add-rule-btn" @click="openAddModal" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      เพิ่มกฎใหม่
    </button>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h4>{{ editingRule ? 'แก้ไขกฎ' : 'เพิ่มกฎใหม่' }}</h4>
          <button class="close-btn" @click="showAddModal = false" type="button" aria-label="ปิด">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Name -->
          <div class="form-group">
            <label for="rule-name">ชื่อกฎ</label>
            <input 
              id="rule-name"
              v-model="formName"
              type="text"
              placeholder="เช่น งานใกล้บ้าน"
              maxlength="50"
            />
          </div>

          <!-- Max Distance -->
          <div class="form-group">
            <label for="max-distance">ระยะทางสูงสุด (กม.)</label>
            <input 
              id="max-distance"
              v-model.number="formMaxDistance"
              type="number"
              min="0"
              max="50"
              step="0.5"
              placeholder="เช่น 3"
            />
          </div>

          <!-- Min Fare -->
          <div class="form-group">
            <label for="min-fare">ราคาขั้นต่ำ (บาท)</label>
            <input 
              id="min-fare"
              v-model.number="formMinFare"
              type="number"
              min="0"
              max="10000"
              step="10"
              placeholder="เช่น 100"
            />
          </div>

          <!-- Job Types -->
          <div class="form-group">
            <label>ประเภทงาน</label>
            <div class="job-type-options">
              <button 
                type="button"
                class="job-type-btn"
                :class="{ active: formJobTypes.includes('ride') }"
                @click="toggleJobType('ride')"
              >
                🚗 เรียกรถ
              </button>
              <button 
                type="button"
                class="job-type-btn"
                :class="{ active: formJobTypes.includes('delivery') }"
                @click="toggleJobType('delivery')"
              >
                📦 ส่งของ
              </button>
              <button 
                type="button"
                class="job-type-btn"
                :class="{ active: formJobTypes.includes('shopping') }"
                @click="toggleJobType('shopping')"
              >
                🛒 ซื้อของ
              </button>
            </div>
          </div>

          <!-- Priority -->
          <div class="form-group">
            <label for="priority">ลำดับความสำคัญ</label>
            <select id="priority" v-model.number="formPriority">
              <option :value="1">1 - ต่ำ</option>
              <option :value="2">2 - ปานกลาง</option>
              <option :value="3">3 - สูง</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="showAddModal = false" type="button">
            ยกเลิก
          </button>
          <button 
            class="save-btn" 
            @click="saveRule" 
            type="button"
            :disabled="!formName.trim() || !hasConditions"
          >
            {{ editingRule ? 'บันทึก' : 'เพิ่มกฎ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auto-accept-settings {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.active-count {
  display: inline-block;
  font-size: 11px;
  color: #10b981;
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

.master-toggle {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  min-height: 44px;
}

.toggle-track {
  display: block;
  width: 48px;
  height: 26px;
  background: #e5e7eb;
  border-radius: 13px;
  position: relative;
  transition: background 0.3s;
}

.master-toggle.active .toggle-track {
  background: #10b981;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.3s;
}

.master-toggle.active .toggle-thumb {
  transform: translateX(22px);
}

.settings-desc {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 16px 0;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.rule-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 12px;
  transition: all 0.2s;
}

.rule-card.disabled {
  opacity: 0.6;
}

.rule-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  min-width: 0;
}

.rule-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rule-name {
  font-size: 14px;
  font-weight: 500;
  color: #111;
}

.rule-conditions {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-priority {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  background: #fff;
  border-radius: 8px;
  flex-shrink: 0;
}

.priority-label {
  font-size: 10px;
  color: #9ca3af;
}

.priority-value {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.rule-toggle {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  background: #e5e7eb;
  border-radius: 10px;
  position: relative;
  transition: background 0.3s;
}

.rule-toggle.active .mini-toggle-track {
  background: #10b981;
}

.mini-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  transition: transform 0.3s;
}

.rule-toggle.active .mini-toggle-thumb {
  transform: translateX(16px);
}

.delete-btn {
  width: 36px;
  height: 36px;
  background: #fee2e2;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ef4444;
}

.delete-btn:active {
  background: #fecaca;
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.add-rule-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
}

.add-rule-btn:active {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.add-rule-btn svg {
  width: 18px;
  height: 18px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h4 {
  font-size: 17px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  color: #111;
  background: #fff;
  min-height: 48px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.job-type-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.job-type-btn {
  flex: 1;
  min-width: 90px;
  padding: 10px 12px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.job-type-btn.active {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.cancel-btn,
.save-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.cancel-btn:active {
  background: #e5e7eb;
}

.save-btn {
  background: #000;
  color: #fff;
}

.save-btn:active:not(:disabled) {
  background: #1f2937;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>