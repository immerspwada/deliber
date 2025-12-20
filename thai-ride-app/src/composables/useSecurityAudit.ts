/**
 * Security Audit Composable
 * Production-ready security monitoring and audit logging
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface SecurityEvent {
  id: string
  event_type: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  details: Record<string, any>
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

export interface SecuritySummary {
  total_logins: number
  failed_logins: number
  high_risk_events: number
  active_sessions: number
  blocked_ips: number
}

export interface UserSession {
  id: string
  user_id: string
  device_info: Record<string, any>
  ip_address?: string
  last_activity: string
  expires_at: string
  is_active: boolean
  created_at: string
}

export function useSecurityAudit() {
  const securityEvents = ref<SecurityEvent[]>([])
  const securitySummary = ref<SecuritySummary | null>(null)
  const userSessions = ref<UserSession[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const highRiskEvents = computed(() => 
    securityEvents.value.filter(e => e.risk_level === 'high' || e.risk_level === 'critical')
  )

  const recentFailedLogins = computed(() =>
    securityEvents.value.filter(e => e.event_type === 'failed_login')
  )

  /**
   * Log security event
   */
  const logSecurityEvent = async (
    eventType: string,
    options?: {
      userId?: string
      ipAddress?: string
      userAgent?: string
      details?: Record<string, any>
      riskLevel?: 'low' | 'medium' | 'high' | 'critical'
    }
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('log_security_event', {
          p_event_type: eventType,
          p_user_id: options?.userId,
          p_ip_address: options?.ipAddress,
          p_user_agent: options?.userAgent || navigator.userAgent,
          p_details: options?.details || {},
          p_risk_level: options?.riskLevel || 'low'
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to log security event:', err)
      return null
    }
  }

  /**
   * Fetch security events
   */
  const fetchSecurityEvents = async (options?: {
    limit?: number
    riskLevel?: string
    eventType?: string
  }): Promise<SecurityEvent[]> => {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100)

      if (options?.riskLevel) {
        query = query.eq('risk_level', options.riskLevel)
      }

      if (options?.eventType) {
        query = query.eq('event_type', options.eventType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      securityEvents.value = data || []
      return securityEvents.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch security events:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get security summary
   */
  const fetchSecuritySummary = async (hours = 24): Promise<SecuritySummary | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_security_summary', { p_hours: hours })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        securitySummary.value = data[0]
        return securitySummary.value
      }
      return null
    } catch (err) {
      logger.error('Failed to fetch security summary:', err)
      return null
    }
  }

  /**
   * Check login attempts
   */
  const checkLoginAttempts = async (
    email: string,
    ipAddress?: string
  ): Promise<{ isLocked: boolean; attemptsRemaining: number; lockedUntil?: Date }> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_login_attempts', {
          p_email: email,
          p_ip_address: ipAddress
        })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        return {
          isLocked: data[0].is_locked,
          attemptsRemaining: data[0].attempts_remaining,
          lockedUntil: data[0].locked_until ? new Date(data[0].locked_until) : undefined
        }
      }

      return { isLocked: false, attemptsRemaining: 5 }
    } catch (err) {
      logger.error('Failed to check login attempts:', err)
      return { isLocked: false, attemptsRemaining: 5 }
    }
  }

  /**
   * Record failed login
   */
  const recordFailedLogin = async (
    email: string,
    ipAddress?: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('record_failed_login', {
          p_email: email,
          p_ip_address: ipAddress,
          p_user_agent: navigator.userAgent
        })

      if (rpcError) throw rpcError
      return data // Returns true if account is now locked
    } catch (err) {
      logger.error('Failed to record failed login:', err)
      return false
    }
  }

  /**
   * Clear failed logins (after successful login)
   */
  const clearFailedLogins = async (email: string): Promise<void> => {
    try {
      await supabase.rpc('clear_failed_logins', { p_email: email })
    } catch (err) {
      logger.error('Failed to clear failed logins:', err)
    }
  }

  /**
   * Check if IP is blacklisted
   */
  const isIpBlacklisted = async (ipAddress: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('is_ip_blacklisted', { p_ip_address: ipAddress })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to check IP blacklist:', err)
      return false
    }
  }

  /**
   * Fetch user sessions
   */
  const fetchUserSessions = async (userId?: string): Promise<UserSession[]> => {
    try {
      let query = supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      userSessions.value = data || []
      return userSessions.value
    } catch (err: any) {
      logger.error('Failed to fetch user sessions:', err)
      return []
    }
  }

  /**
   * Invalidate session
   */
  const invalidateSession = async (sessionToken: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('invalidate_session', { p_session_token: sessionToken })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to invalidate session:', err)
      return false
    }
  }

  /**
   * Invalidate all user sessions
   */
  const invalidateAllSessions = async (userId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('invalidate_session', { 
          p_session_token: null,
          p_user_id: userId 
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to invalidate all sessions:', err)
      return false
    }
  }

  /**
   * Log sensitive data access
   */
  const logSensitiveAccess = async (
    dataType: string,
    targetUserId: string,
    action: 'view' | 'export' | 'modify'
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.rpc('log_sensitive_access', {
        p_user_id: user.id,
        p_data_type: dataType,
        p_target_user_id: targetUserId,
        p_action: action
      })
    } catch (err) {
      logger.error('Failed to log sensitive access:', err)
    }
  }

  /**
   * Add IP to blacklist
   */
  const blacklistIp = async (
    ipAddress: string,
    reason: string,
    isPermanent = false,
    expiresHours?: number
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error: insertError } = await supabase
        .from('ip_blacklist')
        .insert({
          ip_address: ipAddress,
          reason,
          blocked_by: user?.id,
          is_permanent: isPermanent,
          expires_at: expiresHours 
            ? new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
            : null
        })

      if (insertError) throw insertError

      await logSecurityEvent('ip_blacklisted', {
        details: { ip_address: ipAddress, reason },
        riskLevel: 'high'
      })

      return true
    } catch (err) {
      logger.error('Failed to blacklist IP:', err)
      return false
    }
  }

  /**
   * Remove IP from blacklist
   */
  const unblacklistIp = async (ipAddress: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('ip_blacklist')
        .delete()
        .eq('ip_address', ipAddress)

      if (deleteError) throw deleteError
      return true
    } catch (err) {
      logger.error('Failed to unblacklist IP:', err)
      return false
    }
  }

  return {
    // State
    securityEvents,
    securitySummary,
    userSessions,
    loading,
    error,

    // Computed
    highRiskEvents,
    recentFailedLogins,

    // Methods
    logSecurityEvent,
    fetchSecurityEvents,
    fetchSecuritySummary,
    checkLoginAttempts,
    recordFailedLogin,
    clearFailedLogins,
    isIpBlacklisted,
    fetchUserSessions,
    invalidateSession,
    invalidateAllSessions,
    logSensitiveAccess,
    blacklistIp,
    unblacklistIp
  }
}
