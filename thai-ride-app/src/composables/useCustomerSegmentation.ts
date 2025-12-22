/**
 * useCustomerSegmentation - Customer Segmentation & Targeting
 * Feature: F183 - Customer Segmentation System
 * Tables: customer_segments, customer_segment_members
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface CustomerSegment {
  id: string
  name: string
  name_th: string
  description?: string
  segment_type: 'static' | 'dynamic'
  criteria?: SegmentCriteria
  member_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SegmentCriteria {
  min_rides?: number
  max_rides?: number
  min_spending?: number
  max_spending?: number
  last_active_days?: number
  registration_days?: number
  has_wallet?: boolean
  loyalty_tier?: string
  provider_types_used?: string[]
}

export interface SegmentMember {
  id: string
  segment_id: string
  user_id: string
  added_at: string
  user?: { first_name: string; last_name: string; phone_number: string }
}

export function useCustomerSegmentation() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const segments = ref<CustomerSegment[]>([])
  const members = ref<SegmentMember[]>([])

  const activeSegments = computed(() => segments.value.filter(s => s.is_active))
  const totalMembers = computed(() => segments.value.reduce((sum, s) => sum + s.member_count, 0))

  const fetchSegments = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('customer_segments')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      segments.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchSegmentMembers = async (segmentId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('customer_segment_members')
        .select('*, user:users(first_name, last_name, phone_number)')
        .eq('segment_id', segmentId)
        .limit(100)
      if (err) throw err
      members.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createSegment = async (segment: Partial<CustomerSegment>): Promise<CustomerSegment | null> => {
    try {
      const { data, error: err } = await supabase
        .from('customer_segments')
        .insert({ ...segment, member_count: 0 } as never)
        .select()
        .single()
      if (err) throw err
      segments.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateSegment = async (id: string, updates: Partial<CustomerSegment>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('customer_segments')
        .update({ ...updates, updated_at: new Date().toISOString() } as never)
        .eq('id', id)
      if (err) throw err
      const idx = segments.value.findIndex(s => s.id === id)
      if (idx !== -1) segments.value[idx] = { ...segments.value[idx], ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteSegment = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('customer_segments').delete().eq('id', id)
      if (err) throw err
      segments.value = segments.value.filter(s => s.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const addMemberToSegment = async (segmentId: string, userId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('customer_segment_members')
        .insert({ segment_id: segmentId, user_id: userId } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const removeMemberFromSegment = async (segmentId: string, userId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('customer_segment_members')
        .delete()
        .eq('segment_id', segmentId)
        .eq('user_id', userId)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const refreshDynamicSegment = async (segmentId: string): Promise<number> => {
    try {
      const { data, error: err } = await supabase.rpc('refresh_dynamic_segment', { p_segment_id: segmentId })
      if (err) throw err
      return data || 0
    } catch (e: any) { error.value = e.message; return 0 }
  }

  const getSegmentTypeText = (type: string) => ({ static: 'กำหนดเอง', dynamic: 'อัตโนมัติ' }[type] || type)

  return {
    loading, error, segments, members, activeSegments, totalMembers,
    fetchSegments, fetchSegmentMembers, createSegment, updateSegment,
    deleteSegment, addMemberToSegment, removeMemberFromSegment,
    refreshDynamicSegment, getSegmentTypeText
  }
}
