/**
 * Authentication Middleware
 * 
 * Handles authentication checks and user session management
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import type { Result } from '../utils/result'

export interface AuthContext {
  userId: string
  userRole: string
  isAuthenticated: boolean
  sessionId?: string
}

export class AuthMiddleware {
  /**
   * Verify user authentication
   */
  static async verifyAuth(): Promise<Result<AuthContext>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw new Error(`Authentication error: ${error.message}`)
      }
      
      if (!session) {
        return {
          success: false,
          error: new Error('No active session') as any
        }
      }
      
      const user = session.user
      const userRole = user.user_metadata?.role || 'customer'
      
      return {
        success: true,
        data: {
          userId: user.id,
          userRole,
          isAuthenticated: true,
          sessionId: session.access_token
        }
      }
    } catch (error) {
      logger.error('[AuthMiddleware] Authentication verification failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
  
  /**
   * Verify admin authentication
   */
  static async verifyAdminAuth(): Promise<Result<AuthContext>> {
    try {
      const authResult = await this.verifyAuth()
      
      if (!authResult.success) {
        return authResult
      }
      
      const { userRole } = authResult.data
      
      if (userRole !== 'admin') {
        return {
          success: false,
          error: new Error('Insufficient permissions: Admin access required') as any
        }
      }
      
      return authResult
    } catch (error) {
      logger.error('[AuthMiddleware] Admin authentication verification failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
  
  /**
   * Verify provider authentication
   */
  static async verifyProviderAuth(): Promise<Result<AuthContext & { providerId?: string }>> {
    try {
      const authResult = await this.verifyAuth()
      
      if (!authResult.success) {
        return authResult
      }
      
      const { userId, userRole } = authResult.data
      
      if (userRole !== 'provider') {
        return {
          success: false,
          error: new Error('Insufficient permissions: Provider access required') as any
        }
      }
      
      // Get provider ID
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      return {
        success: true,
        data: {
          ...authResult.data,
          providerId: provider?.id
        }
      }
    } catch (error) {
      logger.error('[AuthMiddleware] Provider authentication verification failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
  
  /**
   * Check if user has permission for resource
   */
  static async checkResourcePermission(
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<Result<boolean>> {
    try {
      const authResult = await this.verifyAuth()
      
      if (!authResult.success) {
        return {
          success: false,
          error: new Error('Authentication required') as any
        }
      }
      
      const { userId, userRole } = authResult.data
      
      // Admin has access to everything
      if (userRole === 'admin') {
        return { success: true, data: true }
      }
      
      // Check resource-specific permissions
      const hasPermission = await this.checkSpecificPermission(
        userId,
        userRole,
        resourceType,
        resourceId,
        action
      )
      
      return { success: true, data: hasPermission }
    } catch (error) {
      logger.error('[AuthMiddleware] Permission check failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
  
  /**
   * Check specific resource permission
   */
  private static async checkSpecificPermission(
    userId: string,
    userRole: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    switch (resourceType) {
      case 'ride_request':
        return this.checkRidePermission(userId, userRole, resourceId, action)
      
      case 'delivery_request':
        return this.checkDeliveryPermission(userId, userRole, resourceId, action)
      
      case 'user':
        return this.checkUserPermission(userId, userRole, resourceId, action)
      
      case 'provider':
        return this.checkProviderPermission(userId, userRole, resourceId, action)
      
      default:
        return false
    }
  }
  
  /**
   * Check ride request permission
   */
  private static async checkRidePermission(
    userId: string,
    userRole: string,
    rideId: string,
    action: string
  ): Promise<boolean> {
    try {
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('user_id, provider_id')
        .eq('id', rideId)
        .single()
      
      if (!ride) return false
      
      // Customer can access their own rides
      if (userRole === 'customer' && ride.user_id === userId) {
        return action === 'read' || action === 'write'
      }
      
      // Provider can access assigned rides
      if (userRole === 'provider') {
        const { data: provider } = await supabase
          .from('service_providers')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (provider && ride.provider_id === provider.id) {
          return action === 'read' || action === 'write'
        }
      }
      
      return false
    } catch {
      return false
    }
  }
  
  /**
   * Check delivery request permission
   */
  private static async checkDeliveryPermission(
    userId: string,
    userRole: string,
    deliveryId: string,
    action: string
  ): Promise<boolean> {
    try {
      const { data: delivery } = await supabase
        .from('delivery_requests')
        .select('user_id, provider_id')
        .eq('id', deliveryId)
        .single()
      
      if (!delivery) return false
      
      // Customer can access their own deliveries
      if (userRole === 'customer' && delivery.user_id === userId) {
        return action === 'read' || action === 'write'
      }
      
      // Provider can access assigned deliveries
      if (userRole === 'provider') {
        const { data: provider } = await supabase
          .from('service_providers')
          .select('id')
          .eq('user_id', userId)
          .single()
        
        if (provider && delivery.provider_id === provider.id) {
          return action === 'read' || action === 'write'
        }
      }
      
      return false
    } catch {
      return false
    }
  }
  
  /**
   * Check user permission
   */
  private static async checkUserPermission(
    userId: string,
    userRole: string,
    targetUserId: string,
    action: string
  ): Promise<boolean> {
    // Users can only access their own data
    return userId === targetUserId && (action === 'read' || action === 'write')
  }
  
  /**
   * Check provider permission
   */
  private static async checkProviderPermission(
    userId: string,
    userRole: string,
    providerId: string,
    action: string
  ): Promise<boolean> {
    if (userRole !== 'provider') return false
    
    try {
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userId)
        .eq('id', providerId)
        .single()
      
      return !!provider && (action === 'read' || action === 'write')
    } catch {
      return false
    }
  }
  
  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<Result<string>> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw new Error(`Token refresh failed: ${error.message}`)
      }
      
      if (!data.session) {
        throw new Error('No session after refresh')
      }
      
      return {
        success: true,
        data: data.session.access_token
      }
    } catch (error) {
      logger.error('[AuthMiddleware] Token refresh failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
  
  /**
   * Sign out user
   */
  static async signOut(): Promise<Result<boolean>> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new Error(`Sign out failed: ${error.message}`)
      }
      
      return { success: true, data: true }
    } catch (error) {
      logger.error('[AuthMiddleware] Sign out failed:', error)
      return {
        success: false,
        error: error as any
      }
    }
  }
}