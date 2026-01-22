<template>
  <div class="wallet-page">
    <header class="wallet-header">
      <button class="back-btn" @click="goBack" type="button" aria-label="กลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <h1>กระเป๋าเงิน</h1>
      <div class="header-spacer"></div>
    </header>

    <section class="balance-section">
      <WalletBalance
        :formatted-balance="formattedBalance"
        :loading="loading"
        @topup="showTopupModal = true"
        @withdraw="showWithdrawModal = true"
      />

      <PendingAlert
        :pending-topup-count="pendingTopupCount"
        :pending-withdraw-count="pendingWithdrawCount"
      />
    </section>

    <WalletStats
      :formatted-earned="formattedEarned"
      :formatted-spent="formattedSpent"
    />

    <WalletTabs v-model="activeTab" />

    <section class="tab-content">
      <TransactionList
        v-if="activeTab === 'transactions'"
        :transactions="transactions"
      />

      <TopupRequestList
        v-if="activeTab === 'topup'"
        :requests="topupRequests"
      />

      <WithdrawalList
        v-if="activeTab === 'withdraw'"
        :withdrawals="withdrawals"
      />
    </section>

    <!-- Topup Modal -->
    <div v-if="showTopupModal" class="modal-overlay" @click.self="closeTopupModal">
      <div class="modal topup-modal">
        <template v-if="topupStep === 'amount'">
          <h2>เติมเงิน</h2>
          <div class="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <input v-model.number="topupAmount" type="number" min="20" placeholder="ระบุจำนวนเงิน"/>
            <div class="quick-amounts">
              <button v-for="amt in [100, 200, 500, 1000]" :key="amt" @click="topupAmount = amt" type="button">฿{{ amt }}</button>
            </div>
          </div>
          <div class="form-group">
            <label>วิธีชำระเงิน</label>
            <select v-model="topupMethod">
              <option 
                v-for="method in enabledPaymentMethods" 
                :key="method.value" 
                :value="method.value"
              >
                {{ method.label }}
              </option>
            </select>
            <p v-if="enabledPaymentMethods.length === 0" class="text-sm text-red-600 mt-2">
              ไม่มีวิธีชำระเงินที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeTopupModal" type="button">ยกเลิก</button>
            <button 
              class="btn-primary" 
              @click="goToPaymentStep" 
              :disabled="topupAmount < 20 || enabledPaymentMethods.length === 0" 
              type="button"
            >
              ถัดไป
            </button>
          </div>
        </template>

        <template v-else-if="topupStep === 'payment'">
          <div class="payment-header">
            <button class="back-step-btn" @click="topupStep = 'amount'" type="button" aria-label="กลับ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <h2>ข้อมูลการชำระเงิน</h2>
          </div>

          <div class="payment-amount-display">
            <span class="label">จำนวนเงินที่ต้องโอน</span>
            <span class="amount">฿{{ formatNumber(topupAmount) }}</span>
          </div>

          <div v-if="currentPaymentAccount" class="payment-account-info">
            <template v-if="topupMethod === 'promptpay'">
              <div class="payment-type-badge promptpay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                <span>พร้อมเพย์</span>
              </div>
              
              <div v-if="currentPaymentAccount.qr_code_url" class="qr-code-container">
                <img :src="currentPaymentAccount.qr_code_url" :alt="'QR Code ' + currentPaymentAccount.display_name" class="qr-code-image"/>
              </div>

              <div class="account-details">
                <div class="detail-row">
                  <span class="detail-label">เบอร์พร้อมเพย์</span>
                  <span class="detail-value copyable" @click="copyToClipboard(currentPaymentAccount.account_number)">
                    {{ currentPaymentAccount.account_number }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ชื่อบัญชี</span>
                  <span class="detail-value">{{ currentPaymentAccount.account_name }}</span>
                </div>
              </div>
            </template>

            <template v-else-if="topupMethod === 'bank_transfer'">
              <div class="payment-type-badge bank">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                <span>โอนเงินผ่านธนาคาร</span>
              </div>

              <div v-if="currentPaymentAccount.qr_code_url" class="qr-code-container">
                <img :src="currentPaymentAccount.qr_code_url" :alt="'QR Code ' + currentPaymentAccount.display_name" class="qr-code-image"/>
              </div>

              <div class="bank-info">
                <div class="bank-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
                </div>
                <span class="bank-name">{{ currentPaymentAccount.bank_name || currentPaymentAccount.display_name }}</span>
              </div>

              <div class="account-details">
                <div class="detail-row">
                  <span class="detail-label">เลขบัญชี</span>
                  <span class="detail-value copyable" @click="copyToClipboard(currentPaymentAccount.account_number)">
                    {{ currentPaymentAccount.account_number }}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">ชื่อบัญชี</span>
                  <span class="detail-value">{{ currentPaymentAccount.account_name }}</span>
                </div>
              </div>
            </template>
          </div>

          <div v-else class="no-payment-account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <p>ไม่พบข้อมูลบัญชีรับเงิน</p>
            <span>กรุณาติดต่อผู้ดูแลระบบ</span>
          </div>

          <div class="upload-slip-section">
            <h4>แนบสลิปการโอนเงิน</h4>
            <div v-if="slipPreview" class="slip-preview">
              <img :src="slipPreview" alt="Payment Slip" />
              <button class="remove-slip-btn" @click="removeSlip" type="button" aria-label="ลบสลิป">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <label v-else class="slip-upload-area">
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                @change="handleSlipUpload"
                ref="slipInput"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span class="upload-text">คลิกเพื่อเลือกไฟล์หรือลากไฟล์มาวาง</span>
              <span class="upload-hint">รองรับไฟล์รูปภาพทุกขนาด (จะปรับขนาดอัตโนมัติ)</span>
            </label>
          </div>

          <div class="payment-instructions">
            <h4>ขั้นตอนการเติมเงิน</h4>
            <ol>
              <li>โอนเงินตามจำนวนที่ระบุไปยังบัญชีด้านบน</li>
              <li>แนบสลิปการโอนเงิน</li>
              <li>กดปุ่ม "ยืนยันการโอนเงิน" ด้านล่าง</li>
              <li>รอการตรวจสอบจากทีมงาน (ภายใน 5-15 นาที)</li>
              <li>เงินจะเข้ากระเป๋าอัตโนมัติเมื่อตรวจสอบเรียบร้อย</li>
            </ol>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="closeTopupModal" type="button">ยกเลิก</button>
            <button class="btn-primary" @click="handleTopup" :disabled="topupLoading || !currentPaymentAccount || !slipFile" type="button">
              {{ topupLoading ? 'กำลังดำเนินการ...' : 'ยืนยันการโอนเงิน' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="modal-overlay" @click.self="showWithdrawModal = false">
      <div class="modal">
        <h2>ถอนเงิน</h2>
        <div class="available-balance">ยอดที่ถอนได้: <strong>฿{{ formatNumber(availableForWithdrawal) }}</strong></div>
        <div class="form-group">
          <label>บัญชีธนาคาร</label>
          <div v-if="bankAccounts.length === 0" class="no-bank">
            <p>ยังไม่มีบัญชีธนาคาร</p>
            <button class="btn-link" @click="showAddBankModal = true" type="button">+ เพิ่มบัญชี</button>
          </div>
          <select v-else v-model="selectedBankAccountId">
            <option value="">เลือกบัญชี</option>
            <option v-for="acc in bankAccounts" :key="acc.id" :value="acc.id">{{ acc.bank_name }} - {{ acc.account_number }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input v-model.number="withdrawAmount" type="number" min="100" placeholder="ขั้นต่ำ 100 บาท"/>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showWithdrawModal = false" type="button">ยกเลิก</button>
          <button class="btn-primary" @click="handleWithdraw" :disabled="withdrawLoading || withdrawAmount < 100 || !selectedBankAccountId" type="button">
            {{ withdrawLoading ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Bank Modal -->
    <div v-if="showAddBankModal" class="modal-overlay" @click.self="showAddBankModal = false">
      <div class="modal">
        <h2>เพิ่มบัญชีธนาคาร</h2>
        <div class="form-group">
          <label>ธนาคาร</label>
          <select v-model="newBankCode">
            <option value="">เลือกธนาคาร</option>
            <option v-for="bank in THAI_BANKS" :key="bank.code" :value="bank.code">{{ bank.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>เลขบัญชี</label>
          <input v-model="newAccountNumber" type="text" placeholder="เลขบัญชี"/>
        </div>
        <div class="form-group">
          <label>ชื่อบัญชี</label>
          <input v-model="newAccountName" type="text" placeholder="ชื่อ-นามสกุล"/>
        </div>
        
        <!-- Debug info -->
        <div v-if="isDev" style="font-size: 11px; color: #666; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 12px;">
          Debug: code={{ newBankCode || 'empty' }}, number={{ newAccountNumber || 'empty' }}, name={{ newAccountName || 'empty' }}, 
          disabled={{ isAddBankDisabled }}
        </div>
        
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddBankModal = false" type="button">ยกเลิก</button>
          <button 
            class="btn-primary" 
            @click="handleAddBank" 
            :disabled="isAddBankDisabled" 
            type="button"
          >
            {{ addBankLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toast.show" :class="['toast', toast.type]">{{ toast.message }}</div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useWalletStore } from '@/stores/wallet'
import { useImageResize } from '@/composables/useImageResize'
import { usePaymentAccountsSync } from '@/composables/usePaymentAccountsSync'
import { storeToRefs } from 'pinia'
import type { PaymentMethods } from '@/types/financial-settings'

// Components
import WalletBalance from '@/components/wallet/WalletBalance.vue'
import WalletStats from '@/components/wallet/WalletStats.vue'
import WalletTabs from '@/components/wallet/WalletTabs.vue'
import PendingAlert from '@/components/wallet/PendingAlert.vue'
import TransactionList from '@/components/wallet/TransactionList.vue'
import TopupRequestList from '@/components/wallet/TopupRequestList.vue'
import WithdrawalList from '@/components/wallet/WithdrawalList.vue'

import type { PaymentReceivingAccount } from '@/stores/wallet'

const router = useRouter()
const walletStore = useWalletStore()
const { resizeImage } = useImageResize()
const { loadPromptPayAccounts } = usePaymentAccountsSync()

// Store state
const {
  balance,
  transactions,
  topupRequests,
  withdrawals,
  bankAccounts,
  paymentAccounts,
  loading,
  formattedBalance,
  formattedEarned,
  formattedSpent,
  pendingTopupCount,
  availableForWithdrawal
} = storeToRefs(walletStore)

// Local state
const activeTab = ref<'transactions' | 'topup' | 'withdraw'>('transactions')
const showTopupModal = ref(false)
const showWithdrawModal = ref(false)
const showAddBankModal = ref(false)

const topupAmount = ref(100)
const topupMethod = ref<'promptpay' | 'bank_transfer'>('bank_transfer')
const topupLoading = ref(false)
const topupStep = ref<'amount' | 'payment'>('amount')
const slipFile = ref<File | null>(null)
const slipPreview = ref<string | null>(null)
const slipInput = ref<HTMLInputElement | null>(null)

// Payment methods settings
const paymentMethods = ref<PaymentMethods>({
  bank_transfer: { enabled: true, fee: 0, display_name: 'โอนเงินผ่านธนาคาร' },
  promptpay: { enabled: true, fee: 0, display_name: 'พร้อมเพย์' }
})

const withdrawAmount = ref(100)
const selectedBankAccountId = ref('')
const withdrawLoading = ref(false)

const newBankCode = ref('')
const newAccountNumber = ref('')
const newAccountName = ref('')
const addBankLoading = ref(false)

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })

// Debug mode
const isDev = import.meta.env.DEV

// Computed for button disabled state
const isAddBankDisabled = computed(() => {
  const disabled = addBankLoading.value || !newBankCode.value || !newAccountNumber.value || !newAccountName.value
  if (isDev) {
    console.log('[AddBank] Disabled check:', {
      addBankLoading: addBankLoading.value,
      newBankCode: newBankCode.value,
      newAccountNumber: newAccountNumber.value,
      newAccountName: newAccountName.value,
      disabled
    })
  }
  return disabled
})


// Computed
const currentPaymentAccount = computed((): PaymentReceivingAccount | null => {
  return paymentAccounts.value.find(acc => acc.account_type === topupMethod.value) || null
})

const enabledPaymentMethods = computed(() => {
  return Object.entries(paymentMethods.value)
    .filter(([_, method]) => method.enabled)
    .map(([key, method]) => ({
      value: key,
      label: method.display_name
    }))
})

const pendingWithdrawCount = computed(() => 
  withdrawals.value.filter(w => w.status === 'pending' || w.status === 'processing').length
)

// Thai banks
const THAI_BANKS = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต' }
]

// Methods
const goBack = (): void => router.back()

const numberFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const formatNumber = (num: number): string => numberFormatter.format(num)

const showToast = (message: string, type: 'success' | 'error' = 'success'): void => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('คัดลอกแล้ว')
  } catch {
    showToast('ไม่สามารถคัดลอกได้', 'error')
  }
}

const goToPaymentStep = async (): Promise<void> => {
  if (topupAmount.value < 20) {
    showToast('จำนวนเงินขั้นต่ำ 20 บาท', 'error')
    return
  }
  
  // Load payment accounts from admin settings
  if (paymentAccounts.value.length === 0) {
    try {
      await loadPromptPayAccounts()
      await walletStore.fetchPaymentAccounts()
    } catch (err) {
      console.error('[WalletView] Error loading payment accounts:', err)
      showToast('ไม่สามารถโหลดข้อมูลบัญชีรับเงินได้', 'error')
      return
    }
  }
  
  // Check if we have payment accounts for the selected method
  if (!currentPaymentAccount.value) {
    showToast('ไม่พบบัญชีรับเงินสำหรับวิธีชำระเงินนี้', 'error')
    return
  }
  
  topupStep.value = 'payment'
}

async function loadPaymentMethodsSettings() {
  try {
    // @ts-ignore - Supabase RPC types not fully typed
    const { data, error } = await supabase.rpc(
      'get_system_settings',
      {
        p_category: 'topup',
        p_key: 'topup_settings'
      }
    ) as any

    if (!error && data && data.length > 0) {
      const settings = data[0]?.value
      if (settings?.payment_methods) {
        paymentMethods.value = settings.payment_methods.reduce((acc: PaymentMethods, method: any) => {
          acc[method.id as keyof PaymentMethods] = {
            enabled: method.enabled,
            fee: method.fee || 0,
            display_name: method.name
          }
          return acc
        }, {} as PaymentMethods)
        
        // Set default to first enabled method
        const firstEnabled = Object.entries(paymentMethods.value)
          .find(([_, method]) => method.enabled)?.[0] as 'promptpay' | 'bank_transfer' | undefined
        
        if (firstEnabled) {
          topupMethod.value = firstEnabled as 'promptpay' | 'bank_transfer'
        }
      }
    }
  } catch (err) {
    console.error('[WalletView] Error loading payment methods:', err)
  }
}

const closeTopupModal = (): void => {
  showTopupModal.value = false
  topupStep.value = 'amount'
  topupAmount.value = 100
  slipFile.value = null
  slipPreview.value = null
}

// Watch for topup modal opening to reload payment accounts
watch(showTopupModal, async (newValue) => {
  if (newValue) {
    // Reload payment accounts when modal opens
    try {
      await loadPromptPayAccounts()
      await loadPaymentMethodsSettings()
    } catch (err) {
      console.error('[WalletView] Error reloading payment settings:', err)
    }
  }
})


const handleSlipUpload = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
    showToast('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)', 'error')
    return
  }

  try {
    const originalSize = (file.size / 1024 / 1024).toFixed(2)
    
    const result = await resizeImage(file, {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.85
    })

    const resizedSize = (result.resizedSize / 1024 / 1024).toFixed(2)
    slipFile.value = result.file

    const reader = new FileReader()
    reader.onload = (e) => {
      slipPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(result.file)

    if (parseFloat(originalSize) > 2) {
      showToast(`ปรับขนาดรูปจาก ${originalSize}MB เป็น ${resizedSize}MB`)
    }
  } catch (err) {
    console.error('[WalletView] Image resize error:', err)
    showToast('ไม่สามารถประมวลผลรูปภาพได้', 'error')
  }
}

const removeSlip = (): void => {
  slipFile.value = null
  slipPreview.value = null
  if (slipInput.value) {
    slipInput.value.value = ''
  }
}

const handleTopup = async (): Promise<void> => {
  if (topupAmount.value < 20) { 
    showToast('จำนวนเงินขั้นต่ำ 20 บาท', 'error')
    return 
  }
  
  if (!slipFile.value) {
    showToast('กรุณาแนบสลิปการโอนเงิน', 'error')
    return
  }

  topupLoading.value = true
  
  try {
    const fileExt = slipFile.value.name.split('.').pop() || 'jpg'
    const fileName = `slip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('payment-slips')
      .upload(fileName, slipFile.value, { 
        upsert: false,
        contentType: slipFile.value.type 
      })

    if (uploadError) {
      console.error('[WalletView] Upload error:', uploadError)
      showToast('ไม่สามารถอัปโหลดสลิปได้', 'error')
      return
    }

    const { data: urlData } = supabase.storage
      .from('payment-slips')
      .getPublicUrl(fileName)

    const result = await walletStore.createTopupRequest(
      topupAmount.value, 
      topupMethod.value,
      undefined,
      urlData.publicUrl
    )
    
    if (result.success) { 
      showToast(result.message || 'สร้างคำขอเติมเงินสำเร็จ รอการตรวจสอบ')
      closeTopupModal()
    } else { 
      showToast(result.message || 'เกิดข้อผิดพลาด', 'error') 
    }
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    console.error('[WalletView] Topup error:', err)
    showToast(errorMessage, 'error') 
  } finally { 
    topupLoading.value = false 
  }
}


const handleWithdraw = async (): Promise<void> => {
  if (withdrawAmount.value < 100) { 
    showToast('จำนวนเงินขั้นต่ำ 100 บาท', 'error')
    return 
  }
  if (!selectedBankAccountId.value) { 
    showToast('กรุณาเลือกบัญชีธนาคาร', 'error')
    return 
  }
  
  withdrawLoading.value = true
  try {
    const result = await walletStore.requestWithdrawal(selectedBankAccountId.value, withdrawAmount.value)
    if (result.success) { 
      showToast(result.message || 'สร้างคำขอถอนเงินสำเร็จ')
      showWithdrawModal.value = false
      withdrawAmount.value = 100
      selectedBankAccountId.value = '' 
    } else { 
      showToast(result.message || 'เกิดข้อผิดพลาด', 'error') 
    }
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    showToast(errorMessage, 'error') 
  } finally { 
    withdrawLoading.value = false 
  }
}

const handleAddBank = async (): Promise<void> => {
  console.log('[WalletView] handleAddBank: Starting...')
  console.log('[WalletView] handleAddBank: Values:', {
    code: newBankCode.value,
    number: newAccountNumber.value,
    name: newAccountName.value,
    bankAccountsLength: bankAccounts.value.length
  })
  
  if (!newBankCode.value || !newAccountNumber.value || !newAccountName.value) { 
    console.warn('[WalletView] handleAddBank: Missing required fields')
    showToast('กรุณากรอกข้อมูลให้ครบ', 'error')
    return 
  }
  
  addBankLoading.value = true
  try {
    console.log('[WalletView] handleAddBank: Calling walletStore.addBankAccount...')
    const result = await walletStore.addBankAccount(
      newBankCode.value, 
      newAccountNumber.value, 
      newAccountName.value, 
      bankAccounts.value.length === 0
    )
    console.log('[WalletView] handleAddBank: Result:', result)
    
    if (result.success) { 
      console.log('[WalletView] handleAddBank: Success!')
      showToast(result.message || 'เพิ่มบัญชีสำเร็จ')
      showAddBankModal.value = false
      newBankCode.value = ''
      newAccountNumber.value = ''
      newAccountName.value = '' 
    } else { 
      console.error('[WalletView] handleAddBank: Failed:', result.message)
      showToast(result.message || 'ไม่สามารถเพิ่มบัญชีได้', 'error') 
    }
  } catch (err: unknown) { 
    console.error('[WalletView] handleAddBank: Exception:', err)
    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
    console.error('[WalletView] handleAddBank: Error message:', errorMessage)
    showToast(errorMessage, 'error') 
  } finally { 
    addBankLoading.value = false 
    console.log('[WalletView] handleAddBank: Completed')
  }
}

onMounted(async () => {
  console.log('[WalletView] Mounting...')
  
  // Deep debug - check each step
  try {
    console.log('[WalletView] Step 1: Fetching balance...')
    const balanceResult = await walletStore.fetchBalance()
    console.log('[WalletView] Balance result:', balanceResult)
    console.log('[WalletView] Store balance state:', balance.value)
    
    console.log('[WalletView] Step 2: Fetching transactions...')
    const txnResult = await walletStore.fetchTransactions()
    console.log('[WalletView] Transactions result:', txnResult)
    console.log('[WalletView] Store transactions state:', transactions.value)
    
    console.log('[WalletView] Step 3: Fetching topup requests...')
    const topupResult = await walletStore.fetchTopupRequests()
    console.log('[WalletView] Topup result:', topupResult)
    console.log('[WalletView] Store topup state:', topupRequests.value)
    
    console.log('[WalletView] Step 4: Fetching bank accounts...')
    await walletStore.fetchBankAccounts()
    
    console.log('[WalletView] Step 5: Fetching withdrawals...')
    await walletStore.fetchWithdrawals()
    
    console.log('[WalletView] Step 6: Fetching payment accounts...')
    await walletStore.fetchPaymentAccounts()

    console.log('[WalletView] Step 7: Loading PromptPay accounts from settings...')
    await loadPromptPayAccounts()
    
    console.log('[WalletView] Step 8: Loading payment methods settings...')
    await loadPaymentMethodsSettings()
    
    console.log('[WalletView] ===== DATA LOADED =====')
    console.log('[WalletView] Balance:', formattedBalance.value)
    console.log('[WalletView] Transactions:', transactions.value.length)
    console.log('[WalletView] Topup Requests:', topupRequests.value.length)
    console.log('[WalletView] Payment Accounts:', paymentAccounts.value.length)
    console.log('[WalletView] Payment Methods:', paymentMethods.value)
    console.log('[WalletView] ========================')
    
    // Subscribe to realtime updates
    walletStore.subscribeToWallet()
    walletStore.subscribeToWithdrawals()
    
    // Run debug utility (available in console as window.debugWallet())
    if (import.meta.env.DEV) {
      const { debugWalletSystem, printDebugResults } = await import('@/utils/walletDebug')
      const debugResults = await debugWalletSystem()
      printDebugResults(debugResults)
    }
  } catch (err) {
    console.error('[WalletView] ===== ERROR =====')
    console.error('[WalletView] Error loading data:', err)
    console.error('[WalletView] Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      error: err
    })
    console.error('[WalletView] ==================')
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error')
  }
})

onUnmounted(() => {
  console.log('[WalletView] Unmounting...')
  walletStore.unsubscribeAll()
})
</script>


<style scoped>
.wallet-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 100px; }
.wallet-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #fff; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 10; }
.wallet-header h1 { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0; }
.back-btn, .header-spacer { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
.back-btn svg { width: 24px; height: 24px; color: #1a1a1a; }
.balance-section { padding: 16px; }
.tab-content { padding: 16px 0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 20px 20px 0 0; padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal h2 { font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #666; margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; padding: 12px 16px; border: 2px solid #e8e8e8; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #00A86B; }
.quick-amounts { display: flex; gap: 8px; margin-top: 8px; }
.quick-amounts button { flex: 1; padding: 8px; border: 1px solid #e8e8e8; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.quick-amounts button:hover { background: #f5f5f5; }
.available-balance { background: #e8f5ef; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 14px; color: #00A86B; }
.available-balance strong { font-size: 18px; }
.no-bank { text-align: center; padding: 16px; color: #999; }
.btn-link { background: none; border: none; color: #00A86B; font-size: 14px; font-weight: 500; cursor: pointer; }
.modal-actions { display: flex; gap: 12px; margin-top: 24px; }
.btn-secondary { flex: 1; padding: 14px; border: 2px solid #e8e8e8; border-radius: 12px; background: #fff; font-size: 16px; font-weight: 600; color: #666; cursor: pointer; }
.btn-primary { flex: 1; padding: 14px; border: none; border-radius: 12px; background: #00A86B; font-size: 16px; font-weight: 600; color: #fff; cursor: pointer; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 200; }
.toast.success { background: #00A86B; color: #fff; }
.toast.error { background: #e53935; color: #fff; }

.topup-modal { max-height: 85vh; }
.payment-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.payment-header h2 { margin: 0; flex: 1; }
.back-step-btn { width: 36px; height: 36px; border: none; background: #f5f5f5; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.back-step-btn svg { width: 20px; height: 20px; color: #666; }
.back-step-btn:hover { background: #e8e8e8; }

.payment-amount-display { background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); border-radius: 14px; padding: 16px; text-align: center; color: #fff; margin-bottom: 16px; }
.payment-amount-display .label { font-size: 13px; opacity: 0.9; display: block; margin-bottom: 4px; }
.payment-amount-display .amount { font-size: 28px; font-weight: 700; }

.payment-account-info { background: #f9f9f9; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.payment-type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; margin-bottom: 12px; }
.payment-type-badge svg { width: 16px; height: 16px; }
.payment-type-badge.promptpay { background: #e3f2fd; color: #1565c0; }
.payment-type-badge.bank { background: #fff3e0; color: #e65100; }

.qr-code-container { display: flex; justify-content: center; margin: 16px 0; }
.qr-code-image { width: 180px; height: 180px; border-radius: 12px; border: 2px solid #e8e8e8; object-fit: contain; background: #fff; }

.bank-info { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.bank-logo { width: 44px; height: 44px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid #e8e8e8; }
.bank-logo svg { width: 24px; height: 24px; color: #666; }
.bank-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }

.account-details { background: #fff; border-radius: 10px; padding: 12px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.detail-row:last-child { border-bottom: none; }
.detail-label { font-size: 13px; color: #666; }
.detail-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.detail-value.copyable { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #00A86B; }
.detail-value.copyable:hover { text-decoration: underline; }
.detail-value.copyable svg { width: 14px; height: 14px; }

.no-payment-account { text-align: center; padding: 32px 16px; color: #999; }
.no-payment-account svg { width: 48px; height: 48px; margin-bottom: 12px; color: #ccc; }
.no-payment-account p { font-size: 16px; font-weight: 500; margin: 0 0 4px; color: #666; }
.no-payment-account span { font-size: 13px; }

.payment-instructions { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
.payment-instructions h4 { font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 10px; }
.payment-instructions ol { margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.6; }
.payment-instructions li { margin-bottom: 4px; }

.upload-slip-section { background: #f9f9f9; border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.upload-slip-section h4 { font-size: 14px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px; }

.slip-upload-area { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; background: #fff; border: 2px dashed #d1d5db; border-radius: 12px; cursor: pointer; transition: all 0.2s; padding: 20px; text-align: center; }
.slip-upload-area:hover { border-color: #00A86B; background: #f0fdf4; }
.slip-upload-area input { display: none; }
.slip-upload-area svg { width: 40px; height: 40px; color: #9ca3af; margin-bottom: 12px; }
.upload-text { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.upload-hint { font-size: 12px; color: #9ca3af; }

.slip-preview { position: relative; display: flex; justify-content: center; }
.slip-preview img { max-width: 100%; max-height: 300px; border-radius: 12px; border: 2px solid #e8e8e8; object-fit: contain; }
.remove-slip-btn { position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; background: #ef4444; color: #fff; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.remove-slip-btn:hover { background: #dc2626; }
.remove-slip-btn svg { width: 16px; height: 16px; }
</style>
