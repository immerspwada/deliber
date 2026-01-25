<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";
import { useErrorHandler } from "@/composables/useErrorHandler";
import { usePaymentAccountsSync } from "@/composables/usePaymentAccountsSync";
import { usePaymentAccounts, type PaymentAccount } from "@/composables/usePaymentAccounts";

const router = useRouter();
const route = useRoute();

interface TopupRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  payment_proof_url: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  rejection_reason: string | null;
  wallet_balance: number;
}

const authStore = useAuthStore();
const toast = useToast();
const errorHandler = useErrorHandler();
const { syncToWalletStore } = usePaymentAccountsSync();
const { 
  accounts: paymentAccountsData, 
  loading: paymentAccountsLoading,
  loadAccounts: loadPaymentAccounts,
  createAccount: createPaymentAccount,
  updateAccount: updatePaymentAccount,
  deleteAccount: deletePaymentAccount,
  uploadQRCode
} = usePaymentAccounts();

const topups = ref<TopupRequest[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const searchQuery = ref("");
const selectedTopup = ref<TopupRequest | null>(null);
const showDetailModal = ref(false);
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const rejectionReason = ref("");
const approvalNote = ref("");
const isProcessing = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(20);
const sortBy = ref<'date' | 'amount'>('date');
const sortOrder = ref<'asc' | 'desc'>('desc');
const showImageModal = ref(false);
const selectedImageUrl = ref<string | null>(null);
const autoRefresh = ref(false);
const refreshInterval = ref<number | null>(null);

// Settings state
const paymentMethods = ref([
  { id: "bank_transfer", name: "โอนเงินผ่านธนาคาร", enabled: true, fee: 0 },
  { id: "promptpay", name: "พร้อมเพย์", enabled: true, fee: 0 },
]);
const minTopupAmount = ref(100);
const maxTopupAmount = ref(50000);
const settingsSaved = ref(false);

// PromptPay settings - now using payment_receiving_accounts
const showPromptPayModal = ref(false);
const promptPayForm = ref<Partial<PaymentAccount>>({});
const editingPromptPayId = ref<string | null>(null);
const qrCodePreview = ref<string | null>(null);
const qrCodeInput = ref<HTMLInputElement | null>(null);
const qrCodeFile = ref<File | null>(null);

// Bank settings - now using payment_receiving_accounts
const showBankModal = ref(false);
const bankForm = ref<Partial<PaymentAccount>>({});
const editingBankId = ref<string | null>(null);
const bankQrCodePreview = ref<string | null>(null);
const bankQrCodeInput = ref<HTMLInputElement | null>(null);
const bankQrCodeFile = ref<File | null>(null);

const THAI_BANKS = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต' }
];

// Determine active tab from route
const activeTab = computed(() => {
  return route.path.includes("/settings") ? "settings" : "requests";
});

const stats = computed(() => {
  const pending = topups.value.filter((t) => t.status === "pending");
  const approved = topups.value.filter((t) => t.status === "approved");
  const rejected = topups.value.filter((t) => t.status === "rejected");

  return {
    total_pending: pending.length,
    total_pending_amount: pending.reduce((sum, t) => sum + Number(t.amount), 0),
    total_approved: approved.length,
    total_approved_amount: approved.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    ),
    total_rejected: rejected.length,
    today_approved: approved.filter((t) => isToday(t.processed_at)).length,
    today_approved_amount: approved
      .filter((t) => isToday(t.processed_at))
      .reduce((sum, t) => sum + Number(t.amount), 0),
  };
});

const filteredTopups = computed(() => {
  let filtered = topups.value;

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter((t) => t.status === statusFilter.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.user_name.toLowerCase().includes(query) ||
        t.user_email.toLowerCase().includes(query) ||
        t.user_phone?.toLowerCase().includes(query) ||
        t.payment_reference.toLowerCase().includes(query)
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortBy.value === 'date') {
      comparison = new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
    } else if (sortBy.value === 'amount') {
      comparison = a.amount - b.amount;
    }
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return filtered;
});

const paginatedTopups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredTopups.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredTopups.value.length / itemsPerPage.value);
});

const hasNextPage = computed(() => currentPage.value < totalPages.value);
const hasPrevPage = computed(() => currentPage.value > 1);

async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    // @ts-expect-error - Supabase RPC types not fully typed
    const { data, error: rpcError } = await supabase.rpc(
      "get_topup_requests_admin",
      {
        p_status: statusFilter.value,
        p_limit: 100,
        p_offset: 0,
      },
    ) as any;

    if (rpcError) throw rpcError;
    topups.value = data || [];
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    errorHandler.handle(e, "loadTopupRequests");
  } finally {
    loading.value = false;
  }
}

function onFilterChange() {
  currentPage.value = 1; // Reset to first page
  loadData();
}

function toggleSort(field: 'date' | 'amount') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = field;
    sortOrder.value = 'desc';
  }
}

function nextPage() {
  if (hasNextPage.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (hasPrevPage.value) {
    currentPage.value--;
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

// Watch search query and reset page
watch(searchQuery, () => {
  currentPage.value = 1;
});

function viewImage(url: string | null) {
  if (!url) return;
  selectedImageUrl.value = url;
  showImageModal.value = true;
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    // Refresh every 30 seconds
    refreshInterval.value = window.setInterval(() => {
      loadData();
    }, 30000);
    toast.success('เปิดการรีเฟรชอัตโนมัติ (ทุก 30 วินาที)');
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
    toast.success('ปิดการรีเฟรชอัตโนมัติ');
  }
}

async function quickApprove(topup: TopupRequest) {
  if (!confirm(`ยืนยันการอนุมัติเติมเงิน ${formatCurrency(topup.amount)} ให้ ${topup.user_name}?`)) {
    return;
  }

  isProcessing.value = true;
  try {
    const { data, error: rpcError } = await supabase.rpc(
      "admin_approve_topup_request",
      {
        p_request_id: topup.id,
        p_admin_id: authStore.user?.id,
        p_admin_note: 'Quick approve',
      },
    ) as any;

    if (rpcError) throw rpcError;

    if (data && data[0]?.success) {
      toast.success("อนุมัติเรียบร้อยแล้ว");
      await loadData();
    } else {
      toast.error(data?.[0]?.message || "เกิดข้อผิดพลาด");
    }
  } catch (e) {
    errorHandler.handle(e, "quickApprove");
  } finally {
    isProcessing.value = false;
  }
}

async function quickReject(topup: TopupRequest) {
  const reason = prompt(`ระบุเหตุผลในการปฏิเสธคำขอเติมเงิน ${formatCurrency(topup.amount)} ของ ${topup.user_name}:`);
  
  if (!reason || !reason.trim()) {
    return;
  }

  isProcessing.value = true;
  try {
    const { data, error: rpcError } = await supabase.rpc(
      "admin_reject_topup_request",
      {
        p_request_id: topup.id,
        p_admin_id: authStore.user?.id,
        p_admin_note: reason,
      },
    ) as any;

    if (rpcError) throw rpcError;

    if (data && data[0]?.success) {
      toast.success("ปฏิเสธเรียบร้อยแล้ว");
      await loadData();
    } else {
      toast.error(data?.[0]?.message || "เกิดข้อผิดพลาด");
    }
  } catch (e) {
    errorHandler.handle(e, "quickReject");
  } finally {
    isProcessing.value = false;
  }
}

// Cleanup on unmount
onMounted(() => {
  if (!route.path.includes("/settings")) {
    loadData();
  }
  loadSettings();
  
  return () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }
  };
});

function viewDetails(topup: TopupRequest) {
  selectedTopup.value = topup;
  showDetailModal.value = true;
}

function openApproveModal(topup: TopupRequest) {
  selectedTopup.value = topup;
  approvalNote.value = "";
  showApproveModal.value = true;
}

function openRejectModal(topup: TopupRequest) {
  selectedTopup.value = topup;
  rejectionReason.value = "";
  showRejectModal.value = true;
}

async function approveRequest() {
  if (!selectedTopup.value) return;

  isProcessing.value = true;
  try {
    // @ts-expect-error - Supabase RPC types not fully typed
    const { data, error: rpcError } = await supabase.rpc(
      "admin_approve_topup_request",
      {
        p_request_id: selectedTopup.value.id,
        p_admin_id: authStore.user?.id,
        p_admin_note: approvalNote.value || null,
      },
    ) as any;

    if (rpcError) throw rpcError;

    if (data && data[0]?.success) {
      toast.success("อนุมัติคำขอเติมเงินเรียบร้อยแล้ว");
      showApproveModal.value = false;
      showDetailModal.value = false;
      await loadData();
    } else {
      toast.error(data?.[0]?.message || "เกิดข้อผิดพลาด");
    }
  } catch (e) {
    errorHandler.handle(e, "approveTopupRequest");
  } finally {
    isProcessing.value = false;
  }
}

async function rejectRequest() {
  if (!selectedTopup.value || !rejectionReason.value.trim()) {
    toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
    return;
  }

  isProcessing.value = true;
  try {
    // @ts-expect-error - Supabase RPC types not fully typed
    const { data, error: rpcError } = await supabase.rpc(
      "admin_reject_topup_request",
      {
        p_request_id: selectedTopup.value.id,
        p_admin_id: authStore.user?.id,
        p_admin_note: rejectionReason.value,
      },
    ) as any;

    if (rpcError) throw rpcError;

    if (data && data[0]?.success) {
      toast.success("ปฏิเสธคำขอเติมเงินเรียบร้อยแล้ว");
      showRejectModal.value = false;
      showDetailModal.value = false;
      await loadData();
    } else {
      toast.error(data?.[0]?.message || "เกิดข้อผิดพลาด");
    }
  } catch (e) {
    errorHandler.handle(e, "rejectTopupRequest");
  } finally {
    isProcessing.value = false;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(date: string | null): boolean {
  if (!date) return false;
  const today = new Date();
  const checkDate = new Date(date);
  return today.toDateString() === checkDate.toDateString();
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "รอดำเนินการ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิก",
  };
  return labels[status] || status;
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: "โอนเงินผ่านธนาคาร",
    promptpay: "พร้อมเพย์",
    mobile_banking: "Mobile Banking",
    cash: "เงินสด",
    other: "อื่นๆ",
  };
  return labels[method] || method;
}

async function loadSettings() {
  try {
    // Load payment accounts from database
    await loadPaymentAccounts()
    
    // Load other settings from system_settings
    // @ts-expect-error - Supabase RPC types not fully typed
    const { data, error: rpcError } = await supabase.rpc(
      "get_system_settings",
      {
        p_category: "topup",
        p_key: "topup_settings",
      },
    ) as any;

    if (rpcError) {
      console.warn("Could not load settings:", rpcError);
      return;
    }

    if (data && data.length > 0) {
      const settings = data[0]?.value;
      if (settings?.payment_methods) {
        paymentMethods.value = settings.payment_methods;
      }
      if (settings?.min_topup_amount) {
        minTopupAmount.value = settings.min_topup_amount;
      }
      if (settings?.max_topup_amount) {
        maxTopupAmount.value = settings.max_topup_amount;
      }
    }
  } catch (e) {
    console.warn("Error loading settings:", e);
  }
}

async function saveSettings() {
  isProcessing.value = true;
  try {
    const settings = {
      payment_methods: paymentMethods.value,
      min_topup_amount: minTopupAmount.value,
      max_topup_amount: maxTopupAmount.value,
    };

    // @ts-expect-error - Supabase RPC types not fully typed
    const { error: rpcError } = await supabase.rpc("set_system_settings", {
      p_category: "topup",
      p_key: "topup_settings",
      p_value: settings,
      p_updated_by: authStore.user?.id,
    }) as any;

    if (rpcError) throw rpcError;

    // ซิงค์บัญชีพร้อมเพย์และธนาคารไปยัง wallet store
    await syncToWalletStore();

    settingsSaved.value = true;
    toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");

    setTimeout(() => {
      settingsSaved.value = false;
    }, 3000);
  } catch (e) {
    errorHandler.handle(e, "saveSettings");
  } finally {
    isProcessing.value = false;
  }
}

function openPromptPayModal() {
  showPromptPayModal.value = true;
  promptPayForm.value = {
    account_type: 'promptpay',
    account_name: '',
    account_number: '',
    qr_code_url: '',
    is_active: true,
    is_default: false,
    sort_order: paymentAccountsData.value.length
  };
  qrCodePreview.value = null;
  qrCodeFile.value = null;
  editingPromptPayId.value = null;
}

function editPromptPayAccount(account: PaymentAccount) {
  editingPromptPayId.value = account.id;
  promptPayForm.value = { ...account };
  qrCodePreview.value = account.qr_code_url || null;
  qrCodeFile.value = null;
  showPromptPayModal.value = true;
}

function handleQRCodeUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  qrCodeFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    qrCodePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function removeQRCode() {
  qrCodePreview.value = null;
  qrCodeFile.value = null;
  if (promptPayForm.value) {
    promptPayForm.value.qr_code_url = '';
  }
  if (qrCodeInput.value) {
    qrCodeInput.value.value = "";
  }
}

async function savePromptPayAccount() {
  if (!promptPayForm.value.account_number?.trim() || !promptPayForm.value.account_name?.trim()) {
    toast.error("กรุณากรอกเบอร์พร้อมเพย์และชื่อ");
    return;
  }

  isProcessing.value = true;
  try {
    // Upload QR code if new file selected
    let qrCodeUrl = promptPayForm.value.qr_code_url;
    if (qrCodeFile.value) {
      const accountId = editingPromptPayId.value || `promptpay_${Date.now()}`;
      const uploadedUrl = await uploadQRCode(qrCodeFile.value, accountId);
      if (uploadedUrl) {
        qrCodeUrl = uploadedUrl;
      }
    }

    const accountData: Partial<PaymentAccount> = {
      account_type: 'promptpay',
      account_name: promptPayForm.value.account_name!,
      account_number: promptPayForm.value.account_number!,
      qr_code_url: qrCodeUrl,
      display_name: promptPayForm.value.display_name || `พร้อมเพย์ ${promptPayForm.value.account_name}`,
      description: promptPayForm.value.description || 'โอนเงินผ่านพร้อมเพย์',
      is_active: promptPayForm.value.is_active ?? true,
      is_default: promptPayForm.value.is_default ?? false,
      sort_order: promptPayForm.value.sort_order ?? paymentAccountsData.value.length
    };

    let result;
    if (editingPromptPayId.value) {
      result = await updatePaymentAccount(editingPromptPayId.value, accountData);
    } else {
      result = await createPaymentAccount(accountData as Omit<PaymentAccount, 'id'>);
    }

    if (result.success) {
      await syncToWalletStore();
      toast.success('บันทึกบัญชีพร้อมเพย์เรียบร้อยแล้ว');
      showPromptPayModal.value = false;
      promptPayForm.value = {};
      qrCodePreview.value = null;
      qrCodeFile.value = null;
      editingPromptPayId.value = null;
    } else {
      toast.error('ไม่สามารถบันทึกบัญชีได้');
    }
  } catch (err) {
    console.error('[AdminTopupRequestsView] Save PromptPay error:', err);
    toast.error('เกิดข้อผิดพลาดในการบันทึก');
  } finally {
    isProcessing.value = false;
  }
}

async function deletePromptPayAccount(id: string) {
  if (!confirm('คุณต้องการลบบัญชีพร้อมเพย์นี้หรือไม่?')) return;
  
  const result = await deletePaymentAccount(id);
  if (result.success) {
    await syncToWalletStore();
    toast.success('ลบบัญชีพร้อมเพย์เรียบร้อยแล้ว');
  } else {
    toast.error('ไม่สามารถลบบัญชีได้');
  }
}

// Bank account functions
function openBankModal() {
  showBankModal.value = true;
  bankForm.value = {
    account_type: 'bank_transfer',
    bank_code: '',
    bank_name: '',
    account_number: '',
    account_name: '',
    qr_code_url: '',
    is_active: true,
    is_default: false,
    sort_order: paymentAccountsData.value.length
  };
  bankQrCodePreview.value = null;
  bankQrCodeFile.value = null;
  editingBankId.value = null;
}

function editBankAccount(account: PaymentAccount) {
  editingBankId.value = account.id;
  bankForm.value = { ...account };
  bankQrCodePreview.value = account.qr_code_url || null;
  bankQrCodeFile.value = null;
  showBankModal.value = true;
}

function handleBankQRCodeUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  bankQrCodeFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    bankQrCodePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function removeBankQRCode() {
  bankQrCodePreview.value = null;
  bankQrCodeFile.value = null;
  if (bankForm.value) {
    bankForm.value.qr_code_url = '';
  }
  if (bankQrCodeInput.value) {
    bankQrCodeInput.value.value = "";
  }
}

async function saveBankAccount() {
  if (!bankForm.value.bank_code || !bankForm.value.account_number || !bankForm.value.account_name) {
    toast.error("กรุณากรอกข้อมูลธนาคารให้ครบถ้วน");
    return;
  }

  const selectedBank = THAI_BANKS.find(b => b.code === bankForm.value.bank_code);
  if (!selectedBank) {
    toast.error("กรุณาเลือกธนาคาร");
    return;
  }

  isProcessing.value = true;
  try {
    // Upload QR code if new file selected
    let qrCodeUrl = bankForm.value.qr_code_url;
    if (bankQrCodeFile.value) {
      const accountId = editingBankId.value || `bank_${Date.now()}`;
      const uploadedUrl = await uploadQRCode(bankQrCodeFile.value, accountId);
      if (uploadedUrl) {
        qrCodeUrl = uploadedUrl;
      }
    }

    const accountData: Partial<PaymentAccount> = {
      account_type: 'bank_transfer',
      bank_code: bankForm.value.bank_code,
      bank_name: selectedBank.name,
      account_number: bankForm.value.account_number!,
      account_name: bankForm.value.account_name!,
      qr_code_url: qrCodeUrl,
      display_name: bankForm.value.display_name || selectedBank.name,
      description: bankForm.value.description || 'โอนเงินผ่านธนาคาร',
      is_active: bankForm.value.is_active ?? true,
      is_default: bankForm.value.is_default ?? false,
      sort_order: bankForm.value.sort_order ?? paymentAccountsData.value.length
    };

    let result;
    if (editingBankId.value) {
      result = await updatePaymentAccount(editingBankId.value, accountData);
    } else {
      result = await createPaymentAccount(accountData as Omit<PaymentAccount, 'id'>);
    }

    if (result.success) {
      await syncToWalletStore();
      toast.success('บันทึกบัญชีธนาคารเรียบร้อยแล้ว');
      showBankModal.value = false;
      bankForm.value = {};
      bankQrCodePreview.value = null;
      bankQrCodeFile.value = null;
      editingBankId.value = null;
    } else {
      toast.error('ไม่สามารถบันทึกบัญชีได้');
    }
  } catch (err) {
    console.error('[AdminTopupRequestsView] Save Bank error:', err);
    toast.error('เกิดข้อผิดพลาดในการบันทึก');
  } finally {
    isProcessing.value = false;
  }
}

async function deleteBankAccount(id: string) {
  if (!confirm('คุณต้องการลบบัญชีธนาคารนี้หรือไม่?')) return;
  
  const result = await deletePaymentAccount(id);
  if (result.success) {
    await syncToWalletStore();
    toast.success('ลบบัญชีธนาคารเรียบร้อยแล้ว');
  } else {
    toast.error('ไม่สามารถลบบัญชีได้');
  }
}

</script>

<template>
  <div class="admin-topup-container">
    <div class="admin-header">
      <h1>คำขอเติมเงิน</h1>
      <p>จัดการคำขอเติมเงินของลูกค้า</p>
    </div>

    <!-- Tabs -->
    <div class="tabs-section">
      <button
        :class="['tab', { active: activeTab === 'requests' }]"
        @click="router.push('/admin/topup-requests')"
      >
        คำขอเติมเงิน
      </button>
      <button
        :class="['tab', { active: activeTab === 'settings' }]"
        @click="router.push('/admin/topup-requests/settings')"
      >
        การตั้งค่า
      </button>
    </div>

    <!-- Settings Tab -->
    <div v-if="activeTab === 'settings'" class="settings-tab">
      <div class="settings-card">
        <h2>ข้อมูลการชำระเงิน</h2>

        <div class="settings-section">
          <h3>วิธีการชำระเงิน</h3>
          <div class="payment-methods-list">
            <div
              v-for="method in paymentMethods"
              :key="method.id"
              class="payment-method-item"
            >
              <div class="method-info">
                <input
                  :id="method.id"
                  v-model="method.enabled"
                  type="checkbox"
                />
                <label :for="method.id">{{ method.name }}</label>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>จำนวนเงินเติม</h3>
          <div class="amount-settings">
            <div class="amount-input">
              <label>จำนวนเงินขั้นต่ำ (บาท):</label>
              <input v-model.number="minTopupAmount" type="number" min="1" />
            </div>
            <div class="amount-input">
              <label>จำนวนเงินสูงสุด (บาท):</label>
              <input v-model.number="maxTopupAmount" type="number" min="1" />
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-header-with-button">
            <h3>บัญชีพร้อมเพย์</h3>
            <button
              class="btn btn-approve"
              @click="openPromptPayModal"
            >
              + เพิ่มบัญชี
            </button>
          </div>
          <div v-if="paymentAccountsData.filter(a => a.account_type === 'promptpay').length === 0" class="empty-message">
            ยังไม่มีบัญชีพร้อมเพย์
          </div>
          <div v-else class="promptpay-list">
            <div
              v-for="account in paymentAccountsData.filter(a => a.account_type === 'promptpay')"
              :key="account.id"
              class="promptpay-item"
            >
              <div class="promptpay-info">
                <div class="promptpay-name">{{ account.account_name }}</div>
                <div class="promptpay-phone">{{ account.account_number }}</div>
                <div v-if="account.qr_code_url" class="promptpay-qr-preview">
                  <img :src="account.qr_code_url" :alt="'QR Code ' + account.account_name" class="qr-thumbnail" />
                </div>
              </div>
              <div class="promptpay-actions">
                <button
                  class="btn btn-small btn-edit"
                  title="แก้ไข"
                  @click="editPromptPayAccount(account)"
                >
                  ✎
                </button>
                <button
                  class="btn btn-small btn-delete"
                  title="ลบ"
                  @click="deletePromptPayAccount(account.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-header-with-button">
            <h3>บัญชีธนาคาร</h3>
            <button
              class="btn btn-approve"
              @click="openBankModal"
            >
              + เพิ่มบัญชี
            </button>
          </div>
          <div v-if="paymentAccountsData.filter(a => a.account_type === 'bank_transfer').length === 0" class="empty-message">
            ยังไม่มีบัญชีธนาคาร
          </div>
          <div v-else class="bank-list">
            <div
              v-for="account in paymentAccountsData.filter(a => a.account_type === 'bank_transfer')"
              :key="account.id"
              class="bank-item"
            >
              <div class="bank-info">
                <div class="bank-name">{{ account.bank_name }}</div>
                <div class="bank-account">{{ account.account_number }} - {{ account.account_name }}</div>
                <div v-if="account.qr_code_url" class="bank-qr-preview">
                  <img :src="account.qr_code_url" :alt="'QR Code ' + account.bank_name" class="qr-thumbnail" />
                </div>
              </div>
              <div class="bank-actions">
                <button
                  class="btn btn-small btn-edit"
                  title="แก้ไข"
                  @click="editBankAccount(account)"
                >
                  ✎
                </button>
                <button
                  class="btn btn-small btn-delete"
                  title="ลบ"
                  @click="deleteBankAccount(account.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button
            :disabled="isProcessing"
            class="btn btn-approve"
            @click="saveSettings"
          >
            {{ isProcessing ? "กำลังบันทึก..." : "บันทึกการตั้งค่า" }}
          </button>
          <span v-if="settingsSaved" class="save-success">✓ บันทึกเรียบร้อยแล้ว</span>
        </div>
      </div>
    </div>

    <!-- Requests Tab -->
    <div v-if="activeTab === 'requests'">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p><strong>เกิดข้อผิดพลาด:</strong> {{ error }}</p>
      </div>

      <div v-else class="admin-content">
        <!-- Stats Section -->
        <div class="stats-grid">
          <div class="stat-card pending">
            <div class="stat-label">รอดำเนินการ</div>
            <div class="stat-number">{{ stats.total_pending }}</div>
            <div class="stat-amount">
              {{ formatCurrency(stats.total_pending_amount) }}
            </div>
          </div>
          <div class="stat-card approved">
            <div class="stat-label">อนุมัติแล้ว</div>
            <div class="stat-number">{{ stats.total_approved }}</div>
            <div class="stat-amount">
              {{ formatCurrency(stats.total_approved_amount) }}
            </div>
          </div>
          <div class="stat-card rejected">
            <div class="stat-label">ปฏิเสธ</div>
            <div class="stat-number">{{ stats.total_rejected }}</div>
          </div>
          <div class="stat-card today">
            <div class="stat-label">วันนี้</div>
            <div class="stat-number">{{ stats.today_approved }}</div>
            <div class="stat-amount">
              {{ formatCurrency(stats.today_approved_amount) }}
            </div>
          </div>
        </div>

        <!-- Filter Section -->
        <div class="filter-section">
          <div class="filter-left">
            <div class="search-box">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร, เลขอ้างอิง..."
                class="search-input"
              />
              <button
                v-if="searchQuery"
                class="clear-search"
                aria-label="ล้างการค้นหา"
                @click="searchQuery = ''"
              >
                ✕
              </button>
            </div>
            <select
              id="status-filter"
              v-model="statusFilter"
              class="status-select"
              @change="onFilterChange"
            >
              <option :value="null">ทุกสถานะ</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธ</option>
            </select>
          </div>
          <div class="filter-right">
            <button
              :class="['auto-refresh-btn', { active: autoRefresh }]"
              :title="autoRefresh ? 'ปิดการรีเฟรชอัตโนมัติ' : 'เปิดการรีเฟรชอัตโนมัติ'"
              @click="toggleAutoRefresh"
            >
              <svg class="refresh-icon" :class="{ spinning: autoRefresh }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              {{ autoRefresh ? 'กำลังรีเฟรช' : 'รีเฟรชอัตโนมัติ' }}
            </button>
            <button
              class="refresh-btn"
              :disabled="loading"
              title="รีเฟรชข้อมูล"
              @click="loadData"
            >
              <svg class="refresh-icon" :class="{ spinning: loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
            <span class="count">{{ filteredTopups.length }} รายการ</span>
          </div>
        </div>

        <!-- Table Section -->
        <div class="table-section">
          <table class="data-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th class="sortable" @click="toggleSort('amount')">
                  <div class="th-content">
                    จำนวนเงิน
                    <span v-if="sortBy === 'amount'" class="sort-icon">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>
                <th>วิธีชำระเงิน</th>
                <th>สถานะ</th>
                <th class="sortable" @click="toggleSort('date')">
                  <div class="th-content">
                    วันที่
                    <span v-if="sortBy === 'date'" class="sort-icon">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>
                <th class="action-header">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="topup in paginatedTopups"
                :key="topup.id"
                class="data-row"
              >
                <td class="customer-cell">
                  <div class="customer-info">
                    <div class="customer-avatar">
                      {{ topup.user_name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="customer-name">{{ topup.user_name }}</div>
                      <div class="customer-contact">
                        {{ topup.user_phone || topup.user_email }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="amount-cell">
                  <div class="amount">{{ formatCurrency(topup.amount) }}</div>
                  <div class="wallet">
                    Wallet: {{ formatCurrency(topup.wallet_balance) }}
                  </div>
                </td>
                <td>{{ getPaymentMethodLabel(topup.payment_method) }}</td>
                <td>
                  <span class="status-badge" :class="topup.status">
                    {{ getStatusLabel(topup.status) }}
                  </span>
                </td>
                <td class="date-cell">{{ formatDate(topup.requested_at) }}</td>
                <td class="action-cell">
                  <div class="action-buttons">
                    <button
                      v-if="topup.status === 'pending'"
                      class="btn btn-approve btn-icon"
                      title="อนุมัติด่วน"
                      :disabled="isProcessing"
                      @click="quickApprove(topup)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      v-if="topup.status === 'pending'"
                      class="btn btn-reject btn-icon"
                      title="ปฏิเสธด่วน"
                      :disabled="isProcessing"
                      @click="quickReject(topup)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      class="btn btn-view btn-icon"
                      title="ดูรายละเอียด"
                      @click="viewDetails(topup)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="paginatedTopups.length === 0" class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="empty-title">ไม่พบข้อมูล</p>
            <p class="empty-subtitle">
              {{ searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีคำขอเติมเงิน' }}
            </p>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="pagination">
            <button
              :disabled="!hasPrevPage"
              class="pagination-btn"
              aria-label="หน้าก่อนหน้า"
              @click="prevPage"
            >
              ← ก่อนหน้า
            </button>
            <div class="pagination-pages">
              <button
                v-for="page in totalPages"
                :key="page"
                :class="['pagination-page', { active: page === currentPage }]"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              :disabled="!hasNextPage"
              class="pagination-btn"
              aria-label="หน้าถัดไป"
              @click="nextPage"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="showDetailModal && selectedTopup"
      class="modal-overlay"
      @click.self="showDetailModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>รายละเอียดคำขอเติมเงิน</h2>
          <button class="close-btn" @click="showDetailModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>ลูกค้า</label>
              <p>{{ selectedTopup.user_name }}</p>
            </div>
            <div class="detail-item">
              <label>อีเมล</label>
              <p>{{ selectedTopup.user_email }}</p>
            </div>
            <div class="detail-item">
              <label>เบอร์โทร</label>
              <p>{{ selectedTopup.user_phone || "-" }}</p>
            </div>
            <div class="detail-item">
              <label>จำนวนเงิน</label>
              <p class="amount-highlight">
                {{ formatCurrency(selectedTopup.amount) }}
              </p>
            </div>
            <div class="detail-item">
              <label>วิธีชำระเงิน</label>
              <p>{{ getPaymentMethodLabel(selectedTopup.payment_method) }}</p>
            </div>
            <div class="detail-item">
              <label>เลขอ้างอิง</label>
              <p class="reference">{{ selectedTopup.payment_reference }}</p>
            </div>
            <div class="detail-item">
              <label>สถานะ</label>
              <p>
                <span class="status-badge" :class="selectedTopup.status">
                  {{ getStatusLabel(selectedTopup.status) }}
                </span>
              </p>
            </div>
            <div class="detail-item">
              <label>Wallet ปัจจุบัน</label>
              <p>{{ formatCurrency(selectedTopup.wallet_balance) }}</p>
            </div>
            <div v-if="selectedTopup.payment_proof_url" class="detail-item full-width">
              <label>หลักฐานการโอนเงิน</label>
              <div class="proof-image-container">
                <img 
                  :src="selectedTopup.payment_proof_url" 
                  alt="หลักฐานการโอนเงิน"
                  class="proof-image"
                  @click="viewImage(selectedTopup.payment_proof_url)"
                />
                <button
                  class="view-full-btn"
                  @click="viewImage(selectedTopup.payment_proof_url)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  ดูขนาดเต็ม
                </button>
              </div>
            </div>
            <div v-if="selectedTopup.rejection_reason" class="detail-item full-width">
              <label>เหตุผลที่ปฏิเสธ</label>
              <p class="rejection-reason">{{ selectedTopup.rejection_reason }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Modal -->
    <div
      v-if="showApproveModal && selectedTopup"
      class="modal-overlay"
      @click.self="showApproveModal = false"
    >
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>ยืนยันการอนุมัติ</h2>
          <button class="close-btn" @click="showApproveModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p>
            ลูกค้า: <strong>{{ selectedTopup.user_name }}</strong>
          </p>
          <p>
            จำนวนเงิน:
            <strong>{{ formatCurrency(selectedTopup.amount) }}</strong>
          </p>
          <textarea
            v-model="approvalNote"
            placeholder="หมายเหตุ (ถ้ามี)"
            rows="3"
          ></textarea>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showApproveModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="isProcessing"
              class="btn btn-approve"
              @click="approveRequest"
            >
              {{ isProcessing ? "กำลังดำเนินการ..." : "ยืนยันอนุมัติ" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div
      v-if="showRejectModal && selectedTopup"
      class="modal-overlay"
      @click.self="showRejectModal = false"
    >
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>ยืนยันการปฏิเสธ</h2>
          <button class="close-btn" @click="showRejectModal = false">✕</button>
        </div>
        <div class="modal-body">
          <p>
            ลูกค้า: <strong>{{ selectedTopup.user_name }}</strong>
          </p>
          <p>
            จำนวนเงิน:
            <strong>{{ formatCurrency(selectedTopup.amount) }}</strong>
          </p>
          <textarea
            v-model="rejectionReason"
            placeholder="เหตุผลในการปฏิเสธ *"
            rows="3"
            required
          ></textarea>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showRejectModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="isProcessing || !rejectionReason.trim()"
              class="btn btn-reject"
              @click="rejectRequest"
            >
              {{ isProcessing ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PromptPay Modal -->
    <div
      v-if="showPromptPayModal"
      class="modal-overlay"
      @click.self="showPromptPayModal = false"
    >
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>{{ editingPromptPayId ? "แก้ไขบัญชีพร้อมเพย์" : "เพิ่มบัญชีพร้อมเพย์" }}</h2>
          <button class="close-btn" @click="showPromptPayModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="promptpay-phone">เบอร์พร้อมเพย์ *</label>
            <input
              id="promptpay-phone"
              v-model="promptPayForm.account_number"
              type="tel"
              placeholder="เช่น 0812345678"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="promptpay-name">ชื่อบัญชี *</label>
            <input
              id="promptpay-name"
              v-model="promptPayForm.account_name"
              type="text"
              placeholder="เช่น บริษัท ABC"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>QR Code พร้อมเพย์</label>
            <div v-if="qrCodePreview" class="qr-preview-container">
              <img :src="qrCodePreview" :alt="'QR Code ' + promptPayForm.account_name" class="qr-preview-image" />
              <button
                class="btn btn-small btn-delete"
                title="ลบ QR Code"
                @click="removeQRCode"
              >
                ✕
              </button>
            </div>
            <label v-else class="qr-upload-area">
              <input
                ref="qrCodeInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display: none"
                @change="handleQRCodeUpload"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span class="upload-text">คลิกเพื่อเลือก QR Code</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showPromptPayModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="isProcessing || !promptPayForm.account_number?.trim() || !promptPayForm.account_name?.trim()"
              class="btn btn-approve"
              @click="savePromptPayAccount"
            >
              {{ isProcessing ? "กำลังบันทึก..." : "บันทึก" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bank Modal -->
    <div
      v-if="showBankModal"
      class="modal-overlay"
      @click.self="showBankModal = false"
    >
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>{{ editingBankId ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร" }}</h2>
          <button class="close-btn" @click="showBankModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="bank-select">ธนาคาร *</label>
            <select
              id="bank-select"
              v-model="bankForm.bank_code"
              class="form-input"
            >
              <option value="">-- เลือกธนาคาร --</option>
              <option v-for="bank in THAI_BANKS" :key="bank.code" :value="bank.code">
                {{ bank.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="bank-account">เลขบัญชี *</label>
            <input
              id="bank-account"
              v-model="bankForm.account_number"
              type="text"
              placeholder="เช่น 1234567890"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="bank-name">ชื่อบัญชี *</label>
            <input
              id="bank-name"
              v-model="bankForm.account_name"
              type="text"
              placeholder="เช่น บริษัท ABC"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>QR Code ธนาคาร</label>
            <div v-if="bankQrCodePreview" class="qr-preview-container">
              <img :src="bankQrCodePreview" :alt="'QR Code ' + bankForm.bank_name" class="qr-preview-image" />
              <button
                class="btn btn-small btn-delete"
                title="ลบ QR Code"
                @click="removeBankQRCode"
              >
                ✕
              </button>
            </div>
            <label v-else class="qr-upload-area">
              <input
                ref="bankQrCodeInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display: none"
                @change="handleBankQRCodeUpload"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span class="upload-text">คลิกเพื่อเลือก QR Code</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showBankModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="isProcessing || !bankForm.bank_code || !bankForm.account_number || !bankForm.account_name"
              class="btn btn-approve"
              @click="saveBankAccount"
            >
              {{ isProcessing ? "กำลังบันทึก..." : "บันทึก" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div
      v-if="showImageModal && selectedImageUrl"
      class="modal-overlay image-modal-overlay"
      @click.self="showImageModal = false"
    >
      <div class="image-modal-content">
        <button class="close-btn image-close-btn" @click="showImageModal = false">✕</button>
        <img :src="selectedImageUrl" alt="หลักฐานการโอนเงิน" class="full-image" />
        <div class="image-actions">
          <a 
            :href="selectedImageUrl" 
            target="_blank" 
            class="btn btn-view"
            download
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            ดาวน์โหลด
          </a>
          <a 
            :href="selectedImageUrl" 
            target="_blank" 
            class="btn btn-approve"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            เปิดในแท็บใหม่
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.admin-topup-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}

.admin-header {
  margin-bottom: 30px;
}

.admin-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 5px;
}

.admin-header p {
  color: #666;
  font-size: 14px;
}

.tabs-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  padding: 12px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.settings-tab {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.settings-card {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-card h2 {
  font-size: 20px;
  color: #333;
  margin-bottom: 25px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
}

.settings-section {
  margin-bottom: 30px;
}

.settings-section h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 15px;
}

.payment-methods-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.payment-method-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.method-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.method-info input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.method-info label {
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.method-fee {
  display: flex;
  align-items: center;
  gap: 10px;
}

.method-fee label {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
}

.method-fee input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.amount-settings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.amount-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.amount-input label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.amount-input input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.save-success {
  color: #28a745;
  font-size: 14px;
  font-weight: 500;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #ccc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card.pending {
  border-left-color: #ffc107;
}
.stat-card.approved {
  border-left-color: #28a745;
}
.stat-card.rejected {
  border-left-color: #dc3545;
}
.stat-card.today {
  border-left-color: #007bff;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-amount {
  font-size: 12px;
  color: #999;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #999;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: #e0e0e0;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.clear-search:hover {
  background: #ccc;
  color: #333;
}

.status-select {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
  min-width: 150px;
}

.status-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.count {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.table-section {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: #f9f9f9;
  border-bottom: 2px solid #e0e0e0;
}

.data-table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  font-size: 13px;
  text-transform: uppercase;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
  transition: background 0.2s;
}

.data-table th.sortable:hover {
  background: #f0f0f0;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  font-size: 14px;
  color: #007bff;
}

.action-header {
  text-align: center;
}

.data-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.data-table tbody tr:hover {
  background: #fafafa;
}

.data-table td {
  padding: 15px;
  font-size: 14px;
  color: #333;
}

.customer-cell {
  width: 200px;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.customer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.customer-name {
  font-weight: 500;
  color: #333;
}

.customer-contact {
  font-size: 12px;
  color: #999;
}

.amount-cell {
  width: 150px;
}

.amount {
  font-weight: 600;
  color: #007bff;
}

.wallet {
  font-size: 12px;
  color: #999;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.approved {
  background: #d4edda;
  color: #155724;
}

.status-badge.rejected {
  background: #f8d7da;
  color: #721c24;
}

.date-cell {
  font-size: 13px;
  color: #666;
  width: 150px;
}

.action-cell {
  text-align: center;
  width: 140px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  padding: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

.btn-approve {
  background: #28a745;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
}

.btn-reject {
  background: #dc3545;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.btn-view {
  background: #007bff;
  color: white;
}

.btn-view:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  color: #ccc;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: #999;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.pagination-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #007bff;
  color: #007bff;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 5px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-page:hover {
  background: #f5f5f5;
  border-color: #007bff;
  color: #007bff;
}

.pagination-page.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.pagination-page.active:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  display: block;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.detail-item p {
  font-size: 14px;
  color: #333;
}

.amount-highlight {
  font-size: 18px;
  font-weight: bold;
  color: #007bff;
}

.reference {
  font-family: monospace;
  background: #f5f5f5;
  padding: 5px 8px;
  border-radius: 4px;
}

.proof-image-container {
  position: relative;
  display: inline-block;
}

.proof-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
}

.proof-image:hover {
  border-color: #007bff;
  transform: scale(1.02);
}

.view-full-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.view-full-btn svg {
  width: 16px;
  height: 16px;
}

.view-full-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.rejection-reason {
  background: #fee;
  border-left: 4px solid #dc3545;
  padding: 12px;
  border-radius: 4px;
  color: #721c24;
}

.image-modal-overlay {
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
}

.image-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.image-close-btn {
  position: absolute;
  top: -50px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 32px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.image-close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.full-image {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.image-actions {
  display: flex;
  gap: 10px;
}

.image-actions .btn {
  padding: 10px 20px;
}

.image-actions svg {
  width: 18px;
  height: 18px;
}

.auto-refresh-btn,
.refresh-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  padding: 8px;
  min-width: 40px;
}

.auto-refresh-btn:hover,
.refresh-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #007bff;
  color: #007bff;
}

.auto-refresh-btn.active {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.refresh-icon {
  width: 18px;
  height: 18px;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  margin: 15px 0;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.section-header-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header-with-button h3 {
  margin: 0;
}

.empty-message {
  padding: 20px;
  text-align: center;
  color: #999;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px dashed #ddd;
}

.promptpay-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.promptpay-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.promptpay-info {
  flex: 1;
}

.promptpay-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.promptpay-phone {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}

.promptpay-qr-preview {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.qr-thumbnail {
  width: 60px;
  height: 60px;
  border: 1px solid #ddd;
  border-radius: 4px;
  object-fit: cover;
}

.promptpay-actions {
  display: flex;
  gap: 5px;
}

.btn-small {
  padding: 4px 8px;
  font-size: 11px;
  min-width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit {
  background: #007bff;
  color: white;
}

.btn-edit:hover {
  background: #0056b3;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #333;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.qr-preview-container {
  position: relative;
  display: inline-block;
  width: 100%;
  text-align: center;
  margin-bottom: 10px;
}

.qr-preview-image {
  width: 150px;
  height: 150px;
  border: 2px solid #ddd;
  border-radius: 6px;
  object-fit: cover;
}

.qr-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  border: 2px dashed #ddd;
  border-radius: 6px;
  background: #f9f9f9;
  cursor: pointer;
  transition: all 0.2s;
}

.qr-upload-area:hover {
  border-color: #007bff;
  background: #f0f7ff;
}

.qr-upload-area svg {
  width: 40px;
  height: 40px;
  color: #999;
  margin-bottom: 10px;
}

.upload-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.bank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bank-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.bank-info {
  flex: 1;
}

.bank-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.bank-account {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}

.bank-qr-preview {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}

.bank-actions {
  display: flex;
  gap: 5px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .count {
    margin-left: 0;
  }

  .data-table {
    font-size: 12px;
  }

  .data-table th,
  .data-table td {
    padding: 10px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
