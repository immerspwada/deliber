<script setup lang="ts">
/**
 * Feature: F200 - System Status
 * Display system health status
 */

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  latency?: number
  lastCheck?: string
}

interface Props {
  services: ServiceStatus[]
  overallStatus?: 'operational' | 'degraded' | 'down'
}

withDefaults(defineProps<Props>(), {
  overallStatus: 'operational'
})

const statusConfig = {
  operational: { label: 'ปกติ', color: '#2e7d32', bg: '#e8f5e9' },
  degraded: { label: 'ช้า', color: '#ef6c00', bg: '#fff3e0' },
  down: { label: 'ขัดข้อง', color: '#e11900', bg: '#ffebee' }
}
</script>

<template>
  <div class="system-status">
    <div class="status-header">
      <h3 class="status-title">สถานะระบบ</h3>
      <span class="overall-status" :style="{ color: statusConfig[overallStatus].color, background: statusConfig[overallStatus].bg }">
        {{ statusConfig[overallStatus].label }}
      </span>
    </div>
    
    <div class="services-list">
      <div v-for="service in services" :key="service.name" class="service-item">
        <div class="service-indicator" :style="{ background: statusConfig[service.status].color }"></div>
        <div class="service-info">
          <span class="service-name">{{ service.name }}</span>
          <span v-if="service.latency" class="service-latency">{{ service.latency }}ms</span>
        </div>
        <span class="service-status" :style="{ color: statusConfig[service.status].color }">
          {{ statusConfig[service.status].label }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-status {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.overall-status {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.service-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-name {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.service-latency {
  font-size: 11px;
  color: #999;
}

.service-status {
  font-size: 11px;
  font-weight: 600;
}
</style>