/**
 * Chat/Message System Composable
 * ระบบแชท 1-1 ระหว่างลูกค้าและ Provider
 * 
 * Features:
 * - แชทได้เฉพาะระหว่าง ride/queue booking ที่ active
 * - เมื่อจบงาน (completed/cancelled) ไม่สามารถส่งข้อความได้
 * - ตรวจสอบ role อัตโนมัติ
 * - รองรับ 100+ concurrent chats
 * - ส่งรูปภาพได้
 * - Push notification เมื่อมีข้อความใหม่
 * - รองรับทั้ง ride และ queue booking
 */
import { ref, shallowRef, computed, onUnmounted, unref } from 'vue'
import { supabase } from '../lib/supabase'
import { resizeImage, validateImageFile, RESIZE_PRESETS, createOptimizedFilename } from '../utils/imageResize'

export type BookingType = 'ride' | 'queue' | 'shopping'

export interface ChatMessage {
  id: string
  ride_id?: string | null
  queue_booking_id?: string | null
  shopping_request_id?: string | null
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

// Queue booking statuses that allow chat
const QUEUE_CHAT_ALLOWED_STATUSES = ['confirmed', 'in_progress', 'completed']

// Shopping request statuses that allow chat
const SHOPPING_CHAT_ALLOWED_STATUSES = ['pending', 'matched', 'shopping', 'delivering', 'completed']

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

export function useChat(
  bookingIdInput: string | (() => string),
  bookingType: BookingType = 'ride'
) {
  // Support both static string and getter function for reactive bookingId
  // CRITICAL: Use unref() to unwrap computed refs
  const getBookingId = () => {
    const rawValue = typeof bookingIdInput === 'function' ? bookingIdInput() : bookingIdInput
    // Unwrap computed refs using unref()
    return unref(rawValue)
  }
  
  // Debug: Log bookingId on creation
  chatLog('info', '🚀 useChat CREATED', {
    inputType: typeof bookingIdInput,
    currentBookingId: getBookingId(),
    bookingType,
    isFunction: typeof bookingIdInput === 'function'
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

  const isChatClosed = computed(() => {
    if (chatState.value.rideStatus === null) return false
    
    // Check based on booking type
    let allowedStatuses: string[]
    if (bookingType === 'ride') {
      allowedStatuses = CHAT_ALLOWED_STATUSES
    } else if (bookingType === 'queue') {
      allowedStatuses = QUEUE_CHAT_ALLOWED_STATUSES
    } else {
      allowedStatuses = SHOPPING_CHAT_ALLOWED_STATUSES
    }
    
    return !allowedStatuses.includes(chatState.value.rideStatus)
  })

  // Initialize chat - check permissions and load messages
  async function initialize(): Promise<boolean> {
    const bookingId = getBookingId()
    
    // FORCE LOG - bypass chatLog function
    console.log('%c[CHAT INIT] 🚀 STARTING', 'background: #222; color: #bada55; font-size: 14px;', { bookingId, bookingType })
    chatLog('info', '📋 INITIALIZE START', { bookingId, bookingType })
    
    // Validate bookingId - must be valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!bookingId || !uuidRegex.test(bookingId)) {
      chatLog('error', '❌ INVALID BOOKING_ID', { 
        bookingId, 
        bookingType,
        isNull: bookingId === null,
        isUndefined: bookingId === undefined,
        isEmpty: bookingId === '',
        type: typeof bookingId,
        matchesUUID: bookingId ? uuidRegex.test(bookingId) : false
      })
      error.value = bookingType === 'ride' ? 'รหัสการเดินทางไม่ถูกต้อง' : 'รหัสการจองไม่ถูกต้อง'
      loading.value = false
      return false
    }
    
    chatLog('info', '✅ BOOKING_ID VALID', { bookingId, bookingType })
    
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

      // Step 1: Call get_user_role RPC (different for ride vs queue vs shopping)
      let roleRpcName: string
      let roleParam: string
      let roleParams: Record<string, unknown>
      
      if (bookingType === 'ride') {
        roleRpcName = 'get_user_ride_role'
        roleParam = 'p_ride_id'
        roleParams = { [roleParam]: bookingId, p_user_id: user.id }
      } else if (bookingType === 'queue') {
        roleRpcName = 'get_user_queue_booking_role'
        roleParam = 'p_queue_booking_id'
        roleParams = { [roleParam]: bookingId }
      } else {
        // shopping
        roleRpcName = 'get_user_shopping_role'
        roleParam = 'p_shopping_request_id'
        roleParams = { [roleParam]: bookingId }
      }
      
      chatLog('debug', `📡 RPC: ${roleRpcName}`, roleParams)
      const roleStartTime = performance.now()
      
      const { data: roleData, error: roleError } = await supabase.rpc(roleRpcName, roleParams)
      
      const roleEndTime = performance.now()
      chatLog('info', `📡 RPC RESULT: ${roleRpcName}`, { 
        roleData, 
        roleError,
        duration: `${(roleEndTime - roleStartTime).toFixed(2)}ms`
      })
      
      if (roleError) {
        chatLog('error', `❌ RPC ERROR: ${roleRpcName}`, { 
          code: roleError.code,
          message: roleError.message,
          details: roleError.details,
          hint: roleError.hint
        })
      }

      // Step 2: Call is_chat_allowed RPC (different for ride vs queue vs shopping)
      let allowedRpcName: string
      let allowedParam: string
      
      if (bookingType === 'ride') {
        allowedRpcName = 'is_ride_chat_allowed'
        allowedParam = 'p_ride_id'
      } else if (bookingType === 'queue') {
        allowedRpcName = 'is_queue_booking_chat_allowed'
        allowedParam = 'p_queue_booking_id'
      } else {
        // shopping
        allowedRpcName = 'is_shopping_chat_allowed'
        allowedParam = 'p_shopping_request_id'
      }
      
      chatLog('debug', `📡 RPC: ${allowedRpcName}`, { [allowedParam]: bookingId })
      const allowedStartTime = performance.now()
      
      const { data: allowedData, error: allowedError } = await supabase.rpc(allowedRpcName, {
        [allowedParam]: bookingId
      })
      
      const allowedEndTime = performance.now()
      chatLog('info', `📡 RPC RESULT: ${allowedRpcName}`, { 
        allowedData, 
        allowedError,
        duration: `${(allowedEndTime - allowedStartTime).toFixed(2)}ms`
      })
      
      if (allowedError) {
        chatLog('error', `❌ RPC ERROR: ${allowedRpcName}`, { 
          code: allowedError.code,
          message: allowedError.message,
          details: allowedError.details,
          hint: allowedError.hint
        })
      }

      // Step 3: Get booking status (different table for ride vs queue vs shopping)
      let tableName: string
      if (bookingType === 'ride') {
        tableName = 'ride_requests'
      } else if (bookingType === 'queue') {
        tableName = 'queue_bookings'
      } else {
        tableName = 'shopping_requests'
      }
      
      chatLog('debug', `📡 QUERY: ${tableName}.status`, { bookingId })
      const statusStartTime = performance.now()
      
      const { data: bookingData, error: bookingError } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', bookingId)
        .single()
      
      const statusEndTime = performance.now()
      chatLog('info', `📡 QUERY RESULT: ${tableName}.status`, { 
        bookingData, 
        bookingError,
        duration: `${(statusEndTime - statusStartTime).toFixed(2)}ms`
      })
      
      if (bookingError) {
        chatLog('error', `❌ QUERY ERROR: ${tableName}`, { 
          code: bookingError.code,
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint
        })
      }

      // Step 4: Set chat state
      // CRITICAL: Validate roleData before setting
      const validatedRole = (roleData === 'customer' || roleData === 'provider') ? roleData : null
      
      chatLog('info', '🔍 ROLE VALIDATION', {
        rawRoleData: roleData,
        typeOfRoleData: typeof roleData,
        validatedRole,
        isCustomer: roleData === 'customer',
        isProvider: roleData === 'provider'
      })
      
      chatState.value = {
        isAllowed: allowedData === true,
        userRole: validatedRole,
        rideStatus: bookingData?.status || null
      }

      // Final summary log
      const canSend = chatState.value.isAllowed && chatState.value.userRole !== null
      chatLog('info', '📊 INITIALIZE COMPLETE', {
        userId: user.id,
        bookingId,
        bookingType,
        chatState: chatState.value,
        canSendMessage: canSend,
        summary: {
          userRole: chatState.value.userRole || '❌ NULL',
          isAllowed: chatState.value.isAllowed ? '✅' : '❌',
          bookingStatus: chatState.value.rideStatus || '❌ NULL',
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
    const bookingId = getBookingId()
    chatLog('debug', '📥 LOAD_MESSAGES START', { bookingId, bookingType })
    
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
      let rpcName: string
      let rpcParam: string
      
      if (bookingType === 'ride') {
        rpcName = 'get_chat_history'
        rpcParam = 'p_ride_id'
      } else if (bookingType === 'queue') {
        rpcName = 'get_queue_booking_chat_history'
        rpcParam = 'p_queue_booking_id'
      } else {
        rpcName = 'get_shopping_chat_history'
        rpcParam = 'p_shopping_request_id'
      }
      
      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        [rpcParam]: bookingId,
        p_limit: 100
      })
      const endTime = performance.now()
      
      chatLog('info', '📥 LOAD_MESSAGES RPC RESULT', {
        rpcName,
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

      // Parse RPC response (returns TABLE - array of messages)
      const messagesArray = data as unknown as Record<string, unknown>[]
      
      chatLog('debug', '📥 LOAD_MESSAGES RESPONSE', {
        messageCount: messagesArray?.length || 0,
        isArray: Array.isArray(messagesArray)
      })
      
      if (Array.isArray(messagesArray) && messagesArray.length > 0) {
        messages.value = messagesArray.map(msg => ({
          id: msg.id as string,
          ride_id: msg.ride_id as string | null | undefined,
          queue_booking_id: msg.queue_booking_id as string | null | undefined,
          shopping_request_id: msg.shopping_request_id as string | null | undefined,
          sender_id: msg.sender_id as string,
          sender_type: (msg.sender_type as ChatMessage['sender_type']) || 'customer',
          message: msg.message as string,
          message_type: (msg.message_type as ChatMessage['message_type']) || 'text',
          image_url: msg.image_url as string | null,
          is_read: msg.is_read as boolean,
          created_at: msg.created_at as string
        }))
        chatLog('info', '✅ MESSAGES_RPC LOADED', { count: messages.value.length })
      } else {
        // Empty result - no messages yet
        messages.value = []
        chatLog('info', '✅ MESSAGES_RPC LOADED', { count: 0 })
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
    const bookingId = getBookingId()
    chatLog('debug', '📥 LOAD_MESSAGES_DIRECT START', { bookingId, bookingType })
    
    let filterColumn: string
    if (bookingType === 'ride') {
      filterColumn = 'ride_id'
    } else if (bookingType === 'queue') {
      filterColumn = 'queue_booking_id'
    } else {
      filterColumn = 'shopping_request_id'
    }
    
    const { data, error: dbError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq(filterColumn, bookingId)
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
    const bookingId = getBookingId()
    
    chatLog('info', '📤 SEND_MESSAGE START', {
      bookingId,
      bookingType,
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
      let rpcName: string
      let rpcParam: string
      
      if (bookingType === 'ride') {
        rpcName = 'send_chat_message'
        rpcParam = 'p_ride_id'
      } else if (bookingType === 'queue') {
        rpcName = 'send_queue_booking_chat_message'
        rpcParam = 'p_queue_booking_id'
      } else {
        rpcName = 'send_shopping_chat_message'
        rpcParam = 'p_shopping_request_id'
      }
      
      chatLog('debug', `📡 RPC: ${rpcName}`, { [rpcParam]: bookingId, p_message_type: type })
      const startTime = performance.now()
      
      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        [rpcParam]: bookingId,
        p_message: text.trim(),
        p_message_type: type
      })
      
      const endTime = performance.now()
      chatLog('info', `📡 RPC RESULT: ${rpcName}`, {
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
          ride_id: msgData.ride_id as string | null | undefined,
          queue_booking_id: msgData.queue_booking_id as string | null | undefined,
          shopping_request_id: msgData.shopping_request_id as string | null | undefined,
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
    const bookingId = getBookingId()
    if (!currentUserId.value || !chatState.value.userRole) return false

    const insertData: Record<string, unknown> = {
      sender_id: currentUserId.value,
      sender_type: chatState.value.userRole,
      message: text.trim(),
      message_type: type
    }
    
    // Add either ride_id, queue_booking_id, or shopping_request_id
    if (bookingType === 'ride') {
      insertData.ride_id = bookingId
    } else if (bookingType === 'queue') {
      insertData.queue_booking_id = bookingId
    } else {
      insertData.shopping_request_id = bookingId
    }

    const { data, error: dbError } = await supabase
      .from('chat_messages')
      .insert(insertData)
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
      ride_id: bookingType === 'ride' ? bookingId : null,
      queue_booking_id: bookingType === 'queue' ? bookingId : null,
      shopping_request_id: bookingType === 'shopping' ? bookingId : null,
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
    const bookingId = getBookingId()
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
      const filePath = `${bookingId}/${filename}`

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
      let rpcName: string
      let rpcParam: string
      
      if (bookingType === 'ride') {
        rpcName = 'send_chat_message'
        rpcParam = 'p_ride_id'
      } else if (bookingType === 'queue') {
        rpcName = 'send_queue_booking_chat_message'
        rpcParam = 'p_queue_booking_id'
      } else {
        rpcName = 'send_shopping_chat_message'
        rpcParam = 'p_shopping_request_id'
      }
      
      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        [rpcParam]: bookingId,
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
          ride_id: msgData.ride_id as string | null | undefined,
          queue_booking_id: msgData.queue_booking_id as string | null | undefined,
          shopping_request_id: msgData.shopping_request_id as string | null | undefined,
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
    const bookingId = getBookingId()
    if (!currentUserId.value) return

    try {
      let rpcName: string
      let rpcParam: string
      let userParam: string
      
      if (bookingType === 'ride') {
        rpcName = 'mark_messages_read'
        rpcParam = 'p_ride_id'
        userParam = 'p_user_id'
      } else if (bookingType === 'queue') {
        rpcName = 'mark_queue_booking_messages_read'
        rpcParam = 'p_queue_booking_id'
        userParam = 'p_user_id'
      } else {
        rpcName = 'mark_shopping_messages_read'
        rpcParam = 'p_shopping_request_id'
        userParam = 'p_sender_id' // Shopping uses p_sender_id not p_user_id
      }
      
      await supabase.rpc(rpcName, {
        [rpcParam]: bookingId,
        [userParam]: currentUserId.value
      })
      unreadCount.value = 0
    } catch (err) {
      console.error('[Chat] Mark read error:', err)
    }
  }

  // Get unread count
  async function getUnreadCount(): Promise<number> {
    const bookingId = getBookingId()
    if (!currentUserId.value) return 0

    try {
      let rpcName: string
      let rpcParam: string
      let userParam: string
      
      if (bookingType === 'ride') {
        rpcName = 'get_unread_message_count'
        rpcParam = 'p_ride_id'
        userParam = 'p_user_id'
      } else if (bookingType === 'queue') {
        rpcName = 'get_queue_booking_unread_count'
        rpcParam = 'p_queue_booking_id'
        userParam = 'p_user_id'
      } else {
        rpcName = 'get_shopping_unread_count'
        rpcParam = 'p_shopping_request_id'
        userParam = 'p_sender_id' // Shopping uses p_sender_id not p_user_id
      }
      
      const { data, error: rpcError } = await supabase.rpc(rpcName, {
        [rpcParam]: bookingId,
        [userParam]: currentUserId.value
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
    const bookingId = getBookingId()
    cleanupRealtimeSubscription()

    const channelName = `chat:${bookingType}:${bookingId}`
    let filterColumn: string
    if (bookingType === 'ride') {
      filterColumn = 'ride_id'
    } else if (bookingType === 'queue') {
      filterColumn = 'queue_booking_id'
    } else {
      filterColumn = 'shopping_request_id'
    }
    
    chatLog('debug', '📡 REALTIME SETUP', { channelName, bookingId, bookingType, filterColumn })
    
    realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `${filterColumn}=eq.${bookingId}`
        },
        (payload) => {
          chatLog('info', '📨 REALTIME MESSAGE RECEIVED', { payload })
          
          const newRecord = payload.new as Record<string, unknown>
          
          // Map to ChatMessage type
          const newMessage: ChatMessage = {
            id: newRecord.id as string,
            ride_id: newRecord.ride_id as string | null | undefined,
            queue_booking_id: newRecord.queue_booking_id as string | null | undefined,
            shopping_request_id: newRecord.shopping_request_id as string | null | undefined,
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
    const bookingId = getBookingId()
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
        tag: `chat-${bookingType}-${bookingId}`,
        data: { bookingId, bookingType, messageId: message.id },
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
    const bookingId = getBookingId()
    if (!currentUserId.value) return

    try {
      let allowedRpcName: string
      let allowedParam: string
      
      if (bookingType === 'ride') {
        allowedRpcName = 'is_ride_chat_allowed'
        allowedParam = 'p_ride_id'
      } else if (bookingType === 'queue') {
        allowedRpcName = 'is_queue_booking_chat_allowed'
        allowedParam = 'p_queue_booking_id'
      } else {
        allowedRpcName = 'is_shopping_chat_allowed'
        allowedParam = 'p_shopping_request_id'
      }
      
      const { data: allowedData } = await supabase.rpc(allowedRpcName, {
        [allowedParam]: bookingId
      })

      let tableName: string
      if (bookingType === 'ride') {
        tableName = 'ride_requests'
      } else if (bookingType === 'queue') {
        tableName = 'queue_bookings'
      } else {
        tableName = 'shopping_requests'
      }
      
      const { data: bookingData } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', bookingId)
        .single()

      chatState.value.isAllowed = allowedData === true
      chatState.value.rideStatus = bookingData?.status || null
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
