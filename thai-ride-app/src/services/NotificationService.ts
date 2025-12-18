/**
 * Notification Service - การแจ้งเตือนที่ใส่ใจทุกรายละเอียด ✨
 * 
 * Feature: F07 - Notifications & Push
 * ออกแบบมาเพื่อให้ผู้ใช้รู้สึกถึงความใส่ใจและการดูแลอย่างพิเศษ
 */

import { BaseService } from './BaseService'
import { supabase } from '../lib/supabase'
import type { Result } from '../utils/result'

export interface NotificationTemplate {
  id: string
  name: string
  type: string
  title: string
  message: string
  icon?: string
  actionUrl?: string
  variables?: string[]
  isActive: boolean
  usageCount: number
}

export interface NotificationRequest {
  userId: string
  type: 'system' | 'promo' | 'ride' | 'delivery' | 'payment' | 'safety'
  title: string
  message: string
  icon?: string
  actionUrl?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  scheduledFor?: Date
  templateId?: string
  variables?: Record<string, string>
  channels?: ('in_app' | 'push' | 'sms' | 'email')[]
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: number
  image?: string
  url?: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  data?: Record<string, any>
}

export class NotificationService extends BaseService {
  constructor() {
    super('NotificationService')
  }

  /**
   * ส่งการแจ้งเตือนแบบสวยงามและใส่ใจ
   */
  async sendNotification(request: NotificationRequest): Promise<Result<{ notificationId: string; channels: string[] }>> {
    return this.execute(async () => {
      // เตรียมข้อมูลการแจ้งเตือนด้วยความใส่ใจ
      const notification = await this.prepareNotification(request)
      
      // ส่งผ่านช่องทางที่เหมาะสม
      const channels = request.channels || ['in_app', 'push']
      const results = []
      
      for (const channel of channels) {
        try {
          switch (channel) {
            case 'in_app':
              await this.sendInAppNotification(notification)
              results.push('in_app')
              break
            
            case 'push':
              await this.sendPushNotification(notification)
              results.push('push')
              break
            
            case 'sms':
              await this.sendSMSNotification(notification)
              results.push('sms')
              break
            
            case 'email':
              await this.sendEmailNotification(notification)
              results.push('email')
              break
          }
        } catch (error) {
          this.log('warn', `Failed to send ${channel} notification`, { 
            userId: request.userId,
            error: (error as Error).message 
          })
        }
      }
      
      // บันทึกสถิติการใช้งาน template
      if (request.templateId) {
        await this.incrementTemplateUsage(request.templateId)
      }
      
      this.log('info', '📬 Notification sent successfully', {
        userId: request.userId,
        type: request.type,
        channels: results,
        priority: request.priority || 'normal'
      })
      
      return {
        notificationId: notification.id,
        channels: results
      }
    }, 'sendNotification', { userId: request.userId, type: request.type })
  }

  /**
   * ส่งการแจ้งเตือนแบบกลุ่มอย่างมีสไตล์
   */
  async sendBulkNotification(
    userIds: string[],
    notification: Omit<NotificationRequest, 'userId'>,
    options?: {
      batchSize?: number
      delayBetweenBatches?: number
      personalizeMessage?: boolean
    }
  ): Promise<Result<{ sent: number; failed: number; details: Array<{ userId: string; success: boolean; error?: string }> }>> {
    return this.execute(async () => {
      const batchSize = options?.batchSize || 100
      const delay = options?.delayBetweenBatches || 1000
      const results: Array<{ userId: string; success: boolean; error?: string }> = []
      
      // แบ่งผู้ใช้เป็นกลุ่มเพื่อประสิทธิภาพ
      const batches = this.chunkArray(userIds, batchSize)
      
      this.log('info', '📢 Starting bulk notification', {
        totalUsers: userIds.length,
        batches: batches.length,
        batchSize
      })
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        
        // ส่งแบบ parallel ในแต่ละ batch
        const batchPromises = batch.map(async (userId) => {
          try {
            const personalizedNotification = options?.personalizeMessage
              ? await this.personalizeNotification(userId, notification)
              : notification
            
            await this.sendNotification({ ...personalizedNotification, userId })
            return { userId, success: true }
          } catch (error) {
            return { 
              userId, 
              success: false, 
              error: (error as Error).message 
            }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        // พักระหว่าง batch เพื่อไม่ให้ระบบล้น
        if (i < batches.length - 1) {
          await this.sleep(delay)
        }
        
        this.log('debug', `📦 Batch ${i + 1}/${batches.length} completed`, {
          batchSize: batch.length,
          successful: batchResults.filter(r => r.success).length
        })
      }
      
      const sent = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      this.log('info', '🎯 Bulk notification completed', {
        totalUsers: userIds.length,
        sent,
        failed,
        successRate: `${((sent / userIds.length) * 100).toFixed(1)}%`
      })
      
      return { sent, failed, details: results }
    }, 'sendBulkNotification', { userCount: userIds.length })
  }

  /**
   * สร้าง template การแจ้งเตือนที่สวยงาม
   */
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'usageCount'>): Promise<Result<NotificationTemplate>> {
    return this.execute(async () => {
      // ตรวจสอบตัวแปรใน template
      const variables = this.extractVariables(template.title + ' ' + template.message)
      
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          name: template.name,
          type: template.type,
          title: template.title,
          message: template.message,
          icon: template.icon,
          action_url: template.actionUrl,
          variables,
          is_active: template.isActive,
          usage_count: 0
        })
        .select()
        .single()
      
      if (error) throw error
      
      this.log('info', '📝 Notification template created', {
        templateName: template.name,
        type: template.type,
        variablesCount: variables.length
      })
      
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        title: data.title,
        message: data.message,
        icon: data.icon,
        actionUrl: data.action_url,
        variables: data.variables,
        isActive: data.is_active,
        usageCount: data.usage_count
      }
    }, 'createTemplate', { templateName: template.name })
  }

  /**
   * ส่งการแจ้งเตือนตามเหตุการณ์สำคัญ
   */
  async sendEventNotification(
    event: 'ride_matched' | 'delivery_completed' | 'payment_success' | 'promo_available' | 'safety_alert',
    userId: string,
    data: Record<string, any>
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const template = await this.getEventTemplate(event)
      if (!template) {
        throw new Error(`No template found for event: ${event}`)
      }
      
      // สร้างข้อความที่ปรับแต่งตามเหตุการณ์
      const personalizedNotification = this.processTemplate(template, data)
      
      // กำหนด priority และ channels ตามประเภทเหตุการณ์
      const eventConfig = this.getEventConfig(event)
      
      await this.sendNotification({
        userId,
        type: eventConfig.type,
        title: personalizedNotification.title,
        message: personalizedNotification.message,
        icon: personalizedNotification.icon,
        actionUrl: personalizedNotification.actionUrl,
        priority: eventConfig.priority,
        channels: eventConfig.channels,
        templateId: template.id
      })
      
      this.log('info', '🎪 Event notification sent', {
        event,
        userId,
        templateId: template.id
      })
      
      return true
    }, 'sendEventNotification', { event, userId })
  }

  /**
   * จัดการการแจ้งเตือนแบบ Smart Scheduling
   */
  async scheduleSmartNotification(
    userId: string,
    notification: Omit<NotificationRequest, 'userId'>,
    smartOptions: {
      respectQuietHours?: boolean
      optimizeForEngagement?: boolean
      avoidSpam?: boolean
      maxDailyNotifications?: number
    }
  ): Promise<Result<{ scheduledFor: Date; reason: string }>> {
    return this.execute(async () => {
      // ดึงข้อมูลผู้ใช้และประวัติการแจ้งเตือน
      const userPreferences = await this.getUserNotificationPreferences(userId)
      const recentNotifications = await this.getRecentNotifications(userId, 24) // 24 hours
      
      // คำนวณเวลาที่เหมาะสมที่สุด
      let scheduledFor = notification.scheduledFor || new Date()
      let reason = 'Immediate delivery'
      
      // เคารพ Quiet Hours
      if (smartOptions.respectQuietHours && userPreferences.quietHours) {
        const adjustedTime = this.adjustForQuietHours(scheduledFor, userPreferences.quietHours)
        if (adjustedTime.getTime() !== scheduledFor.getTime()) {
          scheduledFor = adjustedTime
          reason = 'Adjusted for quiet hours'
        }
      }
      
      // หลีกเลี่ยง Spam
      if (smartOptions.avoidSpam && smartOptions.maxDailyNotifications) {
        if (recentNotifications.length >= smartOptions.maxDailyNotifications) {
          // เลื่อนไปวันถัดไป
          scheduledFor = new Date(scheduledFor.getTime() + 24 * 60 * 60 * 1000)
          reason = 'Delayed to avoid spam'
        }
      }
      
      // Optimize for engagement
      if (smartOptions.optimizeForEngagement && userPreferences.activeHours) {
        const optimizedTime = this.optimizeForEngagement(scheduledFor, userPreferences.activeHours)
        if (optimizedTime.getTime() !== scheduledFor.getTime()) {
          scheduledFor = optimizedTime
          reason = 'Optimized for engagement'
        }
      }
      
      // บันทึกการแจ้งเตือนที่จัดตารางไว้
      await this.scheduleNotification({ ...notification, userId }, scheduledFor)
      
      this.log('info', '⏰ Smart notification scheduled', {
        userId,
        originalTime: notification.scheduledFor?.toISOString(),
        scheduledFor: scheduledFor.toISOString(),
        reason
      })
      
      return { scheduledFor, reason }
    }, 'scheduleSmartNotification', { userId })
  }

  /**
   * เตรียมข้อมูลการแจ้งเตือนด้วยความใส่ใจ
   */
  private async prepareNotification(request: NotificationRequest): Promise<any> {
    // ปรับแต่งข้อความตาม template ถ้ามี
    let title = request.title
    let message = request.message
    let icon = request.icon
    let actionUrl = request.actionUrl
    
    if (request.templateId && request.variables) {
      const template = await this.getTemplate(request.templateId)
      if (template) {
        const processed = this.processTemplate(template, request.variables)
        title = processed.title
        message = processed.message
        icon = processed.icon || icon
        actionUrl = processed.actionUrl || actionUrl
      }
    }
    
    // เพิ่ม emoji และสไตล์ตามประเภท
    const styledNotification = this.addNotificationStyle(request.type, title, message, icon)
    
    // บันทึกลงฐานข้อมูล
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: request.userId,
        type: request.type,
        title: styledNotification.title,
        message: styledNotification.message,
        icon: styledNotification.icon,
        action_url: actionUrl,
        priority: request.priority || 'normal',
        scheduled_for: request.scheduledFor?.toISOString(),
        is_read: false
      })
      .select()
      .single()
    
    if (error) throw error
    
    return data
  }

  /**
   * ส่งการแจ้งเตือนใน App
   */
  private async sendInAppNotification(notification: any): Promise<void> {
    // ส่งผ่าน Realtime
    await supabase
      .channel(`user:${notification.user_id}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: notification
      })
  }

  /**
   * ส่ง Push Notification ที่สวยงาม
   */
  private async sendPushNotification(notification: any): Promise<void> {
    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: notification.icon || '/pwa-192x192.png',
      badge: 1,
      url: notification.action_url,
      data: {
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority
      }
    }
    
    // เพิ่ม actions ตามประเภท
    if (notification.type === 'ride') {
      payload.actions = [
        { action: 'view', title: 'ดูรายละเอียด', icon: '/icons/view.png' },
        { action: 'track', title: 'ติดตาม', icon: '/icons/track.png' }
      ]
    }
    
    await supabase.functions.invoke('send-push', {
      body: {
        action: 'send_to_user',
        userId: notification.user_id,
        payload
      }
    })
  }

  /**
   * ส่ง SMS (สำหรับการแจ้งเตือนสำคัญ)
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    // Implementation for SMS service
    this.log('debug', '📱 SMS notification would be sent', {
      userId: notification.user_id,
      message: notification.message
    })
  }

  /**
   * ส่ง Email (สำหรับการแจ้งเตือนสำคัญ)
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    // Implementation for Email service
    this.log('debug', '📧 Email notification would be sent', {
      userId: notification.user_id,
      subject: notification.title
    })
  }

  /**
   * เพิ่มสไตล์และ emoji ให้การแจ้งเตือน
   */
  private addNotificationStyle(type: string, title: string, message: string, icon?: string): {
    title: string
    message: string
    icon: string
  } {
    const styles = {
      system: { emoji: '🔔', color: '#00A86B' },
      promo: { emoji: '🎉', color: '#F5A623' },
      ride: { emoji: '🚗', color: '#00A86B' },
      delivery: { emoji: '📦', color: '#00A86B' },
      payment: { emoji: '💳', color: '#00A86B' },
      safety: { emoji: '🚨', color: '#E53935' }
    }
    
    const style = styles[type as keyof typeof styles] || styles.system
    
    return {
      title: `${style.emoji} ${title}`,
      message,
      icon: icon || '/pwa-192x192.png'
    }
  }

  /**
   * ดึง template ตามเหตุการณ์
   */
  private async getEventTemplate(event: string): Promise<NotificationTemplate | null> {
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', event)
      .eq('is_active', true)
      .single()
    
    return data || null
  }

  /**
   * ประมวลผล template ด้วยตัวแปร
   */
  private processTemplate(template: NotificationTemplate, variables: Record<string, string>): {
    title: string
    message: string
    icon?: string
    actionUrl?: string
  } {
    let title = template.title
    let message = template.message
    
    // แทนที่ตัวแปรด้วยค่าจริง
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      title = title.replace(new RegExp(placeholder, 'g'), value)
      message = message.replace(new RegExp(placeholder, 'g'), value)
    })
    
    return {
      title,
      message,
      icon: template.icon,
      actionUrl: template.actionUrl
    }
  }

  /**
   * ดึงการตั้งค่าตามเหตุการณ์
   */
  private getEventConfig(event: string): {
    type: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    channels: ('in_app' | 'push' | 'sms' | 'email')[]
  } {
    const configs = {
      ride_matched: { type: 'ride', priority: 'high' as const, channels: ['in_app', 'push'] as const },
      delivery_completed: { type: 'delivery', priority: 'normal' as const, channels: ['in_app', 'push'] as const },
      payment_success: { type: 'payment', priority: 'normal' as const, channels: ['in_app'] as const },
      promo_available: { type: 'promo', priority: 'low' as const, channels: ['in_app'] as const },
      safety_alert: { type: 'safety', priority: 'urgent' as const, channels: ['in_app', 'push', 'sms'] as const }
    }
    
    return configs[event as keyof typeof configs] || configs.ride_matched
  }

  /**
   * Utility functions
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
  }

  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    
    return data || null
  }

  private async incrementTemplateUsage(templateId: string): Promise<void> {
    await supabase.rpc('use_notification_template', { p_template_id: templateId })
  }

  private async getUserNotificationPreferences(userId: string): Promise<any> {
    // Mock implementation - would fetch from user_preferences table
    return {
      quietHours: { start: '22:00', end: '08:00' },
      activeHours: { start: '09:00', end: '21:00' },
      timezone: 'Asia/Bangkok'
    }
  }

  private async getRecentNotifications(userId: string, hours: number): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
    
    return data || []
  }

  private adjustForQuietHours(scheduledFor: Date, quietHours: { start: string; end: string }): Date {
    // Implementation to adjust time if it falls within quiet hours
    return scheduledFor
  }

  private optimizeForEngagement(scheduledFor: Date, activeHours: { start: string; end: string }): Date {
    // Implementation to optimize delivery time for better engagement
    return scheduledFor
  }

  private async scheduleNotification(notification: NotificationRequest, scheduledFor: Date): Promise<void> {
    await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        scheduled_at: scheduledFor.toISOString(),
        status: 'scheduled'
      })
  }

  private async personalizeNotification(userId: string, notification: Omit<NotificationRequest, 'userId'>): Promise<Omit<NotificationRequest, 'userId'>> {
    // Get user data for personalization
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', userId)
      .single()
    
    if (user) {
      const userName = user.first_name || 'คุณ'
      return {
        ...notification,
        title: notification.title.replace('{{user_name}}', userName),
        message: notification.message.replace('{{user_name}}', userName)
      }
    }
    
    return notification
  }
}