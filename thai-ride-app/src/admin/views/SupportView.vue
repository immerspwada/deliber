<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()
const isLoading = ref(true)
const tickets = ref<any[]>([])
const totalTickets = ref(0)
const currentPage = ref(1)
const totalPages = ref(0)
const statusFilter = ref('')
const selectedTicket = ref<any>(null)
const showModal = ref(false)

async function loadTickets() {
  isLoading.value = true
  try {
    const offset = (currentPage.value - 1) * 20
    let query = supabase.from('support_tickets').select(`*, users(first_name, last_name, member_uid)`, { count: 'exact' })
    if (statusFilter.value) query = query.eq('status', statusFilter.value)
    query = query.order('created_at', { ascending: false }).range(offset, offset + 19)
    const { data, count } = await query
    tickets.value = (data || []).map((t: any) => ({ ...t, customer_name: t.users ? `${t.users.first_name || ''} ${t.users.last_name || ''}`.trim() : '-', member_uid: t.users?.member_uid }))
    totalTickets.value = count || 0
    totalPages.value = Math.ceil((count || 0) / 20)
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

function viewTicket(t: any) { selectedTicket.value = t; showModal.value = true }
async function updateStatus(s: string) { if (!selectedTicket.value) return; await supabase.from('support_tickets').update({ status: s }).eq('id', selectedTicket.value.id); selectedTicket.value.status = s; loadTickets() }
function formatDate(d: string) { return new Date(d).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function getStatusColor(s: string) { return ({ open: '#F59E0B', in_progress: '#3B82F6', resolved: '#10B981', closed: '#6B7280' } as any)[s] || '#6B7280' }
function getStatusLabel(s: string) { return ({ open: 'เปิด', in_progress: 'ดำเนินการ', resolved: 'แก้ไขแล้ว', closed: 'ปิด' } as any)[s] || s }

watch([statusFilter], () => { currentPage.value = 1; loadTickets() })
watch(currentPage, loadTickets)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Support' }]); loadTickets() })
</script>

<template>
  <div class="support-view">
    <div class="page-header"><div class="header-left"><h1>Support Tickets</h1><span class="count">{{ totalTickets }}</span></div><button class="refresh-btn" @click="loadTickets"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></button></div>
    <div class="filters"><select v-model="statusFilter" class="filter-select"><option value="">ทุกสถานะ</option><option value="open">เปิด</option><option value="in_progress">ดำเนินการ</option><option value="resolved">แก้ไขแล้ว</option></select></div>
    <div class="table-container">
      <div v-if="isLoading" class="loading"><div v-for="i in 8" :key="i" class="skeleton" /></div>
      <table v-else-if="tickets.length" class="data-table">
        <thead><tr><th>ID</th><th>ลูกค้า</th><th>หัวข้อ</th><th>สถานะ</th><th>วันที่</th><th></th></tr></thead>
        <tbody><tr v-for="t in tickets" :key="t.id" @click="viewTicket(t)"><td><code>#{{ t.id.slice(0,8) }}</code></td><td>{{ t.customer_name }}</td><td class="subject">{{ t.subject || '-' }}</td><td><span class="badge" :style="{ color: getStatusColor(t.status), background: getStatusColor(t.status) + '20' }">{{ getStatusLabel(t.status) }}</span></td><td class="date">{{ formatDate(t.created_at) }}</td><td><button class="view-btn" @click.stop="viewTicket(t)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td></tr></tbody>
      </table>
      <div v-else class="empty"><p>ไม่พบ Tickets</p></div>
    </div>
    <div v-if="totalPages > 1" class="pagination"><button :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span>{{ currentPage }}/{{ totalPages }}</span><button :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div>
    <div v-if="showModal && selectedTicket" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header"><h2>#{{ selectedTicket.id.slice(0,8) }}</h2><button @click="showModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="info"><span class="label">ลูกค้า</span><span>{{ selectedTicket.customer_name }}</span></div>
          <div class="info"><span class="label">หัวข้อ</span><span>{{ selectedTicket.subject || '-' }}</span></div>
          <div class="info"><span class="label">สถานะ</span><span class="badge" :style="{ color: getStatusColor(selectedTicket.status), background: getStatusColor(selectedTicket.status) + '20' }">{{ getStatusLabel(selectedTicket.status) }}</span></div>
          <div class="message"><h4>ข้อความ</h4><p>{{ selectedTicket.message || '-' }}</p></div>
          <div class="actions"><button v-if="selectedTicket.status !== 'resolved'" class="btn-resolve" @click="updateStatus('resolved')">แก้ไขแล้ว</button><button v-if="selectedTicket.status !== 'closed'" class="btn-close" @click="updateStatus('closed')">ปิด</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.support-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.filters { margin-bottom: 20px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #F9FAFB; }
.data-table code { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.subject { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.date { font-size: 13px; color: #6B7280; }
.view-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.empty { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.pagination button { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.modal-header button { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.info { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }
.info .label { font-size: 13px; color: #6B7280; }
.message { margin-top: 16px; }
.message h4 { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px 0; }
.message p { padding: 16px; background: #F9FAFB; border-radius: 10px; font-size: 14px; margin: 0; }
.actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-resolve { flex: 1; padding: 12px; background: #D1FAE5; color: #059669; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-close { flex: 1; padding: 12px; background: #F3F4F6; color: #6B7280; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
</style>
