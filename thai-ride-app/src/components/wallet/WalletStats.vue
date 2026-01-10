<template>
  <section class="stats-section">
    <div class="stat-card">
      <div class="stat-icon earned">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z"/>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-label">รายรับทั้งหมด</span>
        <span class="stat-value">{{ formattedEarned }}</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon spent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <div class="stat-info">
        <span class="stat-label">รายจ่ายทั้งหมด</span>
        <span class="stat-value">{{ formattedSpent }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  formattedEarned: string
  formattedSpent: string
}

defineProps<Props>()
</script>

<style scoped>
.stats-section {
  padding: 0 16px 16px;
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.earned {
  background: #dcfce7;
}

.stat-icon.earned svg {
  color: #16a34a;
}

.stat-icon.spent {
  background: #fee2e2;
}

.stat-icon.spent svg {
  color: #dc2626;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
</style>
