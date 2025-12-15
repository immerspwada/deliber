<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const referralCode = computed(() => {
  const userId = authStore.user?.id || 'demo'
  return `THAI${userId.substring(0, 6).toUpperCase()}`
})

const referralLink = computed(() => `https://thairide.app/invite/${referralCode.value}`)

const stats = ref({
  invited: 5,
  completed: 3,
  earned: 150
})

const referrals = ref([
  { id: 1, name: 'สมชาย ใ***', status: 'completed', reward: 50, date: '14 ธ.ค. 2567' },
  { id: 2, name: 'สมหญิง ร***', status: 'completed', reward: 50, date: '12 ธ.ค. 2567' },
  { id: 3, name: 'วิชัย ก***', status: 'completed', reward: 50, date: '10 ธ.ค. 2567' },
  { id: 4, name: 'มานี ส***', status: 'pending', reward: 0, date: '8 ธ.ค. 2567' },
  { id: 5, name: 'ประยุทธ์ จ***', status: 'pending', reward: 0, date: '5 ธ.ค. 2567' }
])

const copyCode = () => {
  navigator.clipboard?.writeText(referralCode.value)
  alert('คัดลอกโค้ดแล้ว')
}

const copyLink = () => {
  navigator.clipboard?.writeText(referralLink.value)
  alert('คัดลอกลิงก์แล้ว')
}

const shareReferral = () => {
  if (navigator.share) {
    navigator.share({
      title: 'ชวนใช้ ThaiRide',
      text: `ใช้โค้ด ${referralCode.value} รับส่วนลด 50 บาท!`,
      url: referralLink.value
    })
  } else {
    copyLink()
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>ชวนเพื่อน</h1>
      </div>

      <!-- Hero Section -->
      <div class="hero-card">
        <div class="hero-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
          </svg>
        </div>
        <h2>รับ ฿50 ทุกครั้งที่ชวนเพื่อน</h2>
        <p>เพื่อนของคุณก็ได้รับส่วนลด ฿50 เช่นกัน</p>
      </div>

      <!-- Referral Code -->
      <div class="code-section">
        <span class="code-label">โค้ดชวนเพื่อนของคุณ</span>
        <div class="code-box">
          <span class="code-value">{{ referralCode }}</span>
          <button @click="copyCode" class="copy-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Share Button -->
      <button @click="shareReferral" class="share-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        แชร์ให้เพื่อน
      </button>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.invited }}</span>
          <span class="stat-label">ชวนแล้ว</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">สำเร็จ</span>
        </div>
        <div class="stat-card highlight">
          <span class="stat-value">฿{{ stats.earned }}</span>
          <span class="stat-label">รับแล้ว</span>
        </div>
      </div>

      <!-- How it works -->
      <div class="how-section">
        <h3>วิธีการ</h3>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">
              <span class="step-title">แชร์โค้ด</span>
              <span class="step-desc">ส่งโค้ดให้เพื่อน</span>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text">
              <span class="step-title">เพื่อนสมัคร</span>
              <span class="step-desc">ใช้โค้ดตอนสมัคร</span>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">
              <span class="step-title">เพื่อนเรียกรถ</span>
              <span class="step-desc">เที่ยวแรกสำเร็จ</span>
            </div>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <div class="step-text">
              <span class="step-title">รับเงิน</span>
              <span class="step-desc">ทั้งคุณและเพื่อน</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Referral History -->
      <div class="history-section">
        <h3>ประวัติการชวน</h3>
        <div class="referral-list">
          <div v-for="ref in referrals" :key="ref.id" class="referral-item">
            <div class="ref-avatar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="ref-info">
              <span class="ref-name">{{ ref.name }}</span>
              <span class="ref-date">{{ ref.date }}</span>
            </div>
            <div :class="['ref-status', ref.status]">
              <span v-if="ref.status === 'completed'">+฿{{ ref.reward }}</span>
              <span v-else>รอดำเนินการ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

/* Hero */
.hero-card {
  text-align: center;
  padding: 24px;
  background: #000;
  color: #fff;
  border-radius: 16px;
  margin-bottom: 20px;
}

.hero-icon {
  width: 64px;
  height: 64px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.hero-icon svg {
  width: 32px;
  height: 32px;
}

.hero-card h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-card p {
  font-size: 14px;
  opacity: 0.8;
}

/* Code Section */
.code-section {
  margin-bottom: 16px;
}

.code-label {
  display: block;
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 8px;
}

.code-box {
  display: flex;
  align-items: center;
  background: #F6F6F6;
  border-radius: 12px;
  padding: 4px;
}

.code-value {
  flex: 1;
  padding: 12px 16px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
}

.copy-btn {
  width: 48px;
  height: 48px;
  background: #fff;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.copy-btn svg {
  width: 22px;
  height: 22px;
}

/* Share Button */
.share-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 24px;
}

.share-btn svg {
  width: 20px;
  height: 20px;
}

/* Stats */
.stats-grid {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
}

.stat-card.highlight {
  background: #000;
  color: #fff;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.stat-card.highlight .stat-value {
  color: #fff;
}

.stat-card.highlight .stat-label {
  color: rgba(255,255,255,0.7);
}

.stat-label {
  font-size: 12px;
  color: #6B6B6B;
}

/* How Section */
.how-section {
  margin-bottom: 24px;
}

.how-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-num {
  width: 32px;
  height: 32px;
  background: #000;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.step-text {
  display: flex;
  flex-direction: column;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
}

.step-desc {
  font-size: 12px;
  color: #6B6B6B;
}

/* History */
.history-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.referral-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.referral-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 12px;
}

.ref-avatar {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ref-avatar svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.ref-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ref-name {
  font-size: 14px;
  font-weight: 500;
}

.ref-date {
  font-size: 12px;
  color: #6B6B6B;
}

.ref-status {
  font-size: 14px;
  font-weight: 500;
}

.ref-status.completed {
  color: #000;
  font-weight: 600;
}

.ref-status.pending {
  color: #6B6B6B;
}
</style>
