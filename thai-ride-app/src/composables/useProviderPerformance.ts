/**
 * Feature: F37 - Provider Performance Score System
 * Tables: service_providers, ride_requests, ride_ratings, provider_daily_stats
 * 
 * ระบบคะแนนประสิทธิภาพสำหรับ Provider
 * - คำนวณคะแนนจากหลายปัจจัย
 * - แสดง badges และ achievements
 * - ใช้ในการจัดอันดับและให้สิทธิพิเศษ
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface PerformanceMetrics {
  acceptanceRate: number      // อัตราการรับงาน (%)
  completionRate: number      // อัตราการทำงานสำเร็จ (%)
  onTimeRate: number          // อัตราการตรงเวลา (%)
  rating: number              // คะแนนเฉลี่ย (1-5)
  responseTime: number        // เวลาตอบรับเฉลี่ย (วินาที)
  totalTrips: number          // จำนวนงานทั้งหมด
  cancellationRate: number    // อัตราการยกเลิก (%)
  onlineHours: number         // ชั่วโมงออนไลน์ (สัปดาห์นี้)
}

export interface PerformanceScore {
  overall: number             // คะแนนรวม (0-100)
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  levelName: string
  badges: Badge[]
  nextLevelProgress: number   // % ไปถึง level ถัดไป
  nextLevelScore: number      // คะแนนที่ต้องการ
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt?: string
}

const LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 40,
  gold: 60,
  platinum: 80,
  diamond: 95
}

const LEVEL_NAMES = {
  bronze: 'บรอนซ์',
  silver: 'ซิลเวอร์',
  gold: 'โกลด์',
  platinum: 'แพลทินัม',
  diamond: 'ไดมอนด์'
}

const AVAILABLE_BADGES: Badge[] = [
  { id: 'first_trip', name: 'เริ่มต้นดี', description: 'ทำงานครั้งแรกสำเร็จ', icon: 'star' },
  { id: 'trips_50', name: 'มือใหม่', description: 'ทำงานครบ 50 งาน', icon: 'medal' },
  { id: 'trips_100', name: 'มืออาชีพ', description: 'ทำงานครบ 100 งาน', icon: 'trophy' },
  { id: 'trips_500', name: 'ผู้เชี่ยวชาญ', description: 'ทำงานครบ 500 งาน', icon: 'crown' },
  { id: 'rating_48', name: 'บริการดีเยี่ยม', description: 'คะแนนเฉลี่ย 4.8+', icon: 'heart' },
  { id: 'perfect_week', name: 'สัปดาห์สมบูรณ์แบบ', description: 'ไม่มียกเลิกตลอดสัปดาห์', icon: 'check' },
  { id: 'early_bird', name: 'นกเช้า', description: 'ออนไลน์ก่อน 6 โมงเช้า 10 ครั้ง', icon: 'sun' },
  { id: 'night_owl', name: 'นกฮูก', description: 'ทำงานหลังเที่ยงคืน 10 ครั้ง', icon: 'moon' },
  { id: 'speed_demon', name: 'สายฟ้า', description: 'ตอบรับงานภายใน 10 วินาที 50 ครั้ง', icon: 'bolt' },
  { id: 'loyal', name: 'ซื่อสัตย์', description: 'ใช้งานต่อเนื่อง 30 วัน', icon: 'shield' }
]

export function useProviderPerformance() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<PerformanceMetrics | null>(null)
  const score = ref<PerformanceScore | null>(null)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Calculate overall score from metrics
  const calculateScore = (m: PerformanceMetrics): number => {
    // Weighted scoring
    const weights = {
      rating: 0.30,           // 30% - คะแนนรีวิว
      completionRate: 0.25,   // 25% - อัตราสำเร็จ
      acceptanceRate: 0.15,   // 15% - อัตราการรับงาน
      onTimeRate: 0.15,       // 15% - ตรงเวลา
      responseTime: 0.10,     // 10% - ความเร็วตอบรับ
      cancellation: 0.05      // 5% - ไม่ยกเลิก
    }

    // Normalize each metric to 0-100
    const ratingScore = (m.rating / 5) * 100
    const completionScore = m.completionRate
    const acceptanceScore = m.acceptanceRate
    const onTimeScore = m.onTimeRate
    const responseScore = Math.max(0, 100 - (m.responseTime / 60) * 100) // 60s = 0 score
    const cancellationScore = 100 - m.cancellationRate

    const overall = 
      ratingScore * weights.rating +
      completionScore * weights.completionRate +
      acceptanceScore * weights.acceptanceRate +
      onTimeScore * weights.onTimeRate +
      responseScore * weights.responseTime +
      cancellationScore * weights.cancellation

    return Math.round(Math.max(0, Math.min(100, overall)))
  }

  // Determine level from score
  const getLevel = (score: number): PerformanceScore['level'] => {
    if (score >= LEVEL_THRESHOLDS.diamond) return 'diamond'
    if (score >= LEVEL_THRESHOLDS.platinum) return 'platinum'
    if (score >= LEVEL_THRESHOLDS.gold) return 'gold'
    if (score >= LEVEL_THRESHOLDS.silver) return 'silver'
    return 'bronze'
  }

  // Get next level info
  const getNextLevelInfo = (currentScore: number, currentLevel: PerformanceScore['level']) => {
    const levels: PerformanceScore['level'][] = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    const currentIndex = levels.indexOf(currentLevel)
    
    if (currentIndex >= levels.length - 1) {
      return { progress: 100, nextScore: 100 }
    }

    const nextLevel = levels[currentIndex + 1]
    if (!nextLevel) {
      return { progress: 100, nextScore: 100 }
    }
    
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel]
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel]
    
    const progress = ((currentScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    
    return {
      progress: Math.min(100, Math.max(0, progress)),
      nextScore: nextThreshold
    }
  }

  // Determine earned badges
  const getEarnedBadges = (m: PerformanceMetrics): Badge[] => {
    const earned: Badge[] = []
    const now = new Date().toISOString()

    const addBadge = (index: number) => {
      const badge = AVAILABLE_BADGES[index]
      if (badge) {
        earned.push({ id: badge.id, name: badge.name, description: badge.description, icon: badge.icon, earnedAt: now })
      }
    }

    if (m.totalTrips >= 1) addBadge(0)
    if (m.totalTrips >= 50) addBadge(1)
    if (m.totalTrips >= 100) addBadge(2)
    if (m.totalTrips >= 500) addBadge(3)
    if (m.rating >= 4.8) addBadge(4)
    if (m.cancellationRate === 0 && m.totalTrips > 0) addBadge(5)

    return earned
  }

  // Fetch performance data for a provider
  const fetchPerformance = async (providerId: string) => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        // Demo data
        metrics.value = {
          acceptanceRate: 92,
          completionRate: 98,
          onTimeRate: 95,
          rating: 4.8,
          responseTime: 15,
          totalTrips: 156,
          cancellationRate: 2,
          onlineHours: 42
        }
      } else {
        // Fetch from database
        const { data: provider } = await supabase
          .from('service_providers')
          .select('rating, total_trips')
          .eq('id', providerId)
          .single()

        // Fetch completed rides count
        const { count: completedCount } = await supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('status', 'completed')

        // Fetch cancelled rides count
        const { count: cancelledCount } = await supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', providerId)
          .eq('status', 'cancelled')

        const totalRides = (completedCount || 0) + (cancelledCount || 0)
        const completionRate = totalRides > 0 ? ((completedCount || 0) / totalRides) * 100 : 100
        const cancellationRate = totalRides > 0 ? ((cancelledCount || 0) / totalRides) * 100 : 0

        const providerData = provider as { rating?: number; total_trips?: number } | null
        
        metrics.value = {
          acceptanceRate: 90, // Would need more tracking to calculate
          completionRate: Math.round(completionRate),
          onTimeRate: 90, // Would need more tracking
          rating: Number(providerData?.rating) || 5,
          responseTime: 20, // Would need more tracking
          totalTrips: providerData?.total_trips || 0,
          cancellationRate: Math.round(cancellationRate),
          onlineHours: 0 // Would fetch from provider_online_sessions
        }
      }

      // Calculate score
      const overallScore = calculateScore(metrics.value)
      const level = getLevel(overallScore)
      const { progress, nextScore } = getNextLevelInfo(overallScore, level)
      const badges = getEarnedBadges(metrics.value)

      score.value = {
        overall: overallScore,
        level,
        levelName: LEVEL_NAMES[level],
        badges,
        nextLevelProgress: progress,
        nextLevelScore: nextScore
      }

      return { metrics: metrics.value, score: score.value }
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Get level color
  const getLevelColor = (level: PerformanceScore['level']): string => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
      diamond: '#b9f2ff'
    }
    return colors[level]
  }

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#05944f'
    if (score >= 70) return '#276ef1'
    if (score >= 50) return '#ffc043'
    return '#e11900'
  }

  return {
    loading,
    error,
    metrics,
    score,
    fetchPerformance,
    calculateScore,
    getLevel,
    getLevelColor,
    getScoreColor,
    LEVEL_NAMES,
    AVAILABLE_BADGES
  }
}
