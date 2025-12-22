/**
 * useRealtimeChat - Real-time Chat System
 * Feature: F212 - Realtime Chat
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  session_id: string
  sender_id: string
  sender_type: 'customer' | 'provider' | 'admin'
  message: string
  message_type: 'text' | 'image' | 'location'
  read_at?: string
  created_at: string
}

export interface ChatSession {
  id: string
  ride_id?: string
  customer_id: string
  provider_id?: string
  status: 'active' | 'closed'
}

export function useRealtimeChat() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const session = ref<ChatSession | null>(null)
  let channel: RealtimeChannel | null = null

  const unreadCount = computed(() => messages.value.filter(m => !m.read_at && m.sender_type !== 'customer').length)

  const startSession = async (customerId: string, rideId?: string, providerId?: string): Promise<ChatSession | null> => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('chat_sessions').insert({ customer_id: customerId, ride_id: rideId, provider_id: providerId, status: 'active' } as never).select().single()
      if (err) throw err
      session.value = data
      subscribeToMessages(data.id)
      return data
    } catch (e: any) { error.value = e.message; return null }
    finally { loading.value = false }
  }

  const loadSession = async (sessionId: string) => {
    loading.value = true
    try {
      const { data: sessionData, error: err1 } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single()
      if (err1) throw err1
      session.value = sessionData
      const { data: msgData, error: err2 } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at')
      if (err2) throw err2
      messages.value = msgData || []
      subscribeToMessages(sessionId)
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const sendMessage = async (senderId: string, senderType: 'customer' | 'provider' | 'admin', message: string): Promise<boolean> => {
    if (!session.value) return false
    try {
      const { error: err } = await supabase.from('chat_messages').insert({ session_id: session.value.id, sender_id: senderId, sender_type: senderType, message, message_type: 'text' } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const subscribeToMessages = (sessionId: string) => {
    if (channel) channel.unsubscribe()
    channel = supabase.channel(`chat:${sessionId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `session_id=eq.${sessionId}` }, (payload) => {
      messages.value.push(payload.new as ChatMessage)
    }).subscribe()
  }

  onUnmounted(() => { if (channel) channel.unsubscribe() })

  return { loading, error, messages, session, unreadCount, startSession, loadSession, sendMessage }
}
