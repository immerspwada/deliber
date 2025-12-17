<script setup lang="ts">
/**
 * Feature: F141 - Corporate Account Card
 * Display corporate/business account info
 */

interface Props {
  companyName: string
  companyLogo?: string
  employeeId?: string
  department?: string
  monthlyLimit?: number
  usedAmount?: number
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: true
})

const emit = defineEmits<{
  viewPolicy: []
  viewHistory: []
}>()

const usagePercent = () => {
  if (!props.monthlyLimit || !props.usedAmount) return 0
  return Math.min((props.usedAmount / props.monthlyLimit) * 100, 100)
}
</script>

<template>
  <div class="corporate-card" :class="{ inactive: !isActive }">
    <div class="card-header">
      <div class="company-logo">
        <img v-if="companyLogo" :src="companyLogo" :alt="companyName" />
        <span v-else class="logo-placeholder">{{ companyName[0] }}</span>
      </div>
      <div class="company-info">
        <h3 class="company-name">{{ companyName }}</h3>
        <p v-if="employeeId" class="employee-id">รหัสพนักงาน: {{ employeeId }}</p>
        <p v-if="department" class="department">{{ department }}</p>
      </div>
      <span class="status-badge" :class="{ active: isActive }">
        {{ isActive ? 'ใช้งานได้' : 'ไม่พร้อมใช้งาน' }}
      </span>
    </div>

    <div v-if="monthlyLimit" class="usage-section">
      <div class="usage-header">
        <span class="usage-label">วงเงินเดือนนี้</span>
        <span class="usage-amount">
          ฿{{ (usedAmount || 0).toLocaleString() }} / ฿{{ monthlyLimit.toLocaleString() }}
        </span>
      </div>
      <div class="usage-bar">
        <div class="usage-fill" :style="{ width: `${usagePercent()}%` }" :class="{ warning: usagePercent() > 80 }" />
      </div>
      <span class="usage-remaining">
        เหลือ ฿{{ (monthlyLimit - (usedAmount || 0)).toLocaleString() }}
      </span>
    </div>
    
    <div class="card-actions">
      <button type="button" class="action-btn" @click="emit('viewPolicy')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <span>นโยบายบริษัท</span>
      </button>
      <button type="button" class="action-btn" @click="emit('viewHistory')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>ประวัติการใช้</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.corporate-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 20px;
  color: #fff;
}

.corporate-card.inactive {
  opacity: 0.6;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.company-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.company-info {
  flex: 1;
}

.company-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.employee-id, .department {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.status-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.status-badge.active {
  background: rgba(46, 125, 50, 0.3);
  color: #81c784;
}

.usage-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.usage-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.usage-amount {
  font-size: 13px;
  font-weight: 500;
}

.usage-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.usage-fill {
  height: 100%;
  background: #81c784;
  border-radius: 3px;
  transition: width 0.3s;
}

.usage-fill.warning {
  background: #ffb74d;
}

.usage-remaining {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.card-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
