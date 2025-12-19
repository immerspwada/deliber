/**
 * useI18nV2 - Enhanced Internationalization System
 * 
 * Feature: F29 - Internationalization System Enhancement
 * Tables: supported_languages, translation_keys, translations, 
 *         user_language_preferences, translation_requests, content_translations
 * Migration: 067_i18n_system.sql
 * 
 * @syncs-with
 * - Customer: เลือกภาษา, ดูเนื้อหาตามภาษา
 * - Provider: เลือกภาษา
 * - Admin: จัดการ translations, ดู stats
 */

import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface SupportedLanguage {
  id: string
  code: string
  name: string
  native_name: string
  flag_emoji?: string
  is_default: boolean
  is_active: boolean
  sort_order: number
}

export interface TranslationKey {
  id: string
  key: string
  namespace: string
  description?: string
  context?: string
  is_plural: boolean
}

export interface Translation {
  id: string
  key_id: string
  language_code: string
  value: string
  plural_value?: string
  is_verified: boolean
}

export interface TranslationStats {
  language_code: string
  language_name: string
  total_keys: number
  translated_count: number
  verified_count: number
  completion_pct: number
}

// Local storage key
const LANGUAGE_STORAGE_KEY = 'thai_ride_language'

export function useI18nV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const currentLanguage = ref<string>(localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'th')
  const fallbackLanguage = ref<string>('en')
  const languages = ref<SupportedLanguage[]>([])
  const translations = ref<Record<string, string>>({})
  const loadedNamespaces = ref<Set<string>>(new Set())

  // Computed
  const activeLanguages = computed(() => 
    languages.value.filter(l => l.is_active)
  )

  const currentLanguageInfo = computed(() => 
    languages.value.find(l => l.code === currentLanguage.value)
  )

  const isRTL = computed(() => 
    ['ar', 'he', 'fa'].includes(currentLanguage.value)
  )

  // =====================================================
  // CORE FUNCTIONS
  // =====================================================

  /**
   * Initialize i18n system
   */
  const init = async () => {
    loading.value = true
    try {
      // Fetch supported languages
      await fetchLanguages()

      // Load user preference if logged in
      if (authStore.user?.id) {
        const userLang = await getUserLanguage()
        if (userLang) {
          currentLanguage.value = userLang
        }
      }

      // Load common namespace
      await loadNamespace('common')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch supported languages
   */
  const fetchLanguages = async () => {
    try {
      const { data, error: err } = await supabase
        .from('supported_languages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (err) throw err
      languages.value = data || []
    } catch (e: any) {
      console.error('Fetch languages error:', e)
      // Fallback to default languages
      languages.value = [
        { id: '1', code: 'th', name: 'Thai', native_name: 'ไทย', flag_emoji: '🇹🇭', is_default: true, is_active: true, sort_order: 1 },
        { id: '2', code: 'en', name: 'English', native_name: 'English', flag_emoji: '🇺🇸', is_default: false, is_active: true, sort_order: 2 }
      ]
    }
  }

  /**
   * Load translations for namespace
   */
  const loadNamespace = async (namespace: string) => {
    if (loadedNamespaces.value.has(`${namespace}_${currentLanguage.value}`)) {
      return
    }

    try {
      const { data, error: err } = await supabase
        .rpc('get_translations_by_namespace', {
          p_namespace: namespace,
          p_language: currentLanguage.value
        })

      if (err) throw err

      // Merge translations
      data?.forEach((t: any) => {
        translations.value[t.key] = t.value
      })

      loadedNamespaces.value.add(`${namespace}_${currentLanguage.value}`)
    } catch (e: any) {
      console.error('Load namespace error:', e)
    }
  }

  /**
   * Get translation for key
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    let value = translations.value[key] || key

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{${k}}`, 'g'), String(v))
      })
    }

    return value
  }

  /**
   * Get translation with plural support
   */
  const tp = (key: string, count: number, params?: Record<string, string | number>): string => {
    const pluralKey = count === 1 ? key : `${key}_plural`
    return t(pluralKey, { ...params, count })
  }

  /**
   * Change language
   */
  const setLanguage = async (langCode: string) => {
    if (!languages.value.find(l => l.code === langCode)) {
      console.warn(`Language ${langCode} not supported`)
      return
    }

    currentLanguage.value = langCode
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode)

    // Clear loaded namespaces to reload
    loadedNamespaces.value.clear()
    translations.value = {}

    // Reload common namespace
    await loadNamespace('common')

    // Save to user preferences if logged in
    if (authStore.user?.id) {
      await saveUserLanguage(langCode)
    }
  }

  /**
   * Get user's preferred language
   */
  const getUserLanguage = async (): Promise<string | null> => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('get_user_language', { p_user_id: authStore.user.id })

      if (err) throw err
      return data
    } catch {
      return null
    }
  }

  /**
   * Save user language preference
   */
  const saveUserLanguage = async (langCode: string): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .rpc('set_user_language', {
          p_user_id: authStore.user.id,
          p_language: langCode
        })

      if (err) throw err
      return true
    } catch {
      return false
    }
  }

  /**
   * Get content translation
   */
  const getContentTranslation = async (
    contentType: string,
    contentId: string,
    field: string
  ): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('get_content_translation', {
          p_content_type: contentType,
          p_content_id: contentId,
          p_field: field,
          p_language: currentLanguage.value
        })

      if (err) throw err
      return data
    } catch {
      return null
    }
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch all translation keys
   */
  const fetchAllKeys = async (namespace?: string) => {
    try {
      let query = supabase.from('translation_keys').select('*')
      if (namespace) query = query.eq('namespace', namespace)

      const { data, error: err } = await query.order('key')
      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Fetch keys error:', e)
      return []
    }
  }

  /**
   * Create translation key
   */
  const createKey = async (key: Partial<TranslationKey>): Promise<TranslationKey | null> => {
    try {
      const { data, error: err } = await supabase
        .from('translation_keys')
        .insert(key)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Create key error:', e)
      return null
    }
  }

  /**
   * Fetch translations for key
   */
  const fetchTranslationsForKey = async (keyId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('translations')
        .select('*, language:supported_languages(native_name)')
        .eq('key_id', keyId)

      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Fetch translations error:', e)
      return []
    }
  }

  /**
   * Update translation
   */
  const updateTranslation = async (
    keyId: string,
    languageCode: string,
    value: string
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('translations')
        .upsert({
          key_id: keyId,
          language_code: languageCode,
          value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key_id,language_code' })

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Update translation error:', e)
      return false
    }
  }

  /**
   * Verify translation
   */
  const verifyTranslation = async (translationId: string): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .from('translations')
        .update({
          is_verified: true,
          verified_by: authStore.user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', translationId)

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Verify translation error:', e)
      return false
    }
  }

  /**
   * Bulk upsert translations
   */
  const bulkUpsertTranslations = async (
    items: Array<{ key: string; language: string; value: string }>
  ): Promise<number> => {
    try {
      const { data, error: err } = await supabase
        .rpc('upsert_translations', { p_translations: items })

      if (err) throw err
      return data || 0
    } catch (e: any) {
      console.error('Bulk upsert error:', e)
      return 0
    }
  }

  /**
   * Get translation stats
   */
  const getTranslationStats = async (): Promise<TranslationStats[]> => {
    try {
      const { data, error: err } = await supabase
        .rpc('get_translation_stats')

      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Get stats error:', e)
      return []
    }
  }

  /**
   * Add content translation
   */
  const addContentTranslation = async (
    contentType: string,
    contentId: string,
    languageCode: string,
    field: string,
    value: string
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('content_translations')
        .upsert({
          content_type: contentType,
          content_id: contentId,
          language_code: languageCode,
          field_name: field,
          translated_value: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'content_type,content_id,language_code,field_name' })

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Add content translation error:', e)
      return false
    }
  }

  /**
   * Export translations
   */
  const exportTranslations = async (languageCode: string): Promise<Record<string, string>> => {
    try {
      const { data, error: err } = await supabase
        .from('translations')
        .select('key:translation_keys(key), value')
        .eq('language_code', languageCode)

      if (err) throw err

      const result: Record<string, string> = {}
      data?.forEach((t: any) => {
        if (t.key?.key) {
          result[t.key.key] = t.value
        }
      })
      return result
    } catch (e: any) {
      console.error('Export translations error:', e)
      return {}
    }
  }

  /**
   * Import translations from JSON
   */
  const importTranslations = async (
    languageCode: string,
    data: Record<string, string>
  ): Promise<number> => {
    const items = Object.entries(data).map(([key, value]) => ({
      key,
      language: languageCode,
      value
    }))
    return bulkUpsertTranslations(items)
  }

  // Watch for language changes
  watch(currentLanguage, () => {
    document.documentElement.lang = currentLanguage.value
    document.documentElement.dir = isRTL.value ? 'rtl' : 'ltr'
  })

  return {
    // State
    loading,
    error,
    currentLanguage,
    fallbackLanguage,
    languages,
    translations,

    // Computed
    activeLanguages,
    currentLanguageInfo,
    isRTL,

    // Core functions
    init,
    fetchLanguages,
    loadNamespace,
    t,
    tp,
    setLanguage,
    getUserLanguage,
    saveUserLanguage,
    getContentTranslation,

    // Admin functions
    fetchAllKeys,
    createKey,
    fetchTranslationsForKey,
    updateTranslation,
    verifyTranslation,
    bulkUpsertTranslations,
    getTranslationStats,
    addContentTranslation,
    exportTranslations,
    importTranslations
  }
}
