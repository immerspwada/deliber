<script setup lang="ts">
/**
 * Feature: F352 - Provider Bank Form
 * Bank account form for provider withdrawals
 */
import { ref, watch } from 'vue'

interface BankAccount {
  bankCode: string
  accountNumber: string
  accountName: string
  isDefault: boolean
}

const props = defineProps<{ account?: BankAccount; loading?: boolean }>()
const emit = defineEmits<{ (e: 'save', account: BankAccount): void }>()

const form = ref<BankAccount>({
  bankCode: props.account?.bankCode || '',
  accountNumber: props.account?.accountNumber || '',
  accountName: props.account?.accountName || '',
  isDefault: props.account?.isDefault ?? true
})

watch(() => props.account, (v) => { if (v) form.value = { ...v } }, { deep: true })

const banks = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', color: '#1e3a8a' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', color: '#22c55e' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', color: '#0ea5e9' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', color: '#7c3aed' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', color: '#eab308' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต', color: '#f97316' },
  { code: 'GSB', name: 'ธนาคารออมสิน', color: '#ec4899' },
  { code: 'BAAC', name: 'ธ.ก.ส.', color: '#84cc16' }
]

const selectedBank = () => banks.find(b => b.code === form.value.bankCode)
</script>

<template>
  <div class="provider-bank-form">
    <h3 class="form-title">บัญชีธนาคาร</h3>
    
    <div class="bank-selector">
      <button v-for="bank in banks" :key="bank.code" type="button" class="bank-btn" :class="{ active: form.bankCode === bank.code }" @click="form.bankCode = bank.code">
        <span class="bank-dot" :style="{ background: bank.color }"></span>
        <span class="bank-name">{{ bank.name }}</span>
      </button>
    </div>

    <div class="form-fields">
      <div class="form-group">
        <label class="form-label">เลขบัญชี</label>
        <input v-model="form.accountNumber" type="text" class="form-input" placeholder="xxx-x-xxxxx-x" maxlength="15" />
      </div>
      <div class="form-group">
        <label class="form-label">ชื่อบัญชี</label>
        <input v-model="form.accountName" type="text" class="form-input" placeholder="ชื่อ-นามสกุล ตามบัญชี" />
      </div>
      <label class="default-toggle">
        <input v-model="form.isDefault" type="checkbox" />
        <span>ตั้งเป็นบัญชีหลัก</span>
      </label>
    </div>

    <div v-if="selectedBank() && form.accountNumber && form.accountName" class="preview-card">
      <div class="preview-header" :style="{ background: selectedBank()?.color }">
        <span class="preview-bank">{{ selectedBank()?.name }}</span>
      </div>
      <div class="preview-body">
        <div class="preview-row">
          <span class="preview-label">เลขบัญชี</span>
          <span class="preview-value">{{ form.accountNumber }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">ชื่อบัญชี</span>
          <span class="preview-value">{{ form.accountName }}</span>
        </div>
      </div>
    </div>

    <button type="button" class="save-btn" :disabled="loading || !form.bankCode || !form.accountNumber || !form.accountName" @click="emit('save', form)">
      {{ loading ? 'กำลังบันทึก...' : 'บันทึกบัญชี' }}
    </button>
  </div>
</template>

<style scoped>
.provider-bank-form { background: #fff; border-radius: 12px; padding: 20px; }
.form-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 16px; }
.bank-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
.bank-btn { display: flex; align-items: center; gap: 8px; padding: 12px; background: #f6f6f6; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; }
.bank-btn:hover { background: #e5e5e5; }
.bank-btn.active { border-color: #000; background: #fff; }
.bank-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.bank-name { font-size: 12px; color: #000; }
.form-fields { margin-bottom: 20px; }
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: #000; margin-bottom: 6px; }
.form-input { width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-input:focus { outline: none; border-color: #000; }
.default-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #000; cursor: pointer; }
.default-toggle input { width: 18px; height: 18px; accent-color: #000; }
.preview-card { border-radius: 12px; overflow: hidden; margin-bottom: 20px; border: 1px solid #e5e5e5; }
.preview-header { padding: 12px 16px; color: #fff; font-size: 13px; font-weight: 500; }
.preview-body { padding: 16px; }
.preview-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.preview-row:last-child { margin-bottom: 0; }
.preview-label { font-size: 13px; color: #6b6b6b; }
.preview-value { font-size: 14px; font-weight: 500; color: #000; }
.save-btn { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; }
.save-btn:disabled { background: #ccc; cursor: not-allowed; }
</style>
