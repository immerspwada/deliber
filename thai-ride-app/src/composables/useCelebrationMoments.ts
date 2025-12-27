/**
 * useCelebrationMoments - Emotional Design & Celebration System
 * Feature: F272 - Celebration Moments & Emotional Design
 * 
 * สร้างประสบการณ์ที่น่าจดจำด้วย celebration animations
 * - Confetti effects
 * - Achievement unlocks
 * - Milestone celebrations
 * - Streak rewards
 * - Level up animations
 */

import { ref, computed } from 'vue'
import { useHapticFeedback } from './useHapticFeedback'
import { useSoundNotification } from './useSoundNotification'

export interface CelebrationConfig {
  type: 'confetti' | 'fireworks' | 'stars' | 'hearts' | 'coins'
  duration: number
  intensity: 'low' | 'medium' | 'high'
  colors?: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: Date
}

export interface Milestone {
  id: string
  title: string
  value: number
  target: number
  reward?: string
}

export interface Streak {
  type: string
  count: number
  lastDate: Date
  reward?: string
}

// Default celebration colors (MUNEEF style)
const CELEBRATION_COLORS = {
  confetti: ['#00A86B', '#F5A623', '#E53935', '#9C27B0', '#2196F3', '#FFD700'],
  fireworks: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
  stars: ['#FFD700', '#FFA500', '#FFFFFF'],
  hearts: ['#E53935', '#FF6B6B', '#FF8A80'],
  coins: ['#FFD700', '#FFA500', '#DAA520']
}

export function useCelebrationMoments() {
  const haptic = useHapticFeedback()
  const sound = useSoundNotification()
  
  const isShowingCelebration = ref(false)
  const currentCelebration = ref<CelebrationConfig | null>(null)
  const particles = ref<Array<{
    id: number
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
    rotation: number
    opacity: number
  }>>([])
  
  const showingAchievement = ref<Achievement | null>(null)
  const showingMilestone = ref<Milestone | null>(null)
  
  // Animation frame ID for cleanup
  let animationFrameId: number | null = null

  /**
   * Create confetti particles
   */
  const createConfettiParticles = (count: number, colors: string[]) => {
    const newParticles = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: Math.random() * window.innerWidth,
        y: -20,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        opacity: 1
      })
    }
    return newParticles
  }

  /**
   * Create firework particles
   */
  const createFireworkParticles = (x: number, y: number, colors: string[]) => {
    const newParticles = []
    const particleCount = 30
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const velocity = Math.random() * 5 + 3
      
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
        rotation: 0,
        opacity: 1
      })
    }
    return newParticles
  }

  /**
   * Animate particles
   */
  const animateParticles = () => {
    particles.value = particles.value
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.1, // gravity
        rotation: p.rotation + 5,
        opacity: p.opacity - 0.01
      }))
      .filter(p => p.opacity > 0 && p.y < window.innerHeight + 50)
    
    if (particles.value.length > 0) {
      animationFrameId = requestAnimationFrame(animateParticles)
    } else {
      isShowingCelebration.value = false
    }
  }

  /**
   * Show confetti celebration
   */
  const showConfetti = (config: Partial<CelebrationConfig> = {}) => {
    const fullConfig: CelebrationConfig = {
      type: 'confetti',
      duration: 3000,
      intensity: 'medium',
      colors: CELEBRATION_COLORS.confetti,
      ...config
    }
    
    const particleCount = {
      low: 30,
      medium: 60,
      high: 100
    }[fullConfig.intensity]
    
    isShowingCelebration.value = true
    currentCelebration.value = fullConfig
    particles.value = createConfettiParticles(particleCount, fullConfig.colors!)
    
    haptic.feedback('success')
    sound.playSound('success')
    
    animateParticles()
    
    // Add more particles over time
    const interval = setInterval(() => {
      if (particles.value.length < particleCount * 2) {
        particles.value.push(...createConfettiParticles(10, fullConfig.colors!))
      }
    }, 200)
    
    setTimeout(() => {
      clearInterval(interval)
    }, fullConfig.duration)
  }

  /**
   * Show fireworks celebration
   */
  const showFireworks = (config: Partial<CelebrationConfig> = {}) => {
    const fullConfig: CelebrationConfig = {
      type: 'fireworks',
      duration: 4000,
      intensity: 'medium',
      colors: CELEBRATION_COLORS.fireworks,
      ...config
    }
    
    isShowingCelebration.value = true
    currentCelebration.value = fullConfig
    
    haptic.feedback('success')
    sound.playSound('success')
    
    // Launch multiple fireworks
    const launchCount = {
      low: 3,
      medium: 5,
      high: 8
    }[fullConfig.intensity]
    
    for (let i = 0; i < launchCount; i++) {
      setTimeout(() => {
        const x = Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2
        const y = Math.random() * window.innerHeight * 0.4 + window.innerHeight * 0.1
        particles.value.push(...createFireworkParticles(x, y, fullConfig.colors!))
        haptic.vibrate('light')
      }, i * 500)
    }
    
    animateParticles()
  }

  /**
   * Show achievement unlock
   */
  const showAchievement = (achievement: Achievement) => {
    showingAchievement.value = achievement
    
    // Play appropriate sound and haptic based on rarity
    const hapticIntensity = {
      common: 'light' as const,
      rare: 'medium' as const,
      epic: 'heavy' as const,
      legendary: 'success' as const
    }[achievement.rarity]
    
    haptic.feedback(hapticIntensity)
    sound.playSound('achievement')
    
    // Show confetti for rare+ achievements
    if (achievement.rarity !== 'common') {
      showConfetti({
        intensity: achievement.rarity === 'legendary' ? 'high' : 'medium',
        colors: achievement.rarity === 'legendary' 
          ? ['#FFD700', '#FFA500', '#FF6B6B']
          : CELEBRATION_COLORS.confetti
      })
    }
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      showingAchievement.value = null
    }, 4000)
  }

  /**
   * Show milestone reached
   */
  const showMilestone = (milestone: Milestone) => {
    showingMilestone.value = milestone
    
    haptic.feedback('success')
    sound.playSound('milestone')
    showConfetti({ intensity: 'medium' })
    
    setTimeout(() => {
      showingMilestone.value = null
    }, 5000)
  }

  /**
   * Show streak celebration
   */
  const showStreak = (streak: Streak) => {
    const streakAchievement: Achievement = {
      id: `streak-${streak.type}-${streak.count}`,
      title: `${streak.count} วันติดต่อกัน!`,
      description: `คุณใช้บริการ${streak.type}ติดต่อกัน ${streak.count} วัน`,
      icon: '🔥',
      rarity: streak.count >= 30 ? 'legendary' : streak.count >= 14 ? 'epic' : streak.count >= 7 ? 'rare' : 'common'
    }
    
    showAchievement(streakAchievement)
  }

  /**
   * Show level up celebration
   */
  const showLevelUp = (newLevel: string, benefits: string[]) => {
    haptic.feedback('success')
    sound.playSound('levelup')
    showFireworks({ intensity: 'high' })
    
    // Show level up modal (handled by component)
    return {
      level: newLevel,
      benefits
    }
  }

  /**
   * Show first ride celebration
   */
  const showFirstRide = () => {
    showAchievement({
      id: 'first-ride',
      title: 'การเดินทางครั้งแรก!',
      description: 'ยินดีต้อนรับสู่ GOBEAR',
      icon: '🎉',
      rarity: 'rare'
    })
  }

  /**
   * Show rating thank you
   */
  const showRatingThankYou = (rating: number) => {
    if (rating >= 5) {
      showConfetti({ intensity: 'low', duration: 1500 })
    }
    haptic.vibrate('light')
  }

  /**
   * Show referral success
   */
  const showReferralSuccess = (friendName: string) => {
    showAchievement({
      id: `referral-${Date.now()}`,
      title: 'ชวนเพื่อนสำเร็จ!',
      description: `${friendName} เข้าร่วมแล้ว`,
      icon: '🤝',
      rarity: 'rare'
    })
  }

  /**
   * Show promo applied
   */
  const showPromoApplied = (discount: number) => {
    haptic.feedback('success')
    sound.playSound('coin')
    
    // Show coin particles
    const coinParticles = []
    for (let i = 0; i < 10; i++) {
      coinParticles.push({
        id: Date.now() + i,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 5 - 3,
        color: CELEBRATION_COLORS.coins[Math.floor(Math.random() * CELEBRATION_COLORS.coins.length)],
        size: 15,
        rotation: 0,
        opacity: 1
      })
    }
    
    particles.value = coinParticles
    isShowingCelebration.value = true
    animateParticles()
  }

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    particles.value = []
    isShowingCelebration.value = false
    showingAchievement.value = null
    showingMilestone.value = null
  }

  return {
    // State
    isShowingCelebration,
    currentCelebration,
    particles,
    showingAchievement,
    showingMilestone,
    
    // Methods
    showConfetti,
    showFireworks,
    showAchievement,
    showMilestone,
    showStreak,
    showLevelUp,
    showFirstRide,
    showRatingThankYou,
    showReferralSuccess,
    showPromoApplied,
    cleanup
  }
}
