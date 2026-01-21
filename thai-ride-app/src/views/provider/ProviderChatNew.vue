<script setup lang="ts">
/**
 * ProviderChatNew - หน้า Chat ใหม่
 * Design: Green theme
 * 
 * Features:
 * - Chat list with customers
 * - Support chat
 * - Unread message count (realtime)
 * - Last message preview
 * - Search by name or order number
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'

const router = useRouter()

// Types
interface ChatItem {
  id: string
  orderNumber: string
  name: string
  avatar?: string
  lastMessage: string
  lastMessageTime: string
  time: string
  unread: number
  type: 'customer' | 'support'
}

// State
const loading = ref(true)
const searchQuery = ref('')
const chats = ref<ChatItem[]>([])
const currentUserId = ref<string | null>(null)
const providerId = ref<string | null>(null)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// Computed - filtered chats by search
const filteredChats = computed(() => {
  if (!searchQuery.value.trim()) return chats.value
  
  const query = searchQuery.value.toLowerCase().trim()
  return chats.value.filter(chat => 
    chat.name.toLowerCase().includes(query) ||
    chat.orderNumber.toLowerCase().includes(query)
  )
})

// Methods
async function loadChats() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    currentUserId.value = user.id

    // Get provider
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: { id: string } | null }

    if (!provider) return
    providerId.value = provider.id

    // Get recent rides with chat + last message
    const { data: rides } = await supabase
      .from('ride_requests')
      .select(`
        id, 
        user_id,
        users:user_id(full_name, avatar_url),
        created_at
      `)
      .eq('provider_id', provider.id)
      .in('status', ['matched', 'arriving', 'pickup', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10)

    type RideWithUser = {
      id: string
      user_id: string
      users: { full_name?: string; avatar_url?: string } | null
      created_at: string
    }

    if (rides && rides.length > 0) {
      // Get last messages and unread counts for all rides
      const rideIds = (rides as RideWithUser[]).map(r => r.id)
      
      // Fetch last message for each ride
      const { data: lastMessages } = await supabase
        .from('chat_messages')
        .select('ride_id, message, message_type, sender_id, created_at')
        .in('ride_id', rideIds)
        .order('created_at', { ascending: false })
      
      // Type for chat message
      type ChatMessageRow = {
        ride_id: string
        message: string
        message_type: string
        sender_id: string
        created_at: string
      }
      
      // Group last messages by ride_id
      const lastMessageMap = new Map<string, ChatMessageRow>()
      if (lastMessages) {
        for (const msg of lastMessages as ChatMessageRow[]) {
          if (!lastMessageMap.has(msg.ride_id)) {
            lastMessageMap.set(msg.ride_id, msg)
          }
        }
      }

      // Fetch unread counts for each ride
      const unreadCounts = new Map<string, number>()
      for (const rideId of rideIds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: countData } = await (supabase.rpc as any)('get_unread_message_count', {
          p_ride_id: rideId,
          p_user_id: user.id
        })
        unreadCounts.set(rideId, countData || 0)
      }

      chats.value = (rides as RideWithUser[]).map(ride => {
        const shortOrderId = ride.id.slice(-8).toUpperCase()
        const lastMsg = lastMessageMap.get(ride.id)
        const unread = unreadCounts.get(ride.id) || 0
        
        // Format last message
        let lastMessageText = 'เริ่มการสนทนา...'
        let lastMessageTimeStr = ride.created_at
        
        if (lastMsg) {
          lastMessageTimeStr = lastMsg.created_at
          if (lastMsg.message_type === 'image') {
            lastMessageText = '📷 รูปภาพ'
          } else if (lastMsg.message_type === 'location') {
            lastMessageText = '📍 ตำแหน่ง'
          } else {
            // Truncate long messages
            lastMessageText = lastMsg.message.length > 40 
              ? lastMsg.message.slice(0, 40) + '...' 
              : lastMsg.message
          }
          // Add prefix if from provider (self)
          if (lastMsg.sender_id === user.id) {
            lastMessageText = 'คุณ: ' + lastMessageText
          }
        }
        
        return {
          id: ride.id,
          orderNumber: shortOrderId,
          name: ride.users?.full_name || 'ลูกค้า',
          avatar: ride.users?.avatar_url,
          lastMessage: lastMessageText,
          lastMessageTime: lastMessageTimeStr,
          time: formatTime(lastMessageTimeStr),
          unread,
          type: 'customer' as const
        }
      })
      
      // Sort by last message time (most recent first)
      chats.value.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      )
    }

    // Add support chat at top
    chats.value.unshift({
      id: 'support',
      orderNumber: '',
      name: 'GOBEAR ช่วยเหลือ',
      lastMessage: 'เราช่วยอะไรได้บ้าง?',
      lastMessageTime: '',
      time: '',
      unread: 0,
      type: 'support'
    })
    
    // Setup realtime subscription
    setupRealtimeSubscription()
  } catch (err) {
    console.error('[Chat] Error:', err)
  } finally {
    loading.value = false
  }
}

// Setup realtime for new messages
function setupRealtimeSubscription() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
  
  if (!providerId.value) return
  
  realtimeChannel = supabase
    .channel('provider-chat-list')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      (payload) => {
        const newMsg = payload.new as { 
          ride_id: string
          message: string
          message_type: string
          sender_id: string
          created_at: string
        }
        
        // Find matching chat
        const chatIndex = chats.value.findIndex(c => c.id === newMsg.ride_id)
        if (chatIndex === -1) return
        
        // Update chat with new message
        const chat = chats.value[chatIndex]
        
        // Format message
        let msgText = newMsg.message
        if (newMsg.message_type === 'image') {
          msgText = '📷 รูปภาพ'
        } else if (newMsg.message_type === 'location') {
          msgText = '📍 ตำแหน่ง'
        } else if (msgText.length > 40) {
          msgText = msgText.slice(0, 40) + '...'
        }
        
        // Add prefix if from self
        if (newMsg.sender_id === currentUserId.value) {
          msgText = 'คุณ: ' + msgText
        }
        
        // Update chat
        const updatedChat: ChatItem = {
          ...chat,
          lastMessage: msgText,
          lastMessageTime: newMsg.created_at,
          time: formatTime(newMsg.created_at),
          unread: newMsg.sender_id !== currentUserId.value ? chat.unread + 1 : chat.unread
        }
        
        // Remove from current position and add to top (after support)
        chats.value.splice(chatIndex, 1)
        const supportIndex = chats.value.findIndex(c => c.type === 'support')
        chats.value.splice(supportIndex + 1, 0, updatedChat)
      }
    )
    .subscribe()
}

// Cleanup on unmount
onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'ตอนนี้'
  if (diffMins < 60) return `${diffMins} นาที`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ชม.`
  
  return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
}

function openChat(chat: typeof chats.value[0]) {
  if (chat.type === 'support') {
    // TODO: Open support chat
    alert('แชทช่วยเหลือกำลังมาเร็วๆ นี้!')
  } else {
    // Navigate to ride chat
    router.push(`/provider/job/${chat.id}`)
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Lifecycle
onMounted(loadChats)
</script>

<template>
  <div class="chat-page">
    <!-- Header -->
    <header class="header">
      <h1 class="title">แชท</h1>
      <!-- Search Box -->
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="ค้นหาชื่อหรือเลขออเดอร์..."
          class="search-input"
        />
        <button 
          v-if="searchQuery" 
          class="search-clear"
          type="button"
          aria-label="ล้างการค้นหา"
          @click="searchQuery = ''"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Empty State -->
      <div v-if="filteredChats.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        </div>
        <h3>{{ searchQuery ? 'ไม่พบการสนทนา' : 'ยังไม่มีการสนทนา' }}</h3>
        <p>{{ searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'แชทกับลูกค้าจะแสดงที่นี่' }}</p>
      </div>

      <!-- Chat List -->
      <div v-else class="chat-list">
        <button 
          v-for="chat in filteredChats" 
          :key="chat.id"
          class="chat-item"
          :class="{ 'has-unread': chat.unread > 0 }"
          @click="openChat(chat)"
        >
          <div class="chat-avatar" :class="{ support: chat.type === 'support' }">
            <img v-if="chat.avatar" :src="chat.avatar" :alt="chat.name" />
            <span v-else>{{ getInitials(chat.name) }}</span>
          </div>
          
          <div class="chat-content">
            <div class="chat-header">
              <div class="chat-name-wrapper">
                <span class="chat-name">{{ chat.name }}</span>
                <span v-if="chat.orderNumber" class="order-badge">#{{ chat.orderNumber }}</span>
              </div>
              <span class="chat-time">{{ chat.time }}</span>
            </div>
            <div class="chat-preview">
              <span class="chat-message">{{ chat.lastMessage }}</span>
              <span v-if="chat.unread > 0" class="chat-badge">{{ chat.unread }}</span>
            </div>
          </div>
          
          <svg class="chat-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-page {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.header {
  padding: 20px 16px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
}

/* Search */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 20px;
  height: 20px;
  color: #9CA3AF;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 15px;
  background: #F9FAFB;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #00A86B;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.search-input::placeholder {
  color: #9CA3AF;
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E5E7EB;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
}

.search-clear:hover {
  background: #D1D5DB;
}

.search-clear svg {
  width: 14px;
  height: 14px;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
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
  padding: 16px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #F3F4F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #9CA3AF;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

/* Chat List */
.chat-list {
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: none;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.chat-item:last-child {
  border-bottom: none;
}

.chat-item:active {
  background: #F9FAFB;
}

.chat-item.has-unread {
  background: #F0FDF4;
}

.chat-item.has-unread:active {
  background: #DCFCE7;
}

.chat-avatar {
  width: 52px;
  height: 52px;
  background: #E5E7EB;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #6B7280;
  flex-shrink: 0;
  overflow: hidden;
}

.chat-avatar.support {
  background: #00A86B;
  color: #FFFFFF;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-content {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chat-name-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-badge {
  padding: 2px 8px;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #B45309;
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.chat-time {
  font-size: 12px;
  color: #9CA3AF;
}

.chat-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-message {
  font-size: 14px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.has-unread .chat-message {
  color: #111827;
  font-weight: 500;
}

.chat-badge {
  padding: 2px 8px;
  background: #00A86B;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  flex-shrink: 0;
}

.chat-arrow {
  width: 20px;
  height: 20px;
  color: #D1D5DB;
  flex-shrink: 0;
}
</style>
