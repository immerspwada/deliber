/**
 * useDriverTraining - Driver Training & Certification
 * Feature: F196 - Driver Training System
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface TrainingCourse {
  id: string
  title: string
  title_th: string
  description?: string
  course_type: 'onboarding' | 'safety' | 'service' | 'advanced'
  duration_minutes: number
  passing_score: number
  is_required: boolean
  is_active: boolean
  content_url?: string
  created_at: string
}

export interface ProviderCertification {
  id: string
  provider_id: string
  course_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  score?: number
  attempts: number
  started_at?: string
  completed_at?: string
  expires_at?: string
  course?: TrainingCourse
}

export function useDriverTraining() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const courses = ref<TrainingCourse[]>([])
  const certifications = ref<ProviderCertification[]>([])

  const requiredCourses = computed(() => courses.value.filter(c => c.is_required && c.is_active))
  const completedCertifications = computed(() => certifications.value.filter(c => c.status === 'completed'))
  const pendingCertifications = computed(() => certifications.value.filter(c => c.status !== 'completed'))

  const fetchCourses = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('training_courses').select('*').eq('is_active', true).order('title')
      if (err) throw err
      courses.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchProviderCertifications = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.from('provider_certifications').select('*, course:training_courses(*)').eq('provider_id', providerId)
      if (err) throw err
      certifications.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createCourse = async (course: Partial<TrainingCourse>): Promise<TrainingCourse | null> => {
    try {
      const { data, error: err } = await supabase.from('training_courses').insert(course as never).select().single()
      if (err) throw err
      courses.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const startCourse = async (providerId: string, courseId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_certifications').upsert({ provider_id: providerId, course_id: courseId, status: 'in_progress', started_at: new Date().toISOString(), attempts: 1 } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const completeCourse = async (certificationId: string, score: number): Promise<boolean> => {
    try {
      const cert = certifications.value.find(c => c.id === certificationId)
      const course = cert?.course || courses.value.find(c => c.id === cert?.course_id)
      const passed = score >= (course?.passing_score || 70)
      
      const { error: err } = await supabase.from('provider_certifications').update({
        status: passed ? 'completed' : 'failed',
        score,
        completed_at: passed ? new Date().toISOString() : null,
        expires_at: passed ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
      } as never).eq('id', certificationId)
      if (err) throw err
      return passed
    } catch (e: any) { error.value = e.message; return false }
  }

  const getCourseTypeText = (type: string) => ({ onboarding: 'เริ่มต้น', safety: 'ความปลอดภัย', service: 'บริการ', advanced: 'ขั้นสูง' }[type] || type)
  const getStatusText = (s: string) => ({ not_started: 'ยังไม่เริ่ม', in_progress: 'กำลังเรียน', completed: 'ผ่าน', failed: 'ไม่ผ่าน' }[s] || s)

  return { loading, error, courses, certifications, requiredCourses, completedCertifications, pendingCertifications, fetchCourses, fetchProviderCertifications, createCourse, startCourse, completeCourse, getCourseTypeText, getStatusText }
}
