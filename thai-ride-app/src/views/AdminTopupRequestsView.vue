<script setup lang="ts">
/**
 * AdminTopupRequestsView - Admin Topup Request Management
 * Feature: F05 - Wallet/Balance (Admin Side)
 * UX/UI Redesign: Clean, Modern, Professional - MUNEEF Style
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TopupRequest {
  id: string;
  tracking_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_member_uid: string;
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  slip_url: string | null;
  status: string;
  admin_id: string | null;
  admin_name: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  expires_at: string | null;
}

interface TopupStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  cancelled_requests: number;
  expired_requests: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  avg_processing_time_minutes: number;
}

const requests = ref<TopupRequest[]>([]);
const stats = ref<TopupStats | null>(null);
const loading = ref(false);
const statusFilter = ref<string | null>(null);
const searchQuery = ref("");
const selectedRequest = ref<TopupRequest | null>(null);
const showDetailModal = ref(false);
const showActionModal = ref(false);
const actionType = ref<"approve" | "reject">("approve");
const adminNote = ref("");
const actionLoading = ref(false);
const toast = ref({ show: false, success: false, text: "" });
const realtimeChannel = ref<RealtimeChannel | null>(null);
const lastUpdate = ref<Date>(new Date());
const viewMode = ref<"cards" | "table">("cards");

const statsComputed = computed(() => {
  if (stats.value) return stats.value;
  const pending = requests.value.filter((r) => r.status === "pending").length;
  const approved = requests.value.filter((r) => r.status === "approved").length;
  const rejected = requests.value.filter((r) => r.status === "rejected").length;
  const totalPending = requests.value.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);
  return {
    total_requests: requests.value.length,
    pending_requests: pending,
    approved_requests: approved,
    rejected_requests: rejected,
    cancelled_requests: 0,
    expired_requests: 0,
    total_amount: requests.value.reduce((sum, r) => sum + r.amount, 0),
    pending_amount: totalPending,
    approved_amount: requests.value.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount, 0),
    avg_processing_time_minutes: 0,
  };
});

const filteredRequests = computed(() => {
  let filtered = requests.value;
  if (statusFilter.value) filtered = filtered.filter((r) => r.status === statusFilter.value);
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter((r) =>
      r.tracking_id.toLowerCase().includes(query) ||
      r.user_name.toLowerCase().includes(query) ||
      r.user_phone?.toLowerCase().includes(query) ||
      r.user_member_uid?.toLowerCase().includes(query)
    );
  }
  return filtered;
});

const pendingRequests = computed(() => requests.value.filter((r) => r.status === "pending"));

onMounted(() => { fetchRequests(); fetchStats(); setupRealtimeSubscription(); });
onUnmounted(() => { if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value); });

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => fetchRequests(), 300); });

const fetchRequests = async () => {
  loading.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)("admin_get_topup_requests_enhanced", { p_status: statusFilter.value, p_limit: 100, p_search: searchQuery.value.trim() || null });
    if (error) throw error;
    requests.value = data || [];
    lastUpdate.value = new Date();
  } catch (err) {
    console.error("Error fetching topup requests:", err);
    try {
      const { data } = await (supabase.rpc as any)("admin_get_topup_requests", { p_status: statusFilter.value, p_limit: 100 });
      if (data) requests.value = data.map((r: any) => ({ ...r, user_member_uid: r.user_member_uid || "", admin_name: r.admin_name || null }));
    } catch { requests.value = []; }
  } finally { loading.value = false; }
};

const fetchStats = async () => {
  try {
    const { data, error } = await (supabase.rpc as any)("admin_get_topup_stats", { p_date_from: null, p_date_to: null });
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (err) { console.error("Error fetching topup stats:", err); }
};

const setupRealtimeSubscription = async () => {
  try {
    await supabase.realtime.setAuth();
    realtimeChannel.value = supabase.channel("admin:topup_requests", { config: { private: true } });
    realtimeChannel.value.on("broadcast", { event: "topup_request_created" }, (payload) => { handleRealtimeUpdate(payload.payload, "created"); })
      .on("broadcast", { event: "topup_request_updated" }, (payload) => { handleRealtimeUpdate(payload.payload, "updated"); }).subscribe();
  } catch (error) { console.error("Error setting up realtime:", error); }
};

const handleRealtimeUpdate = (payload: any, type: "created" | "updated" | "deleted") => {
  fetchRequests(); fetchStats();
  if (type === "created") showToast(true, `คำขอใหม่: ${payload.tracking_id}`);
  lastUpdate.value = new Date();
};

const openDetail = (request: TopupRequest) => { selectedRequest.value = request; showDetailModal.value = true; };
const openAction = (request: TopupRequest, type: "approve" | "reject") => { selectedRequest.value = request; actionType.value = type; adminNote.value = ""; showActionModal.value = true; };

const handleAction = async () => {
  if (!selectedRequest.value) return;
  actionLoading.value = true;
  try {
    const funcName = actionType.value === "approve" ? "admin_approve_topup_request" : "admin_reject_topup_request";
    const { data, error } = await (supabase.rpc as any)(funcName, { p_request_id: selectedRequest.value.id, p_admin_note: adminNote.value || null });
    if (error) throw error;
    const result = data?.[0];
    if (result?.success) { showToast(true, result.message); showActionModal.value = false; setTimeout(() => { fetchRequests(); fetchStats(); }, 500); }
    else showToast(false, result?.message || "เกิดข้อผิดพลาด");
  } catch (err: any) { showToast(false, err.message || "เกิดข้อผิดพลาด"); }
  finally { actionLoading.value = false; }
};

const refreshData = async () => { await Promise.all([fetchRequests(), fetchStats()]); showToast(true, "รีเฟรชข้อมูลแล้ว"); };
const handleFilterChange = (newFilter: string | null) => { statusFilter.value = newFilter; fetchRequests(); };
const showToast = (success: boolean, text: string) => { toast.value = { show: true, success, text }; setTimeout(() => { toast.value.show = false; }, 3000); };

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const formatRelativeTime = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
};

const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = { promptpay: "พร้อมเพย์", bank_transfer: "โอนธนาคาร", credit_card: "บัตรเครดิต" };
  return methods[method] || method;
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: "รอดำเนินการ", bg: "bg-amber-50", text: "text-amber-700" },
    approved: { label: "อนุมัติแล้ว", bg: "bg-emerald-50", text: "text-emerald-700" },
    rejected: { label: "ปฏิเสธ", bg: "bg-red-50", text: "text-red-700" },
    cancelled: { label: "ยกเลิก", bg: "bg-gray-50", text: "text-gray-600" },
    expired: { label: "หมดอายุ", bg: "bg-gray-50", text: "text-gray-500" }
  };
  return configs[status] || { label: status, bg: "bg-gray-50", text: "text-gray-600" };
};

const getPaymentIcon = (method: string): string => {
  const icons: Record<string, string> = {
    promptpay: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    bank_transfer: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    credit_card: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
  };
  return icons[method] || icons.promptpay;
};
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" :class="['fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3', toast.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white']">
        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
          <svg v-if="toast.success" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <span class="font-medium">{{ toast.text }}</span>
      </div>
    </Transition>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">คำขอเติมเงิน</h1>
          <p class="text-gray-500 text-sm mt-1">อัพเดทล่าสุด {{ formatRelativeTime(lastUpdate.toISOString()) }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex bg-white rounded-xl p-1 border border-gray-200">
            <button @click="viewMode = 'cards'" :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', viewMode === 'cards' ? 'bg-[#00A86B] text-white' : 'text-gray-600 hover:bg-gray-100']">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            </button>
            <button @click="viewMode = 'table'" :class="['px-3 py-1.5 rounded-lg text-sm font-medium transition-all', viewMode === 'table' ? 'bg-[#00A86B] text-white' : 'text-gray-600 hover:bg-gray-100']">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
          </div>
          <button @click="refreshData" :disabled="loading" class="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 text-sm font-medium text-gray-700">
            <svg :class="['w-4 h-4', { 'animate-spin': loading }]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span class="hidden sm:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="col-span-2 lg:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-24 h-24 bg-amber-200/30 rounded-full -mr-8 -mt-8"></div>
          <div class="relative">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span class="text-amber-700 font-medium text-sm">รอดำเนินการ</span>
            </div>
            <div class="text-3xl font-bold text-amber-800">{{ statsComputed.pending_requests }}</div>
            <div class="text-amber-600 text-sm mt-1">฿{{ statsComputed.pending_amount.toLocaleString() }}</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <span class="text-gray-600 font-medium text-sm">อนุมัติแล้ว</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ statsComputed.approved_requests }}</div>
          <div class="text-emerald-600 text-sm mt-1">฿{{ statsComputed.approved_amount.toLocaleString() }}</div>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <span class="text-gray-600 font-medium text-sm">ปฏิเสธ</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ statsComputed.rejected_requests }}</div>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <span class="text-gray-600 font-medium text-sm">ทั้งหมด</span>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ statsComputed.total_requests }}</div>
          <div class="text-gray-500 text-sm mt-1">฿{{ statsComputed.total_amount.toLocaleString() }}</div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="relative flex-1">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input v-model="searchQuery" type="text" placeholder="ค้นหาด้วยรหัส, ชื่อ, เบอร์โทร..." class="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-[#00A86B]/20 focus:bg-white transition-all outline-none"/>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button @click="handleFilterChange(null)" :class="['px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', !statusFilter ? 'bg-[#00A86B] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">ทั้งหมด</button>
            <button @click="handleFilterChange('pending')" :class="['px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2', statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">
              <span class="relative flex h-2 w-2" v-if="statsComputed.pending_requests > 0 && statusFilter !== 'pending'"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
              รอดำเนินการ<span v-if="statsComputed.pending_requests > 0" :class="['text-xs px-1.5 py-0.5 rounded-full', statusFilter === 'pending' ? 'bg-white/20' : 'bg-amber-100 text-amber-700']">{{ statsComputed.pending_requests }}</span>
            </button>
            <button @click="handleFilterChange('approved')" :class="['px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', statusFilter === 'approved' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">อนุมัติแล้ว</button>
            <button @click="handleFilterChange('rejected')" :class="['px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', statusFilter === 'rejected' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']">ปฏิเสธ</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <div class="w-12 h-12 border-4 border-[#00A86B]/20 border-t-[#00A86B] rounded-full animate-spin"></div>
        <p class="text-gray-500 mt-4">กำลังโหลดข้อมูล...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredRequests.length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-1">ไม่พบคำขอเติมเงิน</h3>
        <p class="text-gray-500 text-sm">{{ searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีคำขอเติมเงินในขณะนี้' }}</p>
      </div>

      <!-- Cards View -->
      <template v-else-if="viewMode === 'cards'">
        <div v-if="!statusFilter && pendingRequests.length > 0" class="space-y-3">
          <h2 class="text-sm font-semibold text-amber-700 flex items-center gap-2">
            <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>
            รอดำเนินการ ({{ pendingRequests.length }})
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="req in pendingRequests" :key="req.id" class="bg-white rounded-2xl border-2 border-amber-200 p-4 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer" @click="openDetail(req)">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                    <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getPaymentIcon(req.payment_method)"/></svg>
                  </div>
                  <div><div class="font-semibold text-gray-900">{{ req.user_name }}</div><div class="text-xs text-gray-500 font-mono">{{ req.tracking_id }}</div></div>
                </div>
                <span class="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">รอดำเนินการ</span>
              </div>
              <div class="text-2xl font-bold text-[#00A86B] mb-3">฿{{ req.amount.toLocaleString() }}</div>
              <div class="flex items-center justify-between text-sm text-gray-500 mb-4"><span>{{ formatPaymentMethod(req.payment_method) }}</span><span>{{ formatRelativeTime(req.created_at) }}</span></div>
              <div class="flex gap-2" @click.stop>
                <button @click="openAction(req, 'reject')" class="flex-1 py-2.5 px-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">ปฏิเสธ</button>
                <button @click="openAction(req, 'approve')" class="flex-1 py-2.5 px-3 bg-[#00A86B] text-white text-sm font-medium rounded-xl hover:bg-[#008F5B] transition-all flex items-center justify-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>อนุมัติ
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="filteredRequests.filter(r => statusFilter || r.status !== 'pending').length > 0" class="space-y-3">
          <h2 v-if="!statusFilter && pendingRequests.length > 0" class="text-sm font-semibold text-gray-600 mt-6">รายการอื่นๆ</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="req in filteredRequests.filter(r => statusFilter || r.status !== 'pending')" :key="req.id" class="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer" @click="openDetail(req)">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div :class="['w-12 h-12 rounded-xl flex items-center justify-center', req.status === 'approved' ? 'bg-emerald-50' : req.status === 'rejected' ? 'bg-red-50' : 'bg-gray-100']">
                    <svg :class="['w-6 h-6', req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-red-500' : 'text-gray-500']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="req.status === 'approved'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      <path v-else-if="req.status === 'rejected'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getPaymentIcon(req.payment_method)"/>
                    </svg>
                  </div>
                  <div><div class="font-semibold text-gray-900">{{ req.user_name }}</div><div class="text-xs text-gray-500 font-mono">{{ req.tracking_id }}</div></div>
                </div>
                <span :class="['px-2.5 py-1 text-xs font-medium rounded-lg', getStatusConfig(req.status).bg, getStatusConfig(req.status).text]">{{ getStatusConfig(req.status).label }}</span>
              </div>
              <div :class="['text-xl font-bold mb-2', req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-gray-400 line-through' : 'text-gray-900']">฿{{ req.amount.toLocaleString() }}</div>
              <div class="flex items-center justify-between text-sm text-gray-500"><span>{{ formatPaymentMethod(req.payment_method) }}</span><span>{{ formatRelativeTime(req.created_at) }}</span></div>
              <div v-if="req.admin_note" class="mt-3 pt-3 border-t border-gray-100"><p class="text-xs text-gray-500 line-clamp-2">{{ req.admin_note }}</p></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Table View -->
      <div v-else-if="viewMode === 'table'" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead><tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase">รหัส/ลูกค้า</th>
              <th class="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase">จำนวนเงิน</th>
              <th class="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase">ช่องทาง</th>
              <th class="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
              <th class="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase">วันที่</th>
              <th class="text-right py-4 px-5 text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="req in filteredRequests" :key="req.id" class="hover:bg-gray-50/50 transition-colors cursor-pointer" @click="openDetail(req)">
                <td class="py-4 px-5">
                  <div class="flex items-center gap-3">
                    <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', req.status === 'pending' ? 'bg-amber-50' : req.status === 'approved' ? 'bg-emerald-50' : req.status === 'rejected' ? 'bg-red-50' : 'bg-gray-100']">
                      <svg :class="['w-5 h-5', req.status === 'pending' ? 'text-amber-600' : req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-red-500' : 'text-gray-500']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getPaymentIcon(req.payment_method)"/></svg>
                    </div>
                    <div><div class="font-medium text-gray-900">{{ req.user_name }}</div><div class="text-xs text-gray-500 font-mono">{{ req.tracking_id }}</div></div>
                  </div>
                </td>
                <td class="py-4 px-5"><span :class="['font-semibold', req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-gray-400' : 'text-gray-900']">฿{{ req.amount.toLocaleString() }}</span></td>
                <td class="py-4 px-5 text-sm text-gray-600">{{ formatPaymentMethod(req.payment_method) }}</td>
                <td class="py-4 px-5">
                  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg', getStatusConfig(req.status).bg, getStatusConfig(req.status).text]">
                    <span v-if="req.status === 'pending'" class="relative flex h-1.5 w-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>
                    {{ getStatusConfig(req.status).label }}
                  </span>
                </td>
                <td class="py-4 px-5 text-sm text-gray-500">{{ formatDate(req.created_at) }}</td>
                <td class="py-4 px-5 text-right" @click.stop>
                  <div v-if="req.status === 'pending'" class="flex items-center justify-end gap-2">
                    <button @click="openAction(req, 'reject')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="ปฏิเสธ"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    <button @click="openAction(req, 'approve')" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="อนุมัติ"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button>
                  </div>
                  <button v-else @click="openDetail(req)" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="ดูรายละเอียด"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal && selectedRequest" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showDetailModal = false">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDetailModal = false"></div>
          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div class="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div><h3 class="text-lg font-bold text-gray-900">รายละเอียดคำขอ</h3><p class="text-sm text-gray-500 font-mono">{{ selectedRequest.tracking_id }}</p></div>
              <button @click="showDetailModal = false" class="p-2 hover:bg-gray-100 rounded-xl transition-colors"><svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div class="flex justify-center">
                <span :class="['inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full', getStatusConfig(selectedRequest.status).bg, getStatusConfig(selectedRequest.status).text]">
                  <svg v-if="selectedRequest.status === 'approved'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <svg v-else-if="selectedRequest.status === 'rejected'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {{ getStatusConfig(selectedRequest.status).label }}
                </span>
              </div>
              <div class="text-center py-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl"><p class="text-sm text-gray-500 mb-1">จำนวนเงิน</p><p class="text-4xl font-bold text-[#00A86B]">฿{{ selectedRequest.amount.toLocaleString() }}</p></div>
              <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>ข้อมูลลูกค้า</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div><p class="text-gray-500">ชื่อ</p><p class="font-medium text-gray-900">{{ selectedRequest.user_name }}</p></div>
                  <div><p class="text-gray-500">เบอร์โทร</p><p class="font-medium text-gray-900">{{ selectedRequest.user_phone || '-' }}</p></div>
                  <div class="col-span-2"><p class="text-gray-500">Member ID</p><p class="font-mono text-sm text-gray-900">{{ selectedRequest.user_member_uid || '-' }}</p></div>
                </div>
              </div>
              <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>ข้อมูลการชำระเงิน</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div><p class="text-gray-500">ช่องทาง</p><p class="font-medium text-gray-900">{{ formatPaymentMethod(selectedRequest.payment_method) }}</p></div>
                  <div><p class="text-gray-500">เลขอ้างอิง</p><p class="font-mono text-sm text-gray-900">{{ selectedRequest.payment_reference || '-' }}</p></div>
                </div>
                <div v-if="selectedRequest.slip_url" class="mt-3"><p class="text-gray-500 text-sm mb-2">สลิปการโอน</p><a :href="selectedRequest.slip_url" target="_blank" class="block rounded-xl overflow-hidden border border-gray-200 hover:border-[#00A86B] transition-colors"><img :src="selectedRequest.slip_url" alt="Payment slip" class="w-full h-48 object-cover"/></a></div>
              </div>
              <div class="space-y-3">
                <h4 class="text-sm font-semibold text-gray-700">ไทม์ไลน์</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center gap-3"><div class="w-2 h-2 bg-gray-300 rounded-full"></div><span class="text-gray-500">สร้างคำขอ:</span><span class="text-gray-900">{{ formatDate(selectedRequest.created_at) }}</span></div>
                  <div v-if="selectedRequest.approved_at" class="flex items-center gap-3"><div class="w-2 h-2 bg-emerald-500 rounded-full"></div><span class="text-gray-500">อนุมัติ:</span><span class="text-gray-900">{{ formatDate(selectedRequest.approved_at) }}</span></div>
                  <div v-if="selectedRequest.rejected_at" class="flex items-center gap-3"><div class="w-2 h-2 bg-red-500 rounded-full"></div><span class="text-gray-500">ปฏิเสธ:</span><span class="text-gray-900">{{ formatDate(selectedRequest.rejected_at) }}</span></div>
                </div>
              </div>
              <div v-if="selectedRequest.admin_note" class="bg-amber-50 rounded-2xl p-4">
                <h4 class="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>หมายเหตุจาก Admin</h4>
                <p class="text-sm text-amber-800">{{ selectedRequest.admin_note }}</p>
                <p v-if="selectedRequest.admin_name" class="text-xs text-amber-600 mt-2">โดย: {{ selectedRequest.admin_name }}</p>
              </div>
            </div>
            <div v-if="selectedRequest.status === 'pending'" class="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <button @click="openAction(selectedRequest, 'reject'); showDetailModal = false" class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">ปฏิเสธ</button>
              <button @click="openAction(selectedRequest, 'approve'); showDetailModal = false" class="flex-1 py-3 px-4 bg-[#00A86B] text-white font-medium rounded-xl hover:bg-[#008F5B] transition-all flex items-center justify-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>อนุมัติ</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Action Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showActionModal && selectedRequest" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="showActionModal = false">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showActionModal = false"></div>
          <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div :class="['px-6 py-5 text-center', actionType === 'approve' ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-red-50 to-orange-50']">
              <div :class="['w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3', actionType === 'approve' ? 'bg-emerald-100' : 'bg-red-100']">
                <svg v-if="actionType === 'approve'" class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <svg v-else class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
              <h3 :class="['text-xl font-bold', actionType === 'approve' ? 'text-emerald-800' : 'text-red-800']">{{ actionType === 'approve' ? 'อนุมัติคำขอเติมเงิน' : 'ปฏิเสธคำขอเติมเงิน' }}</h3>
              <p class="text-sm text-gray-600 mt-1">{{ selectedRequest.tracking_id }}</p>
            </div>
            <div class="p-6 space-y-4">
              <div class="bg-gray-50 rounded-2xl p-4 text-center"><p class="text-sm text-gray-500">จำนวนเงิน</p><p class="text-3xl font-bold text-gray-900">฿{{ selectedRequest.amount.toLocaleString() }}</p><p class="text-sm text-gray-500 mt-1">{{ selectedRequest.user_name }}</p></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ (ไม่บังคับ)</label><textarea v-model="adminNote" rows="3" :placeholder="actionType === 'approve' ? 'เช่น ตรวจสอบสลิปแล้ว ถูกต้อง' : 'เช่น สลิปไม่ชัด, ยอดไม่ตรง'" class="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#00A86B]/20 focus:bg-white transition-all outline-none"></textarea></div>
              <div v-if="actionType === 'reject'" class="bg-amber-50 rounded-xl p-3 flex items-start gap-3">
                <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <p class="text-sm text-amber-700">การปฏิเสธจะแจ้งเตือนลูกค้าทันที กรุณาระบุเหตุผลเพื่อให้ลูกค้าทราบ</p>
              </div>
            </div>
            <div class="px-6 py-4 bg-gray-50 flex gap-3">
              <button @click="showActionModal = false" :disabled="actionLoading" class="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50">ยกเลิก</button>
              <button @click="handleAction" :disabled="actionLoading" :class="['flex-1 py-3 px-4 font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2', actionType === 'approve' ? 'bg-[#00A86B] text-white hover:bg-[#008F5B]' : 'bg-red-500 text-white hover:bg-red-600']">
                <svg v-if="actionLoading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span v-else>{{ actionType === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(100%); }
.toast-leave-to { opacity: 0; transform: translateX(100%); }
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .relative, .modal-leave-to .relative { transform: scale(0.95) translateY(10px); }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
