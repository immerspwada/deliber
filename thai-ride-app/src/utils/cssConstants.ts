/**
 * CSS Constants - MUNEEF Design System
 * Consolidates all design tokens to prevent CSS duplicates
 */

export const COLORS = {
  // Primary colors
  primary: {
    green: '#00a86b',
    greenLight: '#e8f5ef',
    greenDark: '#008f5b',
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f6f6f6',
    tertiary: '#f0f0f0',
  },
  
  // Text colors
  text: {
    primary: '#1a1a1a',
    secondary: '#666666',
    tertiary: '#999999',
    muted: '#6b6b6b',
  },
  
  // Border colors
  border: {
    light: '#e8e8e8',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
  
  // Status colors
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#e11900',
    info: '#3b82f6',
  },
  
  // Service type colors
  service: {
    ride: '#3b82f6',
    delivery: '#00a86b',
    shopping: '#f59e0b',
    moving: '#8b5cf6',
    laundry: '#06b6d4',
  },
} as const

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',
} as const

export const BORDER_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const

export const TYPOGRAPHY = {
  fontFamily: {
    primary: '"Sarabun", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

export const TRANSITIONS = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
  bounce: '0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
  toast: 70,
} as const

// CSS Custom Properties generator
export function generateCSSVariables(): Record<string, string> {
  return {
    '--color-primary': COLORS.primary.green,
    '--color-primary-light': COLORS.primary.greenLight,
    '--color-primary-dark': COLORS.primary.greenDark,
    '--color-background': COLORS.background.primary,
    '--color-background-secondary': COLORS.background.secondary,
    '--color-text-primary': COLORS.text.primary,
    '--color-text-secondary': COLORS.text.secondary,
    '--color-border-light': COLORS.border.light,
    '--border-radius': BORDER_RADIUS.lg,
    '--border-radius-sm': BORDER_RADIUS.sm,
    '--font-family': TYPOGRAPHY.fontFamily.primary,
    '--transition-normal': TRANSITIONS.normal,
    '--shadow-md': SHADOWS.md,
    '--shadow-lg': SHADOWS.lg,
  }
}

// Utility functions
export function getServiceColor(serviceType: string): string {
  return COLORS.service[serviceType as keyof typeof COLORS.service] || COLORS.text.secondary
}

export function getStatusColor(status: string): { color: string; bgColor: string } {
  const statusColorMap: Record<string, { color: string; bgColor: string }> = {
    pending: { color: COLORS.status.warning, bgColor: '#fef3c7' },
    approved: { color: COLORS.status.success, bgColor: '#dcfce7' },
    active: { color: COLORS.status.success, bgColor: '#dcfce7' },
    suspended: { color: COLORS.status.error, bgColor: '#fee2e2' },
    rejected: { color: COLORS.status.error, bgColor: '#fee2e2' },
    online: { color: COLORS.status.success, bgColor: '#dcfce7' },
    offline: { color: COLORS.text.secondary, bgColor: COLORS.background.secondary },
  }
  
  return statusColorMap[status] || { color: COLORS.text.secondary, bgColor: COLORS.background.secondary }
}