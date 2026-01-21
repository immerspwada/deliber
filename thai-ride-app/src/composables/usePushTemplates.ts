/**
 * usePushTemplates - Push Notification Templates
 * Feature: F228 - Push Templates
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PushTemplate {
  id: string
  name: string
  name_th: string
  event_type: string
  title_template: string
  body_template: string
  is_active: boolean
}

export function usePushTemplates() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const templates = ref<PushTemplate[]>([])

  const activeTemplates = computed(() => templates.value.filter(t => t.is_active))

  const fetchTemplates = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('push_templates').select('*').order('name')
      if (err) throw err
      templates.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createTemplate = async (template: Partial<PushTemplate>): Promise<PushTemplate | null> => {
    try {
      const { data, error: err } = await supabase.from('push_templates').insert({ ...template, is_active: true } as never).select().single()
      if (err) throw err
      templates.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateTemplate = async (id: string, updates: Partial<PushTemplate>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('push_templates').update(updates as never).eq('id', id)
      if (err) throw err
      const idx = templates.value.findIndex(t => t.id === id)
      if (idx !== -1) Object.assign(templates.value[idx], updates)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const renderTemplate = (template: PushTemplate, variables: Record<string, string>): { title: string; body: string } => {
    let title = template.title_template
    let body = template.body_template
    for (const [key, value] of Object.entries(variables)) {
      title = title.replace(new RegExp(`{{${key}}}`, 'g'), value)
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    return { title, body }
  }

  const getTemplateByEvent = (eventType: string): PushTemplate | undefined => {
    return activeTemplates.value.find(t => t.event_type === eventType)
  }

  return { loading, error, templates, activeTemplates, fetchTemplates, createTemplate, updateTemplate, renderTemplate, getTemplateByEvent }
}
