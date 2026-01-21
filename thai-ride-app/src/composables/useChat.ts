/**
 * Chat/Message System Composable
 * ระบบแชท 1-1 ระหว่างลูกค้าและ Provider
 * 
 * Features:
 * - แชทได้เฉพาะระหว่าง ride ที่ active
 * - เมื่อจบงาน (completed/cancelled) ไม่สามารถส่งข้อความได้
 * - ตรวจสอบ role อัตโนมัติ
 * - รองรับ 100+ concurrent chats
 * - ส่งรูปภาพได้
 * - Push notification เมื่อมีข้อความใหม่
 */
import { ref, shallowRef, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { resizeImage, validateImageFile, RESIZE_PRESETS, createOptimizedFilename } from '../utils/imageResize'

export interface ChatMessage {
  id: string
  ride_id: string
  sender_id: string
  sender_type: 'customer' | 'provider' | 'system'
  message: string
  message_type: 'text' | 'image' | 'location' | 'system'
  image_url?: string | null
  is_read: boolean
  created_at: string
}

export interface ChatState {
  isAllowed: boolean
  userRole: 'customer' | 'provider' | null
  rideStatus: string | null
}

// Active ride statuses that allow chat
const CHAT_ALLOWED_STATUSES = ['pending', 'matched', 'arriving', 'arrived', 'pickup', 'in_progress']

// Debug logger with timestamps
const chatLog = (level: 'info' | 'warn' | 'error' | 'debug', ...args: unknown[]) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
  const prefix = `[Chat ${timestamp}]`
  switch (level) {
    case 'error': console.error(prefix, ...args); break
    case 'warn': console.warn(prefix, ...args); break
    case 'debug': console.debug(prefix, ...args); break
    default: console.log(prefix, ...args)
  }
}

export function useChat(rideIdInput: string | (() => string)) {
  // Support both static string and getter function for reactive rideId
  const getRideId = typeof rideIdInput === 'function' ? rideIdInput : () => rideIdInput
  
  // Debug: Log rideId on creation
  chatLog('info', '🚀 useChat CREATED', {
    inputType: typeof rideIdInput,
    currentRideId: getRideId(),
    isFunction: typeof rideIdInput === 'function'
  })
  
  // State
  const messages = shallowRef<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const uploadingImage = ref(false)
  const error = ref<string | null>(null)
  const unreadCount = ref(0)
  const currentUserId = ref<string | null>(null)
  const chatState = ref<ChatState>({
    isAllowed: false,
    userRole: null,
    rideStatus: null
  })

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  // Computed
  const canSendMessage = computed(() => 
    chatState.value.isAllowed && 
    chatState.value.userRole !== null &&
    !sending.value &&
    !uploadingImage.value
  )

  const isChatClosed = computed(() => 
    chatState.value.rideStatus !== null && 
    !CHAT_ALLOWED_STATUSES.includes(chatState.value.rideStatus)
  )

  // Initialize chat - check permissions and load messages
  async function initialize(): Promise<boolean> {
    const rideId = getRideId()
    
    // FORCE LOG - bypass chatLog function
    console.log('%c[CHAT INIT] 🚀 STARTING', 'background: #222; color: #bada55; font-size: 14px;', { rideId })
    chatLog('info', '📋 INITIALIZE START', { rideId })
    
    // Validate rideId - must be valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!rideId || !uuidRegex.test(rideId)) {
      chatLog('error', '❌ INVALID RIDE_ID', { 
        rideId, 
        isNull: rideId === null,
        isUndefined: rideId === undefined,
        isEmpty: rideId === '',
        type: typeof rideId,
        matchesUUID: rideId ? uuidRegex.test(rideId) : false
      })
      error.value = 'รหัสการเดินทางไม่ถูกต้อง'
      loading.value = false
      return false
    }
    
    chatLog('info', '✅ RIDE_ID VALID', { rideId })
    
    loading.value = true
    error.value = null

    try {
      chatLog('debug', '🔐 Getting authenticated user...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        chatLog('error', '❌ AUTH ERROR', { authError })
        error.value = 'กรุณาเข้าสู่ระบบ'
        loading.value = false
        return false
      }
      
      if (!user) {
        chatLog('error', '❌ NO USER', { user })
        error.value = 'กรุณาเข้าสู่ระบบ'
        loading.value = false
        return false
      }
      
      currentUserId.value = user.id
      chatLog('info', '✅ USER AUTHENTICATED', { userId: user.id, email: user.email })

      // Step 1: Call get_user_ride_role RPC
      chatLog('debug', '📡 RPC: get_user_ride_role', { p_ride_id: rideId, p_user_id: user.id })
      const roleStartTime = performance.now()
      
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_ride_role', {
        p_ride_id: rideId,
        p_user_id: user.id
      })
      
      const roleEndTime = performance.now()
      chatLog('info', '📡 RPC RESULT: get_user_ride_role', { 
        roleData, 
        roleError,
        duration: `${(roleEndTime - roleStartTime).toFixed(2)}ms`
      })
      
      if (roleError) {
        chatLog('error', '❌ RPC ERROR: get_user_ride_role', { 
          code: roleError.code,
          message: roleError.message,
          details: roleError.details,
          hint: roleError.hint
        })
      }

      // Step 2: Call is_ride_chat_allowed RPC
      chatLog('debug', '📡 RPC: is_ride_chat_allowed', { p_ride_id: rideId })
      const allowedStartTime = performance.now()
      
      const { data: allowedData, error: allowedError } = await supabase.rpc('is_ride_chat_allowed', {
        p_ride_id: rideId
      })
      
      const allowedEndTime = performance.now()
      chatLog('info', '📡 RPC RESULT: is_ride_chat_allowed', { 
        allowedData, 
        allowedError,
        duration: `${(allowedEndTime - allowedStartTime).toFixed(2)}ms`
      })
      
      if (allowedError) {
        chatLog('error', '❌ RPC ERROR: is_ride_chat_allowed', { 
          code: allowedError.code,
          message: allowedError.message,
          details: allowedError.details,
          hint: allowedError.hint
        })
      }

      // Step 3: Get ride status
      chatLog('debug', '📡 QUERY: ride_requests.status', { rideId })
      const statusStartTime = performance.now()
      
      const { data: rideData, error: rideError } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', rideId)
        .single()
      
      const statusEndTime = performance.now()
      chatLog('info', '📡 QUERY RESULT: ride_requests.status', { 
        rideData, 
        rideError,
        duration: `${(statusEndTime - statusStartTime).toFixed(2)}ms`
      })
      
      if (rideError) {
        chatLog('error', '❌ QUERY ERROR: ride_requests', { 
          code: rideError.code,
          message: rideError.message,
          details: rideError.details,
          hint: rideError.hint
        })
      }

      // Step 4: Set chat state
      chatState.value = {
        isAllowed: allowedData === true,
        userRole: roleData as 'customer' | 'provider' | null,
        rideStatus: rideData?.status || null
      }

      // Final summary log
      const canSend = chatState.value.isAllowed && chatState.value.userRole !== null
      chatLog('info', '📊 INITIALIZE COMPLETE', {
        userId: user.id,
        rideId,
        chatState: chatState.value,
        canSendMessage: canSend,
        summary: {
          userRole: chatState.value.userRole || '❌ NULL',
          isAllowed: chatState.value.isAllowed ? '✅' : '❌',
          rideStatus: chatState.value.rideStatus || '❌ NULL',
          canSend: canSend ? '✅ YES' : '❌ NO'
        }
      })

      if (!chatState.value.userRole) {
        chatLog('warn', '⚠️ NO USER ROLE - Cannot send messages', {
          chatState: chatState.value
        })
        error.value = 'คุณไม่มีสิทธิ์เข้าถึงแชทนี้'
        return false
      }

      // Load messages
      chatLog('debug', '📥 Loading messages...')
      await loadMessages()

      // Setup realtime
      chatLog('debug', '📡 Setting up realtime subscription...')
      setupRealtimeSubscription()
      
      chatLog('info', '✅ INITIALIZE SUCCESS')

      return true
    } catch (err) {
      chatLog('error', '❌ INITIALIZE EXCEPTION', { error: err })
      error.value = 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
      return false
    } finally {
      loading.value = false
    }
  }

  // Load messages using RPC for better security
  async function loadMessages(): Promise<void> {
    const rideId = getRideId()
    chatLog('debug', '📥 LOAD_MESSAGES START', { rideId })
    
    // AUTO-INITIALIZE: If not initialized yet, do it now
    if (!chatState.value.userRole) {
      chatLog('warn', '⚠️ LOAD_MESSAGES called without initialize - auto-initializing...')
      const initResult = await initialize()
      if (!initResult) {
        chatLog('error', '❌ Auto-initialize failed, cannot load messages')
        return
      }
    }
    
    try {
      const startTime = performance.now()
      const { data, error: rpcError } = await supabase.rpc('get_chat_history', {
        p_ride_id: rideId,
        p_limit: 100
      })
      const endTime = performance.now()
      
      chatLog('info', '📥 LOAD_MESSAGES RPC RESULT', {
        hasData: !!data,
        error: rpcError,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      })

      if (rpcError) {
        chatLog('error', '❌ LOAD_MESSAGES RPC ERROR', { rpcError })
        // Fallback to direct query
        await loadMessagesDirect()
        return
      }

      // Parse RPC response (returns JSONB)
      const response = data as unknown as { success: boolean; messages?: Record<string, unknown>[] }
      
      chatLog('debug', '📥 LOAD_MESSAGES RESPONSE', {
        success: response?.success,
        messageCount: response?.messages?.length || 0
      })
      
      if (response?.success && response.messages) {
        messages.value = response.messages.map(msg => ({
          id: msg.id as string,
          ride_id: msg.ride_id as string,
          sender_id: msg.sender_id as string,
          sender_type: (msg.sender_type as ChatMessage['sender_type']) || 'customer',
          message: msg.message as string,
          message_type: (msg.message_type as ChatMessage['message_type']) || 'text',
          image_url: msg.image_url as string | null,
          is_read: msg.is_read as boolean,
          created_at: msg.created_at as string
        }))
        chatLog('info', '✅ MESSAGES LOADED', { count: messages.value.length })
      } else {
        chatLog('warn', '⚠️ RPC returned unexpected format, using fallback')
        // Fallback if RPC returns unexpected format
        await loadMessagesDirect()
      }

      // Mark as read
      await markAsRead()
    } catch (err) {
      chatLog('error', '❌ LOAD_MESSAGES EXCEPTION', { error: err })
      await loadMessagesDirect()
    }
  }

  // Fallback direct query
  async function loadMessagesDirect(): Promise<void> {
    const rideId = getRideId()
    chatLog('debug', '📥 LOAD_MESSAGES_DIRECT START', { rideId })
    
    const { data, error: dbError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (dbError) {
      chatLog('error', '❌ LOAD_MESSAGES_DIRECT ERROR', { dbError })
      return
    }

    messages.value = (data || []).map(msg => ({
      ...msg,
      sender_type: (msg.sender_type || 'customer') as ChatMessage['sender_type'],
      message_type: (msg.message_type || 'text') as ChatMessage['message_type']
    }))
    
    chatLog('info', '✅ MESSAGES_DIRECT LOADED', { count: messages.value.length })
  }

  // Send message using RPC for validation
  async function sendMessage(text: string, type: 'text' | 'image' | 'location' = 'text'): Promise<boolean> {
    const rideId = getRideId()
    
    chatLog('info', '📤 SEND_MESSAGE START', {
      rideId,
      textLength: text.length,
      type,
      canSendMessage: canSendMessage.value,
      chatState: chatState.value
    })
    
    // AUTO-INITIALIZE: If not initialized yet, do it now
    if (!chatState.value.userRole) {
      chatLog('warn', '⚠️ SEND_MESSAGE called without initialize - auto-initializing...')
      const initResult = await initialize()
      if (!initResult) {
        chatLog('error', '❌ Auto-initialize failed, cannot send message')
        error.value = 'ไม่สามารถเชื่อมต่อแชทได้'
        return false
      }
      chatLog('info', '✅ Auto-initialize success, continuing with send')
    }
    
    if (!text.trim() || sending.value || !canSendMessage.value) {
      chatLog('warn', '⚠️ SEND_MESSAGE BLOCKED', {
        reason: !text.trim() ? 'empty text' : sending.value ? 'already sending' : 'canSendMessage is false',
        isChatClosed: isChatClosed.value
      })
      if (isChatClosed.value) {
        error.value = 'การสนทนาปิดแล้ว เนื่องจากงานเสร็จสิ้น'
      }
      return false
    }

    sending.value = true
    error.value = null

    try {
      // Use RPC for server-side validation
      chatLog('debug', '📡 RPC: send_chat_message', { p_ride_id: rideId, p_message_type: type })
      const startTime = performance.now()
      
      const { data, error: rpcError } = await supabase.rpc('send_chat_message', {
        p_ride_id: rideId,
        p_message: text.trim(),
        p_message_type: type
      })
      
      const endTime = performance.now()
      chatLog('info', '📡 RPC RESULT: send_chat_message', {
        hasData: !!data,
        error: rpcError,
        duration: `${(endTime - startTime).toFixed(2)}ms`
      })

      if (rpcError) {
        chatLog('error', '❌ SEND_MESSAGE RPC ERROR', { rpcError })
        // Fallback to direct insert
        return await sendMessageDirect(text, type)
      }

      // Parse RPC response (returns JSONB)
      const response = data as unknown as { success: boolean; error?: string; message?: Record<string, unknown> }
      
      chatLog('debug', '📤 SEND_MESSAGE RESPONSE', { response })

      if (!response?.success) {
        chatLog('warn', '⚠️ SEND_MESSAGE FAILED', { error: response?.error })
        const errorMap: Record<string, string> = {
          'AUTH_REQUIRED': 'กรุณาเข้าสู่ระบบ',
          'NOT_PARTICIPANT': 'คุณไม่มีสิทธิ์ส่งข้อความ',
          'CHAT_CLOSED': 'การสนทนาปิดแล้ว เนื่องจากงานเสร็จสิ้น',
          'EMPTY_MESSAGE': 'กรุณาพิมพ์ข้อความ',
          'MESSAGE_TOO_LONG': 'ข้อความยาวเกินไป (สูงสุด 1000 ตัวอักษร)'
        }
        error.value = errorMap[response?.error || ''] || 'ไม่สามารถส่งข้อความได้'
        
        // Update chat state if closed
        if (response?.error === 'CHAT_CLOSED') {
          chatState.value.isAllowed = false
        }
        return false
      }

      // Add to local messages immediately (optimistic update)
      if (response.message) {
        const msgData = response.message
        const newMsg: ChatMessage = {
          id: msgData.id as string,
          ride_id: msgData.ride_id as string,
          sender_id: msgData.sender_id as string,
          sender_type: (msgData.sender_type as ChatMessage['sender_type']) || 'customer',
          message: msgData.message as string,
          message_type: (msgData.message_type as ChatMessage['message_type']) || 'text',
          image_url: msgData.image_url as string | null,
          is_read: (msgData.is_read as boolean) || false,
          created_at: msgData.created_at as string
        }
        
        chatLog('info', '✅ MESSAGE SENT', { messageId: newMsg.id })
        
        if (!messages.value.some(m => m.id === newMsg.id)) {
          messages.value = [...messages.value, newMsg]
        }
      } else {
        chatLog('warn', '⚠️ RPC success but no message in response')
      }

      return true
    } catch (err) {
      chatLog('error', '❌ SEND_MESSAGE EXCEPTION', { error: err })
      error.value = 'เกิดข้อผิดพลาด'
      return false
    } finally {
      sending.value = false
    }
  }

  // Fallback direct insert
  async function sendMessageDirect(text: string, type: 'text' | 'image' | 'location'): Promise<boolean> {
    const rideId = getRideId()
    if (!currentUserId.value || !chatState.value.userRole) return false

    const { data, error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        ride_id: rideId,
        sender_id: currentUserId.value,
        sender_type: chatState.value.userRole,
        message: text.trim(),
        message_type: type
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Chat] Direct send error:', dbError)
      
      // Check if it's a policy violation (chat closed)
      if (dbError.code === '42501' || dbError.message?.includes('policy')) {
        error.value = 'การสนทนาปิดแล้ว เนื่องจากงานเสร็จสิ้น'
        chatState.value.isAllowed = false
      } else {
        error.value = 'ไม่สามารถส่งข้อความได้'
      }
      return false
    }

    // Add to local messages
    const newMessage: ChatMessage = {
      id: data.id,
      ride_id: getRideId(),
      sender_id: currentUserId.value,
      sender_type: chatState.value.userRole,
      message: text.trim(),
      message_type: type,
      is_read: false,
      created_at: data.created_at || new Date().toISOString()
    }
    messages.value = [...messages.value, newMessage]

    return true
  }

  // Send location message
  async function sendLocation(lat: number, lng: number): Promise<boolean> {
    const locationText = `📍 ${lat.toFixed(6)},${lng.toFixed(6)}`
    return sendMessage(locationText, 'location')
  }

  // Send image message
  async function sendImage(file: File): Promise<boolean> {
    const rideId = getRideId()
    if (!canSendMessage.value || uploadingImage.value) {
      if (isChatClosed.value) {
        error.value = 'การสนทนาปิดแล้ว เนื่องจากงานเสร็จสิ้น'
      }
      return false
    }

    // Validate image
    const validation = validateImageFile(file)
    if (!validation.valid) {
      error.value = validation.error || 'ไฟล์ไม่ถูกต้อง'
      return false
    }

    uploadingImage.value = true
    error.value = null

    try {
      // Resize image
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.evidence)
      
      // Generate filename
      const filename = createOptimizedFilename(file.name, 'jpeg')
      const filePath = `${rideId}/${filename}`

      // Upload to chat-images bucket
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        console.error('[Chat] Upload error:', uploadError)
        error.value = 'ไม่สามารถอัปโหลดรูปภาพได้'
        return false
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath)

      const imageUrl = urlData?.publicUrl

      if (!imageUrl) {
        error.value = 'ไม่สามารถสร้าง URL รูปภาพได้'
        return false
      }

      // Send message with image URL using RPC
      const { data, error: rpcError } = await supabase.rpc('send_chat_message', {
        p_ride_id: rideId,
        p_message: '📷 รูปภาพ',
        p_message_type: 'image',
        p_image_url: imageUrl
      })

      if (rpcError) {
        console.error('[Chat] Send image RPC error:', rpcError)
        error.value = 'ไม่สามารถส่งรูปภาพได้'
        return false
      }

      // Parse RPC response
      const response = data as unknown as { success: boolean; message?: Record<string, unknown> }
      
      // Add to local messages
      if (response?.success && response.message) {
        const msgData = response.message
        const newMsg: ChatMessage = {
          id: msgData.id as string,
          ride_id: msgData.ride_id as string,
          sender_id: msgData.sender_id as string,
          sender_type: (msgData.sender_type as ChatMessage['sender_type']) || 'customer',
          message: msgData.message as string,
          message_type: (msgData.message_type as ChatMessage['message_type']) || 'image',
          image_url: msgData.image_url as string | null,
          is_read: (msgData.is_read as boolean) || false,
          created_at: msgData.created_at as string
        }
        
        if (!messages.value.some(m => m.id === newMsg.id)) {
          messages.value = [...messages.value, newMsg]
        }
      }

      return true
    } catch (err) {
      console.error('[Chat] Send image exception:', err)
      error.value = 'เกิดข้อผิดพลาดในการส่งรูปภาพ'
      return false
    } finally {
      uploadingImage.value = false
    }
  }

  // Mark messages as read
  async function markAsRead(): Promise<void> {
    const rideId = getRideId()
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
    const rideId = getRideId()
    if (!currentUserId.value) return 0

    try {
      const { data, error: rpcError } = await supabase.rpc('get_unread_message_count', {
        p_ride_id: rideId,
        p_user_id: currentUserId.value
      })

      if (rpcError) {
        console.error('[Chat] Unread count error:', rpcError)
        return 0
      }

      unreadCount.value = data || 0
      return unreadCount.value
    } catch (err) {
      console.error('[Chat] Exception:', err)
      return 0
    }
  }

  // Setup realtime subscription using Postgres Changes (not broadcast)
  function setupRealtimeSubscription(): void {
    const rideId = getRideId()
    cleanupRealtimeSubscription()

    const channelName = `chat:${rideId}`
    chatLog('debug', '📡 REALTIME SETUP', { channelName, rideId })
    
    realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          chatLog('info', '📨 REALTIME MESSAGE RECEIVED', { payload })
          
          const newRecord = payload.new as Record<string, unknown>
          
          // Map to ChatMessage type
          const newMessage: ChatMessage = {
            id: newRecord.id as string,
            ride_id: newRecord.ride_id as string,
            sender_id: newRecord.sender_id as string,
            sender_type: (newRecord.sender_type as ChatMessage['sender_type']) || 'customer',
            message: newRecord.message as string,
            message_type: (newRecord.message_type as ChatMessage['message_type']) || 'text',
            image_url: newRecord.image_url as string | null,
            is_read: newRecord.is_read as boolean,
            created_at: newRecord.created_at as string
          }
          
          // Don't add if already exists
          if (messages.value.some(m => m.id === newMessage.id)) {
            chatLog('debug', '⏭️ Message already exists, skipping')
            return
          }
          
          // Don't add if from self (already added optimistically)
          if (newMessage.sender_id === currentUserId.value) {
            chatLog('debug', '⏭️ Own message, skipping realtime update')
            return
          }
          
          chatLog('info', '✅ ADDING REALTIME MESSAGE', { messageId: newMessage.id })
          messages.value = [...messages.value, newMessage]
          
          // Update unread count
          unreadCount.value++
          
          // Show local notification for messages from others
          showChatNotification(newMessage)
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          chatLog('info', '✅ REALTIME SUBSCRIBED', { channelName })
        } else if (status === 'CHANNEL_ERROR') {
          chatLog('error', '❌ REALTIME ERROR', { status, err })
        } else {
          chatLog('debug', '📡 REALTIME STATUS', { status })
        }
      })
  }

  // Show local notification for new chat message
  function showChatNotification(message: ChatMessage): void {
    const rideId = getRideId()
    // Only show if permission granted and not from self
    if (Notification.permission !== 'granted') return
    if (message.sender_id === currentUserId.value) return
    
    const isImage = message.message_type === 'image'
    const body = isImage ? '📷 ส่งรูปภาพ' : message.message
    const senderLabel = message.sender_type === 'customer' ? 'ลูกค้า' : 'ผู้ให้บริการ'
    
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(`💬 ข้อความจาก${senderLabel}`, {
        body: body.substring(0, 100),
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `chat-${rideId}`,
        data: { rideId, messageId: message.id },
        requireInteraction: false,
        silent: false
      })
    }).catch(err => {
      console.warn('[Chat] Notification error:', err)
    })
  }

  // Cleanup subscription
  function cleanupRealtimeSubscription(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Refresh chat state (check if still allowed)
  async function refreshChatState(): Promise<void> {
    const rideId = getRideId()
    if (!currentUserId.value) return

    try {
      const { data: allowedData } = await supabase.rpc('is_ride_chat_allowed', {
        p_ride_id: rideId
      })

      const { data: rideData } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', rideId)
        .single()

      chatState.value.isAllowed = allowedData === true
      chatState.value.rideStatus = rideData?.status || null
    } catch (err) {
      console.error('[Chat] Refresh state error:', err)
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupRealtimeSubscription()
  })

  return {
    // State
    messages,
    loading,
    sending,
    uploadingImage,
    error,
    unreadCount,
    currentUserId,
    chatState,
    
    // Computed
    canSendMessage,
    isChatClosed,
    
    // Methods
    initialize,
    loadMessages,
    sendMessage,
    sendImage,
    sendLocation,
    markAsRead,
    getUnreadCount,
    refreshChatState,
    cleanupRealtimeSubscription
  }
}
