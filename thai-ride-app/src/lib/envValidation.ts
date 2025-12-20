/**
 * Environment Validation
 * Validate required environment variables for production
 */

export interface EnvConfig {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_GOOGLE_MAPS_API_KEY?: string
  VITE_VAPID_PUBLIC_KEY?: string
  VITE_SENTRY_DSN?: string
  VITE_APP_ENV?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config: Partial<EnvConfig>
}

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
]

const RECOMMENDED_VARS = [
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_VAPID_PUBLIC_KEY'
]

const PRODUCTION_VARS = [
  'VITE_SENTRY_DSN'
]

/**
 * Validate environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const config: Partial<EnvConfig> = {}
  const isProduction = import.meta.env.PROD

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = import.meta.env[varName]
    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`)
    } else {
      (config as any)[varName] = value
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    const value = import.meta.env[varName]
    if (!value) {
      warnings.push(`Missing recommended environment variable: ${varName}`)
    } else {
      (config as any)[varName] = value
    }
  }

  // Check production-only variables
  if (isProduction) {
    for (const varName of PRODUCTION_VARS) {
      const value = import.meta.env[varName]
      if (!value) {
        warnings.push(`Missing production environment variable: ${varName}`)
      } else {
        (config as any)[varName] = value
      }
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.includes('supabase')) {
    warnings.push('VITE_SUPABASE_URL does not appear to be a valid Supabase URL')
  }

  // Validate Supabase key format
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (supabaseKey && supabaseKey.length < 100) {
    warnings.push('VITE_SUPABASE_ANON_KEY appears to be too short')
  }

  config.VITE_APP_ENV = import.meta.env.MODE

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  }
}

/**
 * Get current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const mode = import.meta.env.MODE
  if (mode === 'production') return 'production'
  if (mode === 'staging') return 'staging'
  return 'development'
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return import.meta.env.PROD
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV
}

/**
 * Get app version from package.json
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0'
}

/**
 * Get build timestamp
 */
export function getBuildTime(): string {
  return import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
}

/**
 * Log environment info (dev only)
 */
export function logEnvInfo(): void {
  if (!isDevelopment()) return

  const result = validateEnv()
  
  console.group('🔧 Environment Configuration')
  console.log('Environment:', getEnvironment())
  console.log('Version:', getAppVersion())
  console.log('Valid:', result.isValid)
  
  if (result.errors.length > 0) {
    console.error('Errors:', result.errors)
  }
  
  if (result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings)
  }
  
  console.groupEnd()
}

/**
 * Assert environment is valid (throws if not)
 */
export function assertValidEnv(): void {
  const result = validateEnv()
  
  if (!result.isValid) {
    const errorMessage = `Environment validation failed:\n${result.errors.join('\n')}`
    
    if (isProduction()) {
      throw new Error(errorMessage)
    } else {
      console.error(errorMessage)
    }
  }
}
