<script setup lang="ts">
/**
 * VerificationStatsCards - Statistics Cards for Verification Queue
 */
defineProps<{
  stats: {
    pending_count: number
    in_review_count: number
    completed_today: number
    avg_review_time: string | null
  } | null
}>()
</script>

<template>
  <div v-if="stats" class="stats-grid">
    <div class="stat-card pending">
      <div class="stat-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ stats.pending_count }}</div>
        <div class="stat-label">รอตรวจสอบ</div>
      </div>
    </div>

    <div class="stat-card in-review">
      <div class="stat-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ stats.in_review_count }}</div>
        <div class="stat-label">กำลังตรวจสอบ</div>
      </div>
    </div>

    <div class="stat-card completed">
      <div class="stat-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <path d="M22 4L12 14.01l-3-3"/>
        </svg>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ stats.completed_today }}</div>
        <div class="stat-label">เสร็จวันนี้</div>
      </div>
    </div>

    <div class="stat-card time">
      <div class="stat-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div class="stat-content">
        <div class="stat-value">{{ stats.avg_review_time?.split(':')[1] || '25' }} นาที</div>
        <div class="stat-label">เวลาเฉลี่ย</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E8E8E8;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card.pending {
  border-left: 4px solid #FFC043;
}

.stat-card.in-review {
  border-left: 4px solid #3B82F6;
}

.stat-card.completed {
  border-left: 4px solid #00A86B;
}

.stat-card.time {
  border-left: 4px solid #8B5CF6;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.pending .stat-icon {
  background: #FFF9E6;
  color: #FFC043;
}

.stat-card.in-review .stat-icon {
  background: #EBF5FF;
  color: #3B82F6;
}

.stat-card.completed .stat-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-card.time .stat-icon {
  background: #F3F0FF;
  color: #8B5CF6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
