<script setup lang="ts">
/**
 * Chat Drawer Component
 * แชท 1-1 ระหว่างลูกค้าและ Provider
 * รองรับการส่งรูปภาพและตำแหน่ง
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChat, type ChatMessage } from '../composables/useChat'

interface Props {
  rideId: string
  otherUserName: string
  isOpen: boolean
  bookingType?: 'ride' | 'queue'
}

const props = withDefaults(defineProps<Props>(), {
  bookingType: 'ride'
})

const emit = defineEmits<{
  close: []
  unreadChange: [count: number]
}>()

const {
  messages,
  loading,
  sending,
  uploadingImage,
  error,
  currentUserId,
  chatState,
  canSendMessage,
  isChatClosed,
  initialize,
  sendMessage,
  sendImage,
  sendLocation,
  markAsRead,
  refreshChatState
} = useChat(() => props.rideId, props.bookingType)

const messageInput = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const initialized = ref(false)
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const sendingLocation = ref(false)
const locationError = ref<string | null>(null)

const sortedMessages = computed(() => {
  return [...messages.value].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
})

const roleLabel = computed(() => {
  if (chatState.value.userRole === 'customer') return 'ลูกค้า'
  if (chatState.value.userRole === 'provider') return 'ผู้ให้บริการ'
  return ''
})

const statusMessage = computed(() => {
  if (isChatClosed.value) return 'การสนทนาปิดแล้ว เนื่องจากงานเสร็จสิ้น'
  return null
})

const quickMessages = computed(() => {
  if (chatState.value.userRole === 'provider') {
    // Provider quick messages
    return [
      'กำลังไปรับครับ',
      'ถึงจุดรับแล้วครับ',
      'รอสักครู่นะครับ',
      'ขอบคุณครับ'
    ]
  }
  // Customer quick messages
  return [
    'อยู่ที่ไหนแล้วคะ',
    'รอหน้าตึกค่ะ',
    'รอสักครู่ค่ะ',
    'ขอบคุณค่ะ'
  ]
})

async function handleSend(): Promise<void> {
  const text = messageInput.value.trim()
  if (!text || sending.value || !canSendMessage.value) return
  messageInput.value = ''
  const success = await sendMessage(text)
  if (success) scrollToBottom()
}

function sendQuickMessage(text: string): void {
  if (!canSendMessage.value) return
  sendMessage(text)
  scrollToBottom()
}

function openImagePicker(): void {
  console.log('[ChatDrawer] 📷 Opening image picker')
  fileInput.value?.click()
}

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  console.log('[ChatDrawer] 📷 File selected', { name: file.name, size: file.size })
  
  const reader = new FileReader()
  reader.onload = (e) => {
    previewImage.value = e.target?.result as string
    selectedFile.value = file
  }
  reader.readAsDataURL(file)
  target.value = ''
}

async function confirmSendImage(): Promise<void> {
  if (!selectedFile.value || uploadingImage.value) return
  
  console.log('[ChatDrawer] 📷 Sending image...')
  const success = await sendImage(selectedFile.value)
  if (success) {
    cancelImagePreview()
    scrollToBottom()
  }
}

function cancelImagePreview(): void {
  previewImage.value = null
  selectedFile.value = null
}

// Location sharing
async function shareCurrentLocation(): Promise<void> {
  if (!canSendMessage.value || sendingLocation.value) return
  
  locationError.value = null
  sendingLocation.value = true
  
  console.log('[ChatDrawer] 📍 Getting current location...')
  
  try {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      locationError.value = 'เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง'
      return
    }
    
    // Get current position
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      })
    })
    
    const { latitude, longitude } = position.coords
    console.log('[ChatDrawer] 📍 Location obtained', { latitude, longitude })
    
    // Send location message
    const success = await sendLocation(latitude, longitude)
    
    if (success) {
      console.log('[ChatDrawer] 📍 Location sent successfully')
      scrollToBottom()
    } else {
      locationError.value = 'ไม่สามารถส่งตำแหน่งได้'
    }
  } catch (err) {
    console.error('[ChatDrawer] 📍 Location error', err)
    const geoError = err as GeolocationPositionError
    
    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        locationError.value = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
        break
      case geoError.POSITION_UNAVAILABLE:
        locationError.value = 'ไม่สามารถระบุตำแหน่งได้'
        break
      case geoError.TIMEOUT:
        locationError.value = 'หมดเวลาในการระบุตำแหน่ง'
        break
      default:
        locationError.value = 'เกิดข้อผิดพลาดในการระบุตำแหน่ง'
    }
  } finally {
    sendingLocation.value = false
    
    // Clear location error after 3 seconds
    if (locationError.value) {
      setTimeout(() => { locationError.value = null }, 3000)
    }
  }
}

// Check if message is a location message
function isLocationMessage(msg: ChatMessage): boolean {
  return msg.message_type === 'location' || msg.message?.startsWith('📍')
}

// Parse location from message
function parseLocation(msg: ChatMessage): { lat: number; lng: number } | null {
  const match = msg.message?.match(/📍\s*([-\d.]+),([-\d.]+)/)
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
  }
  return null
}

// Open location in Google Maps
function openInMaps(msg: ChatMessage): void {
  const loc = parseLocation(msg)
  if (loc) {
    const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function scrollToBottom(): void {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function isMyMessage(msg: ChatMessage): boolean {
  return msg.sender_id === currentUserId.value
}

function getSenderLabel(msg: ChatMessage): string {
  if (msg.sender_type === 'system') return 'ระบบ'
  if (isMyMessage(msg)) return 'คุณ'
  return props.otherUserName
}

function isImageMessage(msg: ChatMessage): boolean {
  return msg.message_type === 'image' && !!msg.image_url
}

watch(messages, () => { scrollToBottom(); markAsRead() }, { deep: true })

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    if (!initialized.value || !chatState.value.userRole) { 
      await initialize()
      initialized.value = true
    } else { 
      await refreshChatState() 
    }
    scrollToBottom()
  }
}, { immediate: true })

onMounted(async () => {
  if (props.isOpen && !initialized.value) { 
    await initialize()
    initialized.value = true
  }
})
</script>

<template>
  <Transition name="drawer">
    <div v-if="isOpen" class="drawer-overlay" @click.self="emit('close')">
      <div class="drawer-content">
        <!-- Header -->
        <div class="drawer-header">
          <button class="back-btn" type="button" aria-label="ปิด" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="header-info">
            <h3>{{ otherUserName }}</h3>
            <span v-if="chatState.isAllowed" class="online-status">ออนไลน์</span>
            <span v-else class="offline-status">ปิดการสนทนา</span>
          </div>
          <div class="header-spacer"></div>
        </div>

        <!-- Status Banner -->
        <div v-if="statusMessage" class="status-banner" role="alert">
          <svg viewBox="0 0 24 24" fill="currentColor" class="status-icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"/></svg>
          <span>{{ statusMessage }}</span>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="messages-container">
          <div v-if="loading" class="loading-state"><div class="loader"></div></div>
          <div v-else-if="sortedMessages.length === 0" class="empty-state">
            <div class="empty-icon">💬</div>
            <p>เริ่มการสนทนา</p>
            <p v-if="chatState.userRole" class="empty-hint">คุณกำลังแชทในฐานะ{{ roleLabel }}</p>
          </div>
          <template v-else>
            <div v-for="msg in sortedMessages" :key="msg.id" class="message" :class="{ mine: isMyMessage(msg), system: msg.sender_type === 'system' }">
              <div v-if="msg.sender_type === 'system'" class="system-message"><span>{{ msg.message }}</span></div>
              <div v-else class="message-bubble">
                <span v-if="!isMyMessage(msg)" class="sender-name">{{ getSenderLabel(msg) }}</span>
                <!-- Image message -->
                <div v-if="isImageMessage(msg)" class="message-image">
                  <a :href="msg.image_url!" target="_blank" rel="noopener noreferrer">
                    <img :src="msg.image_url!" :alt="'รูปภาพจาก ' + getSenderLabel(msg)" loading="lazy" />
                  </a>
                </div>
                <!-- Location message -->
                <div v-else-if="isLocationMessage(msg)" class="message-location" @click="openInMaps(msg)">
                  <div class="location-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div class="location-info">
                    <span class="location-label">ตำแหน่งปัจจุบัน</span>
                    <span class="location-action">แตะเพื่อเปิดแผนที่</span>
                  </div>
                </div>
                <!-- Text message -->
                <p v-else class="message-text">{{ msg.message }}</p>
                <div class="message-meta">
                  <span class="message-time">{{ formatTime(msg.created_at) }}</span>
                  <svg v-if="isMyMessage(msg) && msg.is_read" viewBox="0 0 24 24" fill="currentColor" class="read-icon"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Image Preview Modal -->
        <div v-if="previewImage" class="image-preview-overlay">
          <div class="image-preview-content">
            <img :src="previewImage" alt="ตัวอย่างรูปภาพ" />
            <div class="image-preview-actions">
              <button class="cancel-btn" type="button" :disabled="uploadingImage" @click="cancelImagePreview">ยกเลิก</button>
              <button class="confirm-btn" type="button" :disabled="uploadingImage" @click="confirmSendImage">
                <span v-if="uploadingImage">กำลังส่ง...</span>
                <span v-else>ส่งรูปภาพ</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Messages -->
        <div v-if="canSendMessage" class="quick-messages">
          <button v-for="qm in quickMessages" :key="qm" class="quick-msg-btn" type="button" @click="sendQuickMessage(qm)">{{ qm }}</button>
        </div>

        <!-- Error -->
        <div v-if="error || locationError" class="error-bar" role="alert">{{ error || locationError }}</div>

        <!-- Hidden file input for camera/gallery -->
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/*" 
          capture="environment"
          class="hidden-file-input" 
          @change="handleFileSelect"
        />

        <!-- Input Area with Camera and Location Buttons -->
        <div v-if="canSendMessage" class="input-container">
          <!-- Camera Button (Green) -->
          <button 
            type="button"
            class="camera-btn" 
            aria-label="ถ่ายรูป/เลือกรูป" 
            :disabled="uploadingImage || sendingLocation" 
            @click="openImagePicker"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <!-- Location Button (Blue) -->
          <button 
            type="button"
            class="location-btn" 
            aria-label="แชร์ตำแหน่ง" 
            :disabled="uploadingImage || sendingLocation" 
            @click="shareCurrentLocation"
          >
            <svg v-if="!sendingLocation" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div v-else class="btn-loader-small"></div>
          </button>
          <!-- Text Input -->
          <input 
            v-model="messageInput" 
            type="text" 
            placeholder="พิมพ์ข้อความ..." 
            :disabled="sending || uploadingImage || sendingLocation" 
            maxlength="1000" 
            @keyup.enter="handleSend" 
          />
          <!-- Send Button (Black) -->
          <button 
            class="send-btn" 
            :disabled="!messageInput.trim() || sending || uploadingImage || sendingLocation" 
            type="button" 
            aria-label="ส่ง" 
            @click="handleSend"
          >
            <svg v-if="!sending" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            <div v-else class="btn-loader"></div>
          </button>
        </div>
        <div v-else class="input-disabled"><span>ไม่สามารถส่งข้อความได้</span></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-enter-active, .drawer-leave-active { transition: all 0.3s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer-content, .drawer-leave-to .drawer-content { transform: translateX(100%); }

.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100; display: flex; justify-content: flex-end; }
.drawer-content { width: 100%; max-width: 400px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header { display: flex; align-items: center; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; min-height: 60px; }
.back-btn { width: 44px; height: 44px; background: none; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%; }
.back-btn:active { background: #f3f4f6; }
.back-btn svg { width: 24px; height: 24px; color: #374151; }
.header-info { flex: 1; text-align: center; }
.header-info h3 { font-size: 16px; font-weight: 600; color: #111; margin: 0; }
.online-status { font-size: 12px; color: #10b981; }
.offline-status { font-size: 12px; color: #9ca3af; }
.header-spacer { width: 44px; }

.status-banner { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; background: #fef3c7; color: #92400e; font-size: 13px; }
.status-icon { width: 18px; height: 18px; flex-shrink: 0; }

.messages-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.loading-state { display: flex; align-items: center; justify-content: center; height: 100%; }
.loader { width: 32px; height: 32px; border: 2px solid #f3f4f6; border-top-color: #000; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { font-size: 14px; margin: 0; }
.empty-hint { font-size: 12px; margin-top: 4px; }

.message { display: flex; justify-content: flex-start; }
.message.mine { justify-content: flex-end; }
.message.system { justify-content: center; }
.system-message { padding: 6px 12px; background: #f3f4f6; border-radius: 12px; font-size: 12px; color: #6b7280; }
.message-bubble { max-width: 75%; padding: 10px 14px; background: #f3f4f6; border-radius: 18px; border-bottom-left-radius: 4px; }
.message.mine .message-bubble { background: #000; color: #fff; border-bottom-left-radius: 18px; border-bottom-right-radius: 4px; }
.sender-name { font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; }
.message-text { font-size: 14px; line-height: 1.4; margin: 0; word-break: break-word; }
.message-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 4px; }
.message-time { font-size: 10px; color: #9ca3af; }
.message.mine .message-time { color: rgba(255,255,255,0.6); }
.read-icon { width: 14px; height: 14px; color: rgba(255,255,255,0.6); }

.message-image { margin: 4px 0; }
.message-image img { max-width: 200px; max-height: 200px; border-radius: 12px; cursor: pointer; object-fit: cover; }

/* Location message styles */
.message-location { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  padding: 8px 12px; 
  background: #e0f2fe; 
  border-radius: 12px; 
  cursor: pointer; 
  margin: 4px 0;
}
.message.mine .message-location { background: rgba(255,255,255,0.15); }
.location-icon { 
  width: 36px; 
  height: 36px; 
  background: #3b82f6; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  flex-shrink: 0;
}
.location-icon svg { width: 20px; height: 20px; color: white; }
.location-info { display: flex; flex-direction: column; }
.location-label { font-size: 13px; font-weight: 500; color: #1e40af; }
.message.mine .location-label { color: #fff; }
.location-action { font-size: 11px; color: #3b82f6; }
.message.mine .location-action { color: rgba(255,255,255,0.7); }

.image-preview-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 110; }
.image-preview-content { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px; max-width: 90%; }
.image-preview-content img { max-width: 100%; max-height: 60vh; border-radius: 12px; object-fit: contain; }
.image-preview-actions { display: flex; gap: 12px; }
.cancel-btn { padding: 12px 24px; background: #374151; color: #fff; border: none; border-radius: 24px; font-size: 14px; cursor: pointer; min-height: 44px; }
.cancel-btn:disabled { opacity: 0.5; }
.confirm-btn { padding: 12px 24px; background: #10b981; color: #fff; border: none; border-radius: 24px; font-size: 14px; cursor: pointer; min-height: 44px; }
.confirm-btn:disabled { opacity: 0.5; }

.quick-messages { display: flex; gap: 8px; padding: 8px 16px; overflow-x: auto; border-top: 1px solid #f0f0f0; }
.quick-msg-btn { padding: 8px 14px; background: #f3f4f6; border: none; border-radius: 16px; font-size: 13px; color: #374151; white-space: nowrap; cursor: pointer; min-height: 36px; }
.quick-msg-btn:active { background: #e5e7eb; }

.error-bar { padding: 10px 16px; background: #fef2f2; color: #b91c1c; font-size: 13px; text-align: center; }

.hidden-file-input { display: none; }

.input-container { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #fff; border-top: 1px solid #f0f0f0; }

/* Camera Button - Green Circle */
.camera-btn { 
  width: 44px; 
  height: 44px; 
  min-width: 44px;
  background-color: #10b981; 
  border: none; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  flex-shrink: 0;
}
.camera-btn:active { background-color: #059669; }
.camera-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.camera-btn svg { width: 22px; height: 22px; }

/* Location Button - Blue Circle */
.location-btn { 
  width: 44px; 
  height: 44px; 
  min-width: 44px;
  background-color: #3b82f6; 
  border: none; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  flex-shrink: 0;
}
.location-btn:active { background-color: #2563eb; }
.location-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.location-btn svg { width: 22px; height: 22px; }

.btn-loader-small { 
  width: 16px; 
  height: 16px; 
  border: 2px solid rgba(255,255,255,0.3); 
  border-top-color: #fff; 
  border-radius: 50%; 
  animation: spin 0.6s linear infinite; 
}

.input-container input { flex: 1; padding: 12px 16px; background: #f3f4f6; border: none; border-radius: 24px; font-size: 14px; outline: none; min-height: 44px; }
.input-container input:focus { background: #e5e7eb; }

/* Send Button - Black Circle */
.send-btn { width: 44px; height: 44px; background: #000; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; flex-shrink: 0; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.send-btn svg { width: 20px; height: 20px; }
.btn-loader { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }

.input-disabled { display: flex; align-items: center; justify-content: center; padding: 16px; background: #f9fafb; border-top: 1px solid #f0f0f0; color: #9ca3af; font-size: 13px; }
</style>
