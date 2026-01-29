<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/composables/useToast';

interface AuditLog {
  id: string;
  topup_request_id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  actor_email: string | null;
  old_status: string | null;
  new_status: string | null;
  old_amount: number | null;
  new_amount: number | null;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  topupRequestId: string;
  autoRefresh?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: false,
});

const toast = useToast();
const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const refreshInterval = ref<number | null>(null);

const ACTION_LABELS: Record<string, string> = {
  created: 'สร้างคำขอ',
  status_changed: 'เปลี่ยนสถานะ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก',
  payment_proof_uploaded: 'อัพโหลดหลักฐาน',
  payment_reference_updated: 'อัพเดทเลขอ้างอิง',
  admin_note_added: 'เพิ่มหมายเหตุ',
  wallet_credited: 'เติมเงินเข้า Wallet',
  wallet_debited: 'หักเงินจาก Wallet',
  viewed: 'เปิดดู',
  exported: 'ส่งออกข้อมูล',
};

const ACTION_ICONS: Record<string, string> = {
  created: '➕',
  status_changed: '🔄',
  approved: '✅',
  rejected: '❌',
  cancelled: '🚫',
  payment_proof_uploaded: '📎',
  payment_reference_updated: '🔢',
  admin_note_added: '📝',
  wallet_credited: '💰',
  wallet_debited: '💸',
  viewed: '👁️',
  exported: '📤',
};

const ACTION_COLORS: Record<string, string> = {
  created: 'blue',
  status_changed: 'gray',
  approved: 'green',
  rejected: 'red',
  cancelled: 'orange',
  payment_proof_uploaded: 'purple',
  payment_reference_updated: 'indigo',
  admin_note_added: 'yellow',
  wallet_credited: 'green',
  wallet_debited: 'red',
  viewed: 'gray',
  exported: 'blue',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'รอดำเนินการ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก',
};

async function loadAuditLogs() {
  if (!props.topupRequestId) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    const { data, error: rpcError } = await supabase.rpc(
      'get_topup_request_audit_logs',
      {
        p_topup_request_id: props.topupRequestId,
        p_limit: 100,
      }
    );
    
    if (rpcError) throw rpcError;
    logs.value = (data || []) as AuditLog[];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
    console.error('[TopupAuditLogTimeline] Load error:', e);
  } finally {
    loading.value = false;
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

function getActionIcon(action: string): string {
  return ACTION_ICONS[action] || '📋';
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'gray';
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function getChangeSummary(log: AuditLog): string[] {
  const summary: string[] = [];
  
  if (log.old_status && log.new_status && log.old_status !== log.new_status) {
    summary.push(`สถานะ: ${getStatusLabel(log.old_status)} → ${getStatusLabel(log.new_status)}`);
  }
  
  if (log.old_amount && log.new_amount && log.old_amount !== log.new_amount) {
    summary.push(`จำนวนเงิน: ${formatCurrency(log.old_amount)} → ${formatCurrency(log.new_amount)}`);
  }
  
  if (log.changes) {
    Object.entries(log.changes).forEach(([key, value]: [string, any]) => {
      if (key === 'status' || key === 'amount') return; // Already handled above
      
      if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
        const oldVal = value.old || '-';
        const newVal = value.new || '-';
        summary.push(`${key}: ${oldVal} → ${newVal}`);
      }
    });
  }
  
  return summary;
}

function startAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  refreshInterval.value = window.setInterval(() => {
    loadAuditLogs();
  }, 10000); // Refresh every 10 seconds
}

function stopAutoRefresh() {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
    refreshInterval.value = null;
  }
}

watch(() => props.topupRequestId, () => {
  loadAuditLogs();
});

watch(() => props.autoRefresh, (newVal) => {
  if (newVal) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

onMounted(() => {
  loadAuditLogs();
  
  if (props.autoRefresh) {
    startAutoRefresh();
  }
  
  // Cleanup on unmount
  return () => {
    stopAutoRefresh();
  };
});
</script>

<template>
  <div class="audit-log-timeline">
    <div class="timeline-header">
      <h3>📜 ประวัติการเคลื่อนไหว</h3>
      <button
        class="refresh-btn"
        :disabled="loading"
        title="รีเฟรช"
        @click="loadAuditLogs"
      >
        <svg
          class="refresh-icon"
          :class="{ spinning: loading }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      </button>
    </div>

    <div v-if="loading && logs.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดประวัติ...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>❌ {{ error }}</p>
      <button class="retry-btn" @click="loadAuditLogs">ลองใหม่</button>
    </div>

    <div v-else-if="logs.length === 0" class="empty-state">
      <p>📭 ยังไม่มีประวัติการเคลื่อนไหว</p>
    </div>

    <div v-else class="timeline-container">
      <div
        v-for="(log, index) in logs"
        :key="log.id"
        class="timeline-item"
        :class="`timeline-item-${getActionColor(log.action)}`"
      >
        <div class="timeline-marker">
          <div class="timeline-icon" :class="`icon-${getActionColor(log.action)}`">
            {{ getActionIcon(log.action) }}
          </div>
          <div v-if="index < logs.length - 1" class="timeline-line"></div>
        </div>

        <div class="timeline-content">
          <div class="timeline-header-row">
            <div class="timeline-action">
              <span class="action-label">{{ getActionLabel(log.action) }}</span>
              <span class="action-time">{{ formatDate(log.created_at) }}</span>
            </div>
          </div>

          <div class="timeline-actor">
            <span class="actor-icon">👤</span>
            <span class="actor-name">{{ log.actor_name || 'ระบบ' }}</span>
            <span v-if="log.actor_role" class="actor-role">({{ log.actor_role }})</span>
          </div>

          <div v-if="getChangeSummary(log).length > 0" class="timeline-changes">
            <div
              v-for="(change, idx) in getChangeSummary(log)"
              :key="idx"
              class="change-item"
            >
              <span class="change-icon">🔸</span>
              <span class="change-text">{{ change }}</span>
            </div>
          </div>

          <div v-if="log.metadata" class="timeline-metadata">
            <details>
              <summary>ข้อมูลเพิ่มเติม</summary>
              <pre class="metadata-content">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
            </details>
          </div>

          <div v-if="log.notes" class="timeline-notes">
            <span class="notes-icon">📝</span>
            <span class="notes-text">{{ log.notes }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="logs.length > 0" class="timeline-footer">
      <p class="log-count">ทั้งหมด {{ logs.length }} รายการ</p>
    </div>
  </div>
</template>

<style scoped>
.audit-log-timeline {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.timeline-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.refresh-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #007bff;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  width: 18px;
  height: 18px;
  color: #666;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
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

.error-state {
  color: #c33;
}

.retry-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #0056b3;
}

.timeline-container {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  position: relative;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.timeline-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: white;
  border: 3px solid #ddd;
  z-index: 1;
}

.icon-blue { border-color: #007bff; background: #e7f3ff; }
.icon-green { border-color: #28a745; background: #e8f5e9; }
.icon-red { border-color: #dc3545; background: #ffebee; }
.icon-orange { border-color: #fd7e14; background: #fff3e0; }
.icon-purple { border-color: #6f42c1; background: #f3e5f5; }
.icon-indigo { border-color: #6610f2; background: #e8eaf6; }
.icon-yellow { border-color: #ffc107; background: #fffde7; }
.icon-gray { border-color: #6c757d; background: #f5f5f5; }

.timeline-line {
  width: 2px;
  flex: 1;
  background: #e0e0e0;
  margin-top: 5px;
}

.timeline-content {
  flex: 1;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  border-left: 3px solid #e0e0e0;
}

.timeline-item-blue .timeline-content { border-left-color: #007bff; }
.timeline-item-green .timeline-content { border-left-color: #28a745; }
.timeline-item-red .timeline-content { border-left-color: #dc3545; }
.timeline-item-orange .timeline-content { border-left-color: #fd7e14; }
.timeline-item-purple .timeline-content { border-left-color: #6f42c1; }
.timeline-item-indigo .timeline-content { border-left-color: #6610f2; }
.timeline-item-yellow .timeline-content { border-left-color: #ffc107; }
.timeline-item-gray .timeline-content { border-left-color: #6c757d; }

.timeline-header-row {
  margin-bottom: 10px;
}

.timeline-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.action-label {
  font-weight: 600;
  font-size: 15px;
  color: #333;
}

.action-time {
  font-size: 12px;
  color: #999;
}

.timeline-actor {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 10px;
}

.actor-icon {
  font-size: 14px;
}

.actor-name {
  font-weight: 500;
  color: #333;
}

.actor-role {
  color: #999;
  font-size: 12px;
}

.timeline-changes {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
}

.change-icon {
  font-size: 10px;
  margin-top: 3px;
  flex-shrink: 0;
}

.change-text {
  flex: 1;
}

.timeline-metadata {
  margin-top: 10px;
}

.timeline-metadata details {
  cursor: pointer;
}

.timeline-metadata summary {
  font-size: 12px;
  color: #007bff;
  user-select: none;
}

.timeline-metadata summary:hover {
  text-decoration: underline;
}

.metadata-content {
  margin-top: 8px;
  padding: 10px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
  overflow-x: auto;
  max-height: 200px;
}

.timeline-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  background: #fffde7;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}

.notes-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.notes-text {
  flex: 1;
}

.timeline-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.log-count {
  font-size: 13px;
  color: #999;
  margin: 0;
}
</style>
