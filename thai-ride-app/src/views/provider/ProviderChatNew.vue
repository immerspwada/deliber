<script setup lang="ts">
/**
 * ProviderChatNew - หน้า Chat ใหม่
 * Design: Green theme
 * 
 * Features:
 * - Chat list with customers
 * - Support chat
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'

const router = useRouter()

// State
const loading = ref(true)
const chats = ref<Array<{
  id: string
  name: string
  avatar?: string
  lastMessage: string
  time: string
  unread: number
  type: 'customer' | 'support'
}>>([])

// Methods
async function loadChats() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!provider) return

    // Get recent rides with chat
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

    if (rides) {
      chats.value = rides.map(ride => {
        const user = ride.users as { full_name?: string; avatar_url?: string } | null
        return {
          id: ride.id,
          name: user?.full_name || 'ลูกค้า',
          avatar: user?.avatar_url,
          lastMessage: 'งานที่กำลังดำเนินการ',
          time: formatTime(ride.created_at),
          unread: 0,
          type: 'customer' as const
        }
      })
    }

    // Add support chat
    chats.value.unshift({
      id: 'support',
      name: 'GOBEAR ช่วยเหลือ',
      lastMessage: 'เราช่วยอะไรได้บ้าง?',
      time: '',
      unread: 0,
      type: 'support'
    })
  } catch (err) {
    console.error('[Chat] Error:', err)
  } finally {
    loading.value = false
  }
}

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
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Empty State -->
      <div v-if="chats.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        </div>
        <h3>ยังไม่มีการสนทนา</h3>
        <p>แชทกับลูกค้าจะแสดงที่นี่</p>
      </div>

      <!-- Chat List -->
      <div v-else class="chat-list">
        <button 
          v-for="chat in chats" 
          :key="chat.id"
          class="chat-item"
          @click="openChat(chat)"
        >
          <div class="chat-avatar" :class="{ support: chat.type === 'support' }">
            <img v-if="chat.avatar" :src="chat.avatar" :alt="chat.name" />
            <span v-else>{{ getInitials(chat.name) }}</span>
          </div>
          
          <div class="chat-content">
            <div class="chat-header">
              <span class="chat-name">{{ chat.name }}</span>
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
  padding: 20px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
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

.chat-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
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
