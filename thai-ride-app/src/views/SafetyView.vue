<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSafety } from '../composables/useSafety'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { emergencyContacts, fetchEmergencyContacts, addEmergencyContact, removeEmergencyContact } = useSafety()

const loading = ref(true)
const showAddModal = ref(false)
const newContact = ref({ name: '', phone: '', relationship: '' })
const saving = ref(false)

onMounted(async () => {
  await fetchEmergencyContacts()
  loading.value = false
})

const goBack = () => router.back()

const handleAddContact = async () => {
  if (!newContact.value.name || !newContact.value.phone) return
  saving.value = true
  await addEmergencyContact(newContact.value)
  newContact.value = { name: '', phone: '', relationship: '' }
  showAddModal.value = false
  saving.value = false
}

const handleRemoveContact = async (id: string) => {
  if (confirm('ต้องการลบผู้ติดต่อฉุกเฉินนี้?')) {
    await removeEmergencyContact(id)
  }
}

const callEmergency = (phone: string) => {
  window.location.href = `tel:${phone}`
}
</script>

<template>
  <div class="safety-page">
    <header class="page-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>ความปลอดภัย</h1>
      <div class="header-spacer"></div>
    </header>

    <main class="page-content">
      <!-- SOS Section -->
      <section class="sos-section">
        <div class="sos-card">
          <div class="sos-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <div class="sos-info">
            <h2>ปุ่มฉุกเฉิน SOS</h2>
            <p>กดค้างเพื่อแจ้งเหตุฉุกเฉินและแชร์ตำแหน่งกับผู้ติดต่อ</p>
          </div>
        </div>
        <button class="sos-btn" @click="callEmergency('191')">
          <span>SOS</span>
          <small>กดค้าง 3 วินาที</small>
        </button>
      </section>

      <!-- Quick Call Section -->
      <section class="quick-call-section">
        <h3 class="section-title">โทรด่วน</h3>
        <div class="quick-call-grid">
          <button class="quick-call-item" @click="callEmergency('191')">
            <div class="call-icon police">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span>ตำรวจ 191</span>
          </button>
          <button class="quick-call-item" @click="callEmergency('1669')">
            <div class="call-icon ambulance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span>ฉุกเฉิน 1669</span>
          </button>
        </div>
      </section>

      <!-- Emergency Contacts -->
      <section class="contacts-section">
        <div class="section-header">
          <h3 class="section-title">ผู้ติดต่อฉุกเฉิน</h3>
          <button class="add-btn" @click="showAddModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            เพิ่ม
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="emergencyContacts.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p>ยังไม่มีผู้ติดต่อฉุกเฉิน</p>
          <small>เพิ่มผู้ติดต่อเพื่อแจ้งเตือนในกรณีฉุกเฉิน</small>
        </div>

        <div v-else class="contacts-list">
          <div v-for="contact in emergencyContacts" :key="contact.id" class="contact-card">
            <div class="contact-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 10-16 0"/>
              </svg>
            </div>
            <div class="contact-info">
              <span class="contact-name">{{ contact.name }}</span>
              <span class="contact-phone">{{ contact.phone }}</span>
              <span v-if="contact.relationship" class="contact-rel">{{ contact.relationship }}</span>
            </div>
            <div class="contact-actions">
              <button class="call-btn" @click="callEmergency(contact.phone)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
              <button class="delete-btn" @click="handleRemoveContact(contact.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Safety Tips -->
      <section class="tips-section">
        <h3 class="section-title">เคล็ดลับความปลอดภัย</h3>
        <div class="tips-list">
          <div class="tip-item">
            <div class="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </div>
            <div class="tip-text">
              <strong>ตรวจสอบข้อมูลคนขับ</strong>
              <span>เช็คชื่อ รูป และทะเบียนรถก่อนขึ้น</span>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="tip-text">
              <strong>แชร์การเดินทาง</strong>
              <span>ส่งข้อมูลการเดินทางให้คนใกล้ชิด</span>
            </div>
          </div>
          <div class="tip-item">
            <div class="tip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="tip-text">
              <strong>นั่งที่นั่งหลัง</strong>
              <span>ปลอดภัยกว่าและมีทางออกมากกว่า</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Add Contact Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="add-modal">
        <div class="modal-header">
          <h3>เพิ่มผู้ติดต่อฉุกเฉิน</h3>
          <button @click="showAddModal = false" class="close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
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
          <label>ความสัมพันธ์ (ไม่บังคับ)</label>
          <input v-model="newContact.relationship" type="text" placeholder="เช่น พ่อ, แม่, เพื่อน" />
        </div>
        <button @click="handleAddContact" :disabled="saving || !newContact.name || !newContact.phone" class="save-btn">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safety-page {
  min-height: 100vh;
  background: #FFFFFF;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg { width: 24px; height: 24px; color: #1A1A1A; }

.page-header h1 { font-size: 18px; font-weight: 700; color: #1A1A1A; }

.header-spacer { width: 44px; }

.page-content {
  padding: 20px;
  padding-bottom: calc(40px + env(safe-area-inset-bottom));
}

/* SOS Section */
.sos-section { margin-bottom: 24px; }

.sos-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FEF2F2;
  border-radius: 16px;
  margin-bottom: 16px;
}

.sos-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E53935;
  border-radius: 12px;
}

.sos-icon svg { width: 24px; height: 24px; color: white; }

.sos-info h2 { font-size: 16px; font-weight: 700; color: #1A1A1A; margin: 0 0 4px; }
.sos-info p { font-size: 13px; color: #666666; margin: 0; }

.sos-btn {
  width: 100%;
  padding: 20px;
  background: #E53935;
  color: white;
  border: none;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.sos-btn span { font-size: 24px; font-weight: 700; }
.sos-btn small { font-size: 12px; opacity: 0.8; }
.sos-btn:active { transform: scale(0.98); }

/* Quick Call */
.quick-call-section { margin-bottom: 24px; }

.section-title { font-size: 16px; font-weight: 700; color: #1A1A1A; margin: 0 0 12px; }

.quick-call-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

.quick-call-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: #F5F5F5;
  border: none;
  border-radius: 16px;
  cursor: pointer;
}

.quick-call-item:active { background: #E8E8E8; }

.call-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.call-icon svg { width: 24px; height: 24px; color: white; }
.call-icon.police { background: #1E40AF; }
.call-icon.ambulance { background: #E53935; }

.quick-call-item span { font-size: 14px; font-weight: 600; color: #1A1A1A; }

/* Contacts Section */
.contacts-section { margin-bottom: 24px; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.add-btn svg { width: 16px; height: 16px; }
.add-btn:active { opacity: 0.9; }

.loading-state { display: flex; justify-content: center; padding: 40px; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background: #F5F5F5;
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8E8E8;
  border-radius: 50%;
  margin-bottom: 12px;
}

.empty-icon svg { width: 28px; height: 28px; color: #999999; }
.empty-state p { font-size: 15px; font-weight: 600; color: #1A1A1A; margin: 0 0 4px; }
.empty-state small { font-size: 13px; color: #666666; }

.contacts-list { display: flex; flex-direction: column; gap: 10px; }

.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border-radius: 14px;
}

.contact-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 50%;
}

.contact-avatar svg { width: 22px; height: 22px; color: #666666; }

.contact-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.contact-name { font-size: 15px; font-weight: 600; color: #1A1A1A; }
.contact-phone { font-size: 13px; color: #666666; }
.contact-rel { font-size: 12px; color: #999999; }

.contact-actions { display: flex; gap: 8px; }

.call-btn, .delete-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

.call-btn { background: #00A86B; }
.call-btn svg { width: 18px; height: 18px; color: white; }
.delete-btn { background: #FEE2E2; }
.delete-btn svg { width: 18px; height: 18px; color: #E53935; }

/* Tips Section */
.tips-section { margin-bottom: 24px; }

.tips-list { display: flex; flex-direction: column; gap: 12px; }

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #F5F5F5;
  border-radius: 14px;
}

.tip-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 10px;
  flex-shrink: 0;
}

.tip-icon svg { width: 20px; height: 20px; color: #00A86B; }

.tip-text { display: flex; flex-direction: column; gap: 2px; }
.tip-text strong { font-size: 14px; font-weight: 600; color: #1A1A1A; }
.tip-text span { font-size: 13px; color: #666666; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.add-modal {
  background: #FFFFFF;
  width: 100%;
  max-width: 480px;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 { font-size: 20px; font-weight: 700; color: #1A1A1A; }

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg { width: 20px; height: 20px; color: #1A1A1A; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; color: #1A1A1A; margin-bottom: 8px; }
.form-group input {
  width: 100%;
  padding: 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}
.form-group input:focus { outline: none; border-color: #00A86B; }

.save-btn {
  width: 100%;
  padding: 18px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
}

.save-btn:disabled { opacity: 0.6; }
</style>
