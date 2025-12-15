<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSafety } from '../composables/useSafety'

const props = defineProps<{
  rideId: string
  show: boolean
  currentLocation?: { lat: number; lng: number }
}>()

const emit = defineEmits<{
  close: []
}>()

const { 
  emergencyContacts, 
  fetchEmergencyContacts, 
  addEmergencyContact,
  removeEmergencyContact,
  shareTrip, 
  triggerSOS, 
  callEmergency 
} = useSafety()

const activeTab = ref<'share' | 'sos' | 'contacts'>('share')
const sharePhone = ref('')
const shareEmail = ref('')
const shareLink = ref('')
const showShareSuccess = ref(false)

// Add contact form
const showAddContact = ref(false)
const newContact = ref({
  name: '',
  phone: '',
  relationship: '',
  is_primary: false
})
const savingContact = ref(false)

const relationshipOptions = [
  'พ่อ/แม่',
  'สามี/ภรรยา',
  'พี่/น้อง',
  'เพื่อน',
  'อื่นๆ'
]

const handleAddContact = async () => {
  if (!newContact.value.name || !newContact.value.phone) return
  
  savingContact.value = true
  await addEmergencyContact({
    name: newContact.value.name,
    phone: newContact.value.phone,
    relationship: newContact.value.relationship || 'อื่นๆ',
    is_primary: newContact.value.is_primary
  })
  
  // Reset form
  newContact.value = { name: '', phone: '', relationship: '', is_primary: false }
  showAddContact.value = false
  savingContact.value = false
}

const handleDeleteContact = async (id: string) => {
  if (confirm('ต้องการลบผู้ติดต่อนี้?')) {
    await removeEmergencyContact(id)
  }
}

const handleShare = async () => {
  const result = await shareTrip(props.rideId, sharePhone.value, shareEmail.value)
  if (result) {
    shareLink.value = result.shareUrl
    showShareSuccess.value = true
    
    // Copy to clipboard
    navigator.clipboard?.writeText(result.shareUrl)
  }
}

const handleSOS = async () => {
  if (confirm('คุณต้องการส่งสัญญาณ SOS หรือไม่?\n\nระบบจะแจ้งเตือนไปยังผู้ติดต่อฉุกเฉินและศูนย์ช่วยเหลือ')) {
    await triggerSOS(props.rideId, props.currentLocation || { lat: 0, lng: 0 })
  }
}

const copyLink = () => {
  navigator.clipboard?.writeText(shareLink.value)
  alert('คัดลอกลิงก์แล้ว')
}

onMounted(() => {
  fetchEmergencyContacts()
})
</script>

<template>
  <div v-if="show" class="safety-overlay" @click.self="emit('close')">
    <div class="safety-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2>ความปลอดภัย</h2>
        <button @click="emit('close')" class="close-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          @click="activeTab = 'share'" 
          :class="['tab', { active: activeTab === 'share' }]"
        >
          แชร์การเดินทาง
        </button>
        <button 
          @click="activeTab = 'sos'" 
          :class="['tab', { active: activeTab === 'sos' }]"
        >
          SOS
        </button>
        <button 
          @click="activeTab = 'contacts'" 
          :class="['tab', { active: activeTab === 'contacts' }]"
        >
          ผู้ติดต่อ
        </button>
      </div>

      <!-- Share Tab -->
      <div v-if="activeTab === 'share'" class="tab-content">
        <div v-if="!showShareSuccess" class="share-form">
          <p class="share-desc">แชร์ตำแหน่งการเดินทางให้คนที่คุณรักติดตามได้</p>
          
          <div class="form-group">
            <label>เบอร์โทรศัพท์</label>
            <input v-model="sharePhone" type="tel" placeholder="081-234-5678" />
          </div>
          
          <div class="form-group">
            <label>หรืออีเมล</label>
            <input v-model="shareEmail" type="email" placeholder="email@example.com" />
          </div>
          
          <button @click="handleShare" class="btn-primary">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
            </svg>
            แชร์การเดินทาง
          </button>
        </div>

        <div v-else class="share-success">
          <div class="success-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h3>แชร์สำเร็จ!</h3>
          <p>ลิงก์ติดตามการเดินทาง:</p>
          <div class="link-box">
            <span>{{ shareLink }}</span>
            <button @click="copyLink" class="copy-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
          <button @click="showShareSuccess = false" class="btn-secondary">แชร์อีกครั้ง</button>
        </div>
      </div>

      <!-- SOS Tab -->
      <div v-if="activeTab === 'sos'" class="tab-content">
        <div class="sos-section">
          <button @click="handleSOS" class="sos-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>SOS ฉุกเฉิน</span>
          </button>
          <p class="sos-desc">กดเพื่อแจ้งเหตุฉุกเฉินไปยังผู้ติดต่อและศูนย์ช่วยเหลือ</p>
        </div>

        <div class="emergency-numbers">
          <h4>เบอร์ฉุกเฉิน</h4>
          <div class="number-grid">
            <button @click="callEmergency('police')" class="number-btn">
              <span class="number">191</span>
              <span class="label">ตำรวจ</span>
            </button>
            <button @click="callEmergency('ambulance')" class="number-btn">
              <span class="number">1669</span>
              <span class="label">รถพยาบาล</span>
            </button>
            <button @click="callEmergency('fire')" class="number-btn">
              <span class="number">199</span>
              <span class="label">ดับเพลิง</span>
            </button>
            <button @click="callEmergency('tourist')" class="number-btn">
              <span class="number">1155</span>
              <span class="label">ท่องเที่ยว</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Contacts Tab -->
      <div v-if="activeTab === 'contacts'" class="tab-content">
        <!-- Add Contact Form -->
        <div v-if="showAddContact" class="add-contact-form">
          <div class="form-header">
            <h4>เพิ่มผู้ติดต่อฉุกเฉิน</h4>
            <button @click="showAddContact = false" class="close-form-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="form-group">
            <label>ชื่อ</label>
            <input v-model="newContact.name" type="text" placeholder="ชื่อผู้ติดต่อ" />
          </div>
          
          <div class="form-group">
            <label>เบอร์โทรศัพท์</label>
            <input v-model="newContact.phone" type="tel" placeholder="081-234-5678" />
          </div>
          
          <div class="form-group">
            <label>ความสัมพันธ์</label>
            <div class="relationship-options">
              <button 
                v-for="rel in relationshipOptions" 
                :key="rel"
                @click="newContact.relationship = rel"
                :class="['rel-btn', { active: newContact.relationship === rel }]"
              >
                {{ rel }}
              </button>
            </div>
          </div>
          
          <label class="checkbox-label">
            <input v-model="newContact.is_primary" type="checkbox" />
            <span>ตั้งเป็นผู้ติดต่อหลัก</span>
          </label>
          
          <button 
            @click="handleAddContact" 
            :disabled="!newContact.name || !newContact.phone || savingContact"
            class="btn-primary"
          >
            {{ savingContact ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="emergencyContacts.length === 0" class="empty-contacts">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p>ยังไม่มีผู้ติดต่อฉุกเฉิน</p>
          <button @click="showAddContact = true" class="btn-secondary">เพิ่มผู้ติดต่อ</button>
        </div>

        <!-- Contacts List -->
        <div v-else>
          <div class="contacts-list">
            <div v-for="contact in emergencyContacts" :key="contact.id" class="contact-item">
              <div class="contact-info">
                <span class="contact-name">{{ contact.name }}</span>
                <span class="contact-phone">{{ contact.phone }}</span>
                <span class="contact-rel">{{ contact.relationship }}</span>
                <span v-if="contact.is_primary" class="primary-badge">หลัก</span>
              </div>
              <div class="contact-actions">
                <a :href="`tel:${contact.phone}`" class="call-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </a>
                <button @click="handleDeleteContact(contact.id)" class="delete-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button @click="showAddContact = true" class="btn-add-more">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            เพิ่มผู้ติดต่อ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safety-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.safety-modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #E5E5E5;
}

.tab {
  flex: 1;
  padding: 14px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #000;
  border-bottom-color: #000;
}

.tab-content {
  padding: 20px;
}

/* Share */
.share-desc {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.form-group input:focus {
  border-color: #000;
}

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.btn-secondary {
  width: 100%;
  padding: 14px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.share-success {
  text-align: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  background: #E8F5E9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.success-icon svg {
  width: 32px;
  height: 32px;
  color: #05944F;
}

.share-success h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.share-success p {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 12px;
}

.link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.link-box span {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copy-btn {
  width: 36px;
  height: 36px;
  background: #fff;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.copy-btn svg {
  width: 18px;
  height: 18px;
}

/* SOS */
.sos-section {
  text-align: center;
  margin-bottom: 24px;
}

.sos-btn {
  width: 120px;
  height: 120px;
  background: #FEE2E2;
  border: none;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto 12px;
  cursor: pointer;
  color: #E11900;
}

.sos-btn svg {
  width: 40px;
  height: 40px;
}

.sos-btn span {
  font-size: 16px;
  font-weight: 700;
}

.sos-desc {
  font-size: 13px;
  color: #6B6B6B;
}

.emergency-numbers h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.number-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.number-btn .number {
  font-size: 24px;
  font-weight: 700;
}

.number-btn .label {
  font-size: 12px;
  color: #6B6B6B;
}

/* Contacts */
.empty-contacts {
  text-align: center;
  padding: 24px;
  color: #6B6B6B;
}

.empty-contacts svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.empty-contacts p {
  margin-bottom: 16px;
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 12px;
}

.contact-info {
  display: flex;
  flex-direction: column;
}

.contact-name {
  font-size: 15px;
  font-weight: 500;
}

.contact-phone {
  font-size: 13px;
  color: #6B6B6B;
}

.primary-badge {
  font-size: 11px;
  color: #276EF1;
  margin-top: 2px;
}

.call-btn {
  width: 44px;
  height: 44px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

/* Add Contact Form */
.add-contact-form {
  padding-bottom: 20px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-header h4 {
  font-size: 16px;
  font-weight: 600;
}

.close-form-btn {
  width: 32px;
  height: 32px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-form-btn svg {
  width: 18px;
  height: 18px;
}

.relationship-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rel-btn {
  padding: 8px 14px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

.rel-btn.active {
  border-color: #000;
  background: #fff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: #000;
}

.contact-rel {
  font-size: 12px;
  color: #6B6B6B;
}

.contact-actions {
  display: flex;
  gap: 8px;
}

.delete-btn {
  width: 44px;
  height: 44px;
  background: #FEE2E2;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.delete-btn svg {
  width: 20px;
  height: 20px;
  color: #E11900;
}

.btn-add-more {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  margin-top: 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-add-more svg {
  width: 20px;
  height: 20px;
}
</style>
