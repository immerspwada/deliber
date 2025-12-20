/**
 * useSupabaseQuery - Safe Supabase Query Wrapper
 * 
 * Provides safe query methods that handle common errors gracefully:
 * - 406 errors from .single() when no rows exist
 * - Network errors with retry logic
 * - Timeout handling
 * 
 * Usage:
 * const { safeSingle, safeQuery } = useSupabaseQuery()
 * const data = await safeSingle('user_wallets', { user_id: userId })
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

interface QueryOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface QueryResult<T> {
  data: T | null
  error: Error | null
  isNotFound: boolean
}

export function useSupabaseQuery() {
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Safe single row query - uses maybeSingle() internally
   * Returns null instead of throwing 406 error when no row found
   */
  async function safeSingle<T = any>(
    table: string,
    filters: Record<string, any>,
    select: string = '*',
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const { timeout = 10000, retries = 1, retryDelay = 1000 } = options
    
    loading.value = true
    error.value = null
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Build query
        let query = supabase.from(table).select(select)
        
        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value)
        }
        
        // Execute with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        })
        
        const queryPromise = query.maybeSingle()
        
        const { data, error: queryError } = await Promise.race([
          queryPromise,
          timeoutPromise.then(() => ({ data: null, error: new Error('Timeout') }))
        ])
        
        if (queryError) {
          throw queryError
        }
        
        loading.value = false
        return {
          data: data as T | null,
          error: null,
          isNotFound: data === null
        }
        
      } catch (e: any) {
        lastError = e
        
        // Don't retry on 406 errors (expected behavior)
        if (e?.code === 'PGRST116') {
          loading.value = false
          return {
            data: null,
            error: null,
            isNotFound: true
          }
        }
        
        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    
    loading.value = false
    error.value = lastError
    return {
      data: null,
      error: lastError,
      isNotFound: false
    }
  }

  /**
   * Safe query for multiple rows
   */
  async function safeQuery<T = any>(
    table: string,
    filters?: Record<string, any>,
    select: string = '*',
    options: QueryOptions & { limit?: number; orderBy?: string; ascending?: boolean } = {}
  ): Promise<QueryResult<T[]>> {
    const { timeout = 10000, retries = 1, retryDelay = 1000, limit, orderBy, ascending = false } = options
    
    loading.value = true
    error.value = null
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let query = supabase.from(table).select(select)
        
        // Apply filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value === null) {
              query = query.is(key, null)
            } else {
              query = query.eq(key, value)
            }
          }
        }
        
        // Apply ordering
        if (orderBy) {
          query = query.order(orderBy, { ascending })
        }
        
        // Apply limit
        if (limit) {
          query = query.limit(limit)
        }
        
        // Execute with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        })
        
        const { data, error: queryError } = await Promise.race([
          query,
          timeoutPromise.then(() => ({ data: null, error: new Error('Timeout') }))
        ])
        
        if (queryError) {
          throw queryError
        }
        
        loading.value = false
        return {
          data: (data || []) as T[],
          error: null,
          isNotFound: !data || data.length === 0
        }
        
      } catch (e: any) {
        lastError = e
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    
    loading.value = false
    error.value = lastError
    return {
      data: [],
      error: lastError,
      isNotFound: false
    }
  }

  /**
   * Safe insert with select
   */
  async function safeInsert<T = any>(
    table: string,
    data: Record<string, any>,
    select: string = '*'
  ): Promise<QueryResult<T>> {
    loading.value = true
    error.value = null
    
    try {
      const { data: result, error: insertError } = await supabase
        .from(table)
        .insert(data)
        .select(select)
        .single() // single() is safe here because we just inserted
      
      if (insertError) {
        throw insertError
      }
      
      loading.value = false
      return {
        data: result as T,
        error: null,
        isNotFound: false
      }
      
    } catch (e: any) {
      loading.value = false
      error.value = e
      return {
        data: null,
        error: e,
        isNotFound: false
      }
    }
  }

  /**
   * Safe update with select
   */
  async function safeUpdate<T = any>(
    table: string,
    filters: Record<string, any>,
    updates: Record<string, any>,
    select: string = '*'
  ): Promise<QueryResult<T>> {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase.from(table).update(updates)
      
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }
      
      const { data: result, error: updateError } = await query.select(select).maybeSingle()
      
      if (updateError) {
        throw updateError
      }
      
      loading.value = false
      return {
        data: result as T | null,
        error: null,
        isNotFound: result === null
      }
      
    } catch (e: any) {
      loading.value = false
      error.value = e
      return {
        data: null,
        error: e,
        isNotFound: false
      }
    }
  }

  /**
   * Safe upsert (insert or update)
   */
  async function safeUpsert<T = any>(
    table: string,
    data: Record<string, any>,
    onConflict: string,
    select: string = '*'
  ): Promise<QueryResult<T>> {
    loading.value = true
    error.value = null
    
    try {
      const { data: result, error: upsertError } = await supabase
        .from(table)
        .upsert(data, { onConflict })
        .select(select)
        .single()
      
      if (upsertError) {
        throw upsertError
      }
      
      loading.value = false
      return {
        data: result as T,
        error: null,
        isNotFound: false
      }
      
    } catch (e: any) {
      loading.value = false
      error.value = e
      return {
        data: null,
        error: e,
        isNotFound: false
      }
    }
  }

  return {
    loading,
    error,
    safeSingle,
    safeQuery,
    safeInsert,
    safeUpdate,
    safeUpsert
  }
}

// Export type for external use
export type { QueryResult, QueryOptions }
