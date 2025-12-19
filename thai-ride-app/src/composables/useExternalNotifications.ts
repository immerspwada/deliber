/**
 * useExternalNotifications - Email/SMS Notification System
 * Feature: External notifications for provider status changes
 * 
 * Note: This composable provides the interface for sending Email/SMS.
 * Actual sending requires integration with:
 * - Email: Supabase Edge Function + SendGrid/Resend/etc.
 * - SMS: Supabase Edge Function + Twilio/etc.
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface NotificationPayload {
  userId: string
  type: 'email' | 'sms' | 'both'
  template: string
  data: Record<string, any>
}

export interface NotificationTemplate {
  id: string
  name: string
  subject?: string
  emailBody?: string
  smsBody?: string
}

// Notification templates
const templates: Record<string, NotificationTemplate> = {
  provider_approved: {
    id: 'provider_approved',
    name: 'Provider Approved',
    subject: 'ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว - GOBEAR',
    emailBody: `
      <h2>ยินดีด้วย! 🎉</h2>
      <p>สวัสดีคุณ {{name}},</p>
      <p>ใบสมัครเป็นผู้ให้บริการของคุณได้รับการอนุมัติแล้ว!</p>
      <p>คุณสามารถเริ่มรับงานได้ทันทีโดย:</p>
      <ol>
        <li>เปิดแอป GOBEAR</li>
        <li>ไปที่หน้า Dashboard</li>
        <li>เปิดสถานะ "ออนไลน์"</li>
      </ol>
      <p>ขอให้โชคดีกับการทำงาน!</p>
      <p>ทีมงาน GOBEAR</p>
    `,
    smsBody: 'GOBEAR: ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว เปิดแอปเพื่อเริ่มรับงานได้เลย'
  },
  provider_rejected: {
    id: 'provider_rejected',
    name: 'Provider Rejected',
    subject: 'แจ้งผลการพิจารณาใบสมัคร - GOBEAR',
    emailBody: `
      <h2>แจ้งผลการพิจารณา</h2>
      <p>สวัสดีคุณ {{name}},</p>
      <p>ขออภัย ใบสมัครของคุณไม่ผ่านการอนุมัติในครั้งนี้</p>
      {{#if reason}}
      <p><strong>เหตุผล:</strong> {{reason}}</p>
      {{/if}}
      <p>คุณสามารถแก้ไขเอกสารและส่งใหม่ได้ที่หน้า "จัดการเอกสาร" ในแอป</p>
      <p>หากมีข้อสงสัย กรุณาติดต่อฝ่ายสนับสนุน</p>
      <p>ทีมงาน GOBEAR</p>
    `,
    smsBody: 'GOBEAR: ใบสมัครของคุณไม่ผ่านการอนุมัติ {{reason}} กรุณาแก้ไขเอกสารและส่งใหม่ในแอป'
  },
  provider_suspended: {
    id: 'provider_suspended',
    name: 'Provider Suspended',
    subject: 'แจ้งการระงับบัญชีชั่วคราว - GOBEAR',
    emailBody: `
      <h2>แจ้งการระงับบัญชี</h2>
      <p>สวัสดีคุณ {{name}},</p>
      <p>บัญชีผู้ให้บริการของคุณถูกระงับชั่วคราว</p>
      {{#if reason}}
      <p><strong>เหตุผล:</strong> {{reason}}</p>
      {{/if}}
      <p>กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม</p>
      <p>ทีมงาน GOBEAR</p>
    `,
    smsBody: 'GOBEAR: บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อฝ่ายสนับสนุน'
  },
  document_approved: {
    id: 'document_approved',
    name: 'Document Approved',
    subject: 'เอกสารผ่านการตรวจสอบ - GOBEAR',
    emailBody: `
      <p>สวัสดีคุณ {{name}},</p>
      <p>{{documentName}} ของคุณผ่านการตรวจสอบแล้ว</p>
      <p>ทีมงาน GOBEAR</p>
    `,
    smsBody: 'GOBEAR: {{documentName}} ของคุณผ่านการตรวจสอบแล้ว'
  },
  document_rejected: {
    id: 'document_rejected',
    name: 'Document Rejected',
    subject: 'เอกสารไม่ผ่านการตรวจสอบ - GOBEAR',
    emailBody: `
      <p>สวัสดีคุณ {{name}},</p>
      <p>{{documentName}} ของคุณไม่ผ่านการตรวจสอบ</p>
      {{#if reason}}
      <p><strong>เหตุผล:</strong> {{reason}}</p>
      {{/if}}
      <p>กรุณาอัพโหลดเอกสารใหม่ในแอป</p>
      <p>ทีมงาน GOBEAR</p>
    `,
    smsBody: 'GOBEAR: {{documentName}} ไม่ผ่านการตรวจสอบ กรุณาอัพโหลดใหม่ในแอป'
  }
}

export function useExternalNotifications() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Replace template variables with actual data
   */
  const parseTemplate = (template: string, data: Record<string, any>): string => {
    let result = template
    
    // Replace simple variables {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value?.toString() || '')
    })
    
    // Handle conditional blocks {{#if variable}}...{{/if}}
    const conditionalRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g
    result = result.replace(conditionalRegex, (_, variable, content) => {
      return data[variable] ? content : ''
    })
    
    return result
  }

  /**
   * Get user contact info
   */
  const getUserContactInfo = async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('email, phone, phone_number, name, first_name, last_name')
      .eq('id', userId)
      .single()
    
    if (fetchError) throw fetchError
    
    const userData = data as any
    return {
      email: userData?.email,
      phone: userData?.phone || userData?.phone_number,
      name: userData?.name || `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'ผู้ใช้'
    }
  }

  /**
   * Queue notification for sending via Edge Function
   */
  const queueNotification = async (payload: {
    userId: string
    channel: 'email' | 'sms'
    to: string
    subject?: string
    body: string
    templateId: string
    data: Record<string, any>
  }) => {
    // Insert into notification queue table
    const { error: insertError } = await (supabase
      .from('external_notification_queue') as any)
      .insert({
        user_id: payload.userId,
        channel: payload.channel,
        recipient: payload.to,
        subject: payload.subject,
        body: payload.body,
        template_id: payload.templateId,
        metadata: payload.data,
        status: 'pending'
      })
    
    if (insertError) {
      // If table doesn't exist, log to console (for development)
      console.log(`[${payload.channel.toUpperCase()}] Would send to ${payload.to}:`, payload.body)
      return { success: true, queued: false }
    }
    
    return { success: true, queued: true }
  }

  /**
   * Send notification using template
   */
  const sendNotification = async (
    userId: string,
    templateId: string,
    data: Record<string, any> = {},
    channels: ('email' | 'sms')[] = ['email', 'sms']
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const template = templates[templateId]
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }
      
      const userInfo = await getUserContactInfo(userId)
      const templateData = { ...data, name: userInfo.name }
      
      const results: { email?: boolean; sms?: boolean } = {}
      
      // Send email
      if (channels.includes('email') && userInfo.email && template.emailBody) {
        const emailBody = parseTemplate(template.emailBody, templateData)
        const subject = parseTemplate(template.subject || '', templateData)
        
        await queueNotification({
          userId,
          channel: 'email',
          to: userInfo.email,
          subject,
          body: emailBody,
          templateId,
          data: templateData
        })
        results.email = true
      }
      
      // Send SMS
      if (channels.includes('sms') && userInfo.phone && template.smsBody) {
        const smsBody = parseTemplate(template.smsBody, templateData)
        
        await queueNotification({
          userId,
          channel: 'sms',
          to: userInfo.phone,
          body: smsBody,
          templateId,
          data: templateData
        })
        results.sms = true
      }
      
      return results
    } catch (err: any) {
      error.value = err.message
      console.error('Send notification error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Send provider approval notification
   */
  const sendProviderApprovalNotification = async (userId: string) => {
    return sendNotification(userId, 'provider_approved')
  }

  /**
   * Send provider rejection notification
   */
  const sendProviderRejectionNotification = async (userId: string, reason?: string) => {
    return sendNotification(userId, 'provider_rejected', { reason })
  }

  /**
   * Send provider suspension notification
   */
  const sendProviderSuspensionNotification = async (userId: string, reason?: string) => {
    return sendNotification(userId, 'provider_suspended', { reason })
  }

  /**
   * Send document status notification
   */
  const sendDocumentNotification = async (
    userId: string,
    documentName: string,
    approved: boolean,
    reason?: string
  ) => {
    const templateId = approved ? 'document_approved' : 'document_rejected'
    return sendNotification(userId, templateId, { documentName, reason })
  }

  return {
    loading,
    error,
    templates,
    sendNotification,
    sendProviderApprovalNotification,
    sendProviderRejectionNotification,
    sendProviderSuspensionNotification,
    sendDocumentNotification
  }
}
