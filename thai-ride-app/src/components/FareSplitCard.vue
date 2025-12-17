<script setup lang="ts">
/**
 * Feature: F138 - Fare Split Card
 * Display fare splitting between passengers
 */

interface Participant {
  id: string
  name: string
  phone?: string
  amount: number
  status: 'pending' | 'paid' | 'declined'
}

interface Props {
  totalFare: number
  participants: Participant[]
  myShare: number
  splitType: 'equal' | 'custom'
}

defineProps<Props>()

const emit = defineEmits<{
  addParticipant: []
  removeParticipant: [id: string]
  remind: [id: string]
}>()

const statusConfig = {
  pending: { label: 'รอชำระ', class: 'pending' },
  paid: { label: 'ชำระแล้ว', class: 'paid' },
  declined: { label: 'ปฏิเสธ', class: 'declined' }
}
</script>

<template>
  <div class="fare-split-card">
    <div class="card-header">
      <div class="header-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </div>
      <div class="header-content">
        <h3 class="header-title">แบ่งค่าโดยสาร</h3>
        <p class="header-desc">{{ splitType === 'equal' ? 'แบ่งเท่ากัน' : 'กำหนดเอง' }}</p>
      </div>
      <div class="total-fare">
        <span class="fare-label">รวม</span>
        <span class="fare-amount">฿{{ totalFare.toLocaleString() }}</span>
      </div>
    </div>

    <div class="participants-list">
      <div class="participant-item me">
        <div class="participant-avatar">ฉัน</div>
        <div class="participant-info">
          <span class="participant-name">ส่วนของคุณ</span>
        </div>
        <span class="participant-amount">฿{{ myShare.toLocaleString() }}</span>
      </div>
      
      <div v-for="p in participants" :key="p.id" class="participant-item">
        <div class="participant-avatar">{{ p.name[0] }}</div>
        <div class="participant-info">
          <span class="participant-name">{{ p.name }}</span>
          <span class="participant-status" :class="statusConfig[p.status].class">
            {{ statusConfig[p.status].label }}
          </span>
        </div>
        <span class="participant-amount">฿{{ p.amount.toLocaleString() }}</span>
        <div class="participant-actions">
          <button v-if="p.status === 'pending'" type="button" class="remind-btn" @click="emit('remind', p.id)">
            เตือน
          </button>
          <button type="button" class="remove-btn" @click="emit('removeParticipant', p.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <button type="button" class="add-btn" @click="emit('addParticipant')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
        <path d="M20 8v6M23 11h-6"/>
      </svg>
      <span>เพิ่มผู้ร่วมจ่าย</span>
    </button>
  </div>
</template>

<style scoped>
.fare-split-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
}

.header-content { flex: 1; }
.header-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 2px; }
.header-desc { font-size: 13px; color: #6b6b6b; margin: 0; }

.total-fare { text-align: right; }
.fare-label { font-size: 12px; color: #6b6b6b; display: block; }
.fare-amount { font-size: 18px; font-weight: 700; color: #000; }

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 12px;
}

.participant-item.me { background: #000; color: #fff; }
.participant-item.me .participant-avatar { background: #fff; color: #000; }

.participant-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.participant-info { flex: 1; }
.participant-name { font-size: 14px; font-weight: 500; display: block; }
.participant-status { font-size: 11px; }
.participant-status.pending { color: #ef6c00; }
.participant-status.paid { color: #2e7d32; }
.participant-status.declined { color: #c62828; }

.participant-amount { font-size: 15px; font-weight: 600; }

.participant-actions { display: flex; gap: 6px; }

.remind-btn {
  padding: 4px 10px;
  background: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.remove-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #999;
  cursor: pointer;
}

.remove-btn:hover { background: #e5e5e5; color: #c62828; }

.add-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #f6f6f6;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
}

.add-btn:hover { border-color: #000; color: #000; }
</style>
