<script setup lang="ts">
/**
 * Feature: F208 - Bank Account Card
 * Display bank account for provider withdrawals
 */
defineProps<{
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  isDefault?: boolean
  isVerified?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSetDefault?: () => void
}>()

const bankLogos: Record<string, string> = {
  'KBANK': '#00A950',
  'SCB': '#4E2A84',
  'BBL': '#1E3A8A',
  'KTB': '#00A3E0',
  'TMB': '#0066B3',
  'BAY': '#FDB913',
  'GSB': '#E91E8C'
}

const maskAccount = (num: string) => {
  if (num.length <= 4) return num
  return '••• ' + num.slice(-4)
}
</script>

<template>
  <div class="bank-card" :class="{ default: isDefault }">
    <div class="bank-logo" :style="{ background: bankLogos[bankCode] || '#000' }">
      {{ bankCode.slice(0, 2) }}
    </div>
    <div class="bank-info">
      <div class="bank-header">
        <span class="bank-name">{{ bankName }}</span>
        <span v-if="isDefault" class="default-badge">บัญชีหลัก</span>
      </div>
      <p class="account-number">{{ maskAccount(accountNumber) }}</p>
      <p class="account-name">{{ accountName }}</p>
      <span v-if="isVerified" class="verified">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        ยืนยันแล้ว
      </span>
    </div>
    <div class="bank-actions">
      <button v-if="onSetDefault && !isDefault" type="button" class="action-btn" @click="onSetDefault" title="ตั้งเป็นบัญชีหลัก">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
      <button v-if="onEdit" type="button" class="action-btn" @click="onEdit" title="แก้ไข">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button v-if="onDelete && !isDefault" type="button" class="action-btn delete" @click="onDelete" title="ลบ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bank-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.bank-card.default { border-color: #000; }
.bank-logo { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700; }
.bank-info { flex: 1; }
.bank-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.bank-name { font-size: 14px; font-weight: 600; color: #000; }
.default-badge { font-size: 10px; font-weight: 500; color: #fff; background: #000; padding: 2px 8px; border-radius: 8px; }
.account-number { font-size: 16px; font-weight: 700; color: #000; margin: 0 0 2px; letter-spacing: 1px; }
.account-name { font-size: 12px; color: #6b6b6b; margin: 0 0 4px; }
.verified { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #10b981; }
.bank-actions { display: flex; gap: 8px; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border: none; border-radius: 8px; cursor: pointer; color: #6b6b6b; }
.action-btn:hover { background: #e5e5e5; color: #000; }
.action-btn.delete:hover { background: #fee2e2; color: #ef4444; }
</style>
