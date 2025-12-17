<script setup lang="ts">
/**
 * Feature: F203 - Notification Composer
 * Admin component for composing and sending notifications
 */
import { ref, computed } from 'vue'

interface NotificationData {
  title: string
  body: string
  type: 'all' | 'segment' | 'individual'
  segment?: string
  userId?: string
  scheduledAt?: string
  sendPush: boolean
  sendInApp: boolean
}

const emit = defineEmits<{
  send: [data: NotificationData]
  preview: [data: NotificationData]
}>()

const form = ref<NotificationData>({
  title: '',
  body: '',
  type: 'all',
  segment: '',
  userId: '',
  scheduledAt: '',
  sendPush: true,
  sendInApp: true
})

const segments = [
  { value: 'new_users', label: 'ผู้ใช้ใหม่ (7 วัน)' },
  { value: 'active_users', label: 'ผู้ใช้ที่ใช้งานบ่อย' },
  { value: 'inactive_users', label: 'ผู้ใช้ที่ไม่ได้ใช้งาน' },
  { value: 'high_value', label: 'ลูกค้า VIP' },
  { value: 'providers', label: 'ผู้ให้บริการทั้งหมด' }
]

const isValid = computed(() => form.value.title && form.value.body && (form.value.sendPush || form.value.sendInApp))
const charCount = computed(() => form.value.body.length)
</script>

<template>
  <div class="notification-composer">
    <div class="composer-header">
      <h2 class="composer-title">ส่งการแจ้งเตือน</h2>
    </div>

    <div class="form-section">
      <label class="form-label">หัวข้อ</label>
      <input v-model="form.title" type="text" class="form-input" placeholder="หัวข้อการแจ้งเตือน" maxlength="50" />
    </div>

    <div class="form-section">
      <label class="form-label">ข้อความ <span class="char-count">{{ charCount }}/200</span></label>
      <textarea v-model="form.body" class="form-textarea" placeholder="เนื้อหาการแจ้งเตือน..." rows="3" maxlength="200" />
    </div>

    <div class="form-section">
      <label class="form-label">ส่งถึง</label>
      <div class="type-options">
        <label class="type-option" :class="{ active: form.type === 'all' }">
          <input v-model="form.type" type="radio" value="all" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>ทุกคน</span>
        </label>
        <label class="type-option" :class="{ active: form.type === 'segment' }">
          <input v-model="form.type" type="radio" value="segment" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>กลุ่มเป้าหมาย</span>
        </label>
        <label class="type-option" :class="{ active: form.type === 'individual' }">
          <input v-model="form.type" type="radio" value="individual" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>รายบุคคล</span>
        </label>
      </div>
    </div>

    <div v-if="form.type === 'segment'" class="form-section">
      <label class="form-label">เลือกกลุ่ม</label>
      <select v-model="form.segment" class="form-select">
        <option value="">-- เลือกกลุ่มเป้าหมาย --</option>
        <option v-for="seg in segments" :key="seg.value" :value="seg.value">{{ seg.label }}</option>
      </select>
    </div>

    <div v-if="form.type === 'individual'" class="form-section">
      <label class="form-label">User ID</label>
      <input v-model="form.userId" type="text" class="form-input" placeholder="ระบุ User ID" />
    </div>

    <div class="form-section">
      <label class="form-label">ช่องทางการส่ง</label>
      <div class="channel-options">
        <label class="channel-option">
          <input v-model="form.sendPush" type="checkbox" />
          <span class="channel-check" />
          <span>Push Notification</span>
        </label>
        <label class="channel-option">
          <input v-model="form.sendInApp" type="checkbox" />
          <span class="channel-check" />
          <span>In-App Notification</span>
        </label>
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">กำหนดเวลาส่ง (ไม่บังคับ)</label>
      <input v-model="form.scheduledAt" type="datetime-local" class="form-input" />
    </div>

    <div class="composer-actions">
      <button type="button" class="btn-secondary" @click="emit('preview', form)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        ดูตัวอย่าง
      </button>
      <button type="button" class="btn-primary" :disabled="!isValid" @click="emit('send', form)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        {{ form.scheduledAt ? 'ตั้งเวลาส่ง' : 'ส่งทันที' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification-composer { background: #fff; border-radius: 16px; padding: 24px; }
.composer-header { margin-bottom: 24px; }
.composer-title { font-size: 20px; font-weight: 700; color: #000; margin: 0; }
.form-section { margin-bottom: 20px; }
.form-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #000; margin-bottom: 8px; }
.char-count { font-weight: 400; color: #6b6b6b; }
.form-input, .form-select, .form-textarea { width: 100%; padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 15px; box-sizing: border-box; }
.form-input:focus, .form-select:focus, .form-textarea:focus { outline: none; border-color: #000; }
.form-textarea { resize: vertical; }
.type-options { display: flex; gap: 12px; }
.type-option { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.type-option input { display: none; }
.type-option:hover { border-color: #000; }
.type-option.active { border-color: #000; background: #f6f6f6; }
.type-option span { font-size: 13px; font-weight: 500; }
.channel-options { display: flex; gap: 16px; }
.channel-option { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.channel-option input { display: none; }
.channel-check { width: 20px; height: 20px; border: 2px solid #e5e5e5; border-radius: 4px; position: relative; }
.channel-option input:checked + .channel-check { background: #000; border-color: #000; }
.channel-option input:checked + .channel-check::after { content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.composer-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
.btn-primary, .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #000; color: #fff; border: none; }
.btn-primary:hover:not(:disabled) { background: #333; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #000; border: 1px solid #e5e5e5; }
.btn-secondary:hover { background: #f6f6f6; }
</style>
