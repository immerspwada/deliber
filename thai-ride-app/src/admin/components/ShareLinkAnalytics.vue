<script setup lang="ts">
/**
 * Component: ShareLinkAnalytics
 * แสดงสถิติการใช้งาน Share Links สำหรับ Admin
 * 
 * Features:
 * - Total share links created
 * - Total views across all links
 * - Recent activity
 * - Top viewed links
 */
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../lib/supabase'

interface ShareLinkStats {
  total_links: number
  active_links: number
  expired_links: number
  total_views: number
  unique_views: number
}

interface RecentView {
  id: string
  share_token: string
  ride_id: string
  view_count: number
  created_at: string
  expires_at: string
  is_active: boolean
}

const stats = ref<ShareLinkStats>({
  total_links: 0,
  active_links: 0,
  expired_links: 0,
  total_views: 0,
  unique_views: 0
})

const recentLinks = ref<RecentView[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Check if link is expired
function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

// Load statistics
async function loadStats(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    // Get total links count
    const { count: totalLinks } = await supabase
      .from('ride_share_links')
      .select('*', { count: 'exact', head: true })

    // Get active links count
    const { count: activeLinks } = await supabase
      .from('ride_share_links')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    // Get total views
    const { data: viewsData } = await supabase
      .from('ride_share_links')
      .select('view_count')
    
    const totalViews = viewsData?.reduce((sum, link) => sum + (link.view_count || 0), 0) || 0

    // Get unique views count
    const { count: uniqueViews } = await supabase
      .from('ride_share_link_views')
      .select('*', { count: 'exact', head: true })
      .eq('is_unique_view', true)

    stats.value = {
      total_links: totalLinks || 0,
      active_links: activeLinks || 0,
      expired_links: (totalLinks || 0) - (activeLinks || 0),
      total_views: totalViews,
      unique_views: uniqueViews || 0
    }

    // Get recent links with most views
    const { data: links, error: linksError } = await supabase
      .from('ride_share_links')
      .select('id, share_token, ride_id, view_count, created_at, expires_at, is_active')
      .order('view_count', { ascending: false })
      .limit(10)

    if (linksError) throw linksError
    recentLinks.value = links || []

  } catch (err) {
    console.error('[ShareLinkAnalytics] Error:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลได้'
  } finally {
    loading.value = false
  }
}

// Manually trigger cleanup
async function runCleanup(): Promise<void> {
  try {
    const { data, error: rpcError } = await supabase
      .rpc('cleanup_expired_share_links')
    
    if (rpcError) throw rpcError
    
    alert(`ลบลิงก์หมดอายุแล้ว ${data} รายการ`)
    loadStats()
  } catch (err) {
    console.error('[ShareLinkAnalytics] Cleanup error:', err)
    alert('ไม่สามารถลบลิงก์หมดอายุได้')
  }
}

// Computed
const viewRate = computed(() => {
  if (stats.value.total_links === 0) return '0%'
  const rate = (stats.value.total_views / stats.value.total_links) * 100
  return `${rate.toFixed(1)}%`
})

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="share-link-analytics">
    <div class="header">
      <h2>📊 Share Link Analytics</h2>
      <div class="actions">
        <button type="button" class="btn-refresh" :disabled="loading" @click="loadStats">
          🔄 รีเฟรช
        </button>
        <button type="button" class="btn-cleanup" @click="runCleanup">
          🗑️ ลบลิงก์หมดอายุ
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <!-- Error -->
    <div v-else-if="error" class="error">{{ error }}</div>

    <!-- Stats -->
    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total_links }}</span>
          <span class="stat-label">ลิงก์ทั้งหมด</span>
        </div>
        <div class="stat-card active">
          <span class="stat-value">{{ stats.active_links }}</span>
          <span class="stat-label">ลิงก์ใช้งานได้</span>
        </div>
        <div class="stat-card expired">
          <span class="stat-value">{{ stats.expired_links }}</span>
          <span class="stat-label">หมดอายุ</span>
        </div>
        <div class="stat-card views">
          <span class="stat-value">{{ stats.total_views }}</span>
          <span class="stat-label">ยอดดูทั้งหมด</span>
        </div>
        <div class="stat-card unique">
          <span class="stat-value">{{ stats.unique_views }}</span>
          <span class="stat-label">ยอดดูไม่ซ้ำ</span>
        </div>
      </div>

      <!-- Top Links Table -->
      <div class="table-section">
        <h3>🔗 ลิงก์ที่มียอดดูสูงสุด</h3>
        <table v-if="recentLinks.length > 0">
          <thead>
            <tr>
              <th>Token</th>
              <th>Ride ID</th>
              <th>ยอดดู</th>
              <th>สร้างเมื่อ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="link in recentLinks" :key="link.id">
              <td class="token">{{ link.share_token.slice(0, 8) }}...</td>
              <td class="ride-id">{{ link.ride_id.slice(0, 8) }}...</td>
              <td class="views">{{ link.view_count || 0 }}</td>
              <td class="date">{{ formatDate(link.created_at) }}</td>
              <td>
                <span 
                  class="status-badge" 
                  :class="{ 
                    active: link.is_active && !isExpired(link.expires_at),
                    expired: isExpired(link.expires_at)
                  }"
                >
                  {{ isExpired(link.expires_at) ? 'หมดอายุ' : (link.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">ยังไม่มีข้อมูล</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.share-link-analytics {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  color: #1a1a1a;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-refresh,
.btn-cleanup {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #e0f2fe;
  color: #0369a1;
}

.btn-refresh:hover {
  background: #bae6fd;
}

.btn-cleanup {
  background: #fee2e2;
  color: #dc2626;
}

.btn-cleanup:hover {
  background: #fecaca;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #dc2626;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-card.active {
  background: #dcfce7;
}

.stat-card.expired {
  background: #fee2e2;
}

.stat-card.views {
  background: #e0f2fe;
}

.stat-card.unique {
  background: #fef3c7;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.table-section h3 {
  font-size: 16px;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e5e5;
}

th {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

td {
  font-size: 14px;
  color: #1a1a1a;
}

.token, .ride-id {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
}

.views {
  font-weight: 600;
  color: #0369a1;
}

.date {
  color: #666;
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.expired {
  background: #fee2e2;
  color: #dc2626;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
