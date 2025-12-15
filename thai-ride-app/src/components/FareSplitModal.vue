<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  show: boolean
  totalAmount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'split', participants: { phone: string; amount: number }[]): void
}>()

interface Participant {
  id: string
  phone: string
  amount: number
}

const splitType = ref<'equal' | 'custom'>('equal')
const participants = ref<Participant[]>([
  { id: '1', phone: '', amount: 0 }
])

const myShare = computed(() => {
  const othersTotal = participants.value.reduce((sum, p) => sum + p.amount, 0)
  return Math.max(0, props.totalAmount - othersTotal)
})

const perPersonAmount = computed(() => {
  const count = participants.value.length + 1
  return Math.ceil(props.totalAmount / count)
})

watch(() => splitType.value, (type) => {
  if (type === 'equal') {
    participants.value = participants.value.map(p => ({
      ...p,
      amount: perPersonAmount.value
    }))
  }
})

watch(() => participants.value.length, () => {
  if (splitType.value === 'equal') {
    participants.value = participants.value.map(p => ({
      ...p,
      amount: perPersonAmount.value
    }))
  }
})

const addParticipant = () => {
  if (participants.value.length >= 4) return
  participants.value.push({
    id: `p-${Date.now()}`,
    phone: '',
    amount: splitType.value === 'equal' ? perPersonAmount.value : 0
  })
}

const removeParticipant = (index: number) => {
  participants.value.splice(index, 1)
}

const updatePhone = (index: number, phone: string) => {
  if (participants.value[index]) {
    participants.value[index].phone = phone
  }
}

const updateAmount = (index: number, amount: number) => {
  if (participants.value[index]) {
    participants.value[index].amount = amount
  }
}

const handleSplit = () => {
  const validParticipants = participants.value.filter(p => p.phone.length >= 10)
  if (validParticipants.length === 0) return
  emit('split', validParticipants.map(p => ({ phone: p.phone, amount: p.amount })))
}

const isValid = computed(() => {
  return participants.value.some(p => p.phone.length >= 10)
})
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>แบ่งค่าโดยสาร</h3>
        <button @click="emit('close')" class="close-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="total-display">
          <span class="total-label">ยอดรวม</span>
          <span class="total-amount">฿{{ totalAmount }}</span>
        </div>

        <div class="split-type-toggle">
          <button
            :class="['type-btn', { active: splitType === 'equal' }]"
            @click="splitType = 'equal'"
          >
            แบ่งเท่ากัน
          </button>
          <button
            :class="['type-btn', { active: splitType === 'custom' }]"
            @click="splitType = 'custom'"
          >
            กำหนดเอง
          </button>
        </div>

        <div class="participants-section">
          <div class="my-share">
            <div class="share-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="share-info">
              <span class="share-name">คุณ</span>
              <span class="share-amount">฿{{ splitType === 'equal' ? perPersonAmount : myShare }}</span>
            </div>
          </div>

          <div v-for="(participant, index) in participants" :key="participant.id" class="participant-row">
            <div class="participant-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="participant-inputs">
              <input
                :value="participant.phone"
                @input="updatePhone(index, ($event.target as HTMLInputElement).value)"
                type="tel"
                placeholder="เบอร์โทรศัพท์"
                class="phone-input"
              />
              <div v-if="splitType === 'custom'" class="amount-input-wrap">
                <span class="currency">฿</span>
                <input
                  :value="participant.amount"
                  @input="updateAmount(index, Number(($event.target as HTMLInputElement).value))"
                  type="number"
                  class="amount-input"
                />
              </div>
              <span v-else class="fixed-amount">฿{{ perPersonAmount }}</span>
            </div>
            <button @click="removeParticipant(index)" class="remove-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>

          <button
            v-if="participants.length < 4"
            @click="addParticipant"
            class="add-participant-btn"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            เพิ่มคน
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="emit('close')" class="btn-secondary">ยกเลิก</button>
        <button @click="handleSplit" :disabled="!isValid" class="btn-primary">
          ส่งคำขอแบ่งจ่าย
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 20px;
}

.total-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 20px;
}

.total-label {
  font-size: 14px;
  color: #6b6b6b;
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
}

.split-type-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.type-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn.active {
  border-color: #000;
  background: #000;
  color: #fff;
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-share {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
}

.share-icon {
  width: 40px;
  height: 40px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.share-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.share-name {
  font-size: 14px;
  font-weight: 500;
}

.share-amount {
  font-size: 16px;
  font-weight: 600;
}

.participant-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.participant-icon {
  width: 40px;
  height: 40px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.participant-icon svg {
  width: 20px;
  height: 20px;
  color: #6b6b6b;
}

.participant-inputs {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.phone-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
}

.phone-input:focus {
  outline: none;
  border-color: #000;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  width: 100px;
}

.currency {
  font-size: 14px;
  color: #6b6b6b;
}

.amount-input {
  width: 60px;
  border: none;
  font-size: 14px;
  font-weight: 500;
}

.amount-input:focus {
  outline: none;
}

.fixed-amount {
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.remove-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
}

.remove-btn svg {
  width: 18px;
  height: 18px;
}

.add-participant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: 2px dashed #e5e5e5;
  border-radius: 12px;
  background: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.add-participant-btn:hover {
  border-color: #000;
  color: #000;
}

.add-participant-btn svg {
  width: 20px;
  height: 20px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e5e5;
}

.btn-secondary {
  flex: 1;
  padding: 14px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
}

.btn-primary {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  background: #000;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
