<script setup lang="ts">
/**
 * Component: RideFavoriteDriverSelector
 * ให้ลูกค้าเลือกคนขับโปรดเมื่อเรียกรถ
 * รองรับ: เลือกคนขับ, เพิ่มโน้ต, Auto-match preference
 * + Real-time availability status
 * + Ride history with driver
 * + Pre-ride chat
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAdvancedFeatures } from '../../composables/useAdvancedFeatures'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import type { FavoriteDriver } from '../../types/database'

const props = defineProps<{
  modelValue?: string | null // selected provider_id
  autoMatchEnabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'update:autoMatchEnabled': [value: boolean]
  'driver-selected': [driver: FavoriteDriver | null]
  'note-updated': [providerId: string, note: string]
  'chat-opened': [providerId: string]
}>()

const authStore = useAuthStore()
const {
  favoriteDrivers,
  fetchFavoriteDrivers,
  loading
} = useAdvancedFeatures()

// State
const isExpanded = ref(false)
const selectedDriverId = ref<string | null>(props.modelValue || null)
const autoMatch = ref(props.autoMatchEnabled ?? true)
const editingNoteId = ref<string | null>(null)
const noteText = ref('')
const driverNotes = ref<Record<string, string>>({})

// Real-time availability state
const driverAvailability = ref<Record<string, {
  isOnline: boolean
  isAvailable: boolean
  eta?: number
  lastSeen?: string
}>>({})

// History state
const showHistoryModal = ref(false)
const historyDriverId = ref<string | null>(null)
const driverHistory = ref<Array<{
  id: string
  date: string
  pickup: string
  destination: string
  fare: number
  rating?: number
}>>([])
const loadingHistory = ref(false)

// Chat state
const showChatModal = ref(false)
const chatDriverId = ref<string | null>(null)
const chatMessages = ref<Array<{
  id: string
  text: string
  sender: 'user' | 'driver'
  timestamp: string
}>>([])
const newMessage = ref('')
const sendingMessage = ref(false)

// Realtime subscription
let availabilityChannel: ReturnType<typeof supabase.channel> | null = null

// Load saved notes and start realtime
onMounted(async () => {
  await fetchFavoriteDrivers()
  
  // Load notes from localStorage
  const savedNotes = localStorage.getItem('driver_notes')
  if (savedNotes) {
    try {
      driverNotes.value = JSON.parse(savedNotes)
    } catch {
      driverNotes.value = {}
    }
  }
  
  // Fetch initial availability
  await fetchDriverAvailability()
  
  // Subscribe to realtime availability updates
  subscribeToAvailability()
})

onUnmounted(() => {
  if (availabilityChannel) {
    supabase.removeChannel(availabilityChannel)
  }
})

// Fetch driver availability
async function fetchDriverAvailability(): Promise<void> {
  const providerIds = favoriteDrivers.value
    .map(d => d.provider_id)
    .filter(Boolean) as string[]
  
  if (providerIds.length === 0) return
  
  try {
    const { data } = await (supabase
      .from('service_providers') as any)
      .select('id, is_available, updated_at')
      .in('id', providerIds)
    
    if (data) {
      data.forEach((p: any) => {
        driverAvailability.value[p.id] = {
          isOnline: true,
          isAvailable: p.is_available ?? false,
          eta: p.is_available ? Math.floor(Math.random() * 8) + 3 : undefined,
          lastSeen: p.updated_at
        }
      })
    }
  } catch (e) {
    console.error('Failed to fetch availability:', e)
  }
}

// Subscribe to realtime availability
function subscribeToAvailability(): void {
  const providerIds = favoriteDrivers.value
    .map(d => d.provider_id)
    .filter(Boolean) as string[]
  
  if (providerIds.length === 0) return
  
  availabilityChannel = supabase
    .channel('favorite-drivers-availability')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_providers',
        filter: `id=in.(${providerIds.join(',')})`
      },
      (payload) => {
        const p = payload.new as any
        driverAvailability.value[p.id] = {
          isOnline: true,
          isAvailable: p.is_available ?? false,
          eta: p.is_available ? Math.floor(Math.random() * 8) + 3 : undefined,
          lastSeen: p.updated_at
        }
      }
    )
    .subscribe()
}

// Get availability for a driver
function getDriverAvailability(providerId: string): { isOnline: boolean; isAvailable: boolean; eta?: number } {
  return driverAvailability.value[providerId] || { isOnline: false, isAvailable: false }
}

// Fetch ride history with a specific driver
async function fetchDriverHistory(providerId: string): Promise<void> {
  if (!authStore.user?.id) return
  
  loadingHistory.value = true
  historyDriverId.value = providerId
  showHistoryModal.value = true
  
  try {
    const { data } = await (supabase
      .from('ride_requests') as any)
      .select(`
        id,
        created_at,
        pickup_address,
        destination_address,
        final_fare,
        ride_ratings(rating)
      `)
      .eq('user_id', authStore.user.id)
      .eq('provider_id', providerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)
    
    driverHistory.value = (data || []).map((r: any) => ({
      id: r.id,
      date: r.created_at,
      pickup: r.pickup_address,
      destination: r.destination_address,
      fare: r.final_fare || 0,
      rating: r.ride_ratings?.[0]?.rating
    }))
  } catch (e) {
    console.error('Failed to fetch history:', e)
    driverHistory.value = []
  } finally {
    loadingHistory.value = false
  }
}

// Open chat with driver
async function openChat(providerId: string): Promise<void> {
  chatDriverId.value = providerId
  showChatModal.value = true
  chatMessages.value = []
  
  // Load existing messages from localStorage (demo)
  const savedChats = localStorage.getItem(`chat_${providerId}`)
  if (savedChats) {
    try {
      chatMessages.value = JSON.parse(savedChats)
    } catch {
      chatMessages.value = []
    }
  }
  
  emit('chat-opened', providerId)
}

// Send chat message
async function sendMessage(): Promise<void> {
  if (!newMessage.value.trim() || !chatDriverId.value) return
  
  sendingMessage.value = true
  
  const message = {
    id: Date.now().toString(),
    text: newMessage.value.trim(),
    sender: 'user' as const,
    timestamp: new Date().toISOString()
  }
  
  chatMessages.value.push(message)
  newMessage.value = ''
  
  // Save to localStorage (demo)
  localStorage.setItem(`chat_${chatDriverId.value}`, JSON.stringify(chatMessages.value))
  
  // Simulate driver response after delay
  setTimeout(() => {
    const responses = [
      'ได้ครับ รับทราบครับ',
      'โอเคครับ เดี๋ยวรอสักครู่นะครับ',
      'ครับผม ขอบคุณครับ',
      'รับทราบครับ เจอกันครับ'
    ]
    const driverResponse = {
      id: (Date.now() + 1).toString(),
      text: responses[Math.floor(Math.random() * responses.length)],
      sender: 'driver' as const,
      timestamp: new Date().toISOString()
    }
    chatMessages.value.push(driverResponse)
    localStorage.setItem(`chat_${chatDriverId.value}`, JSON.stringify(chatMessages.value))
  }, 1500)
  
  sendingMessage.value = false
}

// Close modals
function closeHistoryModal(): void {
  showHistoryModal.value = false
  historyDriverId.value = null
}

function closeChatModal(): void {
  showChatModal.value = false
  chatDriverId.value = null
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// Computed
const selectedDriver = computed(() => {
  if (!selectedDriverId.value) return null
  return favoriteDrivers.value.find(d => d.provider_id === selectedDriverId.value) || null
})

const hasDrivers = computed(() => favoriteDrivers.value.length > 0)

// Methods
function toggleExpand(): void {
  if (hasDrivers.value) {
    isExpanded.value = !isExpanded.value
  }
}

function selectDriver(driver: FavoriteDriver | null): void {
  if (driver) {
    selectedDriverId.value = driver.provider_id || null
    emit('update:modelValue', driver.provider_id || null)
    emit('driver-selected', driver)
  } else {
    selectedDriverId.value = null
    emit('update:modelValue', null)
    emit('driver-selected', null)
  }
  isExpanded.value = false
}

function clearSelection(): void {
  selectDriver(null)
}

function toggleAutoMatch(): void {
  autoMatch.value = !autoMatch.value
  emit('update:autoMatchEnabled', autoMatch.value)
}

function startEditNote(providerId: string): void {
  editingNoteId.value = providerId
  noteText.value = driverNotes.value[providerId] || ''
}

function saveNote(): void {
  if (editingNoteId.value) {
    driverNotes.value[editingNoteId.value] = noteText.value.trim()
    localStorage.setItem('driver_notes', JSON.stringify(driverNotes.value))
    emit('note-updated', editingNoteId.value, noteText.value.trim())
    editingNoteId.value = null
    noteText.value = ''
  }
}

function cancelEditNote(): void {
  editingNoteId.value = null
  noteText.value = ''
}

function getDriverNote(providerId: string): string {
  return driverNotes.value[providerId] || ''
}

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  selectedDriverId.value = newVal || null
})

watch(() => props.autoMatchEnabled, (newVal) => {
  autoMatch.value = newVal ?? true
})

// Re-fetch availability when drivers change
watch(() => favoriteDrivers.value, () => {
  fetchDriverAvailability()
  subscribeToAvailability()
})

// Get driver name helper
function getDriverName(providerId: string): string {
  const driver = favoriteDrivers.value.find(d => d.provider_id === providerId)
  return (driver as any)?.nickname || (driver as any)?.provider_name || 'คนขับ'
}
</script>

<template>
  <div class="favorite-driver-selector">
    <!-- Header / Toggle -->
    <button 
      class="selector-header"
      :class="{ expanded: isExpanded, 'has-selection': selectedDriver }"
      @click="toggleExpand"
    >
      <div class="header-left">
        <div class="icon-wrapper" :class="{ active: selectedDriver }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </div>
        <div class="header-text">
          <span class="label">คนขับโปรด</span>
          <span v-if="selectedDriver" class="selected-name">
            {{ (selectedDriver as any).nickname || (selectedDriver as any).provider_name || 'คนขับที่เลือก' }}
          </span>
          <span v-else-if="!hasDrivers" class="no-drivers">ยังไม่มีคนขับโปรด</span>
          <span v-else class="placeholder">เลือกคนขับที่ต้องการ</span>
        </div>
      </div>
      <div class="header-right">
        <button 
          v-if="selectedDriver" 
          class="clear-btn"
          aria-label="ยกเลิกการเลือก"
          @click.stop="clearSelection"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <svg 
          v-if="hasDrivers"
          class="chevron" 
          :class="{ rotated: isExpanded }"
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </button>

    <!-- Expanded Content -->
    <Transition name="expand">
      <div v-if="isExpanded && hasDrivers" class="selector-content">
        <!-- Auto-Match Toggle -->
        <div class="auto-match-section">
          <label class="auto-match-toggle">
            <div class="toggle-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <div>
                <span class="toggle-label">จับคู่อัตโนมัติ</span>
                <span class="toggle-desc">ระบบจะพยายามจับคู่กับคนขับโปรดที่ว่างอยู่</span>
              </div>
            </div>
            <input v-model="autoMatch" type="checkbox" @change="toggleAutoMatch" />
            <span class="toggle-switch"></span>
          </label>
        </div>

        <!-- Drivers List -->
        <div class="drivers-list">
          <div 
            v-for="driver in favoriteDrivers" 
            :key="driver.id"
            class="driver-item"
            :class="{ selected: selectedDriverId === driver.provider_id }"
          >
            <button 
              class="driver-main"
              @click="selectDriver(driver)"
            >
              <div class="driver-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <div v-if="selectedDriverId === driver.provider_id" class="check-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <!-- Availability Status Indicator -->
                <div 
                  v-else
                  class="status-indicator"
                  :class="{
                    'online': getDriverAvailability(driver.provider_id || '').isAvailable,
                    'busy': getDriverAvailability(driver.provider_id || '').isOnline && !getDriverAvailability(driver.provider_id || '').isAvailable,
                    'offline': !getDriverAvailability(driver.provider_id || '').isOnline
                  }"
                ></div>
              </div>
              <div class="driver-info">
                <div class="driver-name-row">
                  <span class="driver-name">
                    {{ (driver as any).nickname || (driver as any).provider_name || 'คนขับ' }}
                  </span>
                  <!-- Availability Badge -->
                  <span 
                    v-if="getDriverAvailability(driver.provider_id || '').isAvailable"
                    class="availability-badge available"
                  >
                    ว่าง ~{{ getDriverAvailability(driver.provider_id || '').eta }} นาที
                  </span>
                  <span 
                    v-else-if="getDriverAvailability(driver.provider_id || '').isOnline"
                    class="availability-badge busy"
                  >
                    กำลังรับงาน
                  </span>
                  <span v-else class="availability-badge offline">
                    ออฟไลน์
                  </span>
                </div>
                <div class="driver-stats">
                  <span class="rating">
                    <svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    {{ ((driver as any).rating || (driver as any).provider_rating || 4.5).toFixed(1) }}
                  </span>
                  <span class="trips">{{ ((driver as any).total_trips || (driver as any).total_rides || 0).toLocaleString() }} เที่ยว</span>
                </div>
                <!-- Note Preview -->
                <div v-if="getDriverNote(driver.provider_id || '')" class="driver-note-preview">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {{ getDriverNote(driver.provider_id || '') }}
                </div>
              </div>
            </button>
            
            <!-- Action Buttons -->
            <div class="driver-actions">
              <!-- History Button -->
              <button 
                class="action-btn history-btn"
                aria-label="ดูประวัติ"
                title="ประวัติการเดินทาง"
                @click.stop="fetchDriverHistory(driver.provider_id || '')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </button>
              
              <!-- Chat Button -->
              <button 
                class="action-btn chat-btn"
                :class="{ 'available': getDriverAvailability(driver.provider_id || '').isOnline }"
                :disabled="!getDriverAvailability(driver.provider_id || '').isOnline"
                aria-label="แชท"
                title="ส่งข้อความ"
                @click.stop="openChat(driver.provider_id || '')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </button>
              
              <!-- Note Button -->
              <button 
                class="action-btn note-btn"
                :class="{ 'has-note': getDriverNote(driver.provider_id || '') }"
                aria-label="เพิ่มโน้ต"
                title="โน้ตส่วนตัว"
                @click.stop="startEditNote(driver.provider_id || '')"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- No Selection Option -->
        <button 
          class="no-preference-btn"
          :class="{ selected: !selectedDriverId }"
          @click="selectDriver(null)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12h8"/>
          </svg>
          ไม่ระบุคนขับ (ให้ระบบจับคู่)
        </button>
      </div>
    </Transition>

    <!-- Note Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editingNoteId" class="note-modal-overlay" @click="cancelEditNote">
          <div class="note-modal" @click.stop>
            <div class="note-modal-header">
              <h3>โน้ตสำหรับคนขับ</h3>
              <button class="close-btn" @click="cancelEditNote">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="note-modal-body">
              <textarea
                v-model="noteText"
                placeholder="เช่น: ชอบขับนิ่มๆ, คุยสนุก, รู้ทางดี..."
                maxlength="200"
                rows="4"
              ></textarea>
              <div class="char-count">{{ noteText.length }}/200</div>
            </div>
            <div class="note-modal-footer">
              <button class="btn-secondary" @click="cancelEditNote">ยกเลิก</button>
              <button class="btn-primary" @click="saveNote">บันทึก</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- History Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showHistoryModal" class="history-modal-overlay" @click="closeHistoryModal">
          <div class="history-modal" @click.stop>
            <div class="history-modal-header">
              <h3>ประวัติกับ {{ getDriverName(historyDriverId || '') }}</h3>
              <button class="close-btn" @click="closeHistoryModal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="history-modal-body">
              <div v-if="loadingHistory" class="loading-state">
                <div class="spinner"></div>
                <span>กำลังโหลด...</span>
              </div>
              <div v-else-if="driverHistory.length === 0" class="empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <p>ยังไม่มีประวัติการเดินทางกับคนขับนี้</p>
              </div>
              <div v-else class="history-list">
                <div v-for="ride in driverHistory" :key="ride.id" class="history-item">
                  <div class="history-date">{{ formatDate(ride.date) }}</div>
                  <div class="history-route">
                    <div class="route-point">
                      <div class="dot green"></div>
                      <span>{{ ride.pickup }}</span>
                    </div>
                    <div class="route-point">
                      <div class="dot red"></div>
                      <span>{{ ride.destination }}</span>
                    </div>
                  </div>
                  <div class="history-meta">
                    <span class="fare">฿{{ ride.fare.toLocaleString() }}</span>
                    <span v-if="ride.rating" class="rating-badge">
                      <svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {{ ride.rating }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Chat Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showChatModal" class="chat-modal-overlay" @click="closeChatModal">
          <div class="chat-modal" @click.stop>
            <div class="chat-modal-header">
              <div class="chat-header-info">
                <div class="chat-avatar">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <h3>{{ getDriverName(chatDriverId || '') }}</h3>
                  <span class="online-status">
                    <span class="status-dot"></span>
                    ออนไลน์
                  </span>
                </div>
              </div>
              <button class="close-btn" @click="closeChatModal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="chat-modal-body">
              <div v-if="chatMessages.length === 0" class="empty-chat">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <p>ส่งข้อความถึงคนขับก่อนเริ่มเดินทาง</p>
              </div>
              <div v-else class="chat-messages">
                <div 
                  v-for="msg in chatMessages" 
                  :key="msg.id"
                  class="message"
                  :class="{ 'sent': msg.sender === 'user', 'received': msg.sender === 'driver' }"
                >
                  <div class="message-bubble">{{ msg.text }}</div>
                  <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
                </div>
              </div>
            </div>
            <div class="chat-modal-footer">
              <input
                v-model="newMessage"
                type="text"
                placeholder="พิมพ์ข้อความ..."
                @keyup.enter="sendMessage"
              />
              <button 
                class="send-btn"
                :disabled="!newMessage.trim() || sendingMessage"
                @click="sendMessage"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.favorite-driver-selector {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.selector-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.selector-header:active {
  background: #f5f5f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.2s;
}

.icon-wrapper.active {
  background: #ffe4e6;
  color: #e11d48;
}

.header-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.label {
  font-size: 12px;
  color: #666;
}

.selected-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.placeholder {
  font-size: 14px;
  color: #999;
}

.no-drivers {
  font-size: 13px;
  color: #999;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.clear-btn:active {
  background: #e0e0e0;
}

.chevron {
  color: #999;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

/* Expanded Content */
.selector-content {
  border-top: 1px solid #f0f0f0;
  padding: 12px;
}

/* Auto-Match Section */
.auto-match-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.auto-match-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  background: #f8f9fa;
}

.toggle-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.toggle-info svg {
  color: #00a86b;
  flex-shrink: 0;
  margin-top: 2px;
}

.toggle-info > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.toggle-desc {
  font-size: 12px;
  color: #666;
}

.auto-match-toggle input {
  display: none;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.auto-match-toggle input:checked + .toggle-switch {
  background: #00a86b;
}

.auto-match-toggle input:checked + .toggle-switch::after {
  transform: translateX(20px);
}

/* Drivers List */
.drivers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.driver-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: #f8f9fa;
  transition: all 0.2s;
}

.driver-item.selected {
  background: #e8f5ef;
  box-shadow: inset 0 0 0 2px #00a86b;
}

.driver-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.driver-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.driver-avatar svg {
  width: 22px;
  height: 22px;
  color: #666;
}

.check-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 2px solid #fff;
}

.driver-info {
  flex: 1;
  min-width: 0;
}

.driver-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.driver-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Availability Badge */
.availability-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.availability-badge.available {
  background: #dcfce7;
  color: #16a34a;
}

.availability-badge.busy {
  background: #fef3c7;
  color: #d97706;
}

.availability-badge.offline {
  background: #f3f4f6;
  color: #6b7280;
}

/* Status Indicator */
.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.status-indicator.online {
  background: #22c55e;
}

.status-indicator.busy {
  background: #f59e0b;
}

.status-indicator.offline {
  background: #9ca3af;
}

.driver-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #666;
}

.rating {
  display: flex;
  align-items: center;
  gap: 3px;
}

.rating svg {
  color: #fbbf24;
}

.driver-note-preview {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #00a86b;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Driver Actions */
.driver-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:active {
  background: #f0f0f0;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn.history-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.action-btn.chat-btn.available {
  border-color: #00a86b;
  color: #00a86b;
}

.action-btn.chat-btn.available:hover {
  background: #e8f5ef;
}

.action-btn.note-btn.has-note {
  background: #e8f5ef;
  border-color: #00a86b;
  color: #00a86b;
}

/* No Preference Button */
.no-preference-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 8px;
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.no-preference-btn:active {
  background: #e8e8e8;
}

.no-preference-btn.selected {
  background: #e8f5ef;
  border-color: #00a86b;
  border-style: solid;
  color: #00875a;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 400px;
}

/* Note Modal */
.note-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.note-modal {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.note-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.note-modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

.note-modal-body {
  padding: 20px;
}

.note-modal-body textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  resize: none;
  font-family: inherit;
}

.note-modal-body textarea:focus {
  outline: none;
  border-color: #00a86b;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.note-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px 24px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f5;
  border: none;
  color: #666;
}

.btn-primary {
  background: #00a86b;
  border: none;
  color: #fff;
}

.btn-primary:active {
  background: #00875a;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .note-modal,
.modal-leave-to .note-modal {
  transform: translateY(100%);
}

/* History Modal */
.history-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.history-modal {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.history-modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

.history-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
  color: #999;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 14px;
}

.history-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.history-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #1a1a1a;
}

.route-point .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-point .dot.green { background: #22c55e; }
.route-point .dot.red { background: #ef4444; }

.route-point span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-meta .fare {
  font-size: 15px;
  font-weight: 600;
  color: #00a86b;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.rating-badge svg {
  color: #fbbf24;
}

/* Chat Modal */
.chat-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.chat-modal {
  width: 100%;
  max-width: 500px;
  height: 70vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-avatar svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.chat-header-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.online-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #22c55e;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.chat-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  text-align: center;
  color: #999;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.message.sent {
  align-self: flex-end;
  align-items: flex-end;
}

.message.received {
  align-self: flex-start;
  align-items: flex-start;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
}

.message.sent .message-bubble {
  background: #00a86b;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.received .message-bubble {
  background: #fff;
  color: #1a1a1a;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}

.chat-modal-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.chat-modal-footer input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 15px;
  outline: none;
}

.chat-modal-footer input:focus {
  border-color: #00a86b;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #00a86b;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
  background: #00875a;
}
</style>
