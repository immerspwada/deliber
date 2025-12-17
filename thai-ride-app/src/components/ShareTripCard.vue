<script setup lang="ts">
/**
 * Feature: F135 - Share Trip Card
 * Share trip status with contacts
 */

interface Props {
  isSharing: boolean
  sharedWith?: Array<{ name: string; phone: string }>
  tripId?: string
}

withDefaults(defineProps<Props>(), {
  isSharing: false,
  sharedWith: () => []
})

const emit = defineEmits<{
  share: []
  stop: []
  addContact: []
}>()
</script>

<template>
  <div class="share-trip-card">
    <div class="card-header">
      <div class="header-icon" :class="{ active: isSharing }">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
      </div>
      <div class="header-content">
        <h3 class="header-title">แชร์การเดินทาง</h3>
        <p class="header-desc">
          {{ isSharing ? 'กำลังแชร์ตำแหน่งแบบเรียลไทม์' : 'แชร์ตำแหน่งกับคนที่คุณไว้ใจ' }}
        </p>
      </div>
    </div>
    
    <div v-if="isSharing && sharedWith.length > 0" class="shared-contacts">
      <div v-for="contact in sharedWith" :key="contact.phone" class="contact-item">
        <div class="contact-avatar">{{ contact.name[0] }}</div>
        <span class="contact-name">{{ contact.name }}</span>
        <span class="sharing-badge">กำลังดู</span>
      </div>
    </div>

    <div class="card-actions">
      <button v-if="!isSharing" type="button" class="share-btn primary" @click="emit('share')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
        <span>แชร์ตำแหน่ง</span>
      </button>
      
      <template v-else>
        <button type="button" class="share-btn" @click="emit('addContact')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
            <path d="M20 8v6M23 11h-6"/>
          </svg>
          <span>เพิ่มผู้รับ</span>
        </button>
        <button type="button" class="share-btn danger" @click="emit('stop')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
          <span>หยุดแชร์</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.share-trip-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.header-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.header-icon.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.header-content {
  flex: 1;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.header-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.shared-contacts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f6f6f6;
  border-radius: 10px;
}

.contact-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.contact-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.sharing-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.share-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.share-btn:hover { background: #e5e5e5; }
.share-btn.primary { background: #000; color: #fff; }
.share-btn.primary:hover { background: #333; }
.share-btn.danger { background: #ffebee; color: #c62828; }
.share-btn.danger:hover { background: #ffcdd2; }
</style>
