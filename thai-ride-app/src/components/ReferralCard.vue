<script setup lang="ts">
/**
 * Feature: F144 - Referral Card
 * Display referral code and stats
 */

interface Props {
  code: string
  totalReferrals: number
  pendingRewards: number
  earnedRewards: number
  rewardPerReferral: number
}

defineProps<Props>()

const emit = defineEmits<{
  share: []
  copy: []
  viewHistory: []
}>()
</script>

<template>
  <div class="referral-card">
    <div class="card-header">
      <div class="header-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <div class="header-content">
        <h3 class="header-title">ชวนเพื่อนรับเงิน</h3>
        <p class="header-desc">รับ ฿{{ rewardPerReferral }} ทุกครั้งที่เพื่อนใช้บริการครั้งแรก</p>
      </div>
    </div>
    
    <div class="code-section">
      <span class="code-label">รหัสชวนเพื่อนของคุณ</span>
      <div class="code-box">
        <span class="code-value">{{ code }}</span>
        <button type="button" class="copy-btn" @click="emit('copy')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value">{{ totalReferrals }}</span>
        <span class="stat-label">เพื่อนที่ชวน</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">฿{{ pendingRewards.toLocaleString() }}</span>
        <span class="stat-label">รอรับเงิน</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">฿{{ earnedRewards.toLocaleString() }}</span>
        <span class="stat-label">รับแล้ว</span>
      </div>
    </div>
    
    <div class="card-actions">
      <button type="button" class="action-btn primary" @click="emit('share')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
        <span>แชร์ให้เพื่อน</span>
      </button>
      <button type="button" class="action-btn" @click="emit('viewHistory')">
        <span>ดูประวัติ</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.referral-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 20px;
  color: #fff;
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  flex-shrink: 0;
}

.header-content { flex: 1; }
.header-title { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
.header-desc { font-size: 13px; color: rgba(255, 255, 255, 0.8); margin: 0; }

.code-section {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
}

.code-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin-bottom: 8px;
}

.code-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-value {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 2px;
  font-family: monospace;
}

.copy-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.copy-btn:hover { background: rgba(255, 255, 255, 0.3); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  display: block;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
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
  gap: 8px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
}

.action-btn:hover { background: rgba(255, 255, 255, 0.3); }
.action-btn.primary { background: #fff; color: #667eea; }
.action-btn.primary:hover { background: #f0f0f0; }
</style>
