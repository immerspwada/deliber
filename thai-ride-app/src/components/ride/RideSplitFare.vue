<script setup lang="ts">
/**
 * Component: RideSplitFare
 * แชร์ค่าโดยสารกับเพื่อน - ส่งลิงก์เชิญเข้าร่วมการเดินทาง
 */
import { ref, computed, watch } from 'vue'

interface SplitMember {
  id: string
  name: string
  phone?: string
  email?: string
  status: 'pending' | 'accepted' | 'declined' | 'paid'
  amount: number
  inviteLink?: string
}

const props = defineProps<{
  rideId: string
  totalFare: number
  currentUserId: string
  currentUserName: string
}>()

const emit = defineEmits<{
  'update:members': [members: SplitMember[]]
  'split-confirmed': [splitDetails: { members: SplitMember[]; myShare: number }]
}>()

const showSplitModal = ref(false)
const members = ref<SplitMember[]>([])
const newMemberPhone = ref('')
const splitType = ref<'equal' | 'custom'>('equal')
const isInviting = ref(false)

// Calculate shares
const myShare = computed(() => {
  if (members.value.length === 0) return props.totalFare
  
  if (splitType.value === 'equal') {
    return Math.ceil(props.totalFare / (members.value.length + 1))
  }
  
  const othersTotal = members.value.reduce((sum, m) => sum + m.amount, 0)
  return props.totalFare - othersTotal
})

const perPersonShare = computed(() => {
  return Math.ceil(props.totalFare / (members.value.length + 1))
})

// Watch for equal split
watch([() => members.value.length, splitType], () => {
  if (splitType.value === 'equal') {
    members.value.forEach(m => {
      m.amount = perPersonShare.value
    })
  }
})

function openSplitModal(): void {
  showSplitModal.value = true
}

function closeSplitModal(): void {
  showSplitModal.value = false
}

async function inviteMember(): Promise<void> {
  if (!newMemberPhone.value || newMemberPhone.value.length < 10) {
    alert('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง')
    return
  }

  isInviting.value = true

  // Generate invite link
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const inviteLink = `${window.location.origin}/join-ride/${props.rideId}?code=${inviteCode}`

  // Add member
  const newMember: SplitMember = {
    id: `member-${Date.now()}`,
    name: `เพื่อน (${newMemberPhone.value.slice(-4)})`,
    phone: newMemberPhone.value,
    status: 'pending',
    amount: perPersonShare.value,
    inviteLink
  }

  members.value.push(newMember)
  
  // Send invite via LINE
  const message = encodeURIComponent(
    `🚗 ${props.currentUserName} เชิญคุณร่วมเดินทาง\n💰 ค่าโดยสารของคุณ: ฿${perPersonShare.value}\n👉 กดลิงก์เพื่อยืนยัน: ${inviteLink}`
  )
  
  // Open LINE share
  window.open(`https://line.me/R/share?text=${message}`, '_blank')

  newMemberPhone.value = ''
  isInviting.value = false

  emit('update:members', members.value)
}

function removeMember(index: number): void {
  members.value.splice(index, 1)
  emit('update:members', members.value)
}

function updateMemberAmount(index: number, amount: number): void {
  if (splitType.value === 'custom' && members.value[index]) {
    members.value[index].amount = Math.max(0, Math.min(props.totalFare, amount))
  }
}

function confirmSplit(): void {
  emit('split-confirmed', {
    members: members.value,
    myShare: myShare.value
  })
  closeSplitModal()
}

function resendInvite(member: SplitMember): void {
  if (!member.inviteLink) return
  
  const message = encodeURIComponent(
    `🚗 ${props.currentUserName} เชิญคุณร่วมเดินทาง\n💰 ค่าโดยสารของคุณ: ฿${member.amount}\n👉 กดลิงก์เพื่อยืนยัน: ${member.inviteLink}`
  )
  
  window.open(`https://line.me/R/share?text=${message}`, '_blank')
}

function getStatusText(status: SplitMember['status']): string {
  const texts: Record<SplitMember['status'], string> = {
    pending: 'รอตอบรับ',
    accepted: 'ยืนยันแล้ว',
    declined: 'ปฏิเสธ',
    paid: 'ชำระแล้ว'
  }
  return texts[status]
}

function getStatusColor(status: SplitMember['status']): string {
  const colors: Record<SplitMember['status'], string> = {
    pending: '#f57c00',
    accepted: '#00a86b',
    declined: '#e53935',
    paid: '#1976d2'
  }
  return colors[status]
}
</script>

<template>
  <div class="split-fare">
    <!-- Split Button -->
    <button class="split-btn" @click="openSplitModal">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
      <span>แบ่งจ่าย</span>
      <span v-if="members.length > 0" class="member-count">{{ members.length }}</span>
    </button>

    <!-- Active Split Summary -->
    <div v-if="members.length > 0" class="split-summary">
      <div class="summary-row">
        <span>ส่วนของคุณ</span>
        <span class="my-share">฿{{ myShare.toLocaleString() }}</span>
      </div>
      <div class="summary-members">
        <div 
          v-for="member in members" 
          :key="member.id" 
          class="member-chip"
          :style="{ borderColor: getStatusColor(member.status) }"
        >
          <span class="member-name">{{ member.name }}</span>
          <span class="member-status" :style="{ color: getStatusColor(member.status) }">
            {{ getStatusText(member.status) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Split Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSplitModal" class="modal-overlay" @click="closeSplitModal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>แบ่งจ่ายค่าโดยสาร</h3>
              <button class="close-btn" @click="closeSplitModal" aria-label="ปิด">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Total Fare -->
            <div class="fare-display">
              <span class="fare-label">ค่าโดยสารทั้งหมด</span>
              <span class="fare-amount">฿{{ totalFare.toLocaleString() }}</span>
            </div>

            <!-- Split Type -->
            <div class="split-type-selector">
              <button 
                class="type-btn" 
                :class="{ active: splitType === 'equal' }"
                @click="splitType = 'equal'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                แบ่งเท่ากัน
              </button>
              <button 
                class="type-btn" 
                :class="{ active: splitType === 'custom' }"
                @click="splitType = 'custom'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V10M18 20V4M6 20v-4" />
                </svg>
                กำหนดเอง
              </button>
            </div>

            <!-- My Share -->
            <div class="my-share-card">
              <div class="share-icon you">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <div class="share-info">
                <span class="share-name">คุณ</span>
                <span class="share-status">เจ้าของการเดินทาง</span>
              </div>
              <span class="share-amount">฿{{ myShare.toLocaleString() }}</span>
            </div>

            <!-- Members List -->
            <div class="members-section">
              <div class="section-header">
                <span>เพื่อนร่วมเดินทาง</span>
                <span class="member-count-label">{{ members.length }} คน</span>
              </div>

              <TransitionGroup name="list" tag="div" class="members-list">
                <div v-for="(member, index) in members" :key="member.id" class="member-card">
                  <div class="share-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                  </div>
                  <div class="share-info">
                    <span class="share-name">{{ member.name }}</span>
                    <span 
                      class="share-status" 
                      :style="{ color: getStatusColor(member.status) }"
                    >
                      {{ getStatusText(member.status) }}
                    </span>
                  </div>
                  
                  <!-- Amount (editable in custom mode) -->
                  <div v-if="splitType === 'custom'" class="amount-input">
                    <span>฿</span>
                    <input 
                      type="number" 
                      :value="member.amount"
                      @input="updateMemberAmount(index, Number(($event.target as HTMLInputElement).value))"
                    />
                  </div>
                  <span v-else class="share-amount">฿{{ member.amount.toLocaleString() }}</span>

                  <div class="member-actions">
                    <button 
                      v-if="member.status === 'pending'" 
                      class="resend-btn"
                      @click="resendInvite(member)"
                      title="ส่งคำเชิญอีกครั้ง"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    </button>
                    <button class="remove-btn" @click="removeMember(index)" aria-label="ลบ">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </TransitionGroup>

              <!-- Add Member -->
              <div class="add-member">
                <input
                  v-model="newMemberPhone"
                  type="tel"
                  placeholder="เบอร์โทรเพื่อน"
                  maxlength="10"
                />
                <button 
                  class="invite-btn" 
                  @click="inviteMember"
                  :disabled="isInviting || newMemberPhone.length < 10"
                >
                  <svg v-if="!isInviting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  <span v-if="isInviting">กำลังส่ง...</span>
                  <span v-else>เชิญผ่าน LINE</span>
                </button>
              </div>
            </div>

            <!-- Confirm Button -->
            <button 
              class="confirm-btn"
              :disabled="members.length === 0"
              @click="confirmSplit"
            >
              ยืนยันการแบ่งจ่าย
            </button>

            <p class="modal-note">
              * เพื่อนจะได้รับลิงก์ผ่าน LINE เพื่อยืนยันการร่วมจ่าย
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.split-fare {
  margin: 12px 0;
}

.split-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.split-btn:active {
  background: #f5f5f5;
}

.split-btn svg {
  color: #00a86b;
}

.member-count {
  background: #00a86b;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Split Summary */
.split-summary {
  margin-top: 12px;
  padding: 12px;
  background: #e8f5ef;
  border-radius: 10px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-row span:first-child {
  font-size: 13px;
  color: #666;
}

.my-share {
  font-size: 16px;
  font-weight: 700;
  color: #00a86b;
}

.summary-members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #fff;
  border: 1px solid;
  border-radius: 20px;
  font-size: 12px;
}

.member-name {
  color: #1a1a1a;
}

.member-status {
  font-weight: 500;
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
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

/* Fare Display */
.fare-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
}

.fare-label {
  font-size: 14px;
  color: #666;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

/* Split Type */
.split-type-selector {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn.active {
  background: #e8f5ef;
  border-color: #00a86b;
  color: #00a86b;
}

/* Share Cards */
.my-share-card,
.member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.share-icon {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.share-icon.you {
  background: #00a86b;
  color: #fff;
}

.share-info {
  flex: 1;
}

.share-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.share-status {
  display: block;
  font-size: 12px;
  color: #666;
}

.share-amount {
  font-size: 16px;
  font-weight: 600;
  color: #00a86b;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.amount-input span {
  color: #666;
}

.amount-input input {
  width: 60px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  outline: none;
}

.member-actions {
  display: flex;
  gap: 4px;
}

.resend-btn,
.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.remove-btn {
  color: #e53935;
}

/* Members Section */
.members-section {
  padding: 16px 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header span:first-child {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.member-count-label {
  font-size: 12px;
  color: #666;
}

.members-list {
  margin-bottom: 16px;
}

/* Add Member */
.add-member {
  display: flex;
  gap: 8px;
}

.add-member input {
  flex: 1;
  padding: 12px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
}

.invite-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #00B900;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.invite-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Confirm Button */
.confirm-btn {
  width: calc(100% - 40px);
  margin: 16px 20px;
  padding: 16px;
  background: #00a86b;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.confirm-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.modal-note {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 0 20px 16px;
  margin: 0;
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
