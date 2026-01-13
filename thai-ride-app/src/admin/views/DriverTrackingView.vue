<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '../../lib/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface ProviderLocation {
  id: string
  provider_uid: string | null
  provider_type: string | null
  user_name: string
  phone_number: string | null
  current_lat: number | null
  current_lng: number | null
  is_online: boolean
  is_available: boolean
  rating: number
  total_trips: number
  last_location_update: string | null
}

interface LocationHistory {
  id: string
  latitude: number
  longitude: number
  recorded_at: string
}

const providers = ref<ProviderLocation[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedProvider = ref<ProviderLocation | null>(null)
const showDetailModal = ref(false)
const showHistoryModal = ref(false)
const locationHistory = ref<LocationHistory[]>([])
const historyLoading = ref(false)

// Map refs
const mapContainer = ref<HTMLDivElement | null>(null)
const historyMapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let historyMap: L.Map | null = null
let markers: Map<string, L.Marker> = new Map()
let historyPolyline: L.Polyline | null = null
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// Filters
const filterStatus = ref<'all' | 'online' | 'available'>('all')
const searchQuery = ref('')

const filteredProviders = computed(() => {
  let result = [...providers.value]
  if (filterStatus.value === 'online') result = result.filter(p => p.is_online)
  else if (filterStatus.value === 'available') result = result.filter(p => p.is_online && p.is_available)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => p.user_name.toLowerCase().includes(query) || (p.provider_uid?.toLowerCase() || '').includes(query) || (p.phone_number || '').includes(query))
  }
  return result
})

const onlineCount = computed(() => providers.value.filter(p => p.is_online).length)
const availableCount = computed(() => providers.value.filter(p => p.is_online && p.is_available).length)
const providersWithLocation = computed(() => filteredProviders.value.filter(p => p.current_lat && p.current_lng))

// Initialize map
function initMap(): void {
  if (!mapContainer.value || map) return
  map = L.map(mapContainer.value).setView([13.7563, 100.5018], 11) // Bangkok center
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)
}

// Update markers on map
function updateMarkers(): void {
  if (!map) return
  const currentIds = new Set(providersWithLocation.value.map(p => p.id))
  
  // Remove old markers
  markers.forEach((marker, id) => {
    if (!currentIds.has(id)) {
      map?.removeLayer(marker)
      markers.delete(id)
    }
  })
  
  // Add/update markers
  providersWithLocation.value.forEach(provider => {
    if (!provider.current_lat || !provider.current_lng) return
    const existing = markers.get(provider.id)
    const icon = createProviderIcon(provider)
    
    if (existing) {
      existing.setLatLng([provider.current_lat, provider.current_lng])
      existing.setIcon(icon)
    } else {
      const marker = L.marker([provider.current_lat, provider.current_lng], { icon })
        .bindPopup(createPopupContent(provider))
        .on('click', () => { selectedProvider.value = provider; showDetailModal.value = true })
      marker.addTo(map!)
      markers.set(provider.id, marker)
    }
  })
  
  // Fit bounds if providers exist
  if (providersWithLocation.value.length > 0) {
    const bounds = L.latLngBounds(providersWithLocation.value.map(p => [p.current_lat!, p.current_lng!]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
  }
}

function createProviderIcon(provider: ProviderLocation): L.DivIcon {
  const color = provider.is_online ? (provider.is_available ? '#10B981' : '#F59E0B') : '#6B7280'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
}

function createPopupContent(provider: ProviderLocation): string {
  return `<div style="min-width:150px"><strong>${provider.user_name}</strong><br><small>${provider.provider_uid || '-'}</small><br><span style="color:${provider.is_online ? '#10B981' : '#6B7280'}">${provider.is_online ? 'ออนไลน์' : 'ออฟไลน์'}</span></div>`
}

async function loadProviders(): Promise<void> {
  error.value = null
  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_active_providers_locations')
    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      providers.value = rpcData.map((p: any) => ({
        id: p.id, provider_uid: p.provider_uid, provider_type: p.provider_type,
        user_name: p.user_name || 'ไม่ระบุชื่อ', phone_number: p.phone_number,
        current_lat: p.current_lat, current_lng: p.current_lng,
        is_online: p.is_online || false, is_available: p.is_online || false,
        rating: p.rating || 0, total_trips: p.total_trips || 0,
        last_location_update: p.last_updated
      }))
    } else {
      const { data, error: queryError } = await supabase
        .from('providers_v2')
        .select('id, provider_uid, provider_type, first_name, last_name, phone_number, current_lat, current_lng, is_online, is_available, rating, total_trips, updated_at')
        .in('status', ['approved', 'active'])
        .order('updated_at', { ascending: false }).limit(100)
      if (queryError) throw queryError
      providers.value = (data || []).map((p: any) => ({
        id: p.id, provider_uid: p.provider_uid, provider_type: p.provider_type || 'driver',
        user_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'ไม่ระบุชื่อ',
        phone_number: p.phone_number, current_lat: p.current_lat, current_lng: p.current_lng,
        is_online: p.is_online || false, is_available: p.is_available || false,
        rating: p.rating || 0, total_trips: p.total_trips || 0, last_location_update: p.updated_at
      }))
    }
    nextTick(() => updateMarkers())
  } catch (err: unknown) {
    console.error('Error loading providers:', err)
    error.value = (err as Error).message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally { loading.value = false }
}

// Realtime subscription
function setupRealtimeSubscription(): void {
  realtimeChannel = supabase
    .channel('provider-locations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'providers_v2' }, (payload) => {
      const updated = payload.new as any
      if (!updated) return
      const index = providers.value.findIndex(p => p.id === updated.id)
      if (index >= 0) {
        providers.value[index] = {
          ...providers.value[index],
          current_lat: updated.current_lat,
          current_lng: updated.current_lng,
          is_online: updated.is_online || false,
          is_available: updated.is_available || false,
          last_location_update: updated.updated_at
        }
        nextTick(() => updateMarkers())
      }
    })
    .subscribe()
}

// Load location history
async function loadLocationHistory(providerId: string): Promise<void> {
  historyLoading.value = true
  locationHistory.value = []
  try {
    const { data, error: historyError } = await (supabase.rpc as any)('get_provider_location_history', {
      p_provider_id: providerId, p_hours: 24, p_limit: 100
    })
    if (historyError) throw historyError
    locationHistory.value = (data || []).map((h: any) => ({
      id: h.id, latitude: h.latitude, longitude: h.longitude, recorded_at: h.recorded_at
    }))
    nextTick(() => initHistoryMap())
  } catch (err) {
    console.error('Error loading history:', err)
  } finally { historyLoading.value = false }
}

function initHistoryMap(): void {
  if (!historyMapContainer.value) return
  if (historyMap) { historyMap.remove(); historyMap = null }
  
  const center = locationHistory.value.length > 0 
    ? [locationHistory.value[0].latitude, locationHistory.value[0].longitude] as [number, number]
    : [13.7563, 100.5018] as [number, number]
  
  historyMap = L.map(historyMapContainer.value).setView(center, 14)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(historyMap)
  
  if (locationHistory.value.length > 0) {
    const points = locationHistory.value.map(h => [h.latitude, h.longitude] as [number, number]).reverse()
    historyPolyline = L.polyline(points, { color: '#3B82F6', weight: 4, opacity: 0.8 }).addTo(historyMap)
    
    // Add start/end markers
    const startIcon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#10B981;border-radius:50%;border:2px solid white;"></div>', iconSize: [12, 12] })
    const endIcon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#EF4444;border-radius:50%;border:2px solid white;"></div>', iconSize: [12, 12] })
    L.marker(points[0], { icon: startIcon }).addTo(historyMap).bindPopup('จุดเริ่มต้น')
    L.marker(points[points.length - 1], { icon: endIcon }).addTo(historyMap).bindPopup('ตำแหน่งล่าสุด')
    historyMap.fitBounds(historyPolyline.getBounds(), { padding: [30, 30] })
  }
}

function viewHistory(provider: ProviderLocation): void {
  selectedProvider.value = provider
  showHistoryModal.value = true
  loadLocationHistory(provider.id)
}

function viewProvider(provider: ProviderLocation): void {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function focusOnProvider(provider: ProviderLocation): void {
  if (map && provider.current_lat && provider.current_lng) {
    map.setView([provider.current_lat, provider.current_lng], 16)
    const marker = markers.get(provider.id)
    if (marker) marker.openPopup()
  }
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getProviderTypeLabel(type: string | null): string {
  const labels: Record<string, string> = { driver: 'คนขับ', rider: 'ไรเดอร์', shopper: 'ผู้ซื้อ', mover: 'ผู้ขนย้าย', laundry: 'ซักผ้า' }
  return labels[type || ''] || type || 'ไม่ระบุ'
}

function getProviderTypeColor(type: string | null): string {
  const colors: Record<string, string> = { driver: '#3B82F6', rider: '#8B5CF6', shopper: '#F59E0B', mover: '#EF4444', laundry: '#6366F1' }
  return colors[type || ''] || '#6B7280'
}

watch(filteredProviders, () => nextTick(() => updateMarkers()))

onMounted(() => {
  nextTick(() => initMap())
  loadProviders()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  if (map) { map.remove(); map = null }
  if (historyMap) { historyMap.remove(); historyMap = null }
  markers.clear()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">ติดตามผู้ให้บริการ</h1>
        <p class="text-gray-600 mt-1">ติดตามตำแหน่งและสถานะผู้ให้บริการแบบ Real-time</p>
      </div>
      <button type="button" @click="loadProviders" class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        รีเฟรช
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <div><p class="text-sm text-gray-500">ผู้ให้บริการทั้งหมด</p><p class="text-2xl font-bold text-gray-900">{{ providers.length }}</p></div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><div class="w-3 h-3 bg-green-500 rounded-full"></div></div>
          <div><p class="text-sm text-gray-500">ออนไลน์</p><p class="text-2xl font-bold text-green-600">{{ onlineCount }}</p></div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div><p class="text-sm text-gray-500">พร้อมรับงาน</p><p class="text-2xl font-bold text-emerald-600">{{ availableCount }}</p></div>
        </div>
      </div>
    </div>

    <!-- Map -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">แผนที่ตำแหน่งผู้ให้บริการ</h2>
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-1"><div class="w-3 h-3 bg-green-500 rounded-full"></div><span>พร้อมรับงาน</span></div>
          <div class="flex items-center gap-1"><div class="w-3 h-3 bg-yellow-500 rounded-full"></div><span>กำลังทำงาน</span></div>
          <div class="flex items-center gap-1"><div class="w-3 h-3 bg-gray-400 rounded-full"></div><span>ออฟไลน์</span></div>
        </div>
      </div>
      <div ref="mapContainer" class="h-[400px]"></div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <input v-model="searchQuery" type="text" placeholder="ค้นหา ชื่อ, UID, เบอร์โทร..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="flex gap-2">
          <button type="button" @click="filterStatus = 'all'" :class="['px-4 py-2 rounded-lg font-medium transition-colors', filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">ทั้งหมด</button>
          <button type="button" @click="filterStatus = 'online'" :class="['px-4 py-2 rounded-lg font-medium transition-colors', filterStatus === 'online' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">ออนไลน์</button>
          <button type="button" @click="filterStatus = 'available'" :class="['px-4 py-2 rounded-lg font-medium transition-colors', filterStatus === 'available' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">พร้อมรับงาน</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p class="text-red-600">{{ error }}</p>
      <button type="button" @click="loadProviders" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">ลองใหม่</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredProviders.length === 0" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">ไม่พบผู้ให้บริการ</h3>
      <p class="mt-2 text-gray-600">{{ filterStatus !== 'all' ? 'ลองเปลี่ยนตัวกรองดู' : 'ยังไม่มีผู้ให้บริการที่ได้รับการอนุมัติ' }}</p>
    </div>

    <!-- Providers Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="provider in filteredProviders" :key="provider.id" class="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900">{{ provider.user_name }}</h3>
            <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ provider.provider_uid || '-' }}</code>
          </div>
          <span class="px-2 py-1 text-xs font-medium rounded-full" :style="{ color: getProviderTypeColor(provider.provider_type), backgroundColor: getProviderTypeColor(provider.provider_type) + '20' }">{{ getProviderTypeLabel(provider.provider_type) }}</span>
        </div>
        <div class="space-y-2 text-sm text-gray-600 mb-3">
          <div class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span>{{ provider.phone_number || '-' }}</span></div>
          <div v-if="provider.current_lat && provider.current_lng" class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>{{ provider.current_lat.toFixed(4) }}, {{ provider.current_lng.toFixed(4) }}</span></div>
          <div class="flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>{{ formatDate(provider.last_location_update) }}</span></div>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-gray-100">
          <div class="flex items-center gap-2">
            <div :class="['w-2 h-2 rounded-full', provider.is_online ? 'bg-green-500' : 'bg-gray-300']"></div>
            <span :class="['text-sm font-medium', provider.is_online ? 'text-green-600' : 'text-gray-500']">{{ provider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
          </div>
          <div class="flex items-center gap-1 text-sm text-gray-500">
            <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            <span>{{ provider.rating.toFixed(1) }}</span>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button type="button" @click="focusOnProvider(provider)" v-if="provider.current_lat && provider.current_lng" class="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">ดูบนแผนที่</button>
          <button type="button" @click="viewHistory(provider)" class="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">ประวัติ</button>
          <button type="button" @click="viewProvider(provider)" class="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">รายละเอียด</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full">
        <div class="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">รายละเอียดผู้ให้บริการ</h2>
          <button type="button" @click="showDetailModal = false" class="p-2 hover:bg-gray-100 rounded-lg" aria-label="ปิด"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><p class="text-xs text-gray-500 uppercase">ชื่อ</p><p class="font-medium">{{ selectedProvider.user_name }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">UID</p><code class="text-sm">{{ selectedProvider.provider_uid || '-' }}</code></div>
            <div><p class="text-xs text-gray-500 uppercase">ประเภท</p><p class="font-medium">{{ getProviderTypeLabel(selectedProvider.provider_type) }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">เบอร์โทร</p><p class="font-medium">{{ selectedProvider.phone_number || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">Latitude</p><p class="font-medium">{{ selectedProvider.current_lat || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">Longitude</p><p class="font-medium">{{ selectedProvider.current_lng || '-' }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">คะแนน</p><p class="font-medium">{{ selectedProvider.rating.toFixed(1) }} ⭐</p></div>
            <div><p class="text-xs text-gray-500 uppercase">งานทั้งหมด</p><p class="font-medium">{{ selectedProvider.total_trips }} งาน</p></div>
            <div><p class="text-xs text-gray-500 uppercase">สถานะ</p><p :class="['font-medium', selectedProvider.is_online ? 'text-green-600' : 'text-gray-500']">{{ selectedProvider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}</p></div>
            <div><p class="text-xs text-gray-500 uppercase">อัพเดทล่าสุด</p><p class="font-medium">{{ formatDate(selectedProvider.last_location_update) }}</p></div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="viewHistory(selectedProvider); showDetailModal = false" class="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">ดูประวัติตำแหน่ง</button>
          <button type="button" @click="showDetailModal = false" class="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">ปิด</button>
        </div>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="showHistoryModal && selectedProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900">ประวัติตำแหน่ง</h2>
            <p class="text-sm text-gray-500">{{ selectedProvider.user_name }} - 24 ชั่วโมงล่าสุด</p>
          </div>
          <button type="button" @click="showHistoryModal = false" class="p-2 hover:bg-gray-100 rounded-lg" aria-label="ปิด"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="flex-1 overflow-hidden">
          <div v-if="historyLoading" class="h-[400px] flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <div v-else-if="locationHistory.length === 0" class="h-[400px] flex items-center justify-center text-gray-500">
            <div class="text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              <p class="mt-2">ไม่มีประวัติตำแหน่งใน 24 ชั่วโมงที่ผ่านมา</p>
            </div>
          </div>
          <div v-else ref="historyMapContainer" class="h-[400px]"></div>
        </div>
        <div v-if="locationHistory.length > 0" class="p-4 border-t border-gray-200 bg-gray-50">
          <p class="text-sm text-gray-600">พบ {{ locationHistory.length }} จุดตำแหน่ง • <span class="text-green-600">● จุดเริ่มต้น</span> • <span class="text-red-600">● ตำแหน่งล่าสุด</span></p>
        </div>
        <div class="p-6 border-t border-gray-200">
          <button type="button" @click="showHistoryModal = false" class="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">ปิด</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.custom-marker { background: transparent !important; border: none !important; }
</style>
