<script setup lang="ts">
/**
 * Earnings Goal Card Component
 * Set and track daily earnings goal
 */
import { ref, computed, onMounted, watch } from 'vue'

interface Props {
  currentEarnings?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentEarnings: 0
})

const emit = defineEmits<{
  goalUpdated: [goal: number]
}>()

// State
const goalAmount = ref(1500)
const isEditing = ref(false)
const inputValue = ref('')
const STORAGE_KEY = 'provider_daily_goal'

// Preset goals
const presetGoals = [1000, 1500, 2000, 2500, 3000]

// Computed
const progress = computed(() => {
  if (goalAmount.value <= 0) return 0
  return Math.min((props.currentEarnings / goalAmount.value) * 100, 100)
})

const remaining = computed(() => {
  const diff = goalAmount.value - props.currentEarnings
  return diff > 0 ? diff : 0
})

const isGoalReached = computed(() => props.currentEarnings >= goalAmount.value)

// Methods
function startEditing() {
  inputValue.value = goalAmount.value.toString()
  isEditing.value = true
}

function saveGoal() {
  const value = parseInt(inputValue.value, 10)
  if (value && value > 0) {
    goalAmount.value = value
    localStorage.setItem(STORAGE_KEY, value.toString())
    emit('goalUpdated', value)
  }
  isEditing.value = false
}

function selectPreset(amount: number) {
  goalAmount.value = amount
  localStorage.setItem(STORAGE_KEY, amount.toString())
  emit('goalUpdated', amount)
  isEditing.value = false
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('th-TH')
}

// Load saved goal
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    goalAmount.value = parseInt(saved, 10)
  }
})

// Watch for external changes
watch(() => props.currentEarnings, () => {
  if (isGoalReached.value) {
    // Could trigger celebration animation
  }
})
</script>

<template>
  <div class="goal-card" :class="{ reached: isGoalReached }">
    <!-- Header -->
    <div class="goal-header">
      <div class="goal-title">
        <span class="goal-icon">🎯</span>
        <span>เป้าหมายวันนี้</span>
      </div>
      <button 
        v-if="!isEditing"
        class="edit-btn"
        @click="startEditing"
        aria-label="แก้ไขเป้าหมาย"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>

    <!-- Edit Mode -->
    <div v-if="isEditing" class="edit-mode">
      <div class="input-row">
        <span class="currency">฿</span>
        <input
          v-model="inputValue"
          type="number"
          inputmode="numeric"
          class="goal-input"
          placeholder="ระบุจำนวน"
          @keyup.enter="saveGoal"
        />
        <button class="save-btn" @click="saveGoal">
          บันทึก
        </button>
      </div>
      
      <div class="presets">
        <button
          v-for="preset in presetGoals"
          :key="preset"
          class="preset-btn"
          :class="{ active: goalAmount === preset }"
          @click="selectPreset(preset)"
        >
          ฿{{ formatMoney(preset) }}
        </button>
      </div>
    </div>

    <!-- Display Mode -->
    <template v-else>
      <!-- Progress Circle -->
      <div class="progress-section">
        <div class="progress-circle">
          <svg viewBox="0 0 100 100">
            <circle
              class="progress-bg"
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke-width="8"
            />
            <circle
              class="progress-fill"
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke-width="8"
              :stroke-dasharray="`${progress * 2.64} 264`"
              stroke-linecap="round"
            />
          </svg>
          <div class="progress-text">
            <span class="progress-percent">{{ Math.round(progress) }}%</span>
          </div>
        </div>

        <div class="progress-info">
          <div class="current-amount">
            <span class="label">รายได้ปัจจุบัน</span>
            <span class="value">฿{{ formatMoney(currentEarnings) }}</span>
          </div>
          <div class="goal-amount">
            <span class="label">เป้าหมาย</span>
            <span class="value">฿{{ formatMoney(goalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="status-bar" :class="{ success: isGoalReached }">
        <template v-if="isGoalReached">
          <span class="status-icon">🎉</span>
          <span class="status-text">ยินดีด้วย! คุณทำได้ตามเป้าหมายแล้ว</span>
        </template>
        <template v-else>
          <span class="status-icon">💪</span>
          <span class="status-text">เหลืออีก ฿{{ formatMoney(remaining) }}</span>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.goal-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.goal-card.reached {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #a7f3d0;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.goal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111;
}

.goal-icon {
  font-size: 20px;
}

.edit-btn {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.edit-btn:active {
  background: #e5e7eb;
}

.edit-btn svg {
  width: 16px;
  height: 16px;
}

/* Edit Mode */
.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.currency {
  font-size: 20px;
  font-weight: 600;
  color: #111;
}

.goal-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #111;
  outline: none;
  transition: border-color 0.2s;
}

.goal-input:focus {
  border-color: #000;
}

.save-btn {
  padding: 12px 20px;
  background: #000;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:active {
  transform: scale(0.96);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn.active {
  background: #000;
  border-color: #000;
  color: #fff;
}

.preset-btn:active {
  transform: scale(0.96);
}

/* Progress Section */
.progress-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.progress-circle {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.progress-circle svg {
  transform: rotate(-90deg);
}

.progress-bg {
  stroke: #f3f4f6;
}

.progress-fill {
  stroke: #10b981;
  transition: stroke-dasharray 0.5s ease;
}

.goal-card.reached .progress-fill {
  stroke: #059669;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-percent {
  font-size: 22px;
  font-weight: 700;
  color: #111;
}

.progress-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-amount,
.goal-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 13px;
  color: #6b7280;
}

.value {
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

/* Status Bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.status-bar.success {
  background: #d1fae5;
}

.status-icon {
  font-size: 18px;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.status-bar.success .status-text {
  color: #065f46;
}
</style>
