<script setup lang="ts">
/**
 * Feature: F148 - Profile Header
 * User profile header with avatar and info
 */

interface Props {
  name: string
  phone?: string
  email?: string
  photo?: string
  rating?: number
  totalRides?: number
  memberSince?: string
  isVerified?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  editPhoto: []
  editProfile: []
}>()

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="profile-header">
    <div class="avatar-section">
      <div class="avatar" @click="emit('editPhoto')">
        <img v-if="photo" :src="photo" :alt="name" />
        <span v-else class="avatar-initials">{{ getInitials(name) }}</span>
        <div class="avatar-edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>
      <span v-if="isVerified" class="verified-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        ยืนยันแล้ว
      </span>
    </div>

    <div class="info-section">
      <h2 class="user-name">{{ name }}</h2>
      <p v-if="phone" class="user-phone">{{ phone }}</p>
      <p v-if="email" class="user-email">{{ email }}</p>
      
      <div class="stats-row">
        <div v-if="rating" class="stat-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{{ rating.toFixed(1) }}</span>
        </div>
        <div v-if="totalRides" class="stat-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/>
          </svg>
          <span>{{ totalRides }} เที่ยว</span>
        </div>
        <div v-if="memberSince" class="stat-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <span>{{ formatDate(memberSince) }}</span>
        </div>
      </div>
    </div>
    
    <button type="button" class="edit-btn" @click="emit('editProfile')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background: #fff;
  border-radius: 20px;
  position: relative;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 28px;
  font-weight: 600;
  color: #6b6b6b;
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 2px solid #fff;
}

.verified-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 4px 8px;
  border-radius: 12px;
}

.info-section {
  flex: 1;
}

.user-name {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.user-phone, .user-email {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
}

.stat-item svg {
  color: #000;
}

.stat-item svg[fill="currentColor"] {
  color: #ffc107;
}

.edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  color: #6b6b6b;
  cursor: pointer;
}

.edit-btn:hover {
  background: #e5e5e5;
  color: #000;
}
</style>
