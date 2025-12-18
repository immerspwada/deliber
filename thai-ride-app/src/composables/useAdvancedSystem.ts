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


// ============================================
// SESSION 16 (F217): Data Transformer
// ============================================

type TransformFn<T, R> = (data: T) => R

export function useDataTransformer() {
  const transformers = new Map<string, TransformFn<any, any>>()

  const register = <T, R>(name: string, fn: TransformFn<T, R>) => {
    transformers.set(name, fn)
  }

  const transform = <T, R>(name: string, data: T): R => {
    const fn = transformers.get(name)
    if (!fn) throw new Error(`Transformer "${name}" not found`)
    return fn(data)
  }

  const pipe = <T>(...names: string[]) => {
    return (data: T): any => {
      return names.reduce((result, name) => transform(name, result), data)
    }
  }

  const compose = <T>(...names: string[]) => {
    return (data: T): any => {
      return [...names].reverse().reduce((result, name) => transform(name, result), data)
    }
  }

  // Built-in transformers
  register('camelToSnake', (obj: Record<string, any>) => {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      result[snakeKey] = value
    }
    return result
  })

  register('snakeToCamel', (obj: Record<string, any>) => {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = value
    }
    return result
  })

  register('flatten', (obj: Record<string, any>, prefix = '') => {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, (transformers.get('flatten') as any)(value, newKey))
      } else {
        result[newKey] = value
      }
    }
    return result
  })

  return { register, transform, pipe, compose }
}

// ============================================
// SESSION 17 (F218): Query Builder
// ============================================

interface QueryOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
  include?: string[]
}

export function useQueryBuilder() {
  const buildQuery = (table: string, options: QueryOptions = {}): string => {
    const parts: string[] = []

    // SELECT
    const selectFields = options.select?.join(', ') || '*'
    parts.push(`SELECT ${selectFields} FROM ${table}`)

    // WHERE
    if (options.where && Object.keys(options.where).length > 0) {
      const conditions = Object.entries(options.where).map(([key, value]) => {
        if (value === null) return `${key} IS NULL`
        if (Array.isArray(value)) return `${key} IN (${value.map(v => `'${v}'`).join(', ')})`
        if (typeof value === 'string') return `${key} = '${value}'`
        return `${key} = ${value}`
      })
      parts.push(`WHERE ${conditions.join(' AND ')}`)
    }

    // ORDER BY
    if (options.orderBy?.length) {
      const orderClauses = options.orderBy.map(o => `${o.field} ${o.direction.toUpperCase()}`)
      parts.push(`ORDER BY ${orderClauses.join(', ')}`)
    }

    // LIMIT & OFFSET
    if (options.limit) parts.push(`LIMIT ${options.limit}`)
    if (options.offset) parts.push(`OFFSET ${options.offset}`)

    return parts.join(' ')
  }

  const buildInsert = (table: string, data: Record<string, any>): string => {
    const keys = Object.keys(data)
    const values = Object.values(data).map(v => 
      v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : v
    )
    return `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')})`
  }

  const buildUpdate = (table: string, data: Record<string, any>, where: Record<string, any>): string => {
    const setClauses = Object.entries(data).map(([key, value]) => {
      if (value === null) return `${key} = NULL`
      if (typeof value === 'string') return `${key} = '${value}'`
      return `${key} = ${value}`
    })
    
    const whereClauses = Object.entries(where).map(([key, value]) => {
      if (typeof value === 'string') return `${key} = '${value}'`
      return `${key} = ${value}`
    })

    return `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`
  }

  const buildDelete = (table: string, where: Record<string, any>): string => {
    const whereClauses = Object.entries(where).map(([key, value]) => {
      if (typeof value === 'string') return `${key} = '${value}'`
      return `${key} = ${value}`
    })
    return `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`
  }

  return { buildQuery, buildInsert, buildUpdate, buildDelete }
}

// ============================================
// SESSION 18 (F219): Pagination Helper
// ============================================

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function usePagination(initialPageSize: number = 20) {
  const state = reactive<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0
  })

  const setTotal = (total: number) => {
    state.total = total
    state.totalPages = Math.ceil(total / state.pageSize)
  }

  const setPage = (page: number) => {
    state.page = Math.max(1, Math.min(page, state.totalPages || 1))
  }

  const setPageSize = (size: number) => {
    state.pageSize = size
    state.totalPages = Math.ceil(state.total / size)
    state.page = Math.min(state.page, state.totalPages || 1)
  }

  const nextPage = () => setPage(state.page + 1)
  const prevPage = () => setPage(state.page - 1)
  const firstPage = () => setPage(1)
  const lastPage = () => setPage(state.totalPages)

  const hasNext = computed(() => state.page < state.totalPages)
  const hasPrev = computed(() => state.page > 1)

  const offset = computed(() => (state.page - 1) * state.pageSize)
  const range = computed(() => ({
    from: offset.value + 1,
    to: Math.min(offset.value + state.pageSize, state.total)
  }))

  const pageNumbers = computed(() => {
    const pages: (number | '...')[] = []
    const { page, totalPages } = state
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      
      for (let i = start; i <= end; i++) pages.push(i)
      
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    
    return pages
  })

  return {
    state,
    setTotal,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    hasNext,
    hasPrev,
    offset,
    range,
    pageNumbers
  }
}


// ============================================
// SESSION 19 (F220): Search Engine
// ============================================

interface SearchOptions {
  fields: string[]
  fuzzy?: boolean
  highlight?: boolean
  limit?: number
}

export function useSearchEngine<T extends Record<string, any>>() {
  const index = ref<T[]>([])
  const searchHistory = ref<string[]>([])

  const setIndex = (data: T[]) => {
    index.value = data
  }

  const search = (query: string, options: SearchOptions): T[] => {
    if (!query.trim()) return []
    
    const normalizedQuery = query.toLowerCase().trim()
    searchHistory.value.unshift(normalizedQuery)
    if (searchHistory.value.length > 10) searchHistory.value.pop()

    return index.value
      .map(item => {
        let score = 0
        const matches: string[] = []

        options.fields.forEach(field => {
          const value = String(item[field] || '').toLowerCase()
          
          if (value === normalizedQuery) {
            score += 100 // Exact match
            matches.push(field)
          } else if (value.startsWith(normalizedQuery)) {
            score += 75 // Prefix match
            matches.push(field)
          } else if (value.includes(normalizedQuery)) {
            score += 50 // Contains match
            matches.push(field)
          } else if (options.fuzzy && fuzzyMatch(value, normalizedQuery)) {
            score += 25 // Fuzzy match
            matches.push(field)
          }
        })

        return { item, score, matches }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 20)
      .map(r => r.item)
  }

  const fuzzyMatch = (str: string, query: string): boolean => {
    let queryIndex = 0
    for (let i = 0; i < str.length && queryIndex < query.length; i++) {
      if (str[i] === query[queryIndex]) queryIndex++
    }
    return queryIndex === query.length
  }

  const clearHistory = () => { searchHistory.value = [] }

  return { index, searchHistory, setIndex, search, clearHistory }
}

// ============================================
// SESSION 20 (F221): Filter Builder
// ============================================

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between'

interface FilterCondition {
  field: string
  operator: FilterOperator
  value: any
}

export function useFilterBuilder<T extends Record<string, any>>() {
  const filters = ref<FilterCondition[]>([])

  const addFilter = (field: string, operator: FilterOperator, value: any) => {
    filters.value.push({ field, operator, value })
  }

  const removeFilter = (index: number) => {
    filters.value.splice(index, 1)
  }

  const clearFilters = () => {
    filters.value = []
  }

  const apply = (data: T[]): T[] => {
    return data.filter(item => {
      return filters.value.every(filter => {
        const itemValue = item[filter.field]
        const filterValue = filter.value

        switch (filter.operator) {
          case 'eq': return itemValue === filterValue
          case 'neq': return itemValue !== filterValue
          case 'gt': return itemValue > filterValue
          case 'gte': return itemValue >= filterValue
          case 'lt': return itemValue < filterValue
          case 'lte': return itemValue <= filterValue
          case 'contains': return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase())
          case 'startsWith': return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase())
          case 'endsWith': return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase())
          case 'in': return Array.isArray(filterValue) && filterValue.includes(itemValue)
          case 'between': return Array.isArray(filterValue) && itemValue >= filterValue[0] && itemValue <= filterValue[1]
          default: return true
        }
      })
    })
  }

  const toQueryString = (): string => {
    return filters.value
      .map(f => `${f.field}[${f.operator}]=${encodeURIComponent(JSON.stringify(f.value))}`)
      .join('&')
  }

  return { filters, addFilter, removeFilter, clearFilters, apply, toQueryString }
}

// ============================================
// SESSION 21 (F222): Sort Manager
// ============================================

interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
  nullsFirst?: boolean
}

export function useSortManager<T extends Record<string, any>>() {
  const sorts = ref<SortConfig[]>([])

  const addSort = (field: string, direction: 'asc' | 'desc' = 'asc') => {
    const existing = sorts.value.findIndex(s => s.field === field)
    if (existing > -1) {
      sorts.value[existing].direction = direction
    } else {
      sorts.value.push({ field, direction })
    }
  }

  const toggleSort = (field: string) => {
    const existing = sorts.value.find(s => s.field === field)
    if (!existing) {
      addSort(field, 'asc')
    } else if (existing.direction === 'asc') {
      existing.direction = 'desc'
    } else {
      removeSort(field)
    }
  }

  const removeSort = (field: string) => {
    const index = sorts.value.findIndex(s => s.field === field)
    if (index > -1) sorts.value.splice(index, 1)
  }

  const clearSorts = () => { sorts.value = [] }

  const apply = (data: T[]): T[] => {
    if (sorts.value.length === 0) return data

    return [...data].sort((a, b) => {
      for (const sort of sorts.value) {
        const aVal = a[sort.field]
        const bVal = b[sort.field]

        if (aVal === bVal) continue
        if (aVal === null || aVal === undefined) return sort.nullsFirst ? -1 : 1
        if (bVal === null || bVal === undefined) return sort.nullsFirst ? 1 : -1

        const comparison = aVal < bVal ? -1 : 1
        return sort.direction === 'asc' ? comparison : -comparison
      }
      return 0
    })
  }

  const getSortDirection = (field: string): 'asc' | 'desc' | null => {
    return sorts.value.find(s => s.field === field)?.direction || null
  }

  return { sorts, addSort, toggleSort, removeSort, clearSorts, apply, getSortDirection }
}


// ============================================
// SESSION 22 (F223): Export Manager
// ============================================

export function useExportManager() {
  const exportToCSV = <T extends Record<string, any>>(
    data: T[],
    filename: string,
    columns?: { key: string; label: string }[]
  ) => {
    if (data.length === 0) return

    const keys = columns?.map(c => c.key) || Object.keys(data[0])
    const headers = columns?.map(c => c.label) || keys

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        keys.map(key => {
          const value = row[key]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        }).join(',')
      )
    ].join('\n')

    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
  }

  const exportToJSON = <T>(data: T, filename: string, pretty: boolean = true) => {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
    downloadFile(content, `${filename}.json`, 'application/json')
  }

  const exportToExcel = <T extends Record<string, any>>(
    data: T[],
    filename: string,
    sheetName: string = 'Sheet1'
  ) => {
    // Simple XML-based Excel export
    const keys = Object.keys(data[0] || {})
    
    let xml = '<?xml version="1.0"?>\n'
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n'
    xml += `<Worksheet ss:Name="${sheetName}">\n<Table>\n`
    
    // Headers
    xml += '<Row>\n'
    keys.forEach(key => {
      xml += `<Cell><Data ss:Type="String">${key}</Data></Cell>\n`
    })
    xml += '</Row>\n'
    
    // Data
    data.forEach(row => {
      xml += '<Row>\n'
      keys.forEach(key => {
        const value = row[key]
        const type = typeof value === 'number' ? 'Number' : 'String'
        xml += `<Cell><Data ss:Type="${type}">${value ?? ''}</Data></Cell>\n`
      })
      xml += '</Row>\n'
    })
    
    xml += '</Table>\n</Worksheet>\n</Workbook>'
    
    downloadFile(xml, `${filename}.xls`, 'application/vnd.ms-excel')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { exportToCSV, exportToJSON, exportToExcel }
}

// ============================================
// SESSION 23 (F224): Import Manager
// ============================================

export function useImportManager() {
  const parseCSV = <T = Record<string, string>>(
    content: string,
    options: { hasHeader?: boolean; delimiter?: string } = {}
  ): T[] => {
    const { hasHeader = true, delimiter = ',' } = options
    const lines = content.trim().split('\n')
    
    if (lines.length === 0) return []
    
    const headers = hasHeader 
      ? lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
      : lines[0].split(delimiter).map((_, i) => `col${i}`)
    
    const dataLines = hasHeader ? lines.slice(1) : lines
    
    return dataLines.map(line => {
      const values = parseCSVLine(line, delimiter)
      const obj: Record<string, string> = {}
      headers.forEach((header, i) => {
        obj[header] = values[i] || ''
      })
      return obj as T
    })
  }

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    return result
  }

  const parseJSON = <T>(content: string): T => {
    return JSON.parse(content)
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  const importFromFile = async <T>(
    file: File,
    parser: 'csv' | 'json' = 'csv'
  ): Promise<T[]> => {
    const content = await readFile(file)
    
    if (parser === 'json') {
      const data = parseJSON<T | T[]>(content)
      return Array.isArray(data) ? data : [data]
    }
    
    return parseCSV<T>(content)
  }

  return { parseCSV, parseJSON, readFile, importFromFile }
}

// ============================================
// SESSION 24 (F225): Clipboard Manager
// ============================================

export function useClipboard() {
  const copied = ref(false)
  const copiedText = ref('')
  let timeoutId: number | null = null

  const copy = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      copiedText.value = text
      
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        copied.value = false
      }, 2000)
      
      return true
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      
      try {
        document.execCommand('copy')
        copied.value = true
        copiedText.value = text
        return true
      } catch {
        return false
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  const paste = async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return ''
    }
  }

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })

  return { copy, paste, copied, copiedText }
}

// ============================================
// SESSION 25 (F226): Keyboard Shortcuts
// ============================================

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  handler: (e: KeyboardEvent) => void
  description?: string
}

export function useKeyboardShortcuts() {
  const shortcuts = ref<ShortcutConfig[]>([])
  const enabled = ref(true)

  const register = (config: ShortcutConfig) => {
    shortcuts.value.push(config)
  }

  const unregister = (key: string) => {
    const index = shortcuts.value.findIndex(s => s.key === key)
    if (index > -1) shortcuts.value.splice(index, 1)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled.value) return
    
    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
    if (target.isContentEditable) return

    for (const shortcut of shortcuts.value) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey)
      const shiftMatch = !!shortcut.shift === e.shiftKey
      const altMatch = !!shortcut.alt === e.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault()
        shortcut.handler(e)
        break
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const getShortcutLabel = (config: ShortcutConfig): string => {
    const parts: string[] = []
    if (config.ctrl) parts.push('Ctrl')
    if (config.shift) parts.push('Shift')
    if (config.alt) parts.push('Alt')
    parts.push(config.key.toUpperCase())
    return parts.join('+')
  }

  return { shortcuts, enabled, register, unregister, getShortcutLabel }
}


// ============================================
// SESSION 26 (F227): Drag and Drop
// ============================================

interface DragState {
  isDragging: boolean
  draggedItem: any
  draggedIndex: number
  dropTarget: any
}

export function useDragAndDrop<T>() {
  const state = reactive<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedIndex: -1,
    dropTarget: null
  })

  const onDragStart = (item: T, index: number) => {
    state.isDragging = true
    state.draggedItem = item
    state.draggedIndex = index
  }

  const onDragOver = (e: DragEvent, target: T) => {
    e.preventDefault()
    state.dropTarget = target
  }

  const onDragEnd = () => {
    state.isDragging = false
    state.draggedItem = null
    state.draggedIndex = -1
    state.dropTarget = null
  }

  const onDrop = (items: T[], targetIndex: number): T[] => {
    if (state.draggedIndex === -1 || state.draggedIndex === targetIndex) {
      return items
    }

    const newItems = [...items]
    const [removed] = newItems.splice(state.draggedIndex, 1)
    newItems.splice(targetIndex, 0, removed)
    
    onDragEnd()
    return newItems
  }

  const reorder = (items: T[], fromIndex: number, toIndex: number): T[] => {
    const newItems = [...items]
    const [removed] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, removed)
    return newItems
  }

  return { state, onDragStart, onDragOver, onDragEnd, onDrop, reorder }
}

// ============================================
// SESSION 27 (F228): Selection Manager
// ============================================

export function useSelection<T extends { id: string | number }>() {
  const selected = ref<Set<string | number>>(new Set())
  const lastSelected = ref<string | number | null>(null)

  const isSelected = (id: string | number): boolean => {
    return selected.value.has(id)
  }

  const select = (id: string | number) => {
    selected.value.add(id)
    lastSelected.value = id
  }

  const deselect = (id: string | number) => {
    selected.value.delete(id)
  }

  const toggle = (id: string | number) => {
    if (isSelected(id)) {
      deselect(id)
    } else {
      select(id)
    }
  }

  const selectAll = (items: T[]) => {
    items.forEach(item => selected.value.add(item.id))
  }

  const deselectAll = () => {
    selected.value.clear()
    lastSelected.value = null
  }

  const selectRange = (items: T[], toId: string | number) => {
    if (!lastSelected.value) {
      select(toId)
      return
    }

    const fromIndex = items.findIndex(i => i.id === lastSelected.value)
    const toIndex = items.findIndex(i => i.id === toId)
    
    if (fromIndex === -1 || toIndex === -1) return

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    
    for (let i = start; i <= end; i++) {
      selected.value.add(items[i].id)
    }
  }

  const getSelected = (items: T[]): T[] => {
    return items.filter(item => selected.value.has(item.id))
  }

  const selectedCount = computed(() => selected.value.size)
  const hasSelection = computed(() => selected.value.size > 0)

  return {
    selected,
    isSelected,
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    selectRange,
    getSelected,
    selectedCount,
    hasSelection
  }
}

// ============================================
// SESSION 28 (F229): Undo/Redo Stack
// ============================================

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const state = ref<T>(initialState) as Ref<T>
  const past = ref<T[]>([])
  const future = ref<T[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  const push = (newState: T) => {
    past.value.push(JSON.parse(JSON.stringify(state.value)))
    if (past.value.length > maxHistory) {
      past.value.shift()
    }
    state.value = newState
    future.value = []
  }

  const undo = (): T | null => {
    if (!canUndo.value) return null
    
    future.value.push(JSON.parse(JSON.stringify(state.value)))
    state.value = past.value.pop()!
    return state.value
  }

  const redo = (): T | null => {
    if (!canRedo.value) return null
    
    past.value.push(JSON.parse(JSON.stringify(state.value)))
    state.value = future.value.pop()!
    return state.value
  }

  const reset = (newState?: T) => {
    state.value = newState ?? initialState
    past.value = []
    future.value = []
  }

  const getHistoryLength = () => ({
    past: past.value.length,
    future: future.value.length
  })

  return { state, canUndo, canRedo, push, undo, redo, reset, getHistoryLength }
}

// ============================================
// SESSION 29 (F230): Form Wizard
// ============================================

interface WizardStep {
  id: string
  title: string
  description?: string
  validate?: () => boolean | Promise<boolean>
  optional?: boolean
}

export function useFormWizard(steps: WizardStep[]) {
  const currentStepIndex = ref(0)
  const completedSteps = ref<Set<string>>(new Set())
  const stepData = ref<Record<string, any>>({})
  const isValidating = ref(false)

  const currentStep = computed(() => steps[currentStepIndex.value])
  const isFirstStep = computed(() => currentStepIndex.value === 0)
  const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)
  const progress = computed(() => ((currentStepIndex.value + 1) / steps.length) * 100)

  const goToStep = async (index: number): Promise<boolean> => {
    if (index < 0 || index >= steps.length) return false
    
    // Validate current step before moving forward
    if (index > currentStepIndex.value) {
      const valid = await validateCurrentStep()
      if (!valid) return false
    }
    
    currentStepIndex.value = index
    return true
  }

  const nextStep = async (): Promise<boolean> => {
    return goToStep(currentStepIndex.value + 1)
  }

  const prevStep = (): boolean => {
    if (isFirstStep.value) return false
    currentStepIndex.value--
    return true
  }

  const validateCurrentStep = async (): Promise<boolean> => {
    const step = currentStep.value
    if (!step.validate) {
      completedSteps.value.add(step.id)
      return true
    }

    isValidating.value = true
    try {
      const valid = await step.validate()
      if (valid) {
        completedSteps.value.add(step.id)
      }
      return valid
    } finally {
      isValidating.value = false
    }
  }

  const setStepData = (stepId: string, data: any) => {
    stepData.value[stepId] = data
  }

  const getStepData = (stepId: string) => {
    return stepData.value[stepId]
  }

  const isStepCompleted = (stepId: string): boolean => {
    return completedSteps.value.has(stepId)
  }

  const reset = () => {
    currentStepIndex.value = 0
    completedSteps.value.clear()
    stepData.value = {}
  }

  return {
    steps,
    currentStep,
    currentStepIndex,
    isFirstStep,
    isLastStep,
    progress,
    isValidating,
    goToStep,
    nextStep,
    prevStep,
    validateCurrentStep,
    setStepData,
    getStepData,
    isStepCompleted,
    reset
  }
}


// ============================================
// SESSION 30 (F231): Multi-Step Form
// ============================================

interface FormField {
  name: string
  value: any
  rules?: ((value: any) => boolean | string)[]
  error?: string
  touched?: boolean
}

export function useMultiStepForm<T extends Record<string, any>>(initialData: T) {
  const formData = reactive<T>({ ...initialData })
  const fields = ref<Map<string, FormField>>(new Map())
  const currentStep = ref(0)
  const totalSteps = ref(1)
  const isSubmitting = ref(false)

  const registerField = (name: string, rules?: ((value: any) => boolean | string)[]) => {
    fields.value.set(name, {
      name,
      value: (formData as any)[name],
      rules,
      error: undefined,
      touched: false
    })
  }

  const setFieldValue = (name: string, value: any) => {
    (formData as any)[name] = value
    const field = fields.value.get(name)
    if (field) {
      field.value = value
      field.touched = true
      validateField(name)
    }
  }

  const validateField = (name: string): boolean => {
    const field = fields.value.get(name)
    if (!field || !field.rules) return true

    for (const rule of field.rules) {
      const result = rule(field.value)
      if (result !== true) {
        field.error = typeof result === 'string' ? result : 'Invalid value'
        return false
      }
    }
    field.error = undefined
    return true
  }

  const validateAll = (): boolean => {
    let valid = true
    fields.value.forEach((_, name) => {
      if (!validateField(name)) valid = false
    })
    return valid
  }

  const getFieldError = (name: string): string | undefined => {
    return fields.value.get(name)?.error
  }

  const isFieldTouched = (name: string): boolean => {
    return fields.value.get(name)?.touched || false
  }

  const reset = () => {
    Object.assign(formData, initialData)
    fields.value.forEach(field => {
      field.value = (initialData as any)[field.name]
      field.error = undefined
      field.touched = false
    })
    currentStep.value = 0
  }

  const submit = async (handler: (data: T) => Promise<void>): Promise<boolean> => {
    if (!validateAll()) return false
    
    isSubmitting.value = true
    try {
      await handler(formData)
      return true
    } catch {
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    formData,
    currentStep,
    totalSteps,
    isSubmitting,
    registerField,
    setFieldValue,
    validateField,
    validateAll,
    getFieldError,
    isFieldTouched,
    reset,
    submit
  }
}

// ============================================
// SESSION 31 (F232): Notification Queue
// ============================================

interface QueuedNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: { label: string; handler: () => void }
}

export function useNotificationQueue() {
  const notifications = ref<QueuedNotification[]>([])
  const maxVisible = ref(5)

  const add = (notification: Omit<QueuedNotification, 'id'>): string => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const newNotification: QueuedNotification = { ...notification, id }
    
    notifications.value.push(newNotification)
    
    // Auto-remove after duration
    if (notification.duration !== 0) {
      const duration = notification.duration || 5000
      setTimeout(() => remove(id), duration)
    }
    
    // Limit visible notifications
    while (notifications.value.length > maxVisible.value) {
      notifications.value.shift()
    }
    
    return id
  }

  const remove = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) notifications.value.splice(index, 1)
  }

  const clear = () => {
    notifications.value = []
  }

  const success = (title: string, message?: string) => add({ type: 'success', title, message })
  const error = (title: string, message?: string) => add({ type: 'error', title, message, duration: 0 })
  const warning = (title: string, message?: string) => add({ type: 'warning', title, message })
  const info = (title: string, message?: string) => add({ type: 'info', title, message })

  return { notifications, add, remove, clear, success, error, warning, info }
}

// ============================================
// SESSION 32 (F233): Modal Manager
// ============================================

interface ModalConfig {
  id: string
  component?: any
  props?: Record<string, any>
  closable?: boolean
  onClose?: () => void
}

export function useModalManager() {
  const modals = ref<ModalConfig[]>([])
  const activeModal = computed(() => modals.value[modals.value.length - 1])

  const open = (config: ModalConfig) => {
    modals.value.push({ closable: true, ...config })
  }

  const close = (id?: string) => {
    if (id) {
      const index = modals.value.findIndex(m => m.id === id)
      if (index > -1) {
        modals.value[index].onClose?.()
        modals.value.splice(index, 1)
      }
    } else if (modals.value.length > 0) {
      const modal = modals.value.pop()
      modal?.onClose?.()
    }
  }

  const closeAll = () => {
    modals.value.forEach(m => m.onClose?.())
    modals.value = []
  }

  const isOpen = (id: string): boolean => {
    return modals.value.some(m => m.id === id)
  }

  const hasModals = computed(() => modals.value.length > 0)

  return { modals, activeModal, hasModals, open, close, closeAll, isOpen }
}

// ============================================
// SESSION 33 (F234): Confirmation Dialog
// ============================================

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}

export function useConfirmation() {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions | null>(null)
  let resolvePromise: ((value: boolean) => void) | null = null

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    options.value = {
      confirmText: 'ยืนยัน',
      cancelText: 'ยกเลิก',
      type: 'info',
      ...opts
    }
    isOpen.value = true

    return new Promise(resolve => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    isOpen.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  const handleCancel = () => {
    isOpen.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return { isOpen, options, confirm, handleConfirm, handleCancel }
}


// ============================================
// SESSION 34 (F235): Loading State Manager
// ============================================

export function useLoadingState() {
  const loadingStates = reactive<Record<string, boolean>>({})
  const loadingCount = ref(0)

  const isLoading = (key?: string): boolean => {
    if (key) return loadingStates[key] || false
    return loadingCount.value > 0
  }

  const startLoading = (key: string = 'default') => {
    if (!loadingStates[key]) {
      loadingStates[key] = true
      loadingCount.value++
    }
  }

  const stopLoading = (key: string = 'default') => {
    if (loadingStates[key]) {
      loadingStates[key] = false
      loadingCount.value--
    }
  }

  const withLoading = async <T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    startLoading(key)
    try {
      return await fn()
    } finally {
      stopLoading(key)
    }
  }

  const isAnyLoading = computed(() => loadingCount.value > 0)

  return { loadingStates, isLoading, startLoading, stopLoading, withLoading, isAnyLoading }
}

// ============================================
// SESSION 35 (F236): Error Boundary
// ============================================

interface ErrorInfo {
  message: string
  stack?: string
  componentName?: string
  timestamp: number
}

export function useErrorBoundary() {
  const errors = ref<ErrorInfo[]>([])
  const hasError = computed(() => errors.value.length > 0)
  const lastError = computed(() => errors.value[errors.value.length - 1])

  const captureError = (error: Error, componentName?: string) => {
    errors.value.push({
      message: error.message,
      stack: error.stack,
      componentName,
      timestamp: Date.now()
    })
  }

  const clearErrors = () => {
    errors.value = []
  }

  const clearLastError = () => {
    errors.value.pop()
  }

  const withErrorBoundary = async <T>(
    fn: () => Promise<T>,
    componentName?: string
  ): Promise<T | null> => {
    try {
      return await fn()
    } catch (error) {
      captureError(error as Error, componentName)
      return null
    }
  }

  return { errors, hasError, lastError, captureError, clearErrors, clearLastError, withErrorBoundary }
}

// ============================================
// SESSION 36 (F237): Analytics Tracker
// ============================================

interface AnalyticsEvent {
  name: string
  category: string
  properties?: Record<string, any>
  timestamp: number
  sessionId: string
}

export function useAnalyticsTracker() {
  const events = ref<AnalyticsEvent[]>([])
  const sessionId = ref(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  const userId = ref<string | null>(null)

  const track = (name: string, category: string, properties?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      name,
      category,
      properties: { ...properties, userId: userId.value },
      timestamp: Date.now(),
      sessionId: sessionId.value
    }
    events.value.push(event)
    
    // Keep only last 1000 events
    if (events.value.length > 1000) {
      events.value = events.value.slice(-1000)
    }
  }

  const trackPageView = (pageName: string, pageUrl?: string) => {
    track('page_view', 'navigation', { pageName, pageUrl: pageUrl || window.location.href })
  }

  const trackClick = (elementId: string, elementText?: string) => {
    track('click', 'interaction', { elementId, elementText })
  }

  const trackError = (errorMessage: string, errorStack?: string) => {
    track('error', 'error', { errorMessage, errorStack })
  }

  const trackTiming = (name: string, duration: number, category: string = 'performance') => {
    track(name, category, { duration })
  }

  const setUserId = (id: string) => {
    userId.value = id
  }

  const getEvents = (filter?: { category?: string; name?: string }) => {
    return events.value.filter(e => {
      if (filter?.category && e.category !== filter.category) return false
      if (filter?.name && e.name !== filter.name) return false
      return true
    })
  }

  const flush = (): AnalyticsEvent[] => {
    const flushed = [...events.value]
    events.value = []
    return flushed
  }

  return {
    events,
    sessionId,
    track,
    trackPageView,
    trackClick,
    trackError,
    trackTiming,
    setUserId,
    getEvents,
    flush
  }
}

// ============================================
// SESSION 37 (F238): Session Manager
// ============================================

interface SessionData {
  id: string
  userId?: string
  startedAt: number
  lastActivityAt: number
  data: Record<string, any>
}

export function useSessionManager(options: { timeout?: number; storage?: 'local' | 'session' } = {}) {
  const { timeout = 30 * 60 * 1000, storage = 'session' } = options // 30 minutes default
  
  const storageApi = storage === 'local' ? localStorage : sessionStorage
  const SESSION_KEY = 'app_session'
  
  const session = ref<SessionData | null>(null)
  const isExpired = ref(false)

  const createSession = (userId?: string): SessionData => {
    const newSession: SessionData = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      data: {}
    }
    session.value = newSession
    saveSession()
    return newSession
  }

  const loadSession = (): SessionData | null => {
    const saved = storageApi.getItem(SESSION_KEY)
    if (!saved) return null
    
    const parsed = JSON.parse(saved) as SessionData
    
    // Check if expired
    if (Date.now() - parsed.lastActivityAt > timeout) {
      isExpired.value = true
      destroySession()
      return null
    }
    
    session.value = parsed
    return parsed
  }

  const saveSession = () => {
    if (session.value) {
      storageApi.setItem(SESSION_KEY, JSON.stringify(session.value))
    }
  }

  const updateActivity = () => {
    if (session.value) {
      session.value.lastActivityAt = Date.now()
      saveSession()
    }
  }

  const setSessionData = (key: string, value: any) => {
    if (session.value) {
      session.value.data[key] = value
      saveSession()
    }
  }

  const getSessionData = (key: string) => {
    return session.value?.data[key]
  }

  const destroySession = () => {
    session.value = null
    storageApi.removeItem(SESSION_KEY)
  }

  const getSessionDuration = (): number => {
    if (!session.value) return 0
    return Date.now() - session.value.startedAt
  }

  return {
    session,
    isExpired,
    createSession,
    loadSession,
    updateActivity,
    setSessionData,
    getSessionData,
    destroySession,
    getSessionDuration
  }
}


// ============================================
// SESSION 38 (F239): Permission Manager
// ============================================

type Permission = string
type Role = string

interface PermissionConfig {
  roles: Record<Role, Permission[]>
  hierarchy?: Record<Role, Role[]> // Role inheritance
}

export function usePermissionManager(config: PermissionConfig) {
  const userRoles = ref<Role[]>([])
  const userPermissions = ref<Permission[]>([])

  const setRoles = (roles: Role[]) => {
    userRoles.value = roles
    computePermissions()
  }

  const computePermissions = () => {
    const permissions = new Set<Permission>()
    
    const addRolePermissions = (role: Role) => {
      // Add direct permissions
      config.roles[role]?.forEach(p => permissions.add(p))
      
      // Add inherited permissions
      config.hierarchy?.[role]?.forEach(inheritedRole => {
        addRolePermissions(inheritedRole)
      })
    }
    
    userRoles.value.forEach(addRolePermissions)
    userPermissions.value = [...permissions]
  }

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.value.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }

  const hasRole = (role: Role): boolean => {
    return userRoles.value.includes(role)
  }

  const can = (action: string, resource: string): boolean => {
    return hasPermission(`${action}:${resource}`)
  }

  return {
    userRoles,
    userPermissions,
    setRoles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    can
  }
}

// ============================================
// SESSION 39 (F240): Theme Manager
// ============================================

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  error: string
  success: string
  warning: string
}

export function useThemeManager() {
  const mode = ref<ThemeMode>('system')
  const isDark = ref(false)
  const customColors = ref<Partial<ThemeColors>>({})

  const defaultLightColors: ThemeColors = {
    primary: '#00A86B',
    secondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    textSecondary: '#666666',
    border: '#E8E8E8',
    error: '#E53935',
    success: '#00A86B',
    warning: '#F5A623'
  }

  const defaultDarkColors: ThemeColors = {
    primary: '#00C77B',
    secondary: '#999999',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#333333',
    error: '#FF5252',
    success: '#00C77B',
    warning: '#FFB74D'
  }

  const colors = computed<ThemeColors>(() => {
    const baseColors = isDark.value ? defaultDarkColors : defaultLightColors
    return { ...baseColors, ...customColors.value }
  })

  const setMode = (newMode: ThemeMode) => {
    mode.value = newMode
    updateTheme()
    localStorage.setItem('theme_mode', newMode)
  }

  const updateTheme = () => {
    if (mode.value === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = mode.value === 'dark'
    }
    applyTheme()
  }

  const applyTheme = () => {
    const root = document.documentElement
    Object.entries(colors.value).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })
    root.classList.toggle('dark', isDark.value)
  }

  const setCustomColor = (key: keyof ThemeColors, value: string) => {
    customColors.value[key] = value
    applyTheme()
  }

  onMounted(() => {
    const savedMode = localStorage.getItem('theme_mode') as ThemeMode | null
    if (savedMode) mode.value = savedMode
    updateTheme()

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') updateTheme()
    })
  })

  return { mode, isDark, colors, setMode, setCustomColor }
}

// ============================================
// SESSION 40 (F241): Locale Manager
// ============================================

interface LocaleConfig {
  locale: string
  messages: Record<string, string>
  dateFormat?: string
  numberFormat?: Intl.NumberFormatOptions
  currencyFormat?: Intl.NumberFormatOptions
}

export function useLocaleManager(defaultLocale: string = 'th') {
  const currentLocale = ref(defaultLocale)
  const locales = ref<Map<string, LocaleConfig>>(new Map())

  const registerLocale = (config: LocaleConfig) => {
    locales.value.set(config.locale, config)
  }

  const setLocale = (locale: string) => {
    if (locales.value.has(locale)) {
      currentLocale.value = locale
      localStorage.setItem('app_locale', locale)
    }
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const config = locales.value.get(currentLocale.value)
    let message = config?.messages[key] || key

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        message = message.replace(new RegExp(`{${k}}`, 'g'), String(v))
      })
    }

    return message
  }

  const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
    const d = new Date(date)
    return d.toLocaleDateString(currentLocale.value, options)
  }

  const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
    const config = locales.value.get(currentLocale.value)
    return num.toLocaleString(currentLocale.value, options || config?.numberFormat)
  }

  const formatCurrency = (amount: number, currency: string = 'THB'): string => {
    return amount.toLocaleString(currentLocale.value, {
      style: 'currency',
      currency
    })
  }

  const formatRelativeTime = (date: Date | string | number): string => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'เมื่อสักครู่'
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
    if (days < 7) return `${days} วันที่แล้ว`
    return formatDate(d)
  }

  onMounted(() => {
    const savedLocale = localStorage.getItem('app_locale')
    if (savedLocale && locales.value.has(savedLocale)) {
      currentLocale.value = savedLocale
    }
  })

  return {
    currentLocale,
    locales,
    registerLocale,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime
  }
}


// ============================================
// SESSION 41 (F242): Accessibility Manager
// ============================================

interface A11yConfig {
  announceRouteChanges: boolean
  focusTrap: boolean
  skipLinks: boolean
  highContrast: boolean
  reducedMotion: boolean
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'
}

export function useAccessibility() {
  const config = reactive<A11yConfig>({
    announceRouteChanges: true,
    focusTrap: true,
    skipLinks: true,
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium'
  })

  const liveRegion = ref<HTMLElement | null>(null)

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegion.value) {
      liveRegion.value = document.createElement('div')
      liveRegion.value.setAttribute('aria-live', priority)
      liveRegion.value.setAttribute('aria-atomic', 'true')
      liveRegion.value.className = 'sr-only'
      document.body.appendChild(liveRegion.value)
    }
    
    liveRegion.value.setAttribute('aria-live', priority)
    liveRegion.value.textContent = ''
    setTimeout(() => {
      if (liveRegion.value) liveRegion.value.textContent = message
    }, 100)
  }

  const setFontSize = (size: A11yConfig['fontSize']) => {
    config.fontSize = size
    const sizes = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' }
    document.documentElement.style.fontSize = sizes[size]
    localStorage.setItem('a11y_fontSize', size)
  }

  const setHighContrast = (enabled: boolean) => {
    config.highContrast = enabled
    document.documentElement.classList.toggle('high-contrast', enabled)
    localStorage.setItem('a11y_highContrast', String(enabled))
  }

  const setReducedMotion = (enabled: boolean) => {
    config.reducedMotion = enabled
    document.documentElement.classList.toggle('reduced-motion', enabled)
    localStorage.setItem('a11y_reducedMotion', String(enabled))
  }

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => container.removeEventListener('keydown', handleKeyDown)
  }

  const prefersReducedMotion = (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  onMounted(() => {
    // Load saved preferences
    const savedFontSize = localStorage.getItem('a11y_fontSize') as A11yConfig['fontSize']
    if (savedFontSize) setFontSize(savedFontSize)
    
    const savedHighContrast = localStorage.getItem('a11y_highContrast')
    if (savedHighContrast === 'true') setHighContrast(true)
    
    const savedReducedMotion = localStorage.getItem('a11y_reducedMotion')
    if (savedReducedMotion === 'true' || prefersReducedMotion()) {
      setReducedMotion(true)
    }
  })

  return {
    config,
    announce,
    setFontSize,
    setHighContrast,
    setReducedMotion,
    trapFocus,
    prefersReducedMotion
  }
}

// ============================================
// SESSION 42 (F243): Device Detection
// ============================================

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown'
  isTouchDevice: boolean
  isStandalone: boolean
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  orientation: 'portrait' | 'landscape'
}

export function useDeviceDetection() {
  const device = reactive<DeviceInfo>({
    type: 'desktop',
    os: 'unknown',
    browser: 'unknown',
    isTouchDevice: false,
    isStandalone: false,
    screenWidth: 0,
    screenHeight: 0,
    pixelRatio: 1,
    orientation: 'portrait'
  })

  const detectDevice = () => {
    const ua = navigator.userAgent.toLowerCase()
    
    // Device type
    if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
      device.type = 'mobile'
    } else if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
      device.type = 'tablet'
    } else {
      device.type = 'desktop'
    }

    // OS
    if (/iphone|ipad|ipod/i.test(ua)) device.os = 'ios'
    else if (/android/i.test(ua)) device.os = 'android'
    else if (/windows/i.test(ua)) device.os = 'windows'
    else if (/macintosh|mac os/i.test(ua)) device.os = 'macos'
    else if (/linux/i.test(ua)) device.os = 'linux'

    // Browser
    if (/edg/i.test(ua)) device.browser = 'edge'
    else if (/opr|opera/i.test(ua)) device.browser = 'opera'
    else if (/chrome/i.test(ua)) device.browser = 'chrome'
    else if (/safari/i.test(ua)) device.browser = 'safari'
    else if (/firefox/i.test(ua)) device.browser = 'firefox'

    // Touch
    device.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // Standalone (PWA)
    device.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    // Screen
    updateScreenInfo()
  }

  const updateScreenInfo = () => {
    device.screenWidth = window.innerWidth
    device.screenHeight = window.innerHeight
    device.pixelRatio = window.devicePixelRatio || 1
    device.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  }

  const isMobile = computed(() => device.type === 'mobile')
  const isTablet = computed(() => device.type === 'tablet')
  const isDesktop = computed(() => device.type === 'desktop')
  const isIOS = computed(() => device.os === 'ios')
  const isAndroid = computed(() => device.os === 'android')

  onMounted(() => {
    detectDevice()
    window.addEventListener('resize', updateScreenInfo)
    window.addEventListener('orientationchange', updateScreenInfo)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreenInfo)
    window.removeEventListener('orientationchange', updateScreenInfo)
  })

  return { device, isMobile, isTablet, isDesktop, isIOS, isAndroid }
}

// ============================================
// SESSION 43 (F244): Geolocation Manager
// ============================================

interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

export function useGeolocation(options: PositionOptions = {}) {
  const position = ref<GeoPosition | null>(null)
  const error = ref<GeolocationPositionError | null>(null)
  const loading = ref(false)
  const watching = ref(false)
  let watchId: number | null = null

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    ...options
  }

  const getCurrentPosition = (): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      loading.value = true
      error.value = null

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos = mapPosition(pos)
          position.value = geoPos
          loading.value = false
          resolve(geoPos)
        },
        (err) => {
          error.value = err
          loading.value = false
          reject(err)
        },
        defaultOptions
      )
    })
  }

  const watchPosition = () => {
    if (!navigator.geolocation || watching.value) return

    watching.value = true
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        position.value = mapPosition(pos)
        error.value = null
      },
      (err) => {
        error.value = err
      },
      defaultOptions
    )
  }

  const stopWatching = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
      watching.value = false
    }
  }

  const mapPosition = (pos: GeolocationPosition): GeoPosition => ({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude ?? undefined,
    altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
    timestamp: pos.timestamp
  })

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (deg: number): number => deg * (Math.PI / 180)

  onUnmounted(stopWatching)

  return {
    position,
    error,
    loading,
    watching,
    getCurrentPosition,
    watchPosition,
    stopWatching,
    calculateDistance
  }
}


// ============================================
// SESSION 44 (F245): Media Query Manager
// ============================================

interface Breakpoints {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

export function useMediaQuery() {
  const breakpoints: Breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }

  const current = ref<keyof Breakpoints>('xs')
  const width = ref(0)

  const isXs = computed(() => current.value === 'xs')
  const isSm = computed(() => current.value === 'sm')
  const isMd = computed(() => current.value === 'md')
  const isLg = computed(() => current.value === 'lg')
  const isXl = computed(() => current.value === 'xl')
  const is2xl = computed(() => current.value === '2xl')

  const isSmAndUp = computed(() => width.value >= breakpoints.sm)
  const isMdAndUp = computed(() => width.value >= breakpoints.md)
  const isLgAndUp = computed(() => width.value >= breakpoints.lg)
  const isXlAndUp = computed(() => width.value >= breakpoints.xl)

  const isSmAndDown = computed(() => width.value < breakpoints.md)
  const isMdAndDown = computed(() => width.value < breakpoints.lg)
  const isLgAndDown = computed(() => width.value < breakpoints.xl)

  const updateBreakpoint = () => {
    width.value = window.innerWidth
    
    if (width.value >= breakpoints['2xl']) current.value = '2xl'
    else if (width.value >= breakpoints.xl) current.value = 'xl'
    else if (width.value >= breakpoints.lg) current.value = 'lg'
    else if (width.value >= breakpoints.md) current.value = 'md'
    else if (width.value >= breakpoints.sm) current.value = 'sm'
    else current.value = 'xs'
  }

  const matches = (query: string): boolean => {
    return window.matchMedia(query).matches
  }

  onMounted(() => {
    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateBreakpoint)
  })

  return {
    breakpoints,
    current,
    width,
    isXs, isSm, isMd, isLg, isXl, is2xl,
    isSmAndUp, isMdAndUp, isLgAndUp, isXlAndUp,
    isSmAndDown, isMdAndDown, isLgAndDown,
    matches
  }
}

// ============================================
// SESSION 45 (F246): Scroll Manager
// ============================================

export function useScrollManager() {
  const scrollY = ref(0)
  const scrollX = ref(0)
  const scrollDirection = ref<'up' | 'down' | 'none'>('none')
  const isScrolling = ref(false)
  const isAtTop = ref(true)
  const isAtBottom = ref(false)
  
  let lastScrollY = 0
  let scrollTimeout: number | null = null

  const updateScroll = () => {
    scrollY.value = window.scrollY
    scrollX.value = window.scrollX
    
    // Direction
    if (scrollY.value > lastScrollY) {
      scrollDirection.value = 'down'
    } else if (scrollY.value < lastScrollY) {
      scrollDirection.value = 'up'
    }
    lastScrollY = scrollY.value

    // Position
    isAtTop.value = scrollY.value <= 0
    isAtBottom.value = window.innerHeight + scrollY.value >= document.documentElement.scrollHeight - 10

    // Scrolling state
    isScrolling.value = true
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(() => {
      isScrolling.value = false
      scrollDirection.value = 'none'
    }, 150)
  }

  const scrollTo = (options: ScrollToOptions | number) => {
    if (typeof options === 'number') {
      window.scrollTo({ top: options, behavior: 'smooth' })
    } else {
      window.scrollTo({ behavior: 'smooth', ...options })
    }
  }

  const scrollToTop = () => scrollTo(0)
  
  const scrollToBottom = () => {
    scrollTo(document.documentElement.scrollHeight)
  }

  const scrollToElement = (selector: string, offset: number = 0) => {
    const element = document.querySelector(selector)
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      scrollTo(top)
    }
  }

  const lockScroll = () => {
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`
  }

  const unlockScroll = () => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }

  onMounted(() => {
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', updateScroll)
    if (scrollTimeout) clearTimeout(scrollTimeout)
  })

  return {
    scrollY,
    scrollX,
    scrollDirection,
    isScrolling,
    isAtTop,
    isAtBottom,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    scrollToElement,
    lockScroll,
    unlockScroll
  }
}

// ============================================
// SESSION 46 (F247): Focus Manager
// ============================================

export function useFocusManager() {
  const focusedElement = ref<HTMLElement | null>(null)
  const focusHistory = ref<HTMLElement[]>([])

  const saveFocus = () => {
    if (document.activeElement instanceof HTMLElement) {
      focusHistory.value.push(document.activeElement)
    }
  }

  const restoreFocus = () => {
    const lastFocused = focusHistory.value.pop()
    if (lastFocused && document.body.contains(lastFocused)) {
      lastFocused.focus()
    }
  }

  const focusFirst = (container: HTMLElement) => {
    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()
  }

  const focusLast = (container: HTMLElement) => {
    const focusables = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusables[focusables.length - 1]?.focus()
  }

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    return Array.from(container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    ))
  }

  const moveFocus = (container: HTMLElement, direction: 'next' | 'prev') => {
    const focusables = getFocusableElements(container)
    const currentIndex = focusables.indexOf(document.activeElement as HTMLElement)
    
    let nextIndex: number
    if (direction === 'next') {
      nextIndex = currentIndex + 1 >= focusables.length ? 0 : currentIndex + 1
    } else {
      nextIndex = currentIndex - 1 < 0 ? focusables.length - 1 : currentIndex - 1
    }
    
    focusables[nextIndex]?.focus()
  }

  const updateFocusedElement = () => {
    focusedElement.value = document.activeElement instanceof HTMLElement 
      ? document.activeElement 
      : null
  }

  onMounted(() => {
    document.addEventListener('focusin', updateFocusedElement)
  })

  onUnmounted(() => {
    document.removeEventListener('focusin', updateFocusedElement)
  })

  return {
    focusedElement,
    focusHistory,
    saveFocus,
    restoreFocus,
    focusFirst,
    focusLast,
    getFocusableElements,
    moveFocus
  }
}

// ============================================
// SESSION 47 (F248): Animation Controller
// ============================================

interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
  iterations?: number
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  fill?: 'none' | 'forwards' | 'backwards' | 'both'
}

export function useAnimationController() {
  const animations = ref<Map<string, Animation>>(new Map())

  const animate = (
    element: HTMLElement,
    keyframes: Keyframe[],
    config: AnimationConfig,
    id?: string
  ): Animation => {
    const animation = element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      delay: config.delay || 0,
      iterations: config.iterations || 1,
      direction: config.direction || 'normal',
      fill: config.fill || 'none'
    })

    if (id) {
      animations.value.set(id, animation)
    }

    return animation
  }

  const fadeIn = (element: HTMLElement, duration: number = 300): Animation => {
    return animate(element, [
      { opacity: 0 },
      { opacity: 1 }
    ], { duration, easing: 'ease-out', fill: 'forwards' })
  }

  const fadeOut = (element: HTMLElement, duration: number = 300): Animation => {
    return animate(element, [
      { opacity: 1 },
      { opacity: 0 }
    ], { duration, easing: 'ease-out', fill: 'forwards' })
  }

  const slideIn = (element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up', duration: number = 300): Animation => {
    const transforms: Record<string, string> = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)'
    }
    
    return animate(element, [
      { opacity: 0, transform: transforms[direction] },
      { opacity: 1, transform: 'translate(0)' }
    ], { duration, easing: 'ease-out', fill: 'forwards' })
  }

  const scale = (element: HTMLElement, from: number, to: number, duration: number = 300): Animation => {
    return animate(element, [
      { transform: `scale(${from})` },
      { transform: `scale(${to})` }
    ], { duration, easing: 'ease-out', fill: 'forwards' })
  }

  const pause = (id: string) => {
    animations.value.get(id)?.pause()
  }

  const play = (id: string) => {
    animations.value.get(id)?.play()
  }

  const cancel = (id: string) => {
    animations.value.get(id)?.cancel()
    animations.value.delete(id)
  }

  const cancelAll = () => {
    animations.value.forEach(anim => anim.cancel())
    animations.value.clear()
  }

  return { animations, animate, fadeIn, fadeOut, slideIn, scale, pause, play, cancel, cancelAll }
}


// ============================================
// SESSION 48 (F249): File Manager
// ============================================

interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: number
  preview?: string
}

export function useFileManager() {
  const files = ref<FileInfo[]>([])
  const uploading = ref(false)
  const progress = ref(0)

  const selectFiles = (options: { accept?: string; multiple?: boolean } = {}): Promise<File[]> => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = options.accept || '*/*'
      input.multiple = options.multiple || false
      
      input.onchange = () => {
        const selectedFiles = Array.from(input.files || [])
        resolve(selectedFiles)
      }
      
      input.click()
    })
  }

  const addFiles = async (newFiles: File[]) => {
    for (const file of newFiles) {
      const info: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        info.preview = await generatePreview(file)
      }

      files.value.push(info)
    }
  }

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    files.value.splice(index, 1)
  }

  const clearFiles = () => {
    files.value = []
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File, options: {
    maxSize?: number
    allowedTypes?: string[]
  }): { valid: boolean; error?: string } => {
    if (options.maxSize && file.size > options.maxSize) {
      return { valid: false, error: `File size exceeds ${formatFileSize(options.maxSize)}` }
    }
    
    if (options.allowedTypes && !options.allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })) {
      return { valid: false, error: 'File type not allowed' }
    }
    
    return { valid: true }
  }

  return {
    files,
    uploading,
    progress,
    selectFiles,
    addFiles,
    removeFile,
    clearFiles,
    formatFileSize,
    validateFile
  }
}

// ============================================
// SESSION 49 (F250): Image Processor
// ============================================

export function useImageProcessor() {
  const resize = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number = 0.8
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          file.type,
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const crop = (
    file: File,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          file.type
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const rotate = (file: File, degrees: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const radians = (degrees * Math.PI) / 180
        
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        
        const ctx = canvas.getContext('2d')!
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(radians)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          file.type
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const compress = (file: File, quality: number = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  return { resize, crop, rotate, compress, getImageDimensions }
}

// ============================================
// SESSION 50 (F251): System Health Monitor
// ============================================

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memory: { used: number; total: number; percentage: number }
  network: { online: boolean; latency: number }
  storage: { used: number; quota: number; percentage: number }
  lastCheck: number
}

export function useSystemHealthMonitor() {
  const health = reactive<SystemHealth>({
    status: 'healthy',
    uptime: 0,
    memory: { used: 0, total: 0, percentage: 0 },
    network: { online: true, latency: 0 },
    storage: { used: 0, quota: 0, percentage: 0 },
    lastCheck: Date.now()
  })

  const startTime = Date.now()
  let checkInterval: number | null = null

  const checkHealth = async () => {
    // Uptime
    health.uptime = Date.now() - startTime

    // Memory
    if ((performance as any).memory) {
      const mem = (performance as any).memory
      health.memory = {
        used: mem.usedJSHeapSize,
        total: mem.jsHeapSizeLimit,
        percentage: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
      }
    }

    // Network
    health.network.online = navigator.onLine
    if (navigator.onLine) {
      const start = performance.now()
      try {
        await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' })
        health.network.latency = performance.now() - start
      } catch {
        health.network.latency = -1
      }
    }

    // Storage
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate()
      health.storage = {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
      }
    }

    // Determine overall status
    health.status = determineStatus()
    health.lastCheck = Date.now()
  }

  const determineStatus = (): SystemHealth['status'] => {
    if (!health.network.online) return 'unhealthy'
    if (health.memory.percentage > 90) return 'unhealthy'
    if (health.storage.percentage > 90) return 'unhealthy'
    if (health.memory.percentage > 70) return 'degraded'
    if (health.storage.percentage > 70) return 'degraded'
    if (health.network.latency > 1000) return 'degraded'
    return 'healthy'
  }

  const startMonitoring = (intervalMs: number = 30000) => {
    checkHealth()
    checkInterval = window.setInterval(checkHealth, intervalMs)
  }

  const stopMonitoring = () => {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
  }

  const getHealthReport = () => ({
    ...health,
    uptimeFormatted: formatUptime(health.uptime),
    memoryFormatted: `${formatBytes(health.memory.used)} / ${formatBytes(health.memory.total)}`,
    storageFormatted: `${formatBytes(health.storage.used)} / ${formatBytes(health.storage.quota)}`
  })

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  onMounted(() => startMonitoring())
  onUnmounted(() => stopMonitoring())

  return { health, checkHealth, startMonitoring, stopMonitoring, getHealthReport }
}
