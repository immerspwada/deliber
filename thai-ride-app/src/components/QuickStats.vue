<script setup lang="ts">
/**
 * Feature: F194 - Quick Stats
 * Display quick statistics row
 */

interface Stat {
  label: string
  value: string | number
  change?: number
  icon?: string
}

interface Props {
  stats: Stat[]
}

defineProps<Props>()

const iconPaths: Record<string, string> = {
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  rides: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  money: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  chart: 'M18 20V10M12 20V4M6 20v-6'
}
</script>

<template>
  <div class="quick-stats">
    <div v-for="(stat, index) in stats" :key="index" class="stat-item">
      <div v-if="stat.icon" class="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="iconPaths[stat.icon] || iconPaths.chart"/>
        </svg>
      </div>
      <div class="stat-content">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
      <span v-if="stat.change !== undefined" class="stat-change" :class="{ positive: stat.change > 0, negative: stat.change < 0 }">
        <svg v-if="stat.change !== 0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="stat.change > 0 ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'"/>
        </svg>
        {{ Math.abs(stat.change) }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.stat-label {
  font-size: 12px;
  color: #6b6b6b;
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
}

.stat-change.positive {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-change.negative {
  background: #ffebee;
  color: #e11900;
}
</style>