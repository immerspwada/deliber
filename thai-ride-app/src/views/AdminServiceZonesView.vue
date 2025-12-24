<script setup lang="ts">
/**
 * AdminServiceZonesView - Service Zone Management
 * 
 * Feature: F42 - Service Area Management
 * ระบบจัดการพื้นที่ให้บริการ (Serviceable Zones)
 * 
 * @features
 * - แสดงรายการ Zones ทั้งหมด
 * - เพิ่ม Zone ใหม่ (Radius / Geofence / Country)
 * - แก้ไข/ลบ Zone
 * - แผนที่แสดงพื้นที่
 * - Zone Analytics & Heat Map
 * - Zone Pricing Rules
 * - Real-time Demand Tracking
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useServiceAreaV2, type ServiceZone, type ZonePricingRule } from '../composables/useServiceAreaV2'
import { useZoneAnalytics, type ZoneStats, type HourlyDemand, type RealtimeDemand } from '../composables/useZoneAnalytics'

const {
  zones,
  loading,
  error,
  pricingRules,
  fetchAllZones,
  createZone,
  updateZone,
  deleteZone,
  fetchPricingRules,
  createPricingRule,
  updatePricingRule
} = useServiceAreaV2()

const {
  zoneStats,
  hourlyDemand,
  realtimeDemand,
  totalRides,
  totalRevenue,
  avgWaitTime,
  highDemandZones,
  loading: analyticsLoading,
  fetchZoneStats,
  fetchHourlyDemand,
  fetchRealtimeDemand,
  validateZoneOverlap,
  getDemandLevelColor,
  formatCurrency
} = useZoneAnalytics()

// Analytics State
const showAnalytics = ref(false)
const selectedAnalyticsZone = ref<string | null>(null)
const overlapWarning = ref<string | null>(null)

// Pricing Rules State
const showPricingModal = ref(false)
const selectedPricingZone = ref<ServiceZone | null>(null)
const pricingForm = ref({
  rule_type: 'time_based' as 'time_based' | 'demand_based' | 'weather' | 'event' | 'holiday',
  rule_name: '',
  rule_name_th: '',
  fare_multiplier: 1.0,
  flat_surcharge: 0,
  priority: 0,
  is_active: true,
  conditions: {
    time_start: '07:00',
    time_end: '09:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri']
  }
})

// Real-time Demand State
const showRealtimeDemand = ref(false)

// UI State
const showAddModal = ref(false)
const showEditModal = ref(false)
const selectedZone = ref<ServiceZone | null>(null)
const isRefreshing = ref(false)
const searchQuery = ref('')
const filterType = ref<string>('')

// Form State
const form = ref({
  name: '',
  name_th: '',
  zone_type: 'radius' as 'radius' | 'geofence' | 'country',
  center_lat: 13.7563,
  center_lng: 100.5018,
  radius_km: 5,
  boundaries: null as any,
  is_active: true,
  base_fare_multiplier: 1.0,
  per_km_multiplier: 1.0,
  min_fare_override: null as number | null
})

// Map State
const mapRef = ref<HTMLDivElement | null>(null)
const map = ref<google.maps.Map | null>(null)
const marker = ref<google.maps.Marker | null>(null)
const circle = ref<google.maps.Circle | null>(null)
const polygon = ref<google.maps.Polygon | null>(null)
const drawingManager = ref<google.maps.drawing.DrawingManager | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const autocomplete = ref<google.maps.places.Autocomplete | null>(null)

// Computed
const filteredZones = computed(() => {
  let result = zones.value
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(z => 
      z.name.toLowerCase().includes(q) || 
      z.name_th.toLowerCase().includes(q)
    )
  }
  
  if (filterType.value) {
    result = result.filter(z => z.zone_type === filterType.value)
  }
  
  return result
})

const stats = computed(() => ({
  total: zones.value.length,
  active: zones.value.filter(z => z.is_active).length,
  inactive: zones.value.filter(z => !z.is_active).length
}))

// Initialize Map
const initMap = () => {
  if (!mapRef.value || map.value) return
  
  map.value = new google.maps.Map(mapRef.value, {
    center: { lat: form.value.center_lat, lng: form.value.center_lng },
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  })
  
  // Add marker
  marker.value = new google.maps.Marker({
    position: { lat: form.value.center_lat, lng: form.value.center_lng },
    map: map.value,
    draggable: true
  })
  
  // Marker drag event
  marker.value.addListener('dragend', () => {
    const pos = marker.value?.getPosition()
    if (pos) {
      form.value.center_lat = pos.lat()
      form.value.center_lng = pos.lng()
      updateMapOverlay()
    }
  })
  
  // Map click event
  map.value.addListener('click', (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      form.value.center_lat = e.latLng.lat()
      form.value.center_lng = e.latLng.lng()
      marker.value?.setPosition(e.latLng)
      updateMapOverlay()
    }
  })
  
  // Initialize autocomplete
  if (searchInput.value) {
    autocomplete.value = new google.maps.places.Autocomplete(searchInput.value, {
      componentRestrictions: { country: 'th' }
    })
    
    autocomplete.value.addListener('place_changed', () => {
      const place = autocomplete.value?.getPlace()
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        form.value.center_lat = lat
        form.value.center_lng = lng
        map.value?.setCenter({ lat, lng })
        marker.value?.setPosition({ lat, lng })
        updateMapOverlay()
      }
    })
  }
  
  updateMapOverlay()
}

// Update map overlay based on zone type
const updateMapOverlay = () => {
  // Clear existing overlays
  circle.value?.setMap(null)
  polygon.value?.setMap(null)
  
  if (!map.value) return
  
  if (form.value.zone_type === 'radius') {
    circle.value = new google.maps.Circle({
      map: map.value,
      center: { lat: form.value.center_lat, lng: form.value.center_lng },
      radius: form.value.radius_km * 1000,
      fillColor: '#00A86B',
      fillOpacity: 0.2,
      strokeColor: '#00A86B',
      strokeWeight: 2,
      editable: true
    })
    
    circle.value.addListener('radius_changed', () => {
      form.value.radius_km = (circle.value?.getRadius() || 5000) / 1000
    })
    
    circle.value.addListener('center_changed', () => {
      const center = circle.value?.getCenter()
      if (center) {
        form.value.center_lat = center.lat()
        form.value.center_lng = center.lng()
        marker.value?.setPosition(center)
      }
    })
  } else if (form.value.zone_type === 'geofence' && form.value.boundaries) {
    const paths = form.value.boundaries.coordinates?.[0]?.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0]
    })) || []
    
    polygon.value = new google.maps.Polygon({
      map: map.value,
      paths,
      fillColor: '#00A86B',
      fillOpacity: 0.2,
      strokeColor: '#00A86B',
      strokeWeight: 2,
      editable: true
    })
  }
}

// Watch zone type changes
watch(() => form.value.zone_type, () => {
  updateMapOverlay()
})

// Watch radius changes
watch(() => form.value.radius_km, () => {
  if (circle.value && form.value.zone_type === 'radius') {
    circle.value.setRadius(form.value.radius_km * 1000)
  }
})

// Enable drawing mode for geofence
const enableDrawingMode = () => {
  if (!map.value) return
  
  // Clear existing polygon
  polygon.value?.setMap(null)
  
  drawingManager.value = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: false,
    polygonOptions: {
      fillColor: '#00A86B',
      fillOpacity: 0.2,
      strokeColor: '#00A86B',
      strokeWeight: 2,
      editable: true
    }
  })
  
  drawingManager.value.setMap(map.value)
  
  google.maps.event.addListener(drawingManager.value, 'polygoncomplete', (poly: google.maps.Polygon) => {
    polygon.value = poly
    drawingManager.value?.setDrawingMode(null)
    
    // Convert to GeoJSON
    const path = poly.getPath()
    const coordinates: number[][] = []
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i)
      coordinates.push([point.lng(), point.lat()])
    }
    // Close the polygon
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0])
    }
    
    form.value.boundaries = {
      type: 'Polygon',
      coordinates: [coordinates]
    }
  })
}

// Methods
const handleRefresh = async () => {
  isRefreshing.value = true
  await fetchAllZones()
  isRefreshing.value = false
}

const openAddModal = () => {
  resetForm()
  showAddModal.value = true
  setTimeout(initMap, 100)
}

const openEditModal = (zone: ServiceZone) => {
  selectedZone.value = zone
  form.value = {
    name: zone.name,
    name_th: zone.name_th,
    zone_type: zone.boundaries ? 'geofence' : 'radius',
    center_lat: zone.center_lat,
    center_lng: zone.center_lng,
    radius_km: 5,
    boundaries: zone.boundaries,
    is_active: zone.is_active,
    base_fare_multiplier: zone.base_fare_multiplier,
    per_km_multiplier: zone.per_km_multiplier,
    min_fare_override: zone.min_fare_override || null
  }
  showEditModal.value = true
  setTimeout(initMap, 100)
}

const resetForm = () => {
  form.value = {
    name: '',
    name_th: '',
    zone_type: 'radius',
    center_lat: 13.7563,
    center_lng: 100.5018,
    radius_km: 5,
    boundaries: null,
    is_active: true,
    base_fare_multiplier: 1.0,
    per_km_multiplier: 1.0,
    min_fare_override: null
  }
  // Reset map
  map.value = null
  marker.value = null
  circle.value = null
  polygon.value = null
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  selectedZone.value = null
  resetForm()
}

const handleSaveZone = async () => {
  if (!form.value.name || !form.value.name_th) {
    alert('กรุณากรอกชื่อ Zone')
    return
  }
  
  const zoneData: Partial<ServiceZone> = {
    name: form.value.name,
    name_th: form.value.name_th,
    zone_type: form.value.zone_type === 'radius' ? 'urban' : 'suburban',
    center_lat: form.value.center_lat,
    center_lng: form.value.center_lng,
    boundaries: form.value.zone_type === 'geofence' ? form.value.boundaries : null,
    is_active: form.value.is_active,
    base_fare_multiplier: form.value.base_fare_multiplier,
    per_km_multiplier: form.value.per_km_multiplier,
    min_fare_override: form.value.min_fare_override
  }
  
  if (selectedZone.value) {
    // Update
    const success = await updateZone(selectedZone.value.id, zoneData)
    if (success) {
      closeModal()
      await fetchAllZones()
    }
  } else {
    // Create
    const result = await createZone(zoneData)
    if (result) {
      closeModal()
      await fetchAllZones()
    }
  }
}

const handleDeleteZone = async (zone: ServiceZone) => {
  if (!confirm(`ยืนยันการลบ Zone "${zone.name_th}"?`)) return
  
  const success = await deleteZone(zone.id)
  if (success) {
    await fetchAllZones()
  }
}

const handleToggleActive = async (zone: ServiceZone) => {
  await updateZone(zone.id, { is_active: !zone.is_active })
  await fetchAllZones()
}

// Formatters
const getZoneTypeText = (type: string) => {
  const types: Record<string, string> = {
    urban: 'เขตเมือง',
    suburban: 'ชานเมือง',
    rural: 'ชนบท',
    airport: 'สนามบิน',
    tourist: 'แหล่งท่องเที่ยว',
    industrial: 'นิคมอุตสาหกรรม'
  }
  return types[type] || type
}

// Check zone overlap when form changes
const checkOverlap = async () => {
  if (form.value.zone_type !== 'radius') {
    overlapWarning.value = null
    return
  }
  
  const result = await validateZoneOverlap(
    form.value.center_lat,
    form.value.center_lng,
    form.value.radius_km,
    selectedZone.value?.id
  )
  
  if (result.overlaps) {
    const zoneNames = result.overlapping_zones.map(z => z.name_th).join(', ')
    overlapWarning.value = `พื้นที่ทับซ้อนกับ: ${zoneNames}`
  } else {
    overlapWarning.value = null
  }
}

// Watch for radius/location changes to check overlap
watch([() => form.value.center_lat, () => form.value.center_lng, () => form.value.radius_km], () => {
  if (showAddModal.value || showEditModal.value) {
    checkOverlap()
  }
}, { debounce: 500 } as any)

// Toggle analytics view
const toggleAnalytics = async () => {
  showAnalytics.value = !showAnalytics.value
  if (showAnalytics.value) {
    await fetchZoneStats()
    await fetchHourlyDemand()
  }
}

// View zone analytics
const viewZoneAnalytics = async (zoneId: string) => {
  selectedAnalyticsZone.value = zoneId
  await fetchHourlyDemand(zoneId)
}

// Get peak hours display
const getPeakHoursDisplay = (demand: HourlyDemand[]): string => {
  const sorted = [...demand].sort((a, b) => b.demand - a.demand)
  const top3 = sorted.slice(0, 3).map(d => `${d.hour}:00`)
  return top3.join(', ')
}

// Initialize
onMounted(async () => {
  await fetchAllZones()
  await fetchZoneStats()
  // Note: Real-time demand tracking is handled by useZoneAnalytics internally
})

// Cleanup handled by useZoneAnalytics composable
onUnmounted(() => {
  // Cleanup is automatic via useZoneAnalytics
})

// Pricing Rules Methods
const openPricingModal = async (zone: ServiceZone) => {
  selectedPricingZone.value = zone
  await fetchPricingRules(zone.id)
  showPricingModal.value = true
}

const closePricingModal = () => {
  showPricingModal.value = false
  selectedPricingZone.value = null
  resetPricingForm()
}

const resetPricingForm = () => {
  pricingForm.value = {
    rule_type: 'time_based',
    rule_name: '',
    rule_name_th: '',
    fare_multiplier: 1.0,
    flat_surcharge: 0,
    priority: 0,
    is_active: true,
    conditions: {
      time_start: '07:00',
      time_end: '09:00',
      days: ['mon', 'tue', 'wed', 'thu', 'fri']
    }
  }
}

const handleSavePricingRule = async () => {
  if (!selectedPricingZone.value || !pricingForm.value.rule_name) {
    alert('กรุณากรอกชื่อ Rule')
    return
  }

  const rule: Partial<ZonePricingRule> = {
    zone_id: selectedPricingZone.value.id,
    rule_type: pricingForm.value.rule_type,
    rule_name: pricingForm.value.rule_name,
    rule_name_th: pricingForm.value.rule_name_th || pricingForm.value.rule_name,
    fare_multiplier: pricingForm.value.fare_multiplier,
    flat_surcharge: pricingForm.value.flat_surcharge,
    priority: pricingForm.value.priority,
    is_active: pricingForm.value.is_active,
    conditions: pricingForm.value.conditions
  }

  const result = await createPricingRule(rule)
  if (result) {
    resetPricingForm()
    await fetchPricingRules(selectedPricingZone.value.id)
  }
}

const togglePricingRuleActive = async (rule: ZonePricingRule) => {
  await updatePricingRule(rule.id, { is_active: !rule.is_active })
  if (selectedPricingZone.value) {
    await fetchPricingRules(selectedPricingZone.value.id)
  }
}

const getRuleTypeText = (type: string) => {
  const types: Record<string, string> = {
    time_based: 'ตามเวลา',
    demand_based: 'ตาม Demand',
    weather: 'สภาพอากาศ',
    event: 'งานอีเวนต์',
    holiday: 'วันหยุด'
  }
  return types[type] || type
}

// Toggle real-time demand view
const toggleRealtimeDemand = () => {
  showRealtimeDemand.value = !showRealtimeDemand.value
  if (showRealtimeDemand.value) {
    fetchRealtimeDemand()
  }
}

// Get surge color
const getSurgeColor = (multiplier: number): string => {
  if (multiplier >= 2.0) return '#9C27B0'
  if (multiplier >= 1.5) return '#E53935'
  if (multiplier >= 1.25) return '#F5A623'
  return '#00A86B'
}
</script>

<template>
  <AdminLayout>
    <div class="service-zones-page">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="$router.back()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>Serviceable Zones</h1>
        </div>
        <button class="save-btn" @click="handleRefresh" :disabled="isRefreshing">
          {{ isRefreshing ? 'กำลังโหลด...' : 'Save' }}
        </button>
      </header>

      <!-- Content -->
      <div class="page-content">
        <!-- Analytics Section -->
        <section v-if="showAnalytics" class="analytics-section">
          <div class="section-header">
            <div class="section-title">
              <h2>Zone Analytics</h2>
              <p>สถิติการใช้งานแต่ละ Zone</p>
            </div>
            <button class="close-analytics-btn" @click="showAnalytics = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Summary Stats -->
          <div class="analytics-stats">
            <div class="stat-card">
              <div class="stat-icon rides">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ totalRides.toLocaleString() }}</span>
                <span class="stat-label">Rides ทั้งหมด</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon revenue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ formatCurrency(totalRevenue) }}</span>
                <span class="stat-label">รายได้รวม</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon wait">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ avgWaitTime.toFixed(1) }} นาที</span>
                <span class="stat-label">เวลารอเฉลี่ย</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon demand">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ highDemandZones.length }}</span>
                <span class="stat-label">High Demand Zones</span>
              </div>
            </div>
          </div>

          <!-- Zone Stats Table -->
          <div class="zone-stats-table" v-if="zoneStats.length > 0">
            <div class="table-header">
              <div class="th-cell">Zone</div>
              <div class="th-cell">Rides</div>
              <div class="th-cell">รายได้</div>
              <div class="th-cell">เวลารอ</div>
              <div class="th-cell">Demand</div>
              <div class="th-cell">Peak Hour</div>
            </div>
            <div class="table-body">
              <div 
                v-for="stat in zoneStats" 
                :key="stat.zone_id" 
                class="table-row"
                @click="viewZoneAnalytics(stat.zone_id)"
              >
                <div class="td-cell zone-name">
                  <span class="name-th">{{ stat.zone_name_th }}</span>
                </div>
                <div class="td-cell">{{ stat.total_rides.toLocaleString() }}</div>
                <div class="td-cell">{{ formatCurrency(stat.total_revenue) }}</div>
                <div class="td-cell">{{ stat.avg_wait_time_minutes }} นาที</div>
                <div class="td-cell">
                  <span 
                    class="demand-badge" 
                    :style="{ backgroundColor: getDemandLevelColor(stat.demand_level) }"
                  >
                    {{ stat.demand_level }}
                  </span>
                </div>
                <div class="td-cell">{{ stat.peak_hour }}:00</div>
              </div>
            </div>
          </div>

          <!-- Hourly Demand Chart -->
          <div class="hourly-chart" v-if="hourlyDemand.length > 0">
            <h3>Demand ตามชั่วโมง</h3>
            <div class="chart-container">
              <div 
                v-for="hour in hourlyDemand" 
                :key="hour.hour" 
                class="chart-bar"
                :title="`${hour.hour}:00 - ${hour.demand} rides, surge: ${hour.surge_multiplier}x`"
              >
                <div 
                  class="bar-fill" 
                  :style="{ 
                    height: `${Math.max(5, (hour.demand / Math.max(...hourlyDemand.map(h => h.demand), 1)) * 100)}%`,
                    backgroundColor: hour.surge_multiplier > 1.2 ? '#E53935' : hour.surge_multiplier > 1.0 ? '#F5A623' : '#00A86B'
                  }"
                ></div>
                <span class="bar-label">{{ hour.hour }}</span>
              </div>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="dot normal"></span> ปกติ</span>
              <span class="legend-item"><span class="dot medium"></span> Surge 1.1-1.2x</span>
              <span class="legend-item"><span class="dot high"></span> Surge > 1.2x</span>
            </div>
          </div>

          <div v-if="analyticsLoading" class="analytics-loading">
            <div class="spinner"></div>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </section>

        <!-- Zones Section -->
        <section class="zones-section">
          <div class="section-header">
            <div class="section-title">
              <h2>Zones</h2>
              <p>List of Serviceable Zones</p>
            </div>
            <div class="header-actions">
              <button class="realtime-btn" @click="toggleRealtimeDemand">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                {{ showRealtimeDemand ? 'ซ่อน Live' : 'Live Demand' }}
              </button>
              <button class="analytics-btn" @click="toggleAnalytics">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
                {{ showAnalytics ? 'ซ่อน Analytics' : 'ดู Analytics' }}
              </button>
              <button class="add-zone-btn" @click="openAddModal">Add Zone</button>
            </div>
          </div>

          <!-- Stats -->
          <div class="zone-stats">
            <span class="stat-item">ทั้งหมด: {{ stats.total }}</span>
            <span class="stat-item active">เปิดใช้งาน: {{ stats.active }}</span>
            <span class="stat-item inactive">ปิดใช้งาน: {{ stats.inactive }}</span>
          </div>

          <!-- Filters -->
          <div class="filters-row">
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="ค้นหา Zone..."
              class="search-input"
            />
            <select v-model="filterType" class="filter-select">
              <option value="">ทุกประเภท</option>
              <option value="urban">เขตเมือง</option>
              <option value="suburban">ชานเมือง</option>
              <option value="rural">ชนบท</option>
              <option value="airport">สนามบิน</option>
              <option value="tourist">แหล่งท่องเที่ยว</option>
            </select>
          </div>

          <!-- Table -->
          <div class="zones-table">
            <div class="table-header">
              <div class="th-cell">ZONE NAME</div>
              <div class="th-cell">ZONE TYPE</div>
              <div class="th-cell">ACTIVE</div>
              <div class="th-cell">ACTION</div>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="table-loading">
              <div class="spinner"></div>
              <span>กำลังโหลด...</span>
            </div>

            <!-- Empty -->
            <div v-else-if="filteredZones.length === 0" class="table-empty">
              No Data Available
            </div>

            <!-- Rows -->
            <div v-else class="table-body">
              <div 
                v-for="zone in filteredZones" 
                :key="zone.id" 
                class="table-row"
              >
                <div class="td-cell zone-name">
                  <span class="name-th">{{ zone.name_th }}</span>
                  <span class="name-en">{{ zone.name }}</span>
                </div>
                <div class="td-cell">
                  <span class="zone-type-badge">{{ getZoneTypeText(zone.zone_type) }}</span>
                </div>
                <div class="td-cell">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      :checked="zone.is_active"
                      @change="handleToggleActive(zone)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="td-cell actions">
                  <button class="action-btn pricing" @click="openPricingModal(zone)" title="Pricing Rules">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  </button>
                  <button class="action-btn edit" @click="openEditModal(zone)" title="แก้ไข">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn delete" @click="handleDeleteZone(zone)" title="ลบ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Quick Links -->
        <aside class="quick-links">
          <a href="#" class="quick-link active">Zones</a>
        </aside>
      </div>

      <!-- Add/Edit Zone Modal -->
      <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container zone-modal">
          <!-- Modal Header -->
          <div class="modal-header">
            <h3>{{ showEditModal ? 'Edit Zone' : 'Add Zone' }}</h3>
            <button class="close-btn" @click="closeModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="modal-content">
            <!-- Map Section -->
            <div class="map-section">
              <div ref="mapRef" class="map-container"></div>
            </div>

            <!-- Form Section -->
            <div class="form-section">
              <!-- Address Search -->
              <div class="form-group">
                <label>Address</label>
                <input 
                  ref="searchInput"
                  type="text" 
                  placeholder="Search Location"
                  class="form-input"
                />
              </div>

              <!-- Zone Name -->
              <div class="form-group">
                <label>Zone Name*</label>
                <input 
                  v-model="form.name"
                  type="text" 
                  placeholder="Enter Zone Name (English)"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label>ชื่อ Zone (ไทย)*</label>
                <input 
                  v-model="form.name_th"
                  type="text" 
                  placeholder="กรอกชื่อ Zone ภาษาไทย"
                  class="form-input"
                />
              </div>

              <!-- Serviceable Area Type -->
              <div class="form-group">
                <label>Serviceable Area</label>
                <div class="radio-group">
                  <label class="radio-item">
                    <input 
                      type="radio" 
                      v-model="form.zone_type" 
                      value="radius"
                    />
                    <span class="radio-label">Radius</span>
                  </label>
                  <label class="radio-item">
                    <input 
                      type="radio" 
                      v-model="form.zone_type" 
                      value="geofence"
                    />
                    <span class="radio-label">Geofence</span>
                  </label>
                  <label class="radio-item">
                    <input 
                      type="radio" 
                      v-model="form.zone_type" 
                      value="country"
                    />
                    <span class="radio-label">Set Country</span>
                  </label>
                </div>
              </div>

              <!-- Radius Settings -->
              <div v-if="form.zone_type === 'radius'" class="form-group">
                <label>Set Radius</label>
                <div class="radius-input">
                  <input 
                    v-model.number="form.radius_km"
                    type="number" 
                    min="1"
                    max="100"
                    placeholder="Radius"
                    class="form-input"
                  />
                  <select class="unit-select">
                    <option value="km">KM</option>
                  </select>
                </div>
                <!-- Overlap Warning -->
                <div v-if="overlapWarning" class="overlap-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{{ overlapWarning }}</span>
                </div>
              </div>

              <!-- Geofence Button -->
              <div v-if="form.zone_type === 'geofence'" class="form-group">
                <button class="draw-btn" @click="enableDrawingMode">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                  วาดพื้นที่บนแผนที่
                </button>
              </div>

              <!-- Pricing Settings -->
              <div class="form-group">
                <label>ตัวคูณค่าโดยสาร</label>
                <input 
                  v-model.number="form.base_fare_multiplier"
                  type="number" 
                  step="0.1"
                  min="0.5"
                  max="3"
                  class="form-input"
                />
              </div>

              <!-- Active Toggle -->
              <div class="form-group toggle-group">
                <label>เปิดใช้งาน</label>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="form.is_active" />
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <!-- Submit Button -->
              <button class="submit-btn" @click="handleSaveZone">
                {{ showEditModal ? 'Update' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-time Demand Section -->
      <div v-if="showRealtimeDemand" class="realtime-demand-section">
        <div class="section-header">
          <div class="section-title">
            <h2>Live Demand Tracking</h2>
            <p>ข้อมูล Real-time ของแต่ละ Zone</p>
          </div>
          <button class="close-btn" @click="showRealtimeDemand = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="demand-grid">
          <div 
            v-for="demand in realtimeDemand" 
            :key="demand.zone_id" 
            class="demand-card"
            :class="{ 'high-demand': demand.surge_multiplier > 1.25 }"
          >
            <div class="demand-header">
              <span class="zone-name">{{ demand.zone_name_th }}</span>
              <span 
                class="surge-badge" 
                :style="{ backgroundColor: getSurgeColor(demand.surge_multiplier) }"
              >
                {{ demand.surge_multiplier.toFixed(2) }}x
              </span>
            </div>
            <div class="demand-stats">
              <div class="stat">
                <span class="stat-value pending">{{ demand.pending_requests }}</span>
                <span class="stat-label">รอรับ</span>
              </div>
              <div class="stat">
                <span class="stat-value available">{{ demand.available_providers }}</span>
                <span class="stat-label">คนขับว่าง</span>
              </div>
              <div class="stat">
                <span class="stat-value ratio">{{ demand.demand_ratio.toFixed(2) }}</span>
                <span class="stat-label">Ratio</span>
              </div>
            </div>
            <div class="demand-footer">
              <span class="last-updated">อัพเดท: {{ new Date(demand.last_updated).toLocaleTimeString('th-TH') }}</span>
            </div>
          </div>
        </div>
        <div v-if="realtimeDemand.length === 0" class="no-demand-data">
          <p>ไม่มีข้อมูล Demand</p>
        </div>
      </div>

      <!-- Pricing Rules Modal -->
      <div v-if="showPricingModal" class="modal-overlay" @click.self="closePricingModal">
        <div class="modal-container pricing-modal">
          <div class="modal-header">
            <h3>Pricing Rules - {{ selectedPricingZone?.name_th }}</h3>
            <button class="close-btn" @click="closePricingModal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="modal-content pricing-content">
            <!-- Existing Rules -->
            <div class="existing-rules">
              <h4>Rules ที่มีอยู่</h4>
              <div v-if="pricingRules.length === 0" class="no-rules">
                ยังไม่มี Pricing Rules
              </div>
              <div v-else class="rules-list">
                <div 
                  v-for="rule in pricingRules" 
                  :key="rule.id" 
                  class="rule-item"
                  :class="{ inactive: !rule.is_active }"
                >
                  <div class="rule-info">
                    <span class="rule-name">{{ rule.rule_name_th || rule.rule_name }}</span>
                    <span class="rule-type">{{ getRuleTypeText(rule.rule_type) }}</span>
                  </div>
                  <div class="rule-multiplier">
                    <span class="multiplier-value">{{ rule.fare_multiplier }}x</span>
                    <span v-if="rule.flat_surcharge > 0" class="surcharge">+฿{{ rule.flat_surcharge }}</span>
                  </div>
                  <label class="toggle-switch small">
                    <input 
                      type="checkbox" 
                      :checked="rule.is_active"
                      @change="togglePricingRuleActive(rule)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Add New Rule -->
            <div class="add-rule-section">
              <h4>เพิ่ม Rule ใหม่</h4>
              <div class="rule-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>ประเภท Rule</label>
                    <select v-model="pricingForm.rule_type" class="form-input">
                      <option value="time_based">ตามเวลา</option>
                      <option value="demand_based">ตาม Demand</option>
                      <option value="weather">สภาพอากาศ</option>
                      <option value="event">งานอีเวนต์</option>
                      <option value="holiday">วันหยุด</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>ชื่อ Rule</label>
                    <input 
                      v-model="pricingForm.rule_name"
                      type="text" 
                      placeholder="เช่น Rush Hour Morning"
                      class="form-input"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>ชื่อ Rule (ไทย)</label>
                    <input 
                      v-model="pricingForm.rule_name_th"
                      type="text" 
                      placeholder="เช่น ชั่วโมงเร่งด่วนเช้า"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>Priority</label>
                    <input 
                      v-model.number="pricingForm.priority"
                      type="number" 
                      min="0"
                      max="100"
                      class="form-input"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>ตัวคูณค่าโดยสาร</label>
                    <input 
                      v-model.number="pricingForm.fare_multiplier"
                      type="number" 
                      step="0.1"
                      min="1"
                      max="5"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>ค่าธรรมเนียมเพิ่ม (฿)</label>
                    <input 
                      v-model.number="pricingForm.flat_surcharge"
                      type="number" 
                      min="0"
                      class="form-input"
                    />
                  </div>
                </div>

                <!-- Time-based conditions -->
                <div v-if="pricingForm.rule_type === 'time_based'" class="conditions-section">
                  <label>ช่วงเวลา</label>
                  <div class="time-range">
                    <input 
                      v-model="pricingForm.conditions.time_start"
                      type="time" 
                      class="form-input"
                    />
                    <span>ถึง</span>
                    <input 
                      v-model="pricingForm.conditions.time_end"
                      type="time" 
                      class="form-input"
                    />
                  </div>
                  <div class="days-selector">
                    <label 
                      v-for="day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']" 
                      :key="day"
                      class="day-checkbox"
                    >
                      <input 
                        type="checkbox" 
                        :value="day"
                        v-model="pricingForm.conditions.days"
                      />
                      <span>{{ day.toUpperCase() }}</span>
                    </label>
                  </div>
                </div>

                <button class="submit-btn" @click="handleSavePricingRule">
                  เพิ่ม Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.service-zones-page {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  color: #1A1A1A;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.save-btn {
  padding: 10px 24px;
  background: #2196F3;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Content */
.page-content {
  display: flex;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.zones-section {
  flex: 1;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.analytics-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #E8F5EF;
  color: #00A86B;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.analytics-btn:hover {
  background: #D0EBE1;
}

.section-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.section-title p {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.add-zone-btn {
  padding: 10px 20px;
  background: #1A1A1A;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Stats */
.zone-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  font-size: 13px;
  color: #666666;
}

.stat-item.active { color: #00A86B; }
.stat-item.inactive { color: #E53935; }

/* Filters */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFFFF;
  min-width: 150px;
}

/* Table */
.zones-table {
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 100px 120px;
  background: #1A1A1A;
  color: #FFFFFF;
}

.th-cell {
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-body {
  max-height: 500px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 100px 120px;
  border-bottom: 1px solid #F0F0F0;
}

.table-row:last-child {
  border-bottom: none;
}

.td-cell {
  padding: 14px 16px;
  display: flex;
  align-items: center;
}

.zone-name {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.name-th {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.name-en {
  font-size: 12px;
  color: #666666;
}

.zone-type-badge {
  padding: 4px 10px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #E8E8E8;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #FFFFFF;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: #00A86B;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Actions */
.actions {
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.edit {
  background: #E3F2FD;
  color: #2196F3;
}

.action-btn.delete {
  background: #FFEBEE;
  color: #E53935;
}

.action-btn:hover {
  opacity: 0.8;
}

/* Table States */
.table-loading,
.table-empty {
  padding: 60px 20px;
  text-align: center;
  color: #666666;
}

.table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Quick Links */
.quick-links {
  width: 200px;
}

.quick-link {
  display: block;
  padding: 10px 16px;
  color: #2196F3;
  text-decoration: none;
  font-size: 14px;
  border-left: 3px solid #2196F3;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px;
  z-index: 1000;
  overflow-y: auto;
}

.modal-container {
  background: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E8E8E8;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #F5F5F5;
  border-radius: 6px;
  cursor: pointer;
  color: #666666;
}

.modal-content {
  display: flex;
  height: calc(90vh - 60px);
}

/* Map Section */
.map-section {
  flex: 1;
  min-width: 0;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #E8E8E8;
}

/* Form Section */
.form-section {
  width: 320px;
  padding: 20px;
  overflow-y: auto;
  border-left: 1px solid #E8E8E8;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #00A86B;
}

/* Radio Group */
.radio-group {
  display: flex;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.radio-item input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #2196F3;
}

.radio-label {
  font-size: 13px;
  color: #1A1A1A;
}

/* Radius Input */
.radius-input {
  display: flex;
  gap: 8px;
}

.radius-input .form-input {
  flex: 1;
}

.unit-select {
  width: 70px;
  padding: 10px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFFFF;
}

/* Draw Button */
.draw-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 2px dashed #00A86B;
  border-radius: 8px;
  background: #E8F5EF;
  color: #00A86B;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Toggle Group */
.toggle-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Submit Button */
.submit-btn {
  width: 100%;
  padding: 14px;
  background: #1A1A1A;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20px;
}

.submit-btn:hover {
  background: #333333;
}

/* Responsive */
@media (max-width: 768px) {

/* Analytics Section */
.analytics-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.close-analytics-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #F5F5F5;
  border-radius: 6px;
  cursor: pointer;
  color: #666666;
}

.analytics-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F9F9F9;
  border-radius: 10px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.stat-icon.rides { background: #E3F2FD; color: #2196F3; }
.stat-icon.revenue { background: #E8F5EF; color: #00A86B; }
.stat-icon.wait { background: #FFF3E0; color: #F5A623; }
.stat-icon.demand { background: #FFEBEE; color: #E53935; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-label {
  font-size: 12px;
  color: #666666;
}

/* Zone Stats Table */
.zone-stats-table {
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.zone-stats-table .table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  background: #1A1A1A;
  color: #FFFFFF;
}

.zone-stats-table .table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  transition: background 0.2s;
}

.zone-stats-table .table-row:hover {
  background: #F9F9F9;
}

.demand-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #FFFFFF;
  text-transform: uppercase;
}

/* Hourly Chart */
.hourly-chart {
  background: #F9F9F9;
  border-radius: 10px;
  padding: 20px;
}

.hourly-chart h3 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.chart-container {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding-bottom: 24px;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-fill {
  width: 100%;
  max-width: 20px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
}

.bar-label {
  font-size: 10px;
  color: #666666;
  margin-top: 4px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666666;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-item .dot.normal { background: #00A86B; }
.legend-item .dot.medium { background: #F5A623; }
.legend-item .dot.high { background: #E53935; }

.analytics-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #666666;
}

/* Overlap Warning */
.overlap-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #FFF3E0;
  border: 1px solid #F5A623;
  border-radius: 8px;
  color: #E65100;
  font-size: 13px;
}

.overlap-warning svg {
  flex-shrink: 0;
  color: #F5A623;
}

/* Responsive */
@media (max-width: 768px) {
  .analytics-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .zone-stats-table .table-header,
  .zone-stats-table .table-row {
    grid-template-columns: 1fr 1fr 1fr;
  }
  
  .zone-stats-table .th-cell:nth-child(4),
  .zone-stats-table .th-cell:nth-child(5),
  .zone-stats-table .th-cell:nth-child(6),
  .zone-stats-table .td-cell:nth-child(4),
  .zone-stats-table .td-cell:nth-child(5),
  .zone-stats-table .td-cell:nth-child(6) {
    display: none;
  }
  
  .header-actions {
    flex-direction: column;
  }
}
  .page-content {
    flex-direction: column;
  }
  
  .quick-links {
    display: none;
  }
  
  .modal-content {
    flex-direction: column;
    height: auto;
  }
  
  .map-section {
    height: 300px;
  }
  
  .form-section {
    width: 100%;
    border-left: none;
    border-top: 1px solid #E8E8E8;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .th-cell:nth-child(3),
  .th-cell:nth-child(4),
  .td-cell:nth-child(3),
  .td-cell:nth-child(4) {
    display: none;
  }
}

/* Real-time Demand Section */
.realtime-demand-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid #E8E8E8;
  padding: 20px 24px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 50vh;
  overflow-y: auto;
}

.realtime-demand-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.demand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.demand-card {
  background: #F9F9F9;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.demand-card.high-demand {
  border-color: #E53935;
  background: #FFF5F5;
}

.demand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.demand-header .zone-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.surge-badge {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
}

.demand-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.demand-stats .stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.demand-stats .stat-value {
  font-size: 20px;
  font-weight: 700;
}

.demand-stats .stat-value.pending { color: #E53935; }
.demand-stats .stat-value.available { color: #00A86B; }
.demand-stats .stat-value.ratio { color: #F5A623; }

.demand-stats .stat-label {
  font-size: 11px;
  color: #666666;
}

.demand-footer {
  border-top: 1px solid #E8E8E8;
  padding-top: 8px;
}

.last-updated {
  font-size: 11px;
  color: #999999;
}

.no-demand-data {
  text-align: center;
  padding: 40px;
  color: #666666;
}

/* Realtime Button */
.realtime-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFF3E0;
  color: #F5A623;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.realtime-btn:hover {
  background: #FFE0B2;
}

/* Pricing Button */
.action-btn.pricing {
  background: #E8F5EF;
  color: #00A86B;
}

/* Pricing Modal */
.pricing-modal {
  max-width: 700px;
}

.pricing-content {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 24px;
  max-height: calc(90vh - 60px);
  overflow-y: auto;
}

.existing-rules h4,
.add-rule-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px 0;
}

.no-rules {
  padding: 20px;
  text-align: center;
  color: #666666;
  background: #F9F9F9;
  border-radius: 8px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F9F9F9;
  border-radius: 8px;
}

.rule-item.inactive {
  opacity: 0.5;
}

.rule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rule-name {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.rule-type {
  font-size: 12px;
  color: #666666;
}

.rule-multiplier {
  display: flex;
  align-items: center;
  gap: 8px;
}

.multiplier-value {
  font-size: 16px;
  font-weight: 600;
  color: #00A86B;
}

.surcharge {
  font-size: 12px;
  color: #F5A623;
}

.toggle-switch.small {
  width: 36px;
  height: 20px;
}

.toggle-switch.small .toggle-slider:before {
  height: 14px;
  width: 14px;
}

.toggle-switch.small input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.add-rule-section {
  border-top: 1px solid #E8E8E8;
  padding-top: 20px;
}

.rule-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.conditions-section {
  background: #F9F9F9;
  padding: 16px;
  border-radius: 8px;
}

.conditions-section label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.time-range span {
  color: #666666;
}

.days-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.day-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.day-checkbox input:checked + span {
  color: #00A86B;
  font-weight: 600;
}
</style>
