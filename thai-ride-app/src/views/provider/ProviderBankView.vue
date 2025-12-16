<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvider } from '../../composables/useProvider'
import { useProviderEarnings, THAI_BANKS } from '../../composables/useProviderEarnings'
import ProviderLayout from '../../components/ProviderLayout.vue'

const router = useRouter()
const { profile, fetchProfile } = useProvider()
const { 
  bankAccounts, 
  fetchBankAccounts, 
  addBankAccount, 
  deleteBankAccount
} = useProviderEarnings()

const isLoading = ref(true)
const showAddModal = ref(false)
const isAdding = ref(false)
const error = ref('')

// Form data
const newBankCode = ref('')
const newAccountNumber = ref('')
const newAccountName = ref('')
const newIsDefault = ref(false)

const canAdd = computed(() => 
  newBankCode.value && 
  newAccountNumber.value.length >= 10 && 
  newAccountName.value.length >= 4
)

const handleAddAccount = async () => {
  if (!canAdd.value || !profile.value) return
  isAdding.value = true
  error.value = ''

  try {
    await addBankAccount(
      profile.value.id,
      newBankCode.value,
      newAccountNumber.value,
      newAccountName.value,
      newIsDefault.value
    )
    showAddModal.value = false
    resetForm()
  } catch (e: any) {
    error.value = e.message
  } finally {
    isAdding.value = false
  }
}

const handleDeleteAccount = async (accountId: string) => {
  if (!confirm('ต้องการลบบัญชีนี้หรือไม่?')) return
  await deleteBankAccount(accountId)
}

const resetForm = () => {
  newBankCode.value = ''
  newAccountNumber.value = ''
  newAccountName.value = ''
  newIsDefault.value = false
  error.value = ''
}

const maskAccountNumber = (num: string) => {
  if (num.length <= 4) return num
  return '***-*-**' + num.slice(-4)
}

onMounted(async () => {
  await fetchProfile()
  if (profile.value) {
    await fetchBankAccounts(profile.value.id)
  }
  isLoading.value = false
})
</script>

<template>
  <ProviderLayout>
    <div class="bank-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <button @click="router.push('/provider/profile')" class="back-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>บัญชีธนาคาร</h1>
        </div>

        <!-- Info -->
        <div class="info-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>บัญชีธนาคารสำหรับรับเงินจากการถอนรายได้</p>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <template v-else>
          <!-- Bank Accounts List -->
          <div v-if="bankAccounts.length > 0" class="accounts-list">
            <div v-for="account in bankAccounts" :key="account.id" class="account-card">
              <div class="account-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
              </div>
              <div class="account-info">
                <span class="account-bank">{{ account.bank_name }}</span>
                <span class="account-number">{{ maskAccountNumber(account.account_number) }}</span>
                <span class="account-name">{{ account.account_name }}</span>
              </div>
              <div class="account-actions">
                <span v-if="account.is_default" class="default-badge">หลัก</span>
                <span v-if="account.is_verified" class="verified-badge">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <button @click="handleDeleteAccount(account.id)" class="delete-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <p>ยังไม่มีบัญชีธนาคาร</p>
            <span>เพิ่มบัญชีเพื่อรับเงินจากการถอนรายได้</span>
          </div>

          <!-- Add Button -->
          <button @click="showAddModal = true" class="add-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            เพิ่มบัญชีธนาคาร
          </button>
        </template>
      </div>
    </div>

    <!-- Add Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>เพิ่มบัญชีธนาคาร</h3>
            <button @click="showAddModal = false" class="close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div v-if="error" class="error-msg">{{ error }}</div>

            <div class="form-group">
              <label>ธนาคาร</label>
              <select v-model="newBankCode" class="input-field">
                <option value="">เลือกธนาคาร</option>
                <option v-for="bank in THAI_BANKS" :key="bank.code" :value="bank.code">
                  {{ bank.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>เลขบัญชี</label>
              <input v-model="newAccountNumber" type="text" inputmode="numeric" maxlength="15" placeholder="1234567890" class="input-field" />
            </div>

            <div class="form-group">
              <label>ชื่อบัญชี</label>
              <input v-model="newAccountName" type="text" placeholder="ชื่อ-นามสกุล ตามบัญชี" class="input-field" />
            </div>

            <label class="checkbox-label">
              <input v-model="newIsDefault" type="checkbox" />
              <span class="checkmark"></span>
              <span>ตั้งเป็นบัญชีหลัก</span>
            </label>
          </div>

          <div class="modal-footer">
            <button @click="showAddModal = false" class="btn-secondary">ยกเลิก</button>
            <button @click="handleAddAccount" :disabled="!canAdd || isAdding" class="btn-primary">
              {{ isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มบัญชี' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </ProviderLayout>
</template>

<style scoped>
.bank-page { min-height: 100vh; }
.page-content { max-width: 480px; margin: 0 auto; padding: 16px; }

.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.page-header h1 { flex: 1; font-size: 20px; font-weight: 600; }
.back-btn {
  width: 40px; height: 40px; background: none; border: none;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.back-btn svg { width: 24px; height: 24px; }

.info-card {
  display: flex; gap: 12px; padding: 16px;
  background: #F6F6F6; border-radius: 12px; margin-bottom: 20px;
}
.info-card svg { width: 20px; height: 20px; flex-shrink: 0; color: #6B6B6B; }
.info-card p { font-size: 13px; color: #6B6B6B; }

.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.spinner {
  width: 32px; height: 32px; border: 3px solid #E5E5E5; border-top-color: #000;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.accounts-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }

.account-card {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; background: #FFFFFF; border-radius: 12px;
}
.account-icon {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: #F6F6F6; border-radius: 12px;
}
.account-icon svg { width: 24px; height: 24px; }
.account-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.account-bank { font-size: 15px; font-weight: 500; }
.account-number { font-size: 14px; color: #000; font-family: monospace; }
.account-name { font-size: 12px; color: #6B6B6B; }

.account-actions { display: flex; align-items: center; gap: 8px; }
.default-badge {
  padding: 4px 8px; background: #000; color: #FFF;
  border-radius: 4px; font-size: 11px; font-weight: 500;
}
.verified-badge {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: #E8F5E9; border-radius: 50%; color: #05944F;
}
.verified-badge svg { width: 14px; height: 14px; }
.delete-btn {
  width: 32px; height: 32px; background: none; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #E11900; opacity: 0.6;
}
.delete-btn:hover { opacity: 1; }
.delete-btn svg { width: 18px; height: 18px; }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 24px; text-align: center; color: #6B6B6B;
}
.empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.4; }
.empty-state p { font-size: 16px; font-weight: 500; margin-bottom: 4px; color: #000; }
.empty-state span { font-size: 14px; }

.add-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px 24px;
  background: #000; color: #FFF; border: none; border-radius: 8px;
  font-size: 16px; font-weight: 500; cursor: pointer;
}
.add-btn svg { width: 20px; height: 20px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1000;
}
.modal-content {
  background: #FFF; width: 100%; max-width: 480px;
  border-radius: 16px 16px 0 0; max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #E5E5E5;
}
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { background: none; border: none; cursor: pointer; padding: 4px; }
.close-btn svg { width: 24px; height: 24px; }

.modal-body { padding: 20px; }
.error-msg {
  padding: 12px 16px; background: #FEE2E2; color: #E11900;
  border-radius: 8px; font-size: 14px; margin-bottom: 16px;
}
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.input-field {
  width: 100%; padding: 14px 16px;
  border: 1px solid #E5E5E5; border-radius: 8px; font-size: 16px;
}
.input-field:focus { outline: none; border-color: #000; }

.checkbox-label {
  display: flex; align-items: center; gap: 12px; cursor: pointer;
}
.checkbox-label input { display: none; }
.checkmark {
  width: 20px; height: 20px; border: 2px solid #E5E5E5;
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
}
.checkbox-label input:checked + .checkmark {
  background: #000; border-color: #000;
}
.checkbox-label input:checked + .checkmark::after {
  content: ''; width: 6px; height: 10px;
  border: solid #FFF; border-width: 0 2px 2px 0;
  transform: rotate(45deg); margin-bottom: 2px;
}

.modal-footer {
  display: flex; gap: 12px; padding: 16px 20px;
  border-top: 1px solid #E5E5E5;
}
.btn-secondary, .btn-primary {
  flex: 1; padding: 14px 24px; border: none; border-radius: 8px;
  font-size: 16px; font-weight: 500; cursor: pointer;
}
.btn-secondary { background: #F6F6F6; color: #000; }
.btn-primary { background: #000; color: #FFF; }
.btn-primary:disabled { background: #CCC; cursor: not-allowed; }
</style>
