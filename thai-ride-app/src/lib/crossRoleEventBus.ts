/**
 * Cross-Role Event Bus - Unified Event System
 * F174 - Cross-Role Event Communication
 * 
 * ระบบ Event กลางที่ทำให้ทุก Role (Customer, Provider, Admin) 
 * สามารถสื่อสารและ sync ข้อมูลกันได้อย่างมีประสิทธิภาพ
 */

import { ref, readonly, shallowRef } from 'vue'
import type { ServiceType, RequestStatus } from './serviceRegistry'

// Event Types
export type CrossRoleEventType =
  // Request Lifecycle Events
  | 'request:created'
  | 'request:matched'
  | 'request:status_changed'
  | 'request:completed'
  | 'request:cancelled'
  // Provider Events
  | 'provider:online'
  | 'provider:offline'
  | 'provider:location_updated'
  | 'provider:job_accepted'
  | 'provider:job_completed'
  // Customer Events
  | 'customer:rating_submitted'
  | 'customer:payment_completed'
  // Admin Events
  | 'admin:status_override'
  | 'admin:refund_issued'
  | 'admin:provider_suspended'
  // System Events
  | 'system:realtime_connected'
  | 'system:realtime_disconnected'
  | 'system:error'

export type UserRole = 'customer' | 'provider' | 'admin' | 'system'

export interface CrossRoleEvent<T = any> {
  type: CrossRoleEventType
  payload: T
  source: {
    role: UserRole
    userId?: string
  }
  target?: {
    roles: UserRole[]
    userIds?: string[]
  }
  metadata: {
    timestamp: string
    requestId?: string
    serviceType?: ServiceType
    correlationId: string
  }
}

// Specific Event Payloads
export interface RequestCreatedPayload {
  requestId: string
  trackingId: string
  serviceType: ServiceType
  customerId: string
  pickupLat: number
  pickupLng: number
  estimatedFare: number
}

export interface RequestMatchedPayload {
  requestId: string
  serviceType: ServiceType
  customerId: string
  providerId: string
  providerName: string
  providerPhone: string
  vehiclePlate?: string
  estimatedArrival?: number
}

export interface StatusChangedPayload {
  requestId: string
  serviceType: ServiceType
  oldStatus: RequestStatus
  newStatus: RequestStatus
  changedBy: UserRole
  changedById: string
  reason?: string
}

export interface RequestCompletedPayload {
  requestId: string
  serviceType: ServiceType
  customerId: string
  providerId: string
  finalFare: number
  providerEarnings: number
  platformFee: number
  duration: number
}

export interface ProviderLocationPayload {
  providerId: string
  lat: number
  lng: number
  heading?: number
  speed?: number
  accuracy?: number
}

type EventCallback<T = any> = (event: CrossRoleEvent<T>) => void | Promise<void>

interface Subscription {
  id: string
  eventType: CrossRoleEventType | '*'
  callback: EventCallback
  filter?: {
    roles?: UserRole[]
    serviceTypes?: ServiceType[]
    requestIds?: string[]
  }
}

// Event Bus Singleton
class CrossRoleEventBus {
  private subscriptions = new Map<string, Subscription>()
  private eventHistory = shallowRef<CrossRoleEvent[]>([])
  private maxHistorySize = 100
  private isConnected = ref(false)
  private currentRole = ref<UserRole>('customer')
  private currentUserId = ref<string | null>(null)

  // Generate unique correlation ID
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Set current user context
  setContext(role: UserRole, userId: string | null) {
    this.currentRole.value = role
    this.currentUserId.value = userId
  }

  // Subscribe to events
  subscribe<T = any>(
    eventType: CrossRoleEventType | '*',
    callback: EventCallback<T>,
    filter?: Subscription['filter']
  ): () => void {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscriptions.set(id, {
      id,
      eventType,
      callback: callback as EventCallback,
      filter
    })

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id)
    }
  }

  // Emit event
  async emit<T>(
    type: CrossRoleEventType,
    payload: T,
    options?: {
      targetRoles?: UserRole[]
      targetUserIds?: string[]
      requestId?: string
      serviceType?: ServiceType
    }
  ): Promise<void> {
    const event: CrossRoleEvent<T> = {
      type,
      payload,
      source: {
        role: this.currentRole.value,
        userId: this.currentUserId.value || undefined
      },
      target: options?.targetRoles || options?.targetUserIds ? {
        roles: options.targetRoles || [],
        userIds: options.targetUserIds
      } : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: options?.requestId,
        serviceType: options?.serviceType,
        correlationId: this.generateCorrelationId()
      }
    }

    // Add to history
    this.addToHistory(event)

    // Notify subscribers
    await this.notifySubscribers(event)
  }

  // Notify all matching subscribers
  private async notifySubscribers(event: CrossRoleEvent): Promise<void> {
    const promises: Promise<void>[] = []

    for (const subscription of this.subscriptions.values()) {
      if (this.shouldNotify(subscription, event)) {
        promises.push(
          Promise.resolve(subscription.callback(event)).catch(err => {
            console.error(`[EventBus] Subscriber error:`, err)
          })
        )
      }
    }

    await Promise.all(promises)
  }

  // Check if subscription should receive event
  private shouldNotify(subscription: Subscription, event: CrossRoleEvent): boolean {
    // Check event type match
    if (subscription.eventType !== '*' && subscription.eventType !== event.type) {
      return false
    }

    // Check target roles
    if (event.target?.roles?.length) {
      if (!event.target.roles.includes(this.currentRole.value)) {
        return false
      }
    }

    // Check target user IDs
    if (event.target?.userIds?.length && this.currentUserId.value) {
      if (!event.target.userIds.includes(this.currentUserId.value)) {
        return false
      }
    }

    // Check subscription filters
    if (subscription.filter) {
      if (subscription.filter.roles?.length) {
        if (!subscription.filter.roles.includes(event.source.role)) {
          return false
        }
      }
      if (subscription.filter.serviceTypes?.length && event.metadata.serviceType) {
        if (!subscription.filter.serviceTypes.includes(event.metadata.serviceType)) {
          return false
        }
      }
      if (subscription.filter.requestIds?.length && event.metadata.requestId) {
        if (!subscription.filter.requestIds.includes(event.metadata.requestId)) {
          return false
        }
      }
    }

    return true
  }

  // Add event to history
  private addToHistory(event: CrossRoleEvent): void {
    const history = [...this.eventHistory.value, event]
    if (history.length > this.maxHistorySize) {
      history.shift()
    }
    this.eventHistory.value = history
  }

  // Get event history
  getHistory(filter?: {
    type?: CrossRoleEventType
    requestId?: string
    limit?: number
  }): CrossRoleEvent[] {
    let history = this.eventHistory.value

    if (filter?.type) {
      history = history.filter(e => e.type === filter.type)
    }
    if (filter?.requestId) {
      history = history.filter(e => e.metadata.requestId === filter.requestId)
    }
    if (filter?.limit) {
      history = history.slice(-filter.limit)
    }

    return history
  }

  // Clear history
  clearHistory(): void {
    this.eventHistory.value = []
  }

  // Connection status
  setConnected(connected: boolean): void {
    this.isConnected.value = connected
    this.emit(
      connected ? 'system:realtime_connected' : 'system:realtime_disconnected',
      { connected }
    )
  }

  // Getters
  get connected() {
    return readonly(this.isConnected)
  }

  get role() {
    return readonly(this.currentRole)
  }

  get userId() {
    return readonly(this.currentUserId)
  }

  get history() {
    return readonly(this.eventHistory)
  }
}

// Singleton instance
export const eventBus = new CrossRoleEventBus()

// Vue composable
export function useCrossRoleEvents() {
  return {
    subscribe: eventBus.subscribe.bind(eventBus),
    emit: eventBus.emit.bind(eventBus),
    setContext: eventBus.setContext.bind(eventBus),
    getHistory: eventBus.getHistory.bind(eventBus),
    connected: eventBus.connected,
    role: eventBus.role,
    userId: eventBus.userId,
    history: eventBus.history
  }
}

// Helper functions for common events
export const CrossRoleEvents = {
  // Request created - notify providers
  requestCreated(payload: RequestCreatedPayload) {
    return eventBus.emit('request:created', payload, {
      targetRoles: ['provider', 'admin'],
      requestId: payload.requestId,
      serviceType: payload.serviceType
    })
  },

  // Request matched - notify customer
  requestMatched(payload: RequestMatchedPayload) {
    return eventBus.emit('request:matched', payload, {
      targetRoles: ['customer', 'admin'],
      targetUserIds: [payload.customerId],
      requestId: payload.requestId,
      serviceType: payload.serviceType
    })
  },

  // Status changed - notify all parties
  statusChanged(payload: StatusChangedPayload, customerId: string, providerId?: string) {
    const targetUserIds = [customerId]
    if (providerId) targetUserIds.push(providerId)
    
    return eventBus.emit('request:status_changed', payload, {
      targetRoles: ['customer', 'provider', 'admin'],
      targetUserIds,
      requestId: payload.requestId,
      serviceType: payload.serviceType
    })
  },

  // Request completed - notify all parties
  requestCompleted(payload: RequestCompletedPayload) {
    return eventBus.emit('request:completed', payload, {
      targetRoles: ['customer', 'provider', 'admin'],
      targetUserIds: [payload.customerId, payload.providerId],
      requestId: payload.requestId,
      serviceType: payload.serviceType
    })
  },

  // Provider location update - notify customer
  providerLocationUpdated(payload: ProviderLocationPayload, customerId: string, requestId: string) {
    return eventBus.emit('provider:location_updated', payload, {
      targetRoles: ['customer'],
      targetUserIds: [customerId],
      requestId
    })
  },

  // System error
  systemError(error: Error, context?: Record<string, any>) {
    return eventBus.emit('system:error', {
      message: error.message,
      stack: error.stack,
      context
    })
  }
}
