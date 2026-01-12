<script setup lang="ts">
/**
 * Component: RideSafetyFeatures
 * ฟีเจอร์ความปลอดภัยสำหรับการเดินทาง
 * - แชร์ตำแหน่งกับคนใกล้ชิด
 * - บันทึกเส้นทาง
 * - ติดต่อฉุกเฉิน
 */
import { ref, computed, onMounted } from 'vue'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  isSharing: boolean
}

const props = defineProps<{
  rideId?: string
  isRideActive?: boolean
}>()

const emit = defineEmits<{
  'share-location': [contact: EmergencyContact]
  'stop-sharing': [contactId: string]
  'record-route': [enabled: boolean]
}>()

// Haptic feedback
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// State
const isExpanded = ref(false)
const isRecordingRoute = ref(false)
const emergencyContacts = ref<EmergencyContact[]>([])
const showAddContactModal = ref(false)
const newContactName = ref('')
const newContactPhone = ref('')

// Load contacts from localStorage
onMounted(() => {
  const saved = localStorage.getItem('emergency_contacts')
  if (saved) {
    try {
      emergencyContacts.value = JSON.parse(saved)
    } catch {
      emergencyContacts.value = []
    }
  }
})

// Save contacts to localStorage
function saveContacts(): void {
  localStorage.setItem('emergency_contacts', JSON.stringify(emergencyContacts.value))
}

// Computed
const activeShareCount = computed(() => 
  emergencyContacts.value.filter(c => c.isSharing).length
)

const hasContacts = computed(() => emergencyContacts.value.length > 0)

// Methods
function toggleExpand(): void {
  triggerHaptic('light')
  isExpanded.value = !isExpanded.value
}

function toggleRecordRoute(): void {
  triggerHaptic('medium')
  isRecordingRoute.value = !isRecordingRoute.value
  emit('record-route', isRecordingRoute.value)
}

function toggleShareLocation(contact: EmergencyContact): void {
  triggerHaptic('medium')
  contact.isSharing = !contact.isSharing
  saveContacts()
  
  if (contact.isSharing) {
    emit('share-location', contact)
    // Simulate sending SMS
    simulateSendSMS(contact)
  } else {
    emit('stop-sharing', contact.id)
  }
}

function simulateSendSMS(contact: EmergencyContact): void {
  // In production, this would send actual SMS via backend
  console.log(`[Safety] Sharing location with ${contact.name} (${contact.phone})`)
}

function openAddContactModal(): void {
  triggerHaptic('light')
  showAddContactModal.value = true
  newContactName.value = ''
  newContactPhone.value = ''
}

function closeAddContactModal(): void {
  showAddContactModal.value = false
}

function addContact(): void {
  if (!newContactName.value.trim() || !newContactPhone.value.trim()) return
  
  triggerHaptic('medium')
  
  const newContact: EmergencyContact = {
    id: `contact-${Date.now()}`,
    name: newContactName.value.trim(),
    phone: newContactPhone.value.trim(),
    isSharing: false
  }
  
  emergencyContacts.value.push(newContact)
  saveContacts()
  closeAddContactModal()
}

function removeContact(contactId: string): void {
  if (!confirm('ลบผู้ติดต่อนี้?')) return
  
  triggerHaptic('medium')
  emergencyContacts.value = emergencyContacts.value.filter(c => c.id !== contactId)
  saveContacts()
}

function callEmergency(): void {
  triggerHaptic('heavy')
  if (confirm('โทร 191 (ตำรวจ)?')) {
    window.location.href = 'tel:191'
  }
}

function shareAllLocations(): void {
  triggerHaptic('heavy')
  emergencyContacts.value.forEach(contact => {
    if (!contact.isSharing) {
      contact.isSharing = true
      emit('share-location', contact)
      simulateSendSMS(contact)
    }
  })
  saveContacts()
}
</script>

<template>
  <div class="safety-features">
    <!-- Collapsed Header -->
    <button 
      class="safety-header"
      :class="{ expanded: isExpanded, 'has-active': activeShareCount > 0 || isRecordingRoute }"
      @click="toggleExpand"
    >
      <div class="header-left">
        <div class="safety-icon" :class="{ active: activeShareCount > 0 || isRecordingRoute }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="header-text">
          <span class="header-title">ความปลอดภัย</span>
          <span v-if="activeShareCount > 0 || isRecordingRoute" class="header-status">
            <template v-if="activeShareCount > 0">
              แชร์กับ {{ activeShareCount }} คน
            </template>
            <template v-if="activeShareCount > 0 && isRecordingRoute"> • </template>
            <template v-if="isRecordingRoute">
              กำลังบันทึก
            </template>
          </span>
        </div>
      </div>
      <svg 
        class="expand-icon" 
        :class="{ rotated: isExpanded }"
        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      >
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>

    <!-- Expanded Content -->
    <Transition name="expand">
      <div v-if="isExpanded" class="safety-content">
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button 
            class="quick-action-btn sos"
            @click="callEmergency"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>SOS</span>
          </button>
          
          <button 
            class="quick-action-btn record"
            :class="{ active: isRecordingRoute }"
            @click="toggleRecordRoute"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <circle v-if="isRecordingRoute" cx="12" cy="12" r="4" fill="currentColor"/>
              <circle v-else cx="12" cy="12" r="4"/>
            </svg>
            <span>{{ isRecordingRoute ? 'หยุดบันทึก' : 'บันทึกเส้นทาง' }}</span>
          </button>
          
          <button 
            v-if="hasContacts"
            class="quick-action-btn share-all"
            :class="{ active: activeShareCount === emergencyContacts.length }"
            @click="shareAllLocations"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>แชร์ทั้งหมด</span>
          </button>
        </div>

        <!-- Emergency Contacts -->
        <div class="contacts-section">
          <div class="section-header">
            <span class="section-title">ผู้ติดต่อฉุกเฉิน</span>
            <button class="add-btn" @click="openAddContactModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              เพิ่ม
            </button>
          </div>

          <div v-if="!hasContacts" class="empty-contacts">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p>ยังไม่มีผู้ติดต่อฉุกเฉิน</p>
            <span>เพิ่มคนใกล้ชิดเพื่อแชร์ตำแหน่งขณะเดินทาง</span>
          </div>

          <TransitionGroup v-else name="list" tag="div" class="contacts-list">
            <div 
              v-for="contact in emergencyContacts" 
              :key="contact.id"
              class="contact-item"
            >
              <div class="contact-avatar">
                {{ contact.name.charAt(0).toUpperCase() }}
              </div>
              <div class="contact-info">
                <span class="contact-name">{{ contact.name }}</span>
                <span class="contact-phone">{{ contact.phone }}</span>
              </div>
              <div class="contact-actions">
                <button 
                  class="share-toggle"
                  :class="{ active: contact.isSharing }"
                  @click="toggleShareLocation(contact)"
                  :aria-label="contact.isSharing ? 'หยุดแชร์' : 'แชร์ตำแหน่ง'"
                >
                  <svg v-if="contact.isSharing" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </button>
                <button 
                  class="remove-btn"
                  @click="removeContact(contact.id)"
                  aria-label="ลบผู้ติดต่อ"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Safety Tips -->
        <div class="safety-tips">
          <div class="tip-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <p>แชร์ตำแหน่งกับคนใกล้ชิดเพื่อความปลอดภัยขณะเดินทาง</p>
        </div>
      </div>
    </Transition>

    <!-- Add Contact Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddContactModal" class="modal-overlay" @click.self="closeAddContactModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>เพิ่มผู้ติดต่อฉุกเฉิน</h3>
              <button class="close-btn" @click="closeAddContactModal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              <div class="form-group">
                <label>ชื่อ</label>
                <input 
                  v-model="newContactName"
                  type="text"
                  placeholder="เช่น แม่, พ่อ, แฟน"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>เบอร์โทร</label>
                <input 
                  v-model="newContactPhone"
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  class="form-input"
                  inputmode="tel"
                />
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="cancel-btn" @click="closeAddContactModal">ยกเลิก</button>
              <button 
                class="save-btn"
                :disabled="!newContactName.trim() || !newContactPhone.trim()"
                @click="addContact"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.safety-features {
  background: #fff;
  border-radius: 16px;
  margin: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Header */
.safety-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.safety-header:active {
  background: #f5f5f5;
}

.safety-header.has-active {
  background: #e8f5ef;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.safety-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.safety-icon.active {
  background: #00a86b;
  color: #fff;
}

.header-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.header-status {
  font-size: 12px;
  color: #00a86b;
  font-weight: 500;
}

.expand-icon {
  color: #999;
  transition: transform 0.3s ease;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* Content */
.safety-content {
  padding: 0 16px 16px;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.quick-action-btn:active {
  transform: scale(0.96);
}

.quick-action-btn.sos {
  background: #ffebee;
  color: #e53935;
}

.quick-action-btn.record.active {
  background: #e53935;
  color: #fff;
}

.quick-action-btn.share-all.active {
  background: #00a86b;
  color: #fff;
}

/* Contacts Section */
.contacts-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #e8f5ef;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:active {
  background: #d0ebe0;
  transform: scale(0.96);
}

/* Empty State */
.empty-contacts {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  text-align: center;
  color: #999;
}

.empty-contacts svg {
  margin-bottom: 12px;
  color: #ccc;
}

.empty-contacts p {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin: 0 0 4px;
}

.empty-contacts span {
  font-size: 12px;
}

/* Contacts List */
.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
}

.contact-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00a86b 0%, #00875a 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.contact-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.contact-phone {
  font-size: 12px;
  color: #666;
}

.contact-actions {
  display: flex;
  gap: 8px;
}

.share-toggle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-toggle.active {
  background: #00a86b;
  color: #fff;
}

.share-toggle:active {
  transform: scale(0.92);
}

.remove-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:active {
  background: #ffebee;
  color: #e53935;
}

/* Safety Tips */
.safety-tips {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fff8e1;
  border-radius: 10px;
}

.tip-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffc107;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.safety-tips p {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}

/* List Animation */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #00a86b;
  background: #fff;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.modal-footer .cancel-btn {
  flex: 1;
  padding: 14px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
}

.modal-footer .save-btn {
  flex: 1;
  padding: 14px;
  background: #00a86b;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.modal-footer .save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
