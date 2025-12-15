<script setup lang="ts">
interface Props {
  name: string
  rating: number
  trips: number
  vehicle: string
  plate: string
  eta?: string
  phone?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  call: []
  message: []
}>()

const callDriver = () => {
  emit('call')
}

const messageDriver = () => {
  emit('message')
}
</script>

<template>
  <div class="driver-card">
    <div class="driver-main">
      <div class="driver-avatar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div class="driver-info">
        <h3 class="driver-name">{{ name }}</h3>
        <div class="driver-stats">
          <div class="stat">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ rating }}</span>
          </div>
          <span class="divider-dot"></span>
          <span class="trips-count">{{ trips }} เที่ยว</span>
        </div>
      </div>
      <div v-if="eta" class="eta-badge">
        <span>{{ eta }}</span>
      </div>
    </div>

    <div class="vehicle-info">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
      </svg>
      <span>{{ vehicle }}</span>
      <span class="plate">{{ plate }}</span>
    </div>

    <div class="actions">
      <button @click="callDriver" class="action-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
        <span>โทร</span>
      </button>
      <button @click="messageDriver" class="action-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span>ข้อความ</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.driver-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 16px;
}

.driver-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.driver-avatar {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: 50%;
}

.driver-avatar svg {
  width: 26px;
  height: 26px;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.driver-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat svg {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

.divider-dot {
  width: 3px;
  height: 3px;
  background-color: var(--color-text-muted);
  border-radius: 50%;
}

.eta-badge {
  padding: 6px 12px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-size: 14px;
}

.vehicle-info svg {
  width: 20px;
  height: 20px;
}

.plate {
  margin-left: auto;
  font-weight: 600;
  color: var(--color-text-primary);
}

.actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--color-secondary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}
</style>
