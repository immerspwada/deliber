<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">ข้อมูลการชำระเงิน</h1>
        <p class="text-gray-600">ข้อมูลบัญชีรับเงินที่ลูกค้าใช้สำหรับเติมเงิน</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow p-8">
        <div class="animate-pulse space-y-4">
          <div class="h-4 bg-gray-200 rounded w-1/4"></div>
          <div class="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Payment Accounts -->
      <div v-else class="space-y-6">
        <!-- Bank Transfer Account -->
        <div v-if="bankAccount" class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6">
            <div class="payment-type-badge bank mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
              </svg>
              <span>โอนเงินผ่านธนาคาร</span>
            </div>

            <div v-if="bankAccount.qr_code_url" class="qr-code-container mb-6">
              <img 
                :src="bankAccount.qr_code_url" 
                :alt="'QR Code ' + bankAccount.bank_name" 
                class="qr-code-image"
              />
            </div>

            <div class="bank-info mb-4">
              <div class="bank-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6">
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                </svg>
              </div>
              <span class="bank-name">{{ bankAccount.bank_name }}</span>
            </div>

            <div class="account-details">
              <div class="detail-row">
                <span class="detail-label">เลขบัญชี</span>
                <span class="detail-value copyable" @click="copyToClipboard(bankAccount.account_number)">
                  {{ bankAccount.account_number }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 inline ml-1">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ชื่อบัญชี</span>
                <span class="detail-value">{{ bankAccount.account_name }}</span>
              </div>
              <div v-if="bankAccount.description" class="detail-row">
                <span class="detail-label">หมายเหตุ</span>
                <span class="detail-value text-gray-600">{{ bankAccount.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PromptPay Account -->
        <div v-if="promptPayAccount" class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6">
            <div class="payment-type-badge promptpay mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <path d="M12 18h.01"/>
              </svg>
              <span>พร้อมเพย์</span>
            </div>

            <div v-if="promptPayAccount.qr_code_url" class="qr-code-container mb-6">
              <img 
                :src="promptPayAccount.qr_code_url" 
                :alt="'QR Code ' + promptPayAccount.display_name" 
                class="qr-code-image"
              />
            </div>

            <div class="account-details">
              <div class="detail-row">
                <span class="detail-label">เบอร์พร้อมเพย์</span>
                <span class="detail-value copyable" @click="copyToClipboard(promptPayAccount.account_number)">
                  {{ promptPayAccount.account_number }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 inline ml-1">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ชื่อบัญชี</span>
                <span class="detail-value">{{ promptPayAccount.account_name }}</span>
              </div>
              <div v-if="promptPayAccount.description" class="detail-row">
                <span class="detail-label">หมายเหตุ</span>
                <span class="detail-value text-gray-600">{{ promptPayAccount.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!bankAccount && !promptPayAccount" class="bg-white rounded-lg shadow p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">ยังไม่มีบัญชีรับเงิน</h3>
          <p class="text-gray-600">กรุณาเพิ่มบัญชีรับเงินในหน้าการตั้งค่า</p>
        </div>

        <!-- Edit Link -->
        <div class="text-center">
          <router-link 
            to="/admin/payment-settings" 
            class="inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            จัดการบัญชีรับเงิน
          </router-link>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

interface PaymentAccount {
  id: string
  account_type: 'bank_transfer' | 'promptpay'
  account_name: string
  account_number: string
  bank_code?: string
  bank_name?: string
  qr_code_url?: string
  display_name?: string
  description?: string
  is_active: boolean
  is_default: boolean
  sort_order: number
}

const loading = ref(true)
const error = ref('')
const accounts = ref<PaymentAccount[]>([])
const showToast = ref(false)
const toastMessage = ref('')

const bankAccount = computed(() => 
  accounts.value.find(acc => acc.account_type === 'bank_transfer' && acc.is_active)
)

const promptPayAccount = computed(() => 
  accounts.value.find(acc => acc.account_type === 'promptpay' && acc.is_active)
)

async function fetchAccounts() {
  try {
    loading.value = true
    error.value = ''

    const { data, error: fetchError } = await supabase
      .from('payment_receiving_accounts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (fetchError) throw fetchError

    accounts.value = data || []
  } catch (err) {
    console.error('Error fetching accounts:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลบัญชีได้'
  } finally {
    loading.value = false
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toastMessage.value = 'คัดลอกแล้ว'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

onMounted(() => {
  fetchAccounts()
})
</script>

<style scoped>
.payment-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.payment-type-badge.bank {
  background: #EBF5FF;
  color: #1E40AF;
}

.payment-type-badge.promptpay {
  background: #ECFDF5;
  color: #047857;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
}

.qr-code-image {
  width: 256px;
  height: 256px;
  object-fit: contain;
  border-radius: 8px;
}

.bank-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 8px;
}

.bank-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 8px;
  color: #6B7280;
}

.bank-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 14px;
  color: #6B7280;
}

.detail-value {
  font-size: 16px;
  color: #111827;
  font-weight: 500;
}

.detail-value.copyable {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: color 0.2s;
}

.detail-value.copyable:hover {
  color: #2563EB;
}
</style>
