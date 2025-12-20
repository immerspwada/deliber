/**
 * Shared Components - Cross-cutting components used across the app
 * 
 * These components are used by Customer, Provider, and Admin
 */

// Error Handling
export { default as ErrorBoundary } from '../ErrorBoundary.vue'

// Re-export composables
export { useSupabaseQuery } from '../../composables/useSupabaseQuery'
export type { QueryResult, QueryOptions } from '../../composables/useSupabaseQuery'
