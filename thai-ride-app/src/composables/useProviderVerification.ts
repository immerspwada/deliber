/**
 * useProviderVerification - Provider Verification Workflow Composable
 * 
 * Feature: F14 - Enhanced Provider Verification
 * Tables: provider_verification_queue, provider_document_expiry, verification_checklist_templates, provider_verification_results
 * Migration: 057_provider_verification_workflow.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface VerificationQueueItem {
  id: string
  provider_id: string
  assigned_admin_id: string | null
  priority: number
  queue_position: number
  status: 'pending' | 'in_review' | 'completed' | 'escalated'
  notes: string | null
  estimated_review_time: string
  actual_review_time: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  provider?: any
}

export interface DocumentExpiry {
  id: string
  provider_id: string
  document_type: 'id_card' | 'license' | 'vehicle_registration' | 'insurance' | 'background_check'
  expiry_date: string
  reminder_sent_30d: boolean
  reminder_sent_7d: boolean
  reminder_sent_1d: boolean
  is_expired: boolean
  renewed_at: string | null
}

export interface ChecklistItem {
  key: string
  label: string
  required: boolean
  checked?: boolean
}

export interface VerificationResult {
  id: string
  provider_id: string
  admin_id: string | null
  checklist_results: Record<string, boolean>
  overall_result: 'approved' | 'rejected' | 'needs_revision'
  rejection_reasons: string[]
  revision_requests: string[]
  admin_notes: string | null
  verification_score: number | null
  created_at: string
}

export interface QueueStats {
  pending_count: number
  in_review_count: number
  completed_today: number
  avg_review_time: string | null
  oldest_pending_hours: number | null
}

export function useProviderVerification() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Queue data
  const queue = ref<VerificationQueueItem[]>([])
  const queueStats = ref<QueueStats | null>(null)
  
  // Current verification
  const currentItem = ref<VerificationQueueItem | null>(null)
  const checklist = ref<ChecklistItem[]>([])
  const checklistResults = ref<Record<string, boolean>>({})
  
  // Document expiry
  const expiringDocuments = ref<DocumentExpiry[]>([])
  
  // Computed
  const pendingCount = computed(() => queue.value.filter(q => q.status === 'pending').length)
  const inReviewCount = computed(() => queue.value.filter(q => q.status === 'in_review').length)
  
  const checklistComplete = computed(() => {
    const requiredItems = checklist.value.filter(item => item.required)
    return requiredItems.every(item => checklistResults.value[item.key] === true)
  })
  
  const verificationScore = computed(() => {
    const total = checklist.value.length
    if (total === 0) return 0
    const checked = Object.values(checklistResults.value).filter(v => v).length
    return Math.round((checked / total) * 100)
  })

  // Fetch verification queue
  const fetchQueue = async (status?: string) => {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('provider_verification_queue')
        .select(`
          *,
          provider:provider_id (
            id,
            provider_type,
            vehicle_type,
            vehicle_plate,
            documents,
            status,
            user_id,
            users:user_id (name, email, phone)
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
      
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error: err } = await query
      
      if (err) throw err
      queue.value = data || []
    } catch (e: any) {
      error.value = e.message
      // Mock data for demo
      queue.value = generateMockQueue()
    } finally {
      loading.value = false
    }
  }

  // Fetch queue statistics
  const fetchQueueStats = async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_verification_queue_stats')
      
      if (err) throw err
      queueStats.value = data?.[0] || null
    } catch {
      queueStats.value = {
        pending_count: 12,
        in_review_count: 3,
        completed_today: 8,
        avg_review_time: '00:25:00',
        oldest_pending_hours: 4.5
      }
    }
  }

  // Fetch checklist template
  const fetchChecklistTemplate = async (providerType: string) => {
    try {
      const { data, error: err } = await supabase
        .from('verification_checklist_templates')
        .select('checklist_items')
        .eq('provider_type', providerType)
        .eq('is_active', true)
        .single()
      
      if (err) throw err
      checklist.value = data?.checklist_items || []
      
      // Initialize results
      checklistResults.value = {}
      checklist.value.forEach(item => {
        checklistResults.value[item.key] = false
      })
    } catch {
      // Default checklist
      checklist.value = [
        { key: 'id_card_clear', label: 'บัตรประชาชนชัดเจน', required: true },
        { key: 'id_card_name_match', label: 'ชื่อตรงกับข้อมูลที่กรอก', required: true },
        { key: 'license_clear', label: 'ใบขับขี่ชัดเจน', required: true },
        { key: 'license_not_expired', label: 'ใบขับขี่ไม่หมดอายุ', required: true },
        { key: 'vehicle_photo_clear', label: 'รูปรถชัดเจน', required: true },
        { key: 'vehicle_plate_visible', label: 'เห็นทะเบียนชัดเจน', required: true }
      ]
      checklistResults.value = {}
      checklist.value.forEach(item => {
        checklistResults.value[item.key] = false
      })
    }
  }

  // Start verification (assign to admin)
  const startVerification = async (queueId: string, adminId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase.rpc('assign_verification_to_admin', {
        p_queue_id: queueId,
        p_admin_id: adminId
      })
      
      if (err) throw err
      
      // Fetch the item details
      const { data: itemData } = await supabase
        .from('provider_verification_queue')
        .select(`
          *,
          provider:provider_id (
            id,
            provider_type,
            vehicle_type,
            vehicle_plate,
            documents,
            status,
            user_id,
            users:user_id (name, email, phone)
          )
        `)
        .eq('id', queueId)
        .single()
      
      currentItem.value = itemData
      
      // Load checklist for provider type
      if (itemData?.provider?.provider_type) {
        await fetchChecklistTemplate(itemData.provider.provider_type)
      }
      
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Complete verification
  const completeVerification = async (
    queueId: string,
    result: 'approved' | 'rejected' | 'needs_revision',
    notes?: string
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase.rpc('complete_verification', {
        p_queue_id: queueId,
        p_result: result,
        p_checklist: checklistResults.value,
        p_notes: notes || null
      })
      
      if (err) throw err
      
      // Send notification to provider
      if (currentItem.value?.provider?.user_id) {
        const notifications = {
          approved: {
            title: 'ยินดีด้วย! ใบสมัครได้รับการอนุมัติ',
            message: 'คุณสามารถเริ่มรับงานได้แล้ว เปิดสถานะออนไลน์เพื่อเริ่มต้น'
          },
          rejected: {
            title: 'ใบสมัครไม่ผ่านการอนุมัติ',
            message: notes || 'กรุณาตรวจสอบข้อมูลและสมัครใหม่อีกครั้ง'
          },
          needs_revision: {
            title: 'กรุณาแก้ไขเอกสาร',
            message: notes || 'มีเอกสารบางรายการที่ต้องแก้ไข กรุณาตรวจสอบและอัพโหลดใหม่'
          }
        }
        
        await supabase.from('user_notifications').insert({
          user_id: currentItem.value.provider.user_id,
          type: result === 'approved' ? 'success' : 'system',
          title: notifications[result].title,
          message: notifications[result].message,
          action_url: '/provider'
        })
      }
      
      currentItem.value = null
      checklistResults.value = {}
      
      // Refresh queue
      await fetchQueue()
      await fetchQueueStats()
      
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Escalate verification
  const escalateVerification = async (queueId: string, reason: string) => {
    loading.value = true
    
    try {
      await supabase
        .from('provider_verification_queue')
        .update({
          status: 'escalated',
          priority: 10,
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId)
      
      await fetchQueue()
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch expiring documents
  const fetchExpiringDocuments = async (daysAhead: number = 30) => {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)
      
      const { data, error: err } = await supabase
        .from('provider_document_expiry')
        .select(`
          *,
          provider:provider_id (
            id,
            users:user_id (name, email)
          )
        `)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .eq('is_expired', false)
        .order('expiry_date', { ascending: true })
      
      if (err) throw err
      expiringDocuments.value = data || []
    } catch {
      expiringDocuments.value = []
    }
  }

  // Add document expiry tracking
  const addDocumentExpiry = async (
    providerId: string,
    documentType: DocumentExpiry['document_type'],
    expiryDate: string
  ) => {
    try {
      const { error: err } = await supabase
        .from('provider_document_expiry')
        .upsert({
          provider_id: providerId,
          document_type: documentType,
          expiry_date: expiryDate,
          is_expired: false,
          reminder_sent_30d: false,
          reminder_sent_7d: false,
          reminder_sent_1d: false
        }, {
          onConflict: 'provider_id,document_type'
        })
      
      if (err) throw err
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // Run expiry check (admin function)
  const runExpiryCheck = async () => {
    try {
      const { data, error: err } = await supabase.rpc('check_document_expiry_reminders')
      if (err) throw err
      return { success: true, reminders_sent: data }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // Get verification history for provider
  const getVerificationHistory = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('provider_verification_results')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      return data || []
    } catch {
      return []
    }
  }

  // Toggle checklist item
  const toggleChecklistItem = (key: string) => {
    checklistResults.value[key] = !checklistResults.value[key]
  }

  // Check all items
  const checkAllItems = () => {
    checklist.value.forEach(item => {
      checklistResults.value[item.key] = true
    })
  }

  // Uncheck all items
  const uncheckAllItems = () => {
    checklist.value.forEach(item => {
      checklistResults.value[item.key] = false
    })
  }

  // Mock data generator
  const generateMockQueue = (): VerificationQueueItem[] => [
    {
      id: '1',
      provider_id: 'p1',
      assigned_admin_id: null,
      priority: 0,
      queue_position: 1,
      status: 'pending',
      notes: null,
      estimated_review_time: '00:30:00',
      actual_review_time: null,
      started_at: null,
      completed_at: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      provider: {
        id: 'p1',
        provider_type: 'driver',
        vehicle_type: 'Toyota Vios',
        vehicle_plate: 'กข 1234',
        documents: { id_card: 'pending', license: 'pending', vehicle: 'pending' },
        status: 'pending',
        users: { name: 'สมชาย ใจดี', email: 'somchai@email.com', phone: '0812345678' }
      }
    },
    {
      id: '2',
      provider_id: 'p2',
      assigned_admin_id: 'admin1',
      priority: 5,
      queue_position: 2,
      status: 'in_review',
      notes: null,
      estimated_review_time: '00:30:00',
      actual_review_time: null,
      started_at: new Date(Date.now() - 900000).toISOString(),
      completed_at: null,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      provider: {
        id: 'p2',
        provider_type: 'rider',
        vehicle_type: 'Honda PCX',
        vehicle_plate: 'ขค 5678',
        documents: { id_card: 'verified', license: 'pending', vehicle: 'pending' },
        status: 'pending',
        users: { name: 'วีระ ส่งไว', email: 'weera@email.com', phone: '0823456789' }
      }
    }
  ]

  return {
    // State
    loading,
    error,
    queue,
    queueStats,
    currentItem,
    checklist,
    checklistResults,
    expiringDocuments,
    
    // Computed
    pendingCount,
    inReviewCount,
    checklistComplete,
    verificationScore,
    
    // Methods
    fetchQueue,
    fetchQueueStats,
    fetchChecklistTemplate,
    startVerification,
    completeVerification,
    escalateVerification,
    fetchExpiringDocuments,
    addDocumentExpiry,
    runExpiryCheck,
    getVerificationHistory,
    toggleChecklistItem,
    checkAllItems,
    uncheckAllItems
  }
}
