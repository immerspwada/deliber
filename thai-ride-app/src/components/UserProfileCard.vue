<script setup lang="ts">
/**
 * Feature: F167 - User Profile Card
 * Display user profile summary
 */

interface Props {
  name: string
  phone: string
  email?: string
  avatar?: string
  memberSince?: string
  totalRides?: number
  rating?: number
  verified?: boolean
}

withDefaults(defineProps<Props>(), {
  verified: false
})

const emit = defineEmits<{
  edit: []
  viewHistory: []
}>()
</script>

<template>
  <div class="user-profile-card">
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar">
          <img v-if="avatar" :src="avatar" :alt="name" />
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div v-if="verified" class="verified-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      </div>
      <div class="profile-info">
        <h3 class="profile-name">{{ name }}</h3>
        <p class="profile-phone">{{ phone }}</p>
        <p v-if="email" class="profile-email">{{ email }}</p>
      </div>
      <button type="button" class="edit-btn" @click="emit('edit')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

    <div class="profile-stats">
      <div v-if="memberSince" class="stat-item">
        <span class="stat-value">{{ memberSince }}</span>
        <span class="stat-label">สมาชิกตั้งแต่</span>
      </div>
      <div v-if="totalRides !== undefined" class="stat-item">
        <span class="stat-value">{{ totalRides }}</span>
        <span class="stat-label">เที่ยวทั้งหมด</span>
      </div>
      <div v-if="rating !== undefined" class="stat-item">
        <span class="stat-value">
          {{ rating.toFixed(1) }}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </span>
        <span class="stat-label">คะแนน</span>
      </div>
    </div>
    
    <button type="button" class="history-btn" @click="emit('viewHistory')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      ดูประวัติการใช้งาน
    </button>
  </div>
</template>

<style scoped>
.user-profile-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.profile-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.avatar-section {
  position: relative;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.verified-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: #276ef1;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.profile-phone {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.profile-email {
  font-size: 13px;
  color: #999;
  margin: 4px 0 0;
}

.edit-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #6b6b6b;
  cursor: pointer;
}

.edit-btn:hover {
  background: #000;
  color: #fff;
}

.profile-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #f6f6f6;
  border-radius: 10px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-value svg {
  color: #ffc107;
}

.stat-label {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}

.history-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  color: #000;
  cursor: pointer;
}

.history-btn:hover {
  background: #e5e5e5;
}
</style>