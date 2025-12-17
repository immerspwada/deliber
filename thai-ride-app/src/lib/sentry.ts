/**
 * Sentry Error Monitoring Configuration
 * 
 * Setup:
 * 1. Create account at https://sentry.io
 * 2. Create a new Vue project
 * 3. Copy DSN to .env as VITE_SENTRY_DSN
 */

import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'

// Check if Sentry is configured
export const isSentryConfigured = !!import.meta.env.VITE_SENTRY_DSN

// Initialize Sentry
export const initSentry = (app: App, router: Router) => {
  if (!isSentryConfigured) {
    console.warn('[Sentry] Not configured - error monitoring disabled')
    return
  }

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `thai-ride-app@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException as Error
      
      // Ignore network errors (user offline)
      if (error?.message?.includes('Failed to fetch')) {
        return null
      }
      
      // Ignore aborted requests
      if (error?.name === 'AbortError') {
        return null
      }

      // Ignore chunk load errors (usually from deployments)
      if (error?.message?.includes('Loading chunk')) {
        return null
      }

      return event
    },

    // Don't send PII
    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive data from breadcrumbs
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data?.url?.includes('auth')) {
          breadcrumb.data.body = '[REDACTED]'
        }
      }
      return breadcrumb
    },
  })

  console.log('[Sentry] Initialized successfully')
}

// Capture custom error with context
export const captureError = (
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) => {
  if (!isSentryConfigured) {
    console.error('[Error]', error, context)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

// Capture message
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) => {
  if (!isSentryConfigured) {
    console.log('[Message]', message, context)
    return
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    scope.setLevel(level)
    Sentry.captureMessage(message)
  })
}

// Set user context
export const setUser = (user: { id: string; email?: string; role?: string } | null) => {
  if (!isSentryConfigured) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
  }
}

// Add breadcrumb for tracking user actions
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  if (!isSentryConfigured) return

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

// Start a transaction for performance monitoring
export const startTransaction = (name: string, op: string) => {
  if (!isSentryConfigured) return null
  
  return Sentry.startInactiveSpan({
    name,
    op,
  })
}

// Export Sentry for direct access if needed
export { Sentry }
