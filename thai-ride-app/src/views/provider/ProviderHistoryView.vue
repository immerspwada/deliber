<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProvider } from '../../composables/useProvider'
import ProviderLayout from '../../components/ProviderLayout.vue'
import { supabase } from '../../lib/supabase'

interface CompletedRide {
  id: string
  pickup_address: string
  destination_address: string
  fare: number
  completed_at: string
  passenger_name: string
  rating?: number
}

const { profile } = useProvider()
const isLoading = ref(true)
const completedRides = ref<CompletedRide[]>([])

// Check if demo mode
const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

// Fetch completed rides
const fetchHistory = async () => {
  isLoading.value = true

  // Demo mode - mock data
  if (isDemoMode()) {
    completedRides.value = [
      {
        id: '1',
        pickup_address: 'สยามพารากอน',
        destination_address: 'เซ็นทรัลเวิลด์',
        fare: 85,
        completed_at: new Date().toISOString(),
        passenger_name: 'คุณสมชาย',
        rating: 5
      },
      {
        id: '2',
        pickup_address: 'อโศก BTS',
        destination_address: 'เอกมัย',
        fare: 120,
        completed_at: new Date(Date.now() - 3600000).toISOString(),
        passenger_name: 'คุณสมหญิง',
        rating: 4
      },
      {
        id: '3',
        pickup_address: 'MBK Center',
        destination_address: 'สีลม',
        fare: 95,
        completed_at: new Date(Date.now() - 7200000).toISOString(),
        passenger_name: 'คุณวิชัย',
        rating: 5
      },
      {
        id: '4',
        pickup_address: 'ลาดพร้าว',
        destination_address: 'รัชดา',
        fare: 75,
        completed_at: new Date(Date.now() - 86400000).toISOString(),
        passenger_name: 'คุณนภา'
      },
      {
        id: '5',
        pickup_address: 'พระราม 9',
        destination_address: 'ห้วยขวาง',
        fare: 65,
        completed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        passenger_name: 'คุณธนา',
        rating: 5
      }
    ]
    isLoading.value = false
    return
  }

  // Real mode
  try {
    if (!profile.value?.id) {
      isLoading.value = false
      return
    }

    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        id,
        pickup_address,
        destination_address,
        final_fare,
        estimated_fare,
        completed_at,
        users:user_id (name)
      `)
      .eq('provider_id', profile.value.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      completedRides.value = data.map((ride: any) => ({
        id: ride.id,
        pickup_address: ride.pickup_address,
        destination_address: ride.destination_address,
        fare: ride.final_fare || ride.estimated_fare || 0,
        completed_at: ride.completed_at,
        passenger_name: ride.users?.name || 'ผู้โดยสาร'
      }))
    }
  } catch (e) {
    console.warn('Error fetching history:', e)
  } finally {
    isLoading.value = false
  }
}

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'เมื่อวาน'
  } else if (days < 7) {
    return `${days} วันที่แล้ว`
  } else {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <ProviderLayout>
    <div class="history-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <h1>ประวัติงาน</h1>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="completedRides.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3>ยังไม่มีประวัติงาน</h3>
          <p>เมื่อคุณทำงานเสร็จ จะแสดงที่นี่</p>
        </div>

        <!-- History List -->
        <div v-else class="history-list">
          <div 
            v-for="ride in completedRides" 
            :key="ride.id"
            class="history-card"
          >
            <div class="card-header">
              <span class="passenger-name">{{ ride.passenger_name }}</span>
              <span class="ride-time">{{ formatDate(ride.completed_at) }}</span>
            </div>
            
            <div class="route-info">
              <div class="route-point">
                <div class="point-dot pickup"></div>
                <span class="point-address">{{ ride.pickup_address }}</span>
              </div>
              <div class="route-line"></div>
              <div class="route-point">
                <div class="point-dot destination"></div>
                <span class="point-address">{{ ride.destination_address }}</span>
              </div>
            </div>

            <div class="card-footer">
              <div v-if="ride.rating" class="rating-badge">
                <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span>{{ ride.rating }}</span>
              </div>
              <span class="ride-fare">฿{{ ride.fare.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.history-page {
  min-height: 100vh;
}

.page-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 50%;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #CCC;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #6B6B6B;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.passenger-name {
  font-size: 15px;
  font-weight: 600;
}

.ride-time {
  font-size: 13px;
  color: #6B6B6B;
}

/* Route Info */
.route-info {
  position: relative;
  padding-left: 24px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.route-point:first-child {
  margin-bottom: 12px;
}

.point-dot {
  position: absolute;
  left: -24px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.point-dot.pickup {
  background-color: #22C55E;
}

.point-dot.destination {
  background-color: #000000;
}

.route-line {
  position: absolute;
  left: -20px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  background-color: #E5E5E5;
}

.point-address {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

/* Card Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: #FEF3C7;
  border-radius: 12px;
}

.star-icon {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

.rating-badge span {
  font-size: 13px;
  font-weight: 600;
  color: #92400E;
}

.ride-fare {
  font-size: 18px;
  font-weight: 700;
}
</style>
