// @ts-nocheck
/**
 * Advanced System Features (F202-F251)
 * 50 Sessions of Advanced Utilities
 * 
 * Migration: 045_advanced_system.sql
 */

import { ref, computed, onUnmounted, onMounted, watch, reactive } from 'vue'
import type { Ref } from 'vue'

// ============================================
// SESSION 1 (F202): Feature Flags System
// ============================================

interface FeatureFlag {
  key: string
  enabled: boolean
  rolloutPercentage: number
  targetUsers?: string[]
  metadata?: Record<string, any>
}

export function useFeatureFlags() {
  const flags = ref<Map<string, FeatureFlag>>(new Map())
  const userId = ref<string | null>(null)
  const loading = ref(false)

  const setUserId = (id: string) => {
    userId.value = id
  }

  const loadFlags = async (flagsData: FeatureFlag[]) => {
    loading.value = true
    flagsData.forEach(flag => flags.value.set(flag.key, flag))
    loading.value = false
  }

  const isEnabled = (key: string): boolean => {
    const flag = flags.value.get(key)
    if (!flag) return false
    if (!flag.enabled) return false
    
    // Check target users
    if (flag.targetUsers?.length && userId.value) {
      if (flag.targetUsers.includes(userId.value)) return true
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && userId.value) {
      const hash = hashString(userId.value + key)
      return (hash % 100) < flag.rolloutPercentage
    }
    
    return flag.enabled
  }

  const hashString = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  return { flags, loading, setUserId, loadFlags, isEnabled }
}


// ============================================
// SESSION 2 (F203): A/B Testing Framework
// ============================================

interface ABTest {
  id: string
  name: string
  variants: { id: string; weight: number }[]
  status: 'draft' | 'running' | 'paused' | 'completed'
}

export function useABTesting() {
  const tests = ref<Map<string, ABTest>>(new Map())
  const assignments = ref<Map<string, string>>(new Map())
  const userId = ref<string>('')

  const setUserId = (id: string) => {
    userId.value = id
    // Load saved assignments from localStorage
    const saved = localStorage.getItem(`ab_assignments_${id}`)
    if (saved) {
      assignments.value = new Map(JSON.parse(saved))
    }
  }

  const registerTest = (test: ABTest) => {
    tests.value.set(test.id, test)
  }

  const getVariant = (testId: string): string | null => {
    // Check existing assignment
    if (assignments.value.has(testId)) {
      return assignments.value.get(testId) || null
    }

    const test = tests.value.get(testId)
    if (!test || test.status !== 'running') return null

    // Assign variant based on weighted random
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0)
    const random = hashUserId(userId.value + testId) % totalWeight
    
    let cumulative = 0
    for (const variant of test.variants) {
      cumulative += variant.weight
      if (random < cumulative) {
        assignments.value.set(testId, variant.id)
        saveAssignments()
        return variant.id
      }
    }
    return test.variants[0]?.id || null
  }

  const hashUserId = (str: string): number => {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i)
    }
    return Math.abs(hash)
  }

  const saveAssignments = () => {
    if (userId.value) {
      localStorage.setItem(
        `ab_assignments_${userId.value}`,
        JSON.stringify([...assignments.value])
      )
    }
  }

  const trackConversion = (testId: string, eventName: string) => {
    const variant = assignments.value.get(testId)
    if (variant) {
      // Track conversion event
      return { testId, variant, eventName, timestamp: Date.now() }
    }
    return null
  }

  return { tests, assignments, setUserId, registerTest, getVariant, trackConversion }
}

// ============================================
// SESSION 3 (F204): User Preferences Manager
// ============================================

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    push: boolean
    email: boolean
    sms: boolean
    marketing: boolean
  }
  privacy: {
    shareLocation: boolean
    shareRideHistory: boolean
    allowAnalytics: boolean
  }
  accessibility: {
    fontSize: 'small' | 'medium' | 'large'
    highContrast: boolean
    reduceMotion: boolean
    screenReader: boolean
  }
  ride: {
    defaultPaymentMethod: string | null
    preferredVehicleType: string | null
    autoTip: number
    quietRide: boolean
  }
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'th',
  notifications: { push: true, email: true, sms: true, marketing: false },
  privacy: { shareLocation: true, shareRideHistory: false, allowAnalytics: true },
  accessibility: { fontSize: 'medium', highContrast: false, reduceMotion: false, screenReader: false },
  ride: { defaultPaymentMethod: null, preferredVehicleType: null, autoTip: 0, quietRide: false }
}

export function useUserPreferences() {
  const preferences = ref<UserPreferences>({ ...defaultPreferences })
  const loading = ref(false)
  const syncing = ref(false)

  const load = (userId?: string) => {
    loading.value = true
    const key = userId ? `prefs_${userId}` : 'prefs_guest'
    const saved = localStorage.getItem(key)
    if (saved) {
      preferences.value = { ...defaultPreferences, ...JSON.parse(saved) }
    }
    loading.value = false
  }

  const save = (userId?: string) => {
    const key = userId ? `prefs_${userId}` : 'prefs_guest'
    localStorage.setItem(key, JSON.stringify(preferences.value))
  }

  const update = <K extends keyof UserPreferences>(
    category: K,
    value: Partial<UserPreferences[K]>
  ) => {
    if (typeof preferences.value[category] === 'object') {
      preferences.value[category] = { ...preferences.value[category], ...value } as any
    } else {
      preferences.value[category] = value as any
    }
    save()
  }

  const reset = () => {
    preferences.value = { ...defaultPreferences }
    save()
  }

  return { preferences, loading, syncing, load, save, update, reset }
}


// ============================================
// SESSION 4 (F205): Smart Caching System
// ============================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
}

export function useSmartCache<T = any>() {
  const cache = new Map<string, CacheEntry<T>>()
  const stats = reactive({ hits: 0, misses: 0, size: 0 })

  const set = (key: string, data: T, options: { ttl?: number; tags?: string[] } = {}) => {
    const { ttl = 300000, tags = [] } = options // Default 5 minutes
    cache.set(key, { data, timestamp: Date.now(), ttl, tags })
    stats.size = cache.size
  }

  const get = (key: string): T | null => {
    const entry = cache.get(key)
    if (!entry) {
      stats.misses++
      return null
    }
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key)
      stats.misses++
      stats.size = cache.size
      return null
    }
    
    stats.hits++
    return entry.data
  }

  const has = (key: string): boolean => {
    const entry = cache.get(key)
    if (!entry) return false
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key)
      return false
    }
    return true
  }

  const invalidate = (key: string) => {
    cache.delete(key)
    stats.size = cache.size
  }

  const invalidateByTag = (tag: string) => {
    for (const [key, entry] of cache.entries()) {
      if (entry.tags.includes(tag)) {
        cache.delete(key)
      }
    }
    stats.size = cache.size
  }

  const invalidateByPattern = (pattern: RegExp) => {
    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        cache.delete(key)
      }
    }
    stats.size = cache.size
  }

  const clear = () => {
    cache.clear()
    stats.size = 0
  }

  const getStats = () => ({
    ...stats,
    hitRate: stats.hits + stats.misses > 0 
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) + '%'
      : '0%'
  })

  return { set, get, has, invalidate, invalidateByTag, invalidateByPattern, clear, getStats }
}

// ============================================
// SESSION 5 (F206): Request Deduplication
// ============================================

export function useRequestDedup() {
  const pending = new Map<string, Promise<any>>()

  const dedupe = async <T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttl?: number } = {}
  ): Promise<T> => {
    const { ttl = 1000 } = options

    // Check if request is already pending
    if (pending.has(key)) {
      return pending.get(key) as Promise<T>
    }

    // Create new request
    const promise = fn().finally(() => {
      // Remove from pending after TTL
      setTimeout(() => pending.delete(key), ttl)
    })

    pending.set(key, promise)
    return promise
  }

  const cancel = (key: string) => {
    pending.delete(key)
  }

  const cancelAll = () => {
    pending.clear()
  }

  const isPending = (key: string): boolean => {
    return pending.has(key)
  }

  return { dedupe, cancel, cancelAll, isPending }
}

// ============================================
// SESSION 6 (F207): Optimistic Updates
// ============================================

interface OptimisticState<T> {
  data: T
  pending: boolean
  error: Error | null
  rollback: T | null
}

export function useOptimisticUpdate<T>(initialData: T) {
  const state = reactive<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null,
    rollback: null
  })

  const update = async (
    optimisticData: T,
    serverFn: () => Promise<T>
  ): Promise<T> => {
    // Save rollback state
    state.rollback = JSON.parse(JSON.stringify(state.data))
    state.data = optimisticData
    state.pending = true
    state.error = null

    try {
      const result = await serverFn()
      state.data = result
      state.rollback = null
      return result
    } catch (error) {
      // Rollback on error
      if (state.rollback !== null) {
        state.data = state.rollback
      }
      state.error = error as Error
      throw error
    } finally {
      state.pending = false
    }
  }

  const manualRollback = () => {
    if (state.rollback !== null) {
      state.data = state.rollback
      state.rollback = null
    }
  }

  return { state, update, manualRollback }
}


// ============================================
// SESSION 7 (F208): State Machine
// ============================================

type StateConfig<S extends string, E extends string> = {
  initial: S
  states: Record<S, {
    on?: Partial<Record<E, S>>
    entry?: () => void
    exit?: () => void
  }>
}

export function useStateMachine<S extends string, E extends string>(config: StateConfig<S, E>) {
  const currentState = ref<S>(config.initial) as Ref<S>
  const history = ref<S[]>([config.initial]) as Ref<S[]>

  const transition = (event: E): boolean => {
    const stateConfig = config.states[currentState.value]
    const nextState = stateConfig?.on?.[event]
    
    if (!nextState) return false

    // Exit current state
    stateConfig?.exit?.()
    
    // Update state
    const prevState = currentState.value
    currentState.value = nextState
    history.value.push(nextState)
    
    // Enter new state
    config.states[nextState]?.entry?.()
    
    return true
  }

  const can = (event: E): boolean => {
    const stateConfig = config.states[currentState.value]
    return !!stateConfig?.on?.[event]
  }

  const reset = () => {
    currentState.value = config.initial
    history.value = [config.initial]
  }

  return { currentState, history, transition, can, reset }
}

// ============================================
// SESSION 8 (F209): Event Sourcing
// ============================================

interface Event {
  id: string
  type: string
  payload: any
  timestamp: number
  version: number
}

export function useEventSourcing<T>(
  initialState: T,
  reducer: (state: T, event: Event) => T
) {
  const events = ref<Event[]>([])
  const state = ref<T>(initialState) as Ref<T>
  const version = ref(0)

  const dispatch = (type: string, payload: any): Event => {
    const event: Event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      version: ++version.value
    }
    
    events.value.push(event)
    state.value = reducer(state.value, event)
    
    return event
  }

  const replay = (fromVersion: number = 0): T => {
    let replayState = initialState
    for (const event of events.value) {
      if (event.version > fromVersion) {
        replayState = reducer(replayState, event)
      }
    }
    return replayState
  }

  const getSnapshot = () => ({
    state: JSON.parse(JSON.stringify(state.value)),
    version: version.value,
    eventCount: events.value.length
  })

  const loadEvents = (loadedEvents: Event[]) => {
    events.value = loadedEvents
    state.value = replay()
    version.value = loadedEvents.length > 0 
      ? loadedEvents[loadedEvents.length - 1].version 
      : 0
  }

  return { state, events, version, dispatch, replay, getSnapshot, loadEvents }
}

// ============================================
// SESSION 9 (F210): Command Pattern
// ============================================

interface Command<T = any> {
  execute: () => Promise<T>
  undo?: () => Promise<void>
  description?: string
}

export function useCommandPattern() {
  const history = ref<Command[]>([])
  const undoneCommands = ref<Command[]>([])
  const executing = ref(false)

  const execute = async <T>(command: Command<T>): Promise<T> => {
    executing.value = true
    try {
      const result = await command.execute()
      history.value.push(command)
      undoneCommands.value = [] // Clear redo stack
      return result
    } finally {
      executing.value = false
    }
  }

  const undo = async (): Promise<boolean> => {
    const command = history.value.pop()
    if (!command?.undo) return false
    
    executing.value = true
    try {
      await command.undo()
      undoneCommands.value.push(command)
      return true
    } finally {
      executing.value = false
    }
  }

  const redo = async (): Promise<boolean> => {
    const command = undoneCommands.value.pop()
    if (!command) return false
    
    executing.value = true
    try {
      await command.execute()
      history.value.push(command)
      return true
    } finally {
      executing.value = false
    }
  }

  const canUndo = computed(() => history.value.some(c => c.undo))
  const canRedo = computed(() => undoneCommands.value.length > 0)

  const clear = () => {
    history.value = []
    undoneCommands.value = []
  }

  return { history, executing, execute, undo, redo, canUndo, canRedo, clear }
}

// ============================================
// SESSION 10 (F211): Pub/Sub System
// ============================================

type Subscriber<T = any> = (data: T) => void

export function usePubSub() {
  const subscribers = new Map<string, Set<Subscriber>>()

  const subscribe = <T>(topic: string, callback: Subscriber<T>): () => void => {
    if (!subscribers.has(topic)) {
      subscribers.set(topic, new Set())
    }
    subscribers.get(topic)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      subscribers.get(topic)?.delete(callback)
    }
  }

  const publish = <T>(topic: string, data: T): void => {
    const topicSubscribers = subscribers.get(topic)
    if (topicSubscribers) {
      topicSubscribers.forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in subscriber for topic ${topic}:`, e)
        }
      })
    }
  }

  const once = <T>(topic: string, callback: Subscriber<T>): () => void => {
    const wrapper: Subscriber<T> = (data) => {
      callback(data)
      unsubscribe()
    }
    const unsubscribe = subscribe(topic, wrapper)
    return unsubscribe
  }

  const clear = (topic?: string) => {
    if (topic) {
      subscribers.delete(topic)
    } else {
      subscribers.clear()
    }
  }

  const getTopics = () => [...subscribers.keys()]
  const getSubscriberCount = (topic: string) => subscribers.get(topic)?.size || 0

  return { subscribe, publish, once, clear, getTopics, getSubscriberCount }
}


// ============================================
// SESSION 11 (F212): Rate Limiter
// ============================================

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  strategy: 'sliding' | 'fixed'
}

export function useRateLimiter(config: RateLimitConfig) {
  const requests = ref<number[]>([])
  const blocked = ref(false)

  const isAllowed = (): boolean => {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean old requests
    requests.value = requests.value.filter(t => t > windowStart)

    if (requests.value.length >= config.maxRequests) {
      blocked.value = true
      return false
    }

    requests.value.push(now)
    blocked.value = false
    return true
  }

  const getRemainingRequests = (): number => {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const validRequests = requests.value.filter(t => t > windowStart)
    return Math.max(0, config.maxRequests - validRequests.length)
  }

  const getResetTime = (): number => {
    if (requests.value.length === 0) return 0
    const oldestRequest = Math.min(...requests.value)
    return Math.max(0, oldestRequest + config.windowMs - Date.now())
  }

  const reset = () => {
    requests.value = []
    blocked.value = false
  }

  return { isAllowed, getRemainingRequests, getResetTime, blocked, reset }
}

// ============================================
// SESSION 12 (F213): Retry Queue
// ============================================

interface RetryItem<T> {
  id: string
  fn: () => Promise<T>
  attempts: number
  maxAttempts: number
  lastAttempt: number
  backoffMs: number
}

export function useRetryQueue() {
  const queue = ref<RetryItem<any>[]>([])
  const processing = ref(false)
  let intervalId: number | null = null

  const add = <T>(
    fn: () => Promise<T>,
    options: { maxAttempts?: number; backoffMs?: number } = {}
  ): string => {
    const { maxAttempts = 3, backoffMs = 1000 } = options
    const id = `retry_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    queue.value.push({
      id,
      fn,
      attempts: 0,
      maxAttempts,
      lastAttempt: 0,
      backoffMs
    })
    
    return id
  }

  const process = async () => {
    if (processing.value || queue.value.length === 0) return
    
    processing.value = true
    const now = Date.now()
    
    for (let i = queue.value.length - 1; i >= 0; i--) {
      const item = queue.value[i]
      const delay = item.backoffMs * Math.pow(2, item.attempts)
      
      if (now - item.lastAttempt < delay) continue
      
      item.attempts++
      item.lastAttempt = now
      
      try {
        await item.fn()
        queue.value.splice(i, 1) // Success - remove from queue
      } catch {
        if (item.attempts >= item.maxAttempts) {
          queue.value.splice(i, 1) // Max attempts reached - remove
        }
      }
    }
    
    processing.value = false
  }

  const start = (intervalMs: number = 5000) => {
    if (intervalId) return
    intervalId = window.setInterval(process, intervalMs)
  }

  const stop = () => {
    if (intervalId) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  const remove = (id: string) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index > -1) queue.value.splice(index, 1)
  }

  const clear = () => {
    queue.value = []
  }

  onUnmounted(stop)

  return { queue, processing, add, process, start, stop, remove, clear }
}

// ============================================
// SESSION 13 (F214): Data Sync Manager
// ============================================

interface SyncItem {
  id: string
  type: string
  data: any
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  createdAt: number
  syncedAt?: number
  error?: string
}

export function useDataSync() {
  const items = ref<SyncItem[]>([])
  const syncing = ref(false)
  const lastSyncAt = ref<number | null>(null)

  const add = (type: string, data: any): string => {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`
    items.value.push({
      id,
      type,
      data,
      status: 'pending',
      createdAt: Date.now()
    })
    return id
  }

  const sync = async (
    syncFn: (items: SyncItem[]) => Promise<{ success: string[]; failed: string[] }>
  ) => {
    const pendingItems = items.value.filter(i => i.status === 'pending' || i.status === 'failed')
    if (pendingItems.length === 0 || syncing.value) return

    syncing.value = true
    pendingItems.forEach(i => i.status = 'syncing')

    try {
      const result = await syncFn(pendingItems)
      
      result.success.forEach(id => {
        const item = items.value.find(i => i.id === id)
        if (item) {
          item.status = 'synced'
          item.syncedAt = Date.now()
        }
      })
      
      result.failed.forEach(id => {
        const item = items.value.find(i => i.id === id)
        if (item) {
          item.status = 'failed'
        }
      })
      
      lastSyncAt.value = Date.now()
    } catch (e: any) {
      pendingItems.forEach(i => {
        i.status = 'failed'
        i.error = e.message
      })
    } finally {
      syncing.value = false
    }
  }

  const getPending = () => items.value.filter(i => i.status === 'pending')
  const getFailed = () => items.value.filter(i => i.status === 'failed')
  const getSynced = () => items.value.filter(i => i.status === 'synced')

  const clearSynced = () => {
    items.value = items.value.filter(i => i.status !== 'synced')
  }

  const retry = (id: string) => {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.status = 'pending'
      item.error = undefined
    }
  }

  return { items, syncing, lastSyncAt, add, sync, getPending, getFailed, getSynced, clearSynced, retry }
}


// ============================================
// SESSION 14 (F215): Conflict Resolution
// ============================================

interface ConflictItem<T> {
  id: string
  local: T
  remote: T
  timestamp: number
  resolved: boolean
  resolution?: 'local' | 'remote' | 'merged'
}

export function useConflictResolution<T>() {
  const conflicts = ref<ConflictItem<T>[]>([])

  const detect = (id: string, local: T, remote: T): boolean => {
    const localStr = JSON.stringify(local)
    const remoteStr = JSON.stringify(remote)
    
    if (localStr !== remoteStr) {
      conflicts.value.push({
        id,
        local,
        remote,
        timestamp: Date.now(),
        resolved: false
      })
      return true
    }
    return false
  }

  const resolve = (
    id: string,
    resolution: 'local' | 'remote' | 'merged',
    mergedData?: T
  ): T | null => {
    const conflict = conflicts.value.find(c => c.id === id)
    if (!conflict) return null

    conflict.resolved = true
    conflict.resolution = resolution

    switch (resolution) {
      case 'local':
        return conflict.local
      case 'remote':
        return conflict.remote
      case 'merged':
        return mergedData || conflict.local
    }
  }

  const autoResolve = (
    strategy: 'newest' | 'local' | 'remote'
  ): Map<string, T> => {
    const results = new Map<string, T>()
    
    conflicts.value.forEach(conflict => {
      if (conflict.resolved) return
      
      let resolved: T
      switch (strategy) {
        case 'local':
          resolved = conflict.local
          break
        case 'remote':
          resolved = conflict.remote
          break
        case 'newest':
        default:
          resolved = conflict.remote // Assume remote is newer
      }
      
      conflict.resolved = true
      conflict.resolution = strategy === 'local' ? 'local' : 'remote'
      results.set(conflict.id, resolved)
    })
    
    return results
  }

  const getPending = () => conflicts.value.filter(c => !c.resolved)
  const clear = () => { conflicts.value = [] }

  return { conflicts, detect, resolve, autoResolve, getPending, clear }
}

// ============================================
// SESSION 15 (F216): Schema Validator
// ============================================

type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'any'

interface SchemaRule {
  type: SchemaType | SchemaType[]
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  items?: SchemaRule
  properties?: Record<string, SchemaRule>
  custom?: (value: any) => boolean | string
}

export function useSchemaValidator() {
  const validate = (data: any, schema: SchemaRule): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    const checkType = (value: any, types: SchemaType | SchemaType[]): boolean => {
      const typeArray = Array.isArray(types) ? types : [types]
      return typeArray.some(t => {
        if (t === 'any') return true
        if (t === 'null') return value === null
        if (t === 'array') return Array.isArray(value)
        return typeof value === t
      })
    }

    const validateValue = (value: any, rule: SchemaRule, path: string) => {
      // Required check
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`${path}: required field is missing`)
        return
      }

      if (value === undefined || value === null) return

      // Type check
      if (!checkType(value, rule.type)) {
        errors.push(`${path}: expected ${rule.type}, got ${typeof value}`)
        return
      }

      // Min/Max for numbers and strings
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${path}: value ${value} is less than minimum ${rule.min}`)
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${path}: value ${value} is greater than maximum ${rule.max}`)
        }
      }

      if (typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${path}: length ${value.length} is less than minimum ${rule.min}`)
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${path}: length ${value.length} is greater than maximum ${rule.max}`)
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${path}: value does not match pattern`)
        }
      }

      // Enum check
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${path}: value must be one of ${rule.enum.join(', ')}`)
      }

      // Array items
      if (Array.isArray(value) && rule.items) {
        value.forEach((item, index) => {
          validateValue(item, rule.items!, `${path}[${index}]`)
        })
      }

      // Object properties
      if (typeof value === 'object' && !Array.isArray(value) && rule.properties) {
        Object.entries(rule.properties).forEach(([key, propRule]) => {
          validateValue(value[key], propRule, `${path}.${key}`)
        })
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value)
        if (result !== true) {
          errors.push(`${path}: ${typeof result === 'string' ? result : 'custom validation failed'}`)
        }
      }
    }

    validateValue(data, schema, 'root')
    return { valid: errors.length === 0, errors }
  }

  return { validate }
}
