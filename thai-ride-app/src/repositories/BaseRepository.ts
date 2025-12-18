/**
 * Base Repository Class
 * 
 * Abstract base class for all data repositories
 * Provides common database operations and query patterns
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import { fromSupabaseError, handleError } from '../utils/errorHandling'
import type { Result } from '../utils/result'

export interface QueryOptions {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export abstract class BaseRepository<T = any, TInsert = any, TUpdate = any> {
  protected tableName: string
  protected selectFields: string

  constructor(tableName: string, selectFields: string = '*') {
    this.tableName = tableName
    this.selectFields = selectFields
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<Result<T | null>> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select(this.selectFields)
        .eq('id', id)
        .maybeSingle()

      if (error) throw fromSupabaseError(error)
      
      return { success: true, data }
    } catch (error) {
      const appError = handleError(error, { 
        context: { repository: this.tableName, operation: 'findById', id }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Find all with pagination and filters
   */
  async findAll(options: QueryOptions = {}): Promise<Result<PaginatedResult<T>>> {
    try {
      const {
        page = 1,
        limit = 20,
        orderBy = 'created_at',
        orderDirection = 'desc',
        filters = {}
      } = options

      let query = supabase
        .from(this.tableName)
        .select(this.selectFields, { count: 'exact' })

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value)
          } else {
            query = query.eq(key, value)
          }
        }
      })

      // Apply pagination and ordering
      const { data, count, error } = await query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw fromSupabaseError(error)

      const total = count || 0
      const hasMore = page * limit < total

      return {
        success: true,
        data: {
          data: data || [],
          total,
          page,
          limit,
          hasMore
        }
      }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: 'findAll', options }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Create new record
   */
  async create(data: TInsert): Promise<Result<T>> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data as any)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!result) throw new Error('Failed to create record')

      logger.debug(`[${this.tableName}] Created record:`, result)
      return { success: true, data: result }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: 'create', data }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: TUpdate): Promise<Result<T>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      }

      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(updateData as any)
        .eq('id', id)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!result) throw new Error('Record not found or update failed')

      logger.debug(`[${this.tableName}] Updated record:`, result)
      return { success: true, data: result }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: 'update', id, data }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<Result<boolean>> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)

      if (error) throw fromSupabaseError(error)

      logger.debug(`[${this.tableName}] Deleted record:`, id)
      return { success: true, data: true }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: 'delete', id }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Count records with filters
   */
  async count(filters: Record<string, any> = {}): Promise<Result<number>> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })

      const { count, error } = await query

      if (error) throw fromSupabaseError(error)

      return { success: true, data: count || 0 }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: 'count', filters }
      })
      return { success: false, error: appError }
    }
  }

  /**
   * Execute custom query
   */
  protected async executeQuery<TResult = any>(
    queryBuilder: (query: any) => any,
    operationName: string
  ): Promise<Result<TResult>> {
    try {
      const query = supabase.from(this.tableName)
      const { data, error } = await queryBuilder(query)

      if (error) throw fromSupabaseError(error)

      return { success: true, data }
    } catch (error) {
      const appError = handleError(error, {
        context: { repository: this.tableName, operation: operationName }
      })
      return { success: false, error: appError }
    }
  }
}