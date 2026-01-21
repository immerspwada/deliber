<script setup lang="ts">
/**
 * Admin Payment Accounts View - จัดการบัญชีรับเงิน + QR Code
 */
import { ref, computed, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { useAdminUIStore } from "../stores/adminUI.store";

interface PaymentAccount {
  id: string;
  account_type: "promptpay" | "bank_transfer";
  account_name: string;
  account_number: string;
  bank_code: string | null;
  bank_name: string | null;
  qr_code_url: string | null;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

const uiStore = useAdminUIStore();
const accounts = ref<PaymentAccount[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const showModal = ref(false);
const editingAccount = ref<PaymentAccount | null>(null);
const uploadingQR = ref<string | null>(null);
const toast = ref({ show: false, success: false, text: "" });

// Form state
const form = ref({
  account_type: "promptpay" as "promptpay" | "bank_transfer",
  account_name: "",
  account_number: "",
  bank_code: "",
  bank_name: "",
  display_name: "",
  description: "",
  is_default: false,
});

const promptpayAccounts = computed(() =>
  accounts.value.filter((a) => a.account_type === "promptpay")
);
const bankAccounts = computed(() =>
  accounts.value.filter((a) => a.account_type === "bank_transfer")
);

async function loadAccounts(): Promise<void> {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("payment_receiving_accounts")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;
    accounts.value = data || [];
  } catch (err) {
    console.error("Error loading accounts:", err);
    showToast(false, "ไม่สามารถโหลดข้อมูลได้");
  } finally {
    isLoading.value = false;
  }
}

function openAddModal(type: "promptpay" | "bank_transfer"): void {
  editingAccount.value = null;
  form.value = {
    account_type: type,
    account_name: "",
    account_number: "",
    bank_code: type === "bank_transfer" ? "KBANK" : "",
    bank_name: type === "bank_transfer" ? "ธนาคารกสิกรไทย" : "",
    display_name: "",
    description: "",
    is_default: false,
  };
  showModal.value = true;
}

function openEditModal(account: PaymentAccount): void {
  editingAccount.value = account;
  form.value = {
    account_type: account.account_type,
    account_name: account.account_name,
    account_number: account.account_number,
    bank_code: account.bank_code || "",
    bank_name: account.bank_name || "",
    display_name: account.display_name || "",
    description: account.description || "",
    is_default: account.is_default,
  };
  showModal.value = true;
}

async function saveAccount(): Promise<void> {
  if (!form.value.account_name || !form.value.account_number) {
    showToast(false, "กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  isSaving.value = true;
  try {
    if (editingAccount.value) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("admin_update_payment_account", {
        p_account_id: editingAccount.value.id,
        p_account_name: form.value.account_name,
        p_account_number: form.value.account_number,
        p_bank_code: form.value.bank_code || null,
        p_bank_name: form.value.bank_name || null,
        p_display_name: form.value.display_name || null,
        p_description: form.value.description || null,
        p_is_default: form.value.is_default,
      });
      if (error) throw error;
      showToast(true, "อัพเดทบัญชีสำเร็จ");
    } else {
      // Add new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("admin_add_payment_account", {
        p_account_type: form.value.account_type,
        p_account_name: form.value.account_name,
        p_account_number: form.value.account_number,
        p_bank_code: form.value.bank_code || null,
        p_bank_name: form.value.bank_name || null,
        p_display_name: form.value.display_name || null,
        p_description: form.value.description || null,
        p_is_default: form.value.is_default,
      });
      if (error) throw error;
      showToast(true, "เพิ่มบัญชีสำเร็จ");
    }
    showModal.value = false;
    await loadAccounts();
  } catch (err: unknown) {
    console.error("Error saving account:", err);
    showToast(false, (err as Error).message || "เกิดข้อผิดพลาด");
  } finally {
    isSaving.value = false;
  }
}

async function deleteAccount(account: PaymentAccount): Promise<void> {
  if (!confirm(`ต้องการลบบัญชี "${account.display_name || account.account_name}" หรือไม่?`)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("admin_delete_payment_account", {
      p_account_id: account.id,
    });
    if (error) throw error;
    showToast(true, "ลบบัญชีสำเร็จ");
    await loadAccounts();
  } catch (err) {
    console.error("Error deleting account:", err);
    showToast(false, "ไม่สามารถลบบัญชีได้");
  }
}

async function uploadQRCode(account: PaymentAccount, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Validate file
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast(false, "รองรับเฉพาะไฟล์ JPG, PNG, WEBP");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast(false, "ไฟล์ต้องมีขนาดไม่เกิน 2MB");
    return;
  }

  uploadingQR.value = account.id;
  try {
    const ext = file.name.split(".").pop() || "png";
    const fileName = `qr_${account.id}_${Date.now()}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("payment-qr")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("payment-qr")
      .getPublicUrl(fileName);

    // Update account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.rpc as any)("admin_update_account_qr", {
      p_account_id: account.id,
      p_qr_code_url: urlData.publicUrl,
    });

    if (updateError) throw updateError;

    showToast(true, "อัพโหลด QR Code สำเร็จ");
    await loadAccounts();
  } catch (err) {
    console.error("Error uploading QR:", err);
    showToast(false, "ไม่สามารถอัพโหลดได้");
  } finally {
    uploadingQR.value = null;
    input.value = "";
  }
}

async function removeQRCode(account: PaymentAccount): Promise<void> {
  if (!confirm("ต้องการลบ QR Code นี้หรือไม่?")) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("admin_update_account_qr", {
      p_account_id: account.id,
      p_qr_code_url: null,
    });
    if (error) throw error;
    showToast(true, "ลบ QR Code สำเร็จ");
    await loadAccounts();
  } catch (err) {
    console.error("Error removing QR:", err);
    showToast(false, "ไม่สามารถลบได้");
  }
}

function showToast(success: boolean, text: string): void {
  toast.value = { show: true, success, text };
  setTimeout(() => (toast.value.show = false), 4000);
}

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Finance" }, { label: "Payment Accounts" }]);
  loadAccounts();
});
</script>

<template>
  <div class="payment-accounts-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>บัญชีรับเงิน</h1>
        <span class="subtitle">จัดการบัญชีพร้อมเพย์และธนาคารสำหรับรับเงินเติมเงิน</span>
      </div>
      <button class="refresh-btn" @click="loadAccounts" :disabled="isLoading">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', toast.success ? 'success' : 'error']">
      {{ toast.text }}
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton" v-for="i in 4" :key="i" />
    </div>

    <template v-else>
      <!-- PromptPay Section -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon promptpay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <div>
            <h2>พร้อมเพย์ (PromptPay)</h2>
            <p>บัญชีรับเงินผ่านพร้อมเพย์</p>
          </div>
          <button class="add-btn" @click="openAddModal('promptpay')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มบัญชี
          </button>
        </div>

        <div v-if="promptpayAccounts.length === 0" class="empty-state">
          ยังไม่มีบัญชีพร้อมเพย์
        </div>

        <div v-else class="accounts-grid">
          <div v-for="account in promptpayAccounts" :key="account.id" class="account-card">
            <div class="card-header">
              <span v-if="account.is_default" class="default-badge">หลัก</span>
              <div class="card-actions">
                <button class="icon-btn" @click="openEditModal(account)" title="แก้ไข">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button class="icon-btn danger" @click="deleteAccount(account)" title="ลบ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- QR Code -->
            <div class="qr-section">
              <div v-if="account.qr_code_url" class="qr-preview">
                <img :src="account.qr_code_url" :alt="account.display_name || 'QR Code'" />
                <button class="remove-qr" @click="removeQRCode(account)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <label v-else class="qr-upload" :class="{ uploading: uploadingQR === account.id }">
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadQRCode(account, $event)" :disabled="uploadingQR === account.id" />
                <svg v-if="uploadingQR !== account.id" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div v-else class="spinner" />
                <span>{{ uploadingQR === account.id ? 'กำลังอัพโหลด...' : 'อัพโหลด QR Code' }}</span>
              </label>
            </div>

            <div class="card-info">
              <div class="info-row">
                <span class="label">ชื่อบัญชี</span>
                <span class="value">{{ account.account_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">เบอร์พร้อมเพย์</span>
                <span class="value mono">{{ account.account_number }}</span>
              </div>
              <div v-if="account.display_name" class="info-row">
                <span class="label">ชื่อที่แสดง</span>
                <span class="value">{{ account.display_name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bank Transfer Section -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon bank">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <div>
            <h2>บัญชีธนาคาร</h2>
            <p>บัญชีรับเงินผ่านการโอน</p>
          </div>
          <button class="add-btn" @click="openAddModal('bank_transfer')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            เพิ่มบัญชี
          </button>
        </div>

        <div v-if="bankAccounts.length === 0" class="empty-state">
          ยังไม่มีบัญชีธนาคาร
        </div>

        <div v-else class="accounts-grid">
          <div v-for="account in bankAccounts" :key="account.id" class="account-card bank">
            <div class="card-header">
              <span v-if="account.is_default" class="default-badge">หลัก</span>
              <div class="card-actions">
                <button class="icon-btn" @click="openEditModal(account)" title="แก้ไข">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button class="icon-btn danger" @click="deleteAccount(account)" title="ลบ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- QR Code -->
            <div class="qr-section">
              <div v-if="account.qr_code_url" class="qr-preview">
                <img :src="account.qr_code_url" :alt="account.display_name || 'QR Code'" />
                <button class="remove-qr" @click="removeQRCode(account)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <label v-else class="qr-upload" :class="{ uploading: uploadingQR === account.id }">
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadQRCode(account, $event)" :disabled="uploadingQR === account.id" />
                <svg v-if="uploadingQR !== account.id" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div v-else class="spinner" />
                <span>{{ uploadingQR === account.id ? 'กำลังอัพโหลด...' : 'อัพโหลด QR Code' }}</span>
              </label>
            </div>

            <div class="card-info">
              <div class="info-row">
                <span class="label">ธนาคาร</span>
                <span class="value">{{ account.bank_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">ชื่อบัญชี</span>
                <span class="value">{{ account.account_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">เลขบัญชี</span>
                <span class="value mono">{{ account.account_number }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ editingAccount ? 'แก้ไขบัญชี' : 'เพิ่มบัญชีใหม่' }}</h3>
            <button class="close-btn" @click="showModal = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>ประเภท</label>
              <div class="type-badge" :class="form.account_type">
                {{ form.account_type === 'promptpay' ? 'พร้อมเพย์' : 'ธนาคาร' }}
              </div>
            </div>

            <div class="form-group">
              <label>ชื่อบัญชี <span class="required">*</span></label>
              <input v-model="form.account_name" type="text" placeholder="เช่น บริษัท ABC จำกัด" />
            </div>

            <div class="form-group">
              <label>{{ form.account_type === 'promptpay' ? 'เบอร์พร้อมเพย์' : 'เลขบัญชี' }} <span class="required">*</span></label>
              <input v-model="form.account_number" type="text" :placeholder="form.account_type === 'promptpay' ? '0812345678' : '123-4-56789-0'" />
            </div>

            <template v-if="form.account_type === 'bank_transfer'">
              <div class="form-group">
                <label>ธนาคาร</label>
                <select v-model="form.bank_name" @change="form.bank_code = form.bank_name === 'ธนาคารกสิกรไทย' ? 'KBANK' : form.bank_name === 'ธนาคารกรุงเทพ' ? 'BBL' : form.bank_name === 'ธนาคารไทยพาณิชย์' ? 'SCB' : ''">
                  <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย</option>
                  <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ</option>
                  <option value="ธนาคารไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
                  <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย</option>
                  <option value="ธนาคารกรุงศรีอยุธยา">ธนาคารกรุงศรีอยุธยา</option>
                  <option value="ธนาคารทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
                </select>
              </div>
            </template>

            <div class="form-group">
              <label>ชื่อที่แสดง</label>
              <input v-model="form.display_name" type="text" placeholder="เช่น พร้อมเพย์ GOBEAR" />
            </div>

            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea v-model="form.description" rows="2" placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)" />
            </div>

            <div class="form-group checkbox">
              <label>
                <input type="checkbox" v-model="form.is_default" />
                <span>ตั้งเป็นบัญชีหลัก</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="showModal = false">ยกเลิก</button>
            <button class="btn-primary" @click="saveAccount" :disabled="isSaving">
              {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


<style scoped>
.payment-accounts-view { max-width: 1200px; margin: 0 auto; }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.header-left h1 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
.subtitle { font-size: 14px; color: #6b7280; }

.refresh-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; color: #6b7280; }
.refresh-btn:hover { background: #f9fafb; }

.toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 1001; }
.toast.success { background: #dcfce7; color: #166534; }
.toast.error { background: #fee2e2; color: #991b1b; }

.loading-state { display: flex; flex-direction: column; gap: 16px; }
.skeleton { height: 200px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.section { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }

.section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
.section-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.section-icon.promptpay { background: #e0f2fe; color: #0284c7; }
.section-icon.bank { background: #fef3c7; color: #d97706; }
.section-header h2 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
.section-header p { font-size: 13px; color: #6b7280; margin: 0; }
.section-header > div:nth-child(2) { flex: 1; }

.add-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: #00a86b; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.add-btn:hover { background: #009960; }

.empty-state { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }

.accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

.account-card { background: #f9fafb; border-radius: 12px; padding: 16px; border: 1px solid #e5e7eb; }
.account-card.bank { background: #fffbeb; border-color: #fde68a; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; min-height: 28px; }
.default-badge { background: #00a86b; color: #fff; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }
.card-actions { display: flex; gap: 4px; }
.icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; color: #6b7280; }
.icon-btn:hover { background: #f3f4f6; }
.icon-btn.danger:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }

.qr-section { margin-bottom: 16px; }
.qr-preview { position: relative; width: 160px; height: 160px; margin: 0 auto; }
.qr-preview img { width: 100%; height: 100%; object-fit: contain; border-radius: 8px; border: 2px solid #e5e7eb; background: #fff; }
.remove-qr { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; background: #ef4444; color: #fff; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.qr-upload { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 160px; height: 160px; margin: 0 auto; background: #fff; border: 2px dashed #d1d5db; border-radius: 8px; cursor: pointer; color: #9ca3af; transition: all 0.2s; }
.qr-upload:hover { border-color: #00a86b; color: #00a86b; }
.qr-upload.uploading { pointer-events: none; opacity: 0.7; }
.qr-upload input { display: none; }
.qr-upload span { font-size: 12px; margin-top: 8px; }

.spinner { width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #00a86b; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.bank-icon-large { display: flex; justify-content: center; margin: 16px 0; color: #d97706; }

.card-info { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 13px; }
.info-row .label { color: #6b7280; }
.info-row .value { color: #1f2937; font-weight: 500; }
.info-row .value.mono { font-family: monospace; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
.modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px; }

.modal-body { padding: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.form-group .required { color: #ef4444; }
.form-group input[type="text"], .form-group select, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #00a86b; }
.form-group textarea { resize: vertical; }
.form-group.checkbox label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.form-group.checkbox input { width: auto; }

.type-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; }
.type-badge.promptpay { background: #e0f2fe; color: #0284c7; }
.type-badge.bank_transfer { background: #fef3c7; color: #d97706; }

.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #e5e7eb; }
.btn-secondary { padding: 10px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary { padding: 10px 20px; background: #00a86b; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
