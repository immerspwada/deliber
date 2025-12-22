<script setup lang="ts">
/**
 * Admin Payment Settings View - ตั้งค่า PromptPay ID และบัญชีธนาคาร
 */
import { ref, onMounted } from 'vue'
import { usePaymentSettings } from '../../composables/usePaymentSettings'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()
const { settings, loading, fetchAllSettings, updateSetting, getSettingLabel } = usePaymentSettings()

const isLoading = ref(true)
const isSaving = ref(false)
const editedSettings = ref<Record<string, string>>({})
const resultMessage = ref({ show: false, success: false, text: '' })

async function loadSettings() {
  isLoading.value = true
  await fetchAllSettings()
  settings.value.forEach(s => { editedSettings.value[s.setting_key] = s.setting_value })
  isLoading.value = false
}

async function saveSetting(key: string) {
  const newValue = editedSettings.value[key]
  const original = settings.value.find(s => s.setting_key === key)
  if (original && original.setting_value === newValue) { showResult(false, 'ไม่มีการเปลี่ยนแปลง'); return }
  isSaving.value = true
  const result = await updateSetting(key, newValue)
  isSaving.value = false
  showResult(result.success, result.message)
}

async function saveAllSettings() {
  isSaving.value = true
  let successCount = 0, failCount = 0
  for (const setting of settings.value) {
    const newValue = editedSettings.value[setting.setting_key]
    if (setting.setting_value !== newValue) {
      const result = await updateSetting(setting.setting_key, newValue)
      if (result.success) successCount++; else failCount++
    }
  }
  isSaving.value = false
  if (successCount === 0 && failCount === 0) showResult(false, 'ไม่มีการเปลี่ยนแปลง')
  else if (failCount === 0) showResult(true, `บันทึกสำเร็จ ${successCount} รายการ`)
  else showResult(false, `สำเร็จ ${successCount}, ล้มเหลว ${failCount}`)
}

function showResult(success: boolean, text: string) {
  resultMessage.value = { show: true, success, text }
  setTimeout(() => { resultMessage.value.show = false }, 4000)
}

onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Finance' }, { label: 'Payment Settings' }]); loadSettings() })
</script>

<template>
  <div class="payment-settings-view">
    <div class="page-header">
      <div class="header-left"><h1>Payment Settings</h1><span class="subtitle">ตั้งค่าการรับชำระเงิน</span></div>
      <div class="header-actions">
        <button class="refresh-btn" @click="loadSettings" :disabled="isLoading"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button>
        <button class="save-all-btn" @click="saveAllSettings" :disabled="isSaving || isLoading"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>{{ isSaving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด' }}</button>
      </div>
    </div>
    <div v-if="resultMessage.show" :class="['result-toast', resultMessage.success ? 'success' : 'error']">{{ resultMessage.text }}</div>
    <div v-if="isLoading" class="loading-state"><div class="skeleton" v-for="i in 8" :key="i" /></div>
    <div v-else class="settings-grid">
      <div class="settings-section">
        <div class="section-header"><div class="section-icon promptpay"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg></div><div><h2>พร้อมเพย์ (PromptPay)</h2><p>ข้อมูลสำหรับรับเงินผ่านพร้อมเพย์</p></div></div>
        <div class="settings-fields">
          <div v-for="setting in settings.filter(s => s.setting_key.includes('promptpay'))" :key="setting.id" class="field-group">
            <label>{{ getSettingLabel(setting.setting_key) }}</label>
            <div class="input-row"><input v-model="editedSettings[setting.setting_key]" type="text" /><button class="save-btn" @click="saveSetting(setting.setting_key)" :disabled="isSaving"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg></button></div>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-header"><div class="section-icon bank"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/></svg></div><div><h2>บัญชีธนาคาร</h2><p>ข้อมูลสำหรับรับเงินผ่านการโอน</p></div></div>
        <div class="settings-fields">
          <div v-for="setting in settings.filter(s => s.setting_key.includes('bank'))" :key="setting.id" class="field-group">
            <label>{{ getSettingLabel(setting.setting_key) }}</label>
            <div class="input-row"><input v-model="editedSettings[setting.setting_key]" type="text" /><button class="save-btn" @click="saveSetting(setting.setting_key)" :disabled="isSaving"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg></button></div>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <div class="section-header"><div class="section-icon limits"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div><h2>ขีดจำกัดการเติมเงิน</h2><p>กำหนดยอดขั้นต่ำ-สูงสุด และเวลาหมดอายุ</p></div></div>
        <div class="settings-fields">
          <div v-for="setting in settings.filter(s => s.setting_key.includes('amount') || s.setting_key.includes('expiry'))" :key="setting.id" class="field-group">
            <label>{{ getSettingLabel(setting.setting_key) }}</label>
            <div class="input-row"><input v-model="editedSettings[setting.setting_key]" type="number" /><span v-if="setting.setting_key.includes('amount')" class="input-suffix">บาท</span><span v-else-if="setting.setting_key.includes('hours')" class="input-suffix">ชม.</span><button class="save-btn" @click="saveSetting(setting.setting_key)" :disabled="isSaving"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg></button></div>
          </div>
        </div>
      </div>
    </div>
    <div class="info-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><strong>หมายเหตุ:</strong><p>การเปลี่ยนแปลงจะมีผลทันทีสำหรับลูกค้าที่สร้างคำขอเติมเงินใหม่</p></div></div>
  </div>
</template>

<style scoped>
.payment-settings-view { max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.header-left h1 { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.subtitle { font-size: 14px; color: #6B7280; }
.header-actions { display: flex; gap: 12px; }
.refresh-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.save-all-btn { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #00A86B; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.save-all-btn:disabled { opacity: 0.6; }
.result-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 1001; }
.result-toast.success { background: #dcfce7; color: #166534; }
.result-toast.error { background: #fee2e2; color: #991b1b; }
.loading-state { display: flex; flex-direction: column; gap: 16px; }
.skeleton { height: 80px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.settings-grid { display: flex; flex-direction: column; gap: 24px; }
.settings-section { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #F3F4F6; }
.section-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.section-icon.promptpay { background: #E0F2FE; color: #0284C7; }
.section-icon.bank { background: #FEF3C7; color: #D97706; }
.section-icon.limits { background: #E8F5EF; color: #00A86B; }
.section-header h2 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
.section-header p { font-size: 13px; color: #6B7280; margin: 0; }
.settings-fields { display: flex; flex-direction: column; gap: 16px; }
.field-group label { font-size: 13px; font-weight: 500; color: #374151; display: block; margin-bottom: 8px; }
.input-row { display: flex; gap: 8px; align-items: center; }
.input-row input { flex: 1; padding: 12px 16px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 15px; outline: none; }
.input-row input:focus { border-color: #00A86B; }
.input-suffix { font-size: 14px; color: #6B7280; min-width: 40px; }
.save-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #E8F5EF; color: #00A86B; border: none; border-radius: 10px; cursor: pointer; }
.save-btn:hover { background: #D1FAE5; }
.info-box { display: flex; gap: 12px; padding: 16px; background: #FEF3C7; border-radius: 12px; margin-top: 24px; }
.info-box svg { flex-shrink: 0; color: #D97706; }
.info-box strong { display: block; font-size: 14px; color: #92400E; margin-bottom: 4px; }
.info-box p { font-size: 13px; color: #92400E; margin: 0; }
</style>
