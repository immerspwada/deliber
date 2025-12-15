import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface ChatMessage {
  id: string
  ride_id: string
  sender_type: 'user' | 'driver'
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
}

// Demo auto-replies
const DEMO_REPLIES = [
  'รับทราบครับ',
  'กำลังไปครับ',
  'ถึงแล้วครับ รอตรงไหนครับ?',
  'เห็นแล้วครับ',
  'โอเคครับ'
]

export function useChat() {
  const authStore = useAuthStore()
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)

  const isDemoMode = () => {
    return !authStore.user?.id || localStorage.getItem('demo_mode') === 'true'
  }

  // Fetch messages for a ride
  const fetchMessages = async (rideId: string) => {
    loading.value = true
    
    // Demo mode - return empty or cached messages
    if (isDemoMode() || rideId.startsWith('mock-')) {
      loading.value = false
      return messages.value
    }

    try {
      const { data, error } = await (supabase
        .from('chat_messages') as any)
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true })

      if (!error) {
        messages.value = data || []
      }
      return data || []
    } catch (err) {
      console.error('Error fetching messages:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Send a message
  const sendMessage = async (rideId: string, message: string) => {
    // Demo mode - add message locally and simulate reply
    if (isDemoMode() || rideId.startsWith('mock-')) {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        ride_id: rideId,
        sender_type: 'user',
        sender_id: 'demo-user',
        message,
        is_read: true,
        created_at: new Date().toISOString()
      }
      messages.value.push(userMsg)

      // Simulate driver reply after 1-3 seconds
      setTimeout(() => {
        const replyText = DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)] || 'รับทราบครับ'
        const reply: ChatMessage = {
          id: `msg-${Date.now()}`,
          ride_id: rideId,
          sender_type: 'driver',
          sender_id: 'demo-driver',
          message: replyText,
          is_read: false,
          created_at: new Date().toISOString()
        }
        messages.value.push(reply)
      }, 1000 + Math.random() * 2000)

      return userMsg
    }

    if (!authStore.user?.id) return null

    try {
      const { data, error } = await (supabase
        .from('chat_messages') as any)
        .insert({
          ride_id: rideId,
          sender_type: 'user',
          sender_id: authStore.user.id,
          message
        })
        .select()
        .single()

      if (!error && data) {
        messages.value.push(data)
      }
      return data
    } catch (err) {
      console.error('Error sending message:', err)
      return null
    }
  }

  // Subscribe to new messages
  const subscribeToMessages = (rideId: string, callback: (msg: ChatMessage) => void) => {
    // Demo mode - no real subscription needed
    if (isDemoMode() || rideId.startsWith('mock-')) {
      return { unsubscribe: () => {} }
    }

    return supabase
      .channel(`chat:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          if (!messages.value.find(m => m.id === newMsg.id)) {
            messages.value.push(newMsg)
          }
          callback(newMsg)
        }
      )
      .subscribe()
  }

  // Mark messages as read
  const markAsRead = async (rideId: string) => {
    if (isDemoMode() || rideId.startsWith('mock-')) return
    if (!authStore.user?.id) return

    await (supabase
      .from('chat_messages') as any)
      .update({ is_read: true })
      .eq('ride_id', rideId)
      .neq('sender_id', authStore.user.id)
  }

  return {
    messages,
    loading,
    fetchMessages,
    sendMessage,
    subscribeToMessages,
    markAsRead
  }
}
