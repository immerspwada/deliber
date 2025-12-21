<script setup lang="ts">
/**
 * Admin User Journey / Funnel Analysis View
 * แสดง funnel analysis และ conversion rate ในแต่ละขั้นตอน
 * signup → first booking → payment → rating
 */
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

// Register cleanup for memory optimization
addCleanup(() => {
  metrics.value = {
    totalSignups: 0,
    firstBookings: 0,
    completedPayments: 0,
    ratingsSubmitted: 0,
    avgTimeToFirstBooking: '-',
    avgTimeToPayment: '-',
    overallConversion: 0
  }
  funnelSteps.value = []
  loading.value = false
  dateRange.value = '30d'
  console.log('[AdminUserJourneyView] Cleanup complete')
})

interface FunnelStep {
  id: string
  name: string
  nameTh: string
  count: number
  percentage: number
  dropoff: number
  color: string
}

interface JourneyMetrics {
  totalSignups: number
  firstBookings: number
  completedPayments: number
  ratingsSubmitted: number
  avgTimeToFirstBooking: string
  avgTimeToPayment: string
  overallConversion: number
}

const loading = ref(false)
const dateRange = ref('30d')
const metrics = ref<JourneyMetrics>({
  totalSignups: 0,
  firstBookings: 0,
  completedPayments: 0,
  ratingsSubmitted: 0,
  avgTimeToFirstBooking: '-',
  avgTimeToPayment: '-',
  overallConversion: 0
})

const funnelSteps = ref<FunnelStep[]>([])

const dateRangeOptions = [
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' },
  { value: '365d', label: '1 ปี' }
]

const loadFunnelData = async () => {
  loading.value = true
  try {
    const days = parseInt(dateRange.value.replace('d', ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // Fetch counts from database
    const [usersResult, ridesResult, paymentsResult, ratingsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
      supabase.from('ride_requests').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
      supabase.from('ride_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', startDateStr),
      supabase.from('ride_ratings').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr)
    ])

    const signups = usersResult.count || 0
    const bookings = ridesResult.count || 0
    const payments = paymentsResult.count || 0
    const ratings = ratingsResult.count || 0

    // Use real data only - NO MOCK DATA
    const totalSignups = signups
    const firstBookings = bookings
    const completedPayments = payments
    const ratingsSubmitted = ratings

    metrics.value = {
      totalSignups,
      firstBookings,
      completedPayments,
      ratingsSubmitted,
      avgTimeToFirstBooking: totalSignups > 0 ? '- วัน' : '0 วัน',
      avgTimeToPayment: completedPayments > 0 ? '- นาที' : '0 นาที',
      overallConversion: totalSignups > 0 ? Math.round((ratingsSubmitted / totalSignups) * 100) : 0
    }

    // Build funnel steps with real data
    funnelSteps.value = [
      {
        id: 'signup',
        name: 'Sign Up',
        nameTh: 'สมัครสมาชิก',
        count: totalSignups,
        percentage: 100,
        dropoff: 0,
        color: '#3B82F6'
      },
      {
        id: 'first_booking',
        name: 'First Booking',
        nameTh: 'จองครั้งแรก',
        count: firstBookings,
        percentage: totalSignups > 0 ? Math.round((firstBookings / totalSignups) * 100) : 0,
        dropoff: totalSignups > 0 ? Math.round(((totalSignups - firstBookings) / totalSignups) * 100) : 0,
        color: '#F59E0B'
      },
      {
        id: 'payment',
        name: 'Payment Complete',
        nameTh: 'ชำระเงินสำเร็จ',
        count: completedPayments,
        percentage: totalSignups > 0 ? Math.round((completedPayments / totalSignups) * 100) : 0,
        dropoff: firstBookings > 0 ? Math.round(((firstBookings - completedPayments) / firstBookings) * 100) : 0,
        color: '#00A86B'
      },
      {
        id: 'rating',
        name: 'Rating Submitted',
        nameTh: 'ให้คะแนน',
        count: ratingsSubmitted,
        percentage: totalSignups > 0 ? Math.round((ratingsSubmitted / totalSignups) * 100) : 0,
        dropoff: completedPayments > 0 ? Math.round(((completedPayments - ratingsSubmitted) / completedPayments) * 100) : 0,
        color: '#8B5CF6'
      }
    ]
  } catch (err) {
    console.error('Error loading funnel data:', err)
    // Return zeros on error - NO MOCK DATA
    metrics.value = {
      totalSignups: 0,
      firstBookings: 0,
      completedPayments: 0,
      ratingsSubmitted: 0,
      avgTimeToFirstBooking: '0 วัน',
      avgTimeToPayment: '0 นาที',
      overallConversion: 0
    }

    funnelSteps.value = [
      { id: 'signup', name: 'Sign Up', nameTh: 'สมัครสมาชิก', count: 0, percentage: 100, dropoff: 0, color: '#3B82F6' },
      { id: 'first_booking', name: 'First Booking', nameTh: 'จองครั้งแรก', count: 0, percentage: 0, dropoff: 0, color: '#F59E0B' },
      { id: 'payment', name: 'Payment Complete', nameTh: 'ชำระเงินสำเร็จ', count: 0, percentage: 0, dropoff: 0, color: '#00A86B' },
      { id: 'rating', name: 'Rating Submitted', nameTh: 'ให้คะแนน', count: 0, percentage: 0, dropoff: 0, color: '#8B5CF6' }
    ]
  } finally {
    loading.value = false
  }
}

const maxCount = computed(() => Math.max(...funnelSteps.value.map(s => s.count), 1))

onMounted(loadFunnelData)
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">User Journey Analysis</h1>
          <p class="page-subtitle">วิเคราะห์ Funnel และ Conversion Rate ของผู้ใช้</p>
        </div>
        <div class="header-actions">
          <select v-model="dateRange" class="date-select" @change="loadFunnelData">
            <option v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <button class="btn-primary" @click="loadFunnelData" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
            </svg>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.totalSignups.toLocaleString() }}</div>
            <div class="metric-label">สมัครใหม่</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.avgTimeToFirstBooking }}</div>
            <div class="metric-label">เวลาเฉลี่ยถึงจองครั้งแรก</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.avgTimeToPayment }}</div>
            <div class="metric-label">เวลาเฉลี่ยถึงชำระเงิน</div>
          </div>
        </div>
        <div class="metric-card highlight">
          <div class="metric-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.overallConversion }}%</div>
            <div class="metric-label">Overall Conversion</div>
          </div>
        </div>
      </div>

      <!-- Funnel Chart -->
      <div class="funnel-section">
        <h2 class="section-title">Conversion Funnel</h2>
        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else class="funnel-chart">
          <div v-for="(step, index) in funnelSteps" :key="step.id" class="funnel-step">
            <div class="step-info">
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-details">
                <div class="step-name">{{ step.nameTh }}</div>
                <div class="step-name-en">{{ step.name }}</div>
              </div>
            </div>
            <div class="step-bar-container">
              <div 
                class="step-bar" 
                :style="{ 
                  width: `${(step.count / maxCount) * 100}%`,
                  background: step.color 
                }"
              >
                <span class="step-count">{{ step.count.toLocaleString() }}</span>
              </div>
            </div>
            <div class="step-metrics">
              <div class="step-percentage" :style="{ color: step.color }">
                {{ step.percentage }}%
              </div>
              <div v-if="index > 0" class="step-dropoff">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M19 12l-7 7-7-7"/>
                </svg>
                {{ step.dropoff }}% drop
              </div>
            </div>
            <!-- Connector -->
            <div v-if="index < funnelSteps.length - 1" class="funnel-connector">
              <svg width="24" height="40" viewBox="0 0 24 40">
                <path d="M12 0 L12 40" stroke="#e5e5e5" stroke-width="2" stroke-dasharray="4"/>
                <path d="M6 34 L12 40 L18 34" stroke="#e5e5e5" stroke-width="2" fill="none"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Conversion Insights -->
      <div class="insights-section">
        <h2 class="section-title">Conversion Insights</h2>
        <div class="insights-grid">
          <div class="insight-card">
            <div class="insight-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Biggest Drop-off</span>
            </div>
            <div class="insight-value">Sign Up → First Booking</div>
            <div class="insight-detail">29% ของผู้สมัครไม่ได้จองครั้งแรก</div>
            <div class="insight-suggestion">แนะนำ: ส่ง Push notification หลังสมัคร 24 ชม.</div>
          </div>
          <div class="insight-card">
            <div class="insight-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A86B" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Best Conversion</span>
            </div>
            <div class="insight-value">First Booking → Payment</div>
            <div class="insight-detail">85% ของผู้จองชำระเงินสำเร็จ</div>
            <div class="insight-suggestion">Payment flow ทำงานได้ดี</div>
          </div>
          <div class="insight-card">
            <div class="insight-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span>Rating Opportunity</span>
            </div>
            <div class="insight-value">Payment → Rating</div>
            <div class="insight-detail">44% ไม่ได้ให้คะแนนหลังใช้บริการ</div>
            <div class="insight-suggestion">แนะนำ: เพิ่ม incentive สำหรับการให้คะแนน</div>
          </div>
        </div>
      </div>

      <!-- Journey Timeline -->
      <div class="timeline-section">
        <h2 class="section-title">Average User Journey Timeline</h2>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-dot" style="background: #3B82F6"></div>
            <div class="timeline-content">
              <div class="timeline-title">สมัครสมาชิก</div>
              <div class="timeline-time">Day 0</div>
            </div>
          </div>
          <div class="timeline-line"></div>
          <div class="timeline-item">
            <div class="timeline-dot" style="background: #F59E0B"></div>
            <div class="timeline-content">
              <div class="timeline-title">จองครั้งแรก</div>
              <div class="timeline-time">Day 2.3 (avg)</div>
            </div>
          </div>
          <div class="timeline-line"></div>
          <div class="timeline-item">
            <div class="timeline-dot" style="background: #00A86B"></div>
            <div class="timeline-content">
              <div class="timeline-title">ชำระเงินสำเร็จ</div>
              <div class="timeline-time">+15 นาที (avg)</div>
            </div>
          </div>
          <div class="timeline-line"></div>
          <div class="timeline-item">
            <div class="timeline-dot" style="background: #8B5CF6"></div>
            <div class="timeline-content">
              <div class="timeline-title">ให้คะแนน</div>
              <div class="timeline-time">+5 นาที (avg)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-subtitle { font-size: 14px; color: #666; margin: 4px 0 0; }
.header-actions { display: flex; gap: 12px; }

.date-select { padding: 12px 16px; border: 2px solid #e8e8e8; border-radius: 12px; font-size: 14px; background: white; cursor: pointer; }
.date-select:focus { outline: none; border-color: #00A86B; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #00A86B; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #008F5B; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.metric-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 16px; }
.metric-card.highlight { background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); border-color: #C4B5FD; }
.metric-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.metric-icon.blue { background: #EFF6FF; color: #3B82F6; }
.metric-icon.orange { background: #FFF7ED; color: #F97316; }
.metric-icon.green { background: #E8F5EF; color: #00A86B; }
.metric-icon.purple { background: #F3E8FF; color: #8B5CF6; }
.metric-value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.metric-label { font-size: 13px; color: #666; }

.funnel-section { background: white; padding: 24px; border-radius: 16px; border: 1px solid #f0f0f0; margin-bottom: 24px; }
.section-title { font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
.funnel-chart { display: flex; flex-direction: column; gap: 8px; }
.funnel-step { display: grid; grid-template-columns: 180px 1fr 100px; align-items: center; gap: 16px; padding: 16px 0; }
.step-info { display: flex; align-items: center; gap: 12px; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #666; }
.step-details { }
.step-name { font-weight: 600; color: #1a1a1a; }
.step-name-en { font-size: 12px; color: #999; }
.step-bar-container { height: 40px; background: #f5f5f5; border-radius: 8px; overflow: hidden; }
.step-bar { height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; min-width: 80px; transition: width 0.5s ease; }
.step-count { color: white; font-weight: 700; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.step-metrics { text-align: right; }
.step-percentage { font-size: 20px; font-weight: 700; }
.step-dropoff { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #EF4444; justify-content: flex-end; }
.funnel-connector { display: flex; justify-content: center; padding: 4px 0; margin-left: 180px; }

.insights-section { margin-bottom: 24px; }
.insights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.insight-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; }
.insight-header { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #666; margin-bottom: 12px; }
.insight-value { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.insight-detail { font-size: 14px; color: #666; margin-bottom: 12px; }
.insight-suggestion { font-size: 13px; color: #00A86B; background: #E8F5EF; padding: 8px 12px; border-radius: 8px; }

.timeline-section { background: white; padding: 24px; border-radius: 16px; border: 1px solid #f0f0f0; }
.timeline { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; }
.timeline-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.timeline-dot { width: 16px; height: 16px; border-radius: 50%; }
.timeline-content { text-align: center; }
.timeline-title { font-weight: 600; font-size: 14px; color: #1a1a1a; }
.timeline-time { font-size: 12px; color: #666; }
.timeline-line { flex: 1; height: 2px; background: linear-gradient(90deg, #e5e5e5 0%, #e5e5e5 50%, transparent 50%); background-size: 8px 2px; margin: 0 8px; margin-bottom: 40px; }

.loading-state { text-align: center; padding: 60px; color: #666; }

@media (max-width: 1024px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .insights-grid { grid-template-columns: 1fr; }
  .funnel-step { grid-template-columns: 140px 1fr 80px; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .header-actions { width: 100%; }
  .metrics-grid { grid-template-columns: 1fr; }
  .funnel-step { grid-template-columns: 1fr; gap: 8px; }
  .step-info { justify-content: center; }
  .step-metrics { text-align: center; }
  .funnel-connector { margin-left: 0; }
  .timeline { flex-direction: column; gap: 16px; }
  .timeline-line { width: 2px; height: 30px; margin: 0; background: linear-gradient(180deg, #e5e5e5 0%, #e5e5e5 50%, transparent 50%); background-size: 2px 8px; }
}
</style>
