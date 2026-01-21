/**
 * Job Priority Score Composable
 * คำนวณ priority score ตาม distance + fare + time
 * 
 * Score Formula:
 * - Distance Score: ยิ่งใกล้ยิ่งดี (max 40 points)
 * - Fare Score: ยิ่งแพงยิ่งดี (max 40 points)
 * - Time Score: ยิ่งใหม่ยิ่งดี (max 20 points)
 * 
 * Total: 0-100 points
 */
import { computed, type Ref } from 'vue'

export interface JobForPriority {
  id: string
  fare: number
  distance?: number  // km
  created_at: string
}

export interface JobWithPriority extends JobForPriority {
  priorityScore: number
  priorityLabel: 'hot' | 'good' | 'normal' | 'low'
  priorityDetails: {
    distanceScore: number
    fareScore: number
    timeScore: number
  }
}

// Configuration
const CONFIG = {
  // Distance scoring (closer = better)
  distance: {
    maxPoints: 40,
    idealKm: 1,      // 1km = full points
    maxKm: 10,       // 10km+ = 0 points
  },
  // Fare scoring (higher = better)
  fare: {
    maxPoints: 40,
    minFare: 30,     // Below this = 0 points
    idealFare: 200,  // This or above = full points
  },
  // Time scoring (newer = better)
  time: {
    maxPoints: 20,
    maxMinutes: 30,  // 30+ minutes old = 0 points
  },
  // Priority thresholds
  thresholds: {
    hot: 75,         // 75+ = hot
    good: 50,        // 50-74 = good
    normal: 25,      // 25-49 = normal
    // Below 25 = low
  }
}

export function useJobPriority() {
  
  // Calculate distance score (0-40)
  function calculateDistanceScore(distanceKm: number | undefined): number {
    if (distanceKm === undefined) return CONFIG.distance.maxPoints / 2 // Unknown = half points
    
    if (distanceKm <= CONFIG.distance.idealKm) {
      return CONFIG.distance.maxPoints
    }
    
    if (distanceKm >= CONFIG.distance.maxKm) {
      return 0
    }
    
    // Linear interpolation
    const range = CONFIG.distance.maxKm - CONFIG.distance.idealKm
    const distanceFromIdeal = distanceKm - CONFIG.distance.idealKm
    const ratio = 1 - (distanceFromIdeal / range)
    
    return Math.round(CONFIG.distance.maxPoints * ratio)
  }
  
  // Calculate fare score (0-40)
  function calculateFareScore(fare: number): number {
    if (fare <= CONFIG.fare.minFare) {
      return 0
    }
    
    if (fare >= CONFIG.fare.idealFare) {
      return CONFIG.fare.maxPoints
    }
    
    // Linear interpolation
    const range = CONFIG.fare.idealFare - CONFIG.fare.minFare
    const fareAboveMin = fare - CONFIG.fare.minFare
    const ratio = fareAboveMin / range
    
    return Math.round(CONFIG.fare.maxPoints * ratio)
  }
  
  // Calculate time score (0-20)
  function calculateTimeScore(createdAt: string): number {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = diffMs / 60000
    
    if (diffMinutes <= 1) {
      return CONFIG.time.maxPoints // Brand new
    }
    
    if (diffMinutes >= CONFIG.time.maxMinutes) {
      return 0
    }
    
    // Linear decay
    const ratio = 1 - (diffMinutes / CONFIG.time.maxMinutes)
    return Math.round(CONFIG.time.maxPoints * ratio)
  }
  
  // Get priority label from score
  function getPriorityLabel(score: number): 'hot' | 'good' | 'normal' | 'low' {
    if (score >= CONFIG.thresholds.hot) return 'hot'
    if (score >= CONFIG.thresholds.good) return 'good'
    if (score >= CONFIG.thresholds.normal) return 'normal'
    return 'low'
  }
  
  // Calculate full priority for a job
  function calculatePriority(job: JobForPriority): JobWithPriority {
    const distanceScore = calculateDistanceScore(job.distance)
    const fareScore = calculateFareScore(job.fare)
    const timeScore = calculateTimeScore(job.created_at)
    
    const priorityScore = distanceScore + fareScore + timeScore
    
    return {
      ...job,
      priorityScore,
      priorityLabel: getPriorityLabel(priorityScore),
      priorityDetails: {
        distanceScore,
        fareScore,
        timeScore
      }
    }
  }
  
  // Sort jobs by priority (highest first)
  function sortByPriority<T extends JobForPriority>(jobs: T[]): (T & { priorityScore: number; priorityLabel: string })[] {
    return jobs
      .map(job => ({
        ...job,
        ...calculatePriority(job)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
  }
  
  // Create reactive sorted jobs
  function useSortedJobs<T extends JobForPriority>(jobs: Ref<T[]>) {
    return computed(() => sortByPriority(jobs.value))
  }
  
  // Get priority color
  function getPriorityColor(label: 'hot' | 'good' | 'normal' | 'low'): string {
    const colors = {
      hot: '#ef4444',    // Red
      good: '#f97316',   // Orange
      normal: '#3b82f6', // Blue
      low: '#9ca3af'     // Gray
    }
    return colors[label]
  }
  
  // Get priority background color
  function getPriorityBgColor(label: 'hot' | 'good' | 'normal' | 'low'): string {
    const colors = {
      hot: '#fef2f2',
      good: '#fff7ed',
      normal: '#eff6ff',
      low: '#f9fafb'
    }
    return colors[label]
  }
  
  // Get priority label text (Thai)
  function getPriorityText(label: 'hot' | 'good' | 'normal' | 'low'): string {
    const texts = {
      hot: '🔥 งานดีมาก',
      good: '⭐ งานดี',
      normal: '📋 ปกติ',
      low: '📌 ทั่วไป'
    }
    return texts[label]
  }

  return {
    calculatePriority,
    sortByPriority,
    useSortedJobs,
    getPriorityColor,
    getPriorityBgColor,
    getPriorityText,
    CONFIG
  }
}