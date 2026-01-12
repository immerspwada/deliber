/**
 * Chat/Message System Composable
 * ระบบแชทระหว่างลูกค้าและ Provider
 */
import { ref, shallowRef, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export interface ChatMessage {
  id: string
  ride_id: string
  sender_id: string
  message: string
  message_type: 'text' | 'image' | 'location' | 'system'
  is_read: boolean
  created_at: string
}

export function useChat(rideId: string) {
  const messages = shallowRef<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)
  const unreadCount = ref(0)
  const currentUserId = ref<string | null>(null)

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  // Load messages
  async function loadMessages(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }
      currentUserId.value = user.id

      const { data, error: dbError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true })

      if (dbError) {
        console.error('[Chat] Load error:', dbError)
        error.value = 'ไม่สามารถโหลดข้อความได้'
        return
      }

      messages.value = data as ChatMessage[]
      
      // Mark messages as read
      await markAsRead()
      
      // Setup realtime subscription
      setupRealtimeSubscription()

    } catch (err) {
      console.error('[Chat] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
    } finally {
      loading.value = false
    }
  }

  // Send message
  async function sendMessage(text: string, type: 'text' | 'image' | 'location' = 'text'): Promise<boolean> {
    if (!text.trim() || sending.value) return false

    sending.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return false
      }

      const { data, error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          ride_id: rideId,
          sender_id: user.id,
          message: text.trim(),
          message_type: type
        })
        .select()
        .single()

      if (dbError) {
        console.error('[Chat] Send error:', dbError)
        error.value = 'ไม่สามารถส่งข้อความได้'
        return false
      }

      // Add to local messages (optimistic update)
      messages.value = [...messages.value, data as ChatMessage]
      return true

    } catch (err) {
      console.error('[Chat] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return false
    } finally {
      sending.value = false
    }
  }

  // Send location message
  async function sendLocation(lat: number, lng: number): Promise<boolean> {
    const locationText = `📍 ${lat.toFixed(6)},${lng.toFixed(6)}`
    return sendMessage(locationText, 'location')
  }

  // Mark messages as read
  async function markAsRead(): Promise<void> {
    if (!currentUserId.value) return

    try {
      await supabase.rpc('mark_messages_read', {
        p_ride_id: rideId,
        p_user_id: currentUserId.value
      })
      unreadCount.value = 0
    } catch (err) {
      console.error('[Chat] Mark read error:', err)
    }
  }

  // Get unread count
  async function getUnreadCount(): Promise<number> {
    if (!currentUserId.value) return 0

    try {
      const { data, error: dbError } = await supabase.rpc('get_unread_message_count', {
        p_ride_id: rideId,
        p_user_id: currentUserId.value
      })

      if (dbError) {
        console.error('[Chat] Unread count error:', dbError)
        return 0
      }

      unreadCount.value = data || 0
      return unreadCount.value
    } catch (err) {
      console.error('[Chat] Exception:', err)
      return 0
    }
  }

  // Setup realtime subscription
  function setupRealtimeSubscription(): void {
    cleanupRealtimeSubscription()

    realtimeChannel = supabase
      .channel(`ride:${rideId}:chat`)
      .on('broadcast', { event: 'message_created' }, (payload) => {
        const newMessage = payload.payload as ChatMessage
        
        // Don't add if already exists
        if (messages.value.some(m => m.id === newMessage.id)) return
        
        messages.value = [...messages.value, newMessage]
        
        // Update unread count if not from current user
        if (newMessage.sender_id !== currentUserId.value) {
          unreadCount.value++
        }
      })
      .subscribe((status) => {
        console.log('[Chat] Realtime status:', status)
      })
  }

  // Cleanup subscription
  function cleanupRealtimeSubscription(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupRealtimeSubscription()
  })

  return {
    messages,
    loading,
    sending,
    error,
    unreadCount,
    currentUserId,
    loadMessages,
    sendMessage,
    sendLocation,
    markAsRead,
    getUnreadCount,
    cleanupRealtimeSubscription
  }
}
