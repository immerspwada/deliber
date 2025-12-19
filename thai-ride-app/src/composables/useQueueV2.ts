/**
 * useQueueV2 - Enhanced Queue Booking
 * Feature: F158 - Queue Booking Enhancement V2
 * Tables: queue_locations, queue_tickets, queue_analytics
 * Migration: 074_queue_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface QueueLocation {
  id: string
  name: string
  name_th: string
  location_type: string
  lat: number
  lng: number
  address?: string
  avg_service_time_minutes: number
  current_queue_size: number
  avg_wait_time_minutes: number
  is_featured: boolean
}

export interface QueueTicket {
  id: string
  ticket_number: string
  queue_position: number
  estimated_call_time?: string
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'cancelled'
  location?: QueueLocation
}

export function useQueueV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const locations = ref<QueueLocation[]>([])
  const myTickets = ref<QueueTicket[]>([])
  const currentTicket = ref<QueueTicket | null>(null)

  const featuredLocations = computed(() => locations.value.filter(l => l.is_featured))
  const activeTickets = computed(() => myTickets.value.filter(t => t.status === 'waiting' || t.status === 'called'))

  const fetchLocations = async (type?: string) => {
    try {
      let query = supabase.from('queue_locations').select('*').eq('is_active', true)
      if (type) query = query.eq('location_type', type)
      const { data, error } = await query.order('is_featured', { ascending: false })
      if (error) throw error
      locations.value = data || []
    } catch (e) {
      console.error('Fetch locations error:', e)
    }
  }

  const getTicket = async (locationId: string): Promise<QueueTicket | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error } = await supabase.rpc('get_queue_ticket', {
        p_user_id: authStore.user.id,
        p_location_id: locationId
      })
      if (error) throw error
      const ticket = data?.[0]
      if (ticket) {
        currentTicket.value = {
          id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          queue_position: ticket.queue_position,
          estimated_call_time: ticket.estimated_call_time,
          status: 'waiting'
        }
        return currentTicket.value
      }
      return null
    } catch (e) {
      console.error('Get ticket error:', e)
      return null
    }
  }

  const fetchMyTickets = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error } = await supabase
        .from('queue_tickets')
        .select('*, location:queue_locations(*)')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      myTickets.value = data || []
    } catch (e) {
      console.error('Fetch tickets error:', e)
    }
  }

  const cancelTicket = async (ticketId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('update_queue_ticket_status', {
        p_ticket_id: ticketId,
        p_status: 'cancelled'
      })
      if (error) throw error
      await fetchMyTickets()
      return data || false
    } catch (e) {
      console.error('Cancel ticket error:', e)
      return false
    }
  }

  const getQueueStatus = async (locationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_queue_status', { p_location_id: locationId })
      if (error) throw error
      return data?.[0] || null
    } catch (e) {
      console.error('Get queue status error:', e)
      return null
    }
  }

  return {
    loading, locations, myTickets, currentTicket,
    featuredLocations, activeTickets,
    fetchLocations, getTicket, fetchMyTickets, cancelTicket, getQueueStatus
  }
}
