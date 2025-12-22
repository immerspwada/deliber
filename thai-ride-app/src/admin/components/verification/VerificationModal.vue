<script setup lang="ts">
/**
 * VerificationModal - Provider Verification Modal
 */
defineProps<{
  item: any
  checklist: any[]
  checklistResults: Record<string, boolean>
  checklistComplete: boolean
  verificationScore: number
  notes: string
  loading: boolean
}>()

defineEmits<{
  'update:notes': [value: string]
  'toggle-item': [key: string]
  'check-all': []
  approve: []
  reject: []
  'needs-revision': []
  close: []
}>()

const getProviderName = (provider: any) => {
  if (!provider?.users) return 'ไม่ระบุชื่อ'
  const user = provider.users
  if (user.name) return user.name
  if (user.first_name) return `${user.first_name} ${user.last_name || ''}`.trim()
  return 'ไม่ระบุชื่อ'
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>ตรวจสอบเอกสาร</h2>
        <button @click="$emit('close')" class="close-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Provider Info -->
        <div class="provider-summary">
          <h3>{{ getProviderName(item.provider) }}</h3>
          <p>{{ item.provider?.provider_type === 'driver' ? 'คนขับรถ' : 'ไรเดอร์' }} - {{ item.provider?.vehicle_type }}</p>
        </div>

        <!-- Checklist -->
        <div class="checklist-section">
          <div class="checklist-header">
            <h4>รายการตรวจสอบ</h4>
            <button class="check-all-btn" @click="$emit('check-all')">เลือกทั้งหมด</button>
          </div>
          
          <div class="checklist-items">
            <label 
              v-for="checkItem in checklist" 
              :key="checkItem.key"
              class="checklist-item"
            >
              <input 
                type="checkbox" 
                :checked="checklistResults[checkItem.key]"
                @change="$emit('toggle-item', checkItem.key)"
              />
              <span class="checkmark"></span>
              <span class="item-label">
                {{ checkItem.label }}
                <span v-if="checkItem.required" class="required">*</span>
              </span>
            </label>
          </div>

          <!-- Score -->
          <div class="verification-score">
            <div class="score-bar">
              <div class="score-fill" :style="{ width: verificationScore + '%' }"></div>
            </div>
            <span class="score-text">{{ verificationScore }}%</span>
          </div>
        </div>

        <!-- Notes -->
        <div class="notes-section">
          <label>หมายเหตุ / เหตุผล</label>
          <textarea 
            :value="notes"
            @input="$emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
            placeholder="ระบุหมายเหตุหรือเหตุผล (จำเป็นสำหรับการปฏิเสธ)"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          class="btn-reject"
          @click="$emit('reject')"
          :disabled="loading"
        >
          ปฏิเสธ
        </button>
        <button 
          class="btn-revision"
          @click="$emit('needs-revision')"
          :disabled="loading"
        >
          ขอแก้ไข
        </button>
        <button 
          class="btn-approve"
          @click="$emit('approve')"
          :disabled="loading || !checklistComplete"
        >
          อนุมัติ
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E8E8E8;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #1A1A1A;
}

.modal-body {
  padding: 24px;
}

.provider-summary {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E8E8E8;
}

.provider-summary h3 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
}

.provider-summary p {
  margin: 0;
  color: #666;
}

.checklist-section {
  margin-bottom: 24px;
}

.checklist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.checklist-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.check-all-btn {
  background: none;
  border: 1px solid #00A86B;
  color: #00A86B;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.check-all-btn:hover {
  background: #E8F5EF;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  background: #F9F9F9;
  border-radius: 10px;
  transition: background 0.2s;
}

.checklist-item:hover {
  background: #F5F5F5;
}

.checklist-item input {
  display: none;
}

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.checklist-item input:checked + .checkmark {
  background: #00A86B;
  border-color: #00A86B;
}

.checklist-item input:checked + .checkmark::after {
  content: '✓';
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.item-label {
  flex: 1;
  font-size: 14px;
}

.required {
  color: #E53935;
  margin-left: 4px;
}

.verification-score {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: #E8E8E8;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: #00A86B;
  transition: width 0.3s;
}

.score-text {
  font-weight: 600;
  color: #00A86B;
  font-size: 14px;
}

.notes-section label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 14px;
}

.notes-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
}

.notes-section textarea:focus {
  outline: none;
  border-color: #00A86B;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #E8E8E8;
}

.btn-reject,
.btn-revision,
.btn-approve {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reject {
  background: #E53935;
  color: #fff;
}

.btn-reject:hover:not(:disabled) {
  background: #C62828;
}

.btn-revision {
  background: #FFC043;
  color: #1A1A1A;
}

.btn-revision:hover:not(:disabled) {
  background: #FFB020;
}

.btn-approve {
  background: #00A86B;
  color: #fff;
}

.btn-approve:hover:not(:disabled) {
  background: #008F5B;
}

.btn-approve:disabled,
.btn-reject:disabled,
.btn-revision:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-footer {
    flex-wrap: wrap;
  }

  .modal-footer button {
    flex: 1;
    min-width: 100px;
  }
}
</style>
