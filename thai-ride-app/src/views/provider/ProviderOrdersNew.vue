<script setup lang="ts">
/**
 * ProviderOrdersNew - หน้ารายละเอียด Orders
 * Design: ตาม reference UI (หน้าขวา)
 * 
 * Features:
 * - Route display (Your location -> Drop points)
 * - Earnings breakdown
 * - Accept/Decline buttons
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'

const router = useRouter()

// State
const loading = ref(true)
const orders = ref<Array<{
  id: string
  tracking_id?: string
  pickup_address: string
  destination_address: string
  pickup_lat: number
  pickup_lng: number
  destination_lat: number
  destination_lng: number
  estimated_fare: number
  distance: number
  created_at: string
}>>([])

const selectedOrders = ref<Set<string>>(new Set())
const alwaysBestRoute = ref(true)

// Computed
const totalEarnings = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => sum + (o.estimated_fare || 0), 0)
})

const totalTips = computed(() => {
  // Estimate tips as 10% of earnings
  return totalEarnings.value * 0.1
})

const totalDistance = computed(() => {
  return orders.value
    .filter(o => selectedOrders.value.has(o.id))
    .reduce((sum, o) => sum + (o.distance || 0), 0)
})

const totalEstEarnings = computed(() => {
  return totalEarnings.value + totalTips.value
})

const dropPointsCount = computed(() => selectedOrders.value.size)

// Methods
async function loadOrders() {
  loading.value = true
  try {
    const { data } = await supabase
      .from('ride_requests')
      .select('id, tracking_id, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      orders.value = data.map(o => ({
        ...o,
        distance: calculateDistance(o.pickup_lat, o.pickup_lng, o.destination_lat, o.destination_lng)
      }))
      
      // Select all by default
      orders.value.forEach(o => selectedOrders.value.add(o.id))
    }
  } catch (err) {
    console.error('[Orders] Error:', err)
  } finally {
    loading.value = false
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0
  const R = 6371 * 0.621371 // Convert to miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function toggleOrder(orderId: string) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId)
  } else {
    selectedOrders.value.add(orderId)
  }
  selectedOrders.value = new Set(selectedOrders.value) // Trigger reactivity
}

async function acceptOrders() {
  if (selectedOrders.value.size === 0) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[Orders] No user found')
      return
    }

    // Get provider ID
    const { data: provider, error: providerError } = await supabase
      .from('providers_v2')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (providerError || !provider) {
      console.error('[Orders] Provider not found:', providerError)
      alert('ไม่พบข้อมูลผู้ให้บริการ')
      return
    }

    // Accept selected orders
    const orderIds = Array.from(selectedOrders.value)
    
    for (const orderId of orderIds) {
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({
          provider_id: provider.id,
          status: 'matched',
          matched_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'pending')

      if (updateError) {
        console.error('[Orders] Accept error:', updateError)
        alert(`ไม่สามารถรับงานได้: ${updateError.message}`)
        return
      }
    }

    // Navigate to first job detail
    if (orderIds.length > 0) {
      router.push(`/provider/job/${orderIds[0]}`)
    }
  } catch (err) {
    console.error('[Orders] Accept error:', err)
  }
}

function customSelect() {
  // Clear selection and let user pick
  selectedOrders.value = new Set()
}

function goBack() {
  router.back()
}

// Lifecycle
onMounted(loadOrders)
</script>

<template>
  <div class="orders-page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="กลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 class="title">งาน</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Route Display -->
      <div class="route-card">
        <div class="route-item">
          <div class="route-dot green"></div>
          <div class="route-line"></div>
          <span class="route-label">ตำแหน่งของคุณ</span>
        </div>
        
        <div class="route-item destination">
          <div class="route-dot red"></div>
          <div class="route-info">
            <span class="route-address">
              {{ orders.length > 0 ? orders[0].destination_address : 'ไม่มีจุดหมาย' }}
            </span>
          </div>
          <button class="drop-points-btn">
            {{ dropPointsCount }} จุดส่ง
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Earnings Summary -->
      <div class="earnings-card">
        <div class="earnings-row main">
          <span class="earnings-label">รายได้จากการส่ง</span>
          <span class="earnings-value">฿{{ totalEarnings.toFixed(2) }}</span>
        </div>
        
        <div class="earnings-grid">
          <div class="earnings-item">
            <span class="item-label">ทิปรวม</span>
            <span class="item-value">฿{{ totalTips.toFixed(2) }}</span>
          </div>
          <div class="earnings-item">
            <span class="item-label">ระยะทางรวม</span>
            <span class="item-value">{{ totalDistance.toFixed(1) }} กม.</span>
          </div>
        </div>

        <div class="earnings-row total">
          <span class="earnings-label">รายได้โดยประมาณ</span>
          <span class="earnings-value">฿{{ totalEstEarnings.toFixed(2) }}</span>
        </div>

        <!-- Best Route Toggle -->
        <div class="route-toggle">
          <div class="toggle-info">
            <span class="toggle-label">เลือกเส้นทางที่ดีที่สุดเสมอ ไม่สนใจการจราจร</span>
          </div>
          <button 
            class="toggle-btn"
            :class="{ active: alwaysBestRoute }"
            @click="alwaysBestRoute = !alwaysBestRoute"
            aria-label="สลับเส้นทางที่ดีที่สุด"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
          <button class="info-btn" aria-label="ข้อมูลเพิ่มเติม">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Orders List (Collapsible) -->
      <details class="orders-list">
        <summary class="orders-summary">
          <span>{{ orders.length }} งานที่พร้อมรับ</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div class="orders-content">
          <div 
            v-for="order in orders" 
            :key="order.id"
            class="order-item"
            :class="{ selected: selectedOrders.has(order.id) }"
            @click="toggleOrder(order.id)"
          >
            <div class="order-checkbox">
              <svg v-if="selectedOrders.has(order.id)" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div class="order-info">
              <span class="order-address">{{ order.destination_address }}</span>
              <span class="order-meta">{{ order.distance.toFixed(1) }} กม. • ฿{{ order.estimated_fare.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </details>
    </main>

    <!-- Bottom Actions -->
    <footer class="actions">
      <button class="accept-btn" @click="acceptOrders" :disabled="selectedOrders.size === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
        รับ {{ selectedOrders.size }} งาน
      </button>
      <button class="custom-btn" @click="customSelect">
        ไม่ ฉันจะเลือกเอง
      </button>
    </footer>
  </div>
</template>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  background: #FFFFFF;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #111827;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-spacer {
  width: 40px;
}

/* Loading */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.content {
  flex: 1;
  padding: 20px 16px;
  padding-bottom: 160px;
}

/* Route Card */
.route-card {
  margin-bottom: 24px;
}

.route-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  padding-left: 4px;
}

.route-item.destination {
  margin-top: 16px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.route-dot.green {
  background: #00A86B;
}

.route-dot.red {
  background: #EF4444;
}

.route-line {
  position: absolute;
  left: 9px;
  top: 20px;
  width: 2px;
  height: 24px;
  background: repeating-linear-gradient(
    to bottom,
    #D1D5DB 0px,
    #D1D5DB 4px,
    transparent 4px,
    transparent 8px
  );
}

.route-label {
  font-size: 15px;
  color: #6B7280;
}

.route-info {
  flex: 1;
}

.route-address {
  font-size: 15px;
  color: #111827;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drop-points-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
  margin-left: auto;
}

.drop-points-btn svg {
  width: 16px;
  height: 16px;
}

/* Earnings Card */
.earnings-card {
  background: #F9FAFB;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.earnings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.earnings-row.main {
  margin-bottom: 20px;
}

.earnings-row.total {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.earnings-label {
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  letter-spacing: 0.5px;
}

.earnings-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.earnings-row.total .earnings-value {
  font-size: 24px;
}

.earnings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.earnings-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-label {
  font-size: 11px;
  font-weight: 500;
  color: #9CA3AF;
  letter-spacing: 0.5px;
}

.item-value {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

/* Route Toggle */
.route-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.toggle-info {
  flex: 1;
}

.toggle-label {
  font-size: 13px;
  color: #6B7280;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggle-track {
  display: block;
  width: 44px;
  height: 24px;
  background: #E5E7EB;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: #00A86B;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #FFFFFF;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

.info-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #9CA3AF;
}

.info-btn svg {
  width: 20px;
  height: 20px;
}

/* Orders List */
.orders-list {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.orders-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  list-style: none;
}

.orders-summary::-webkit-details-marker {
  display: none;
}

.orders-summary svg {
  width: 20px;
  height: 20px;
  color: #6B7280;
  transition: transform 0.2s;
}

.orders-list[open] .orders-summary svg {
  transform: rotate(180deg);
}

.orders-content {
  border-top: 1px solid #E5E7EB;
  max-height: 300px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:last-child {
  border-bottom: none;
}

.order-item:active {
  background: #F9FAFB;
}

.order-item.selected {
  background: #E8F5EF;
}

.order-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #D1D5DB;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.order-item.selected .order-checkbox {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.order-checkbox svg {
  width: 16px;
  height: 16px;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-address {
  display: block;
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-meta {
  font-size: 12px;
  color: #6B7280;
}

/* Actions */
.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accept-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: #00A86B;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
}

.accept-btn:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
}

.accept-btn:not(:disabled):active {
  transform: scale(0.98);
  background: #008F5B;
}

.accept-btn svg {
  width: 20px;
  height: 20px;
}

.custom-btn {
  width: 100%;
  padding: 14px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  min-height: 48px;
}

.custom-btn:active {
  color: #111827;
}
</style>
