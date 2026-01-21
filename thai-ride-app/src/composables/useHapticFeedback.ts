/**
 * useHapticFeedback - Haptic feedback และ Sound notification
 * Feature: F14 - Provider Dashboard Enhancement
 * 
 * ฟีเจอร์:
 * - Haptic feedback สำหรับ mobile
 * - Sound notification เมื่อมีงานใหม่
 * - Configurable settings
 */

import { ref, onUnmounted } from 'vue'

// Sound URLs (base64 encoded short sounds)
const SOUNDS = {
  newJob: '/sounds/new-job.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  notification: '/sounds/notification.mp3'
}

// Fallback: Generate simple beep using Web Audio API
const createBeep = (frequency: number = 440, duration: number = 200): void => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration / 1000)
  } catch (e) {
    console.warn('[Haptic] Web Audio API not supported:', e)
  }
}

export function useHapticFeedback() {
  const isEnabled = ref(true)
  const isSoundEnabled = ref(true)
  
  // Audio elements cache
  const audioCache = new Map<string, HTMLAudioElement>()
  
  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const hapticSetting = localStorage.getItem('haptic_enabled')
      const soundSetting = localStorage.getItem('sound_enabled')
      isEnabled.value = hapticSetting !== 'false'
      isSoundEnabled.value = soundSetting !== 'false'
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  loadSettings()

  // Save settings
  const saveSettings = () => {
    try {
      localStorage.setItem('haptic_enabled', String(isEnabled.value))
      localStorage.setItem('sound_enabled', String(isSoundEnabled.value))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Toggle haptic
  const toggleHaptic = (enabled?: boolean) => {
    isEnabled.value = enabled ?? !isEnabled.value
    saveSettings()
  }

  // Toggle sound
  const toggleSound = (enabled?: boolean) => {
    isSoundEnabled.value = enabled ?? !isSoundEnabled.value
    saveSettings()
  }

  // Haptic feedback
  const vibrate = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' = 'light') => {
    if (!isEnabled.value) return
    
    if ('vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        success: [10, 50, 10],
        error: [50, 30, 50, 30, 50],
        warning: [30, 20, 30]
      }
      
      try {
        navigator.vibrate(patterns[pattern] || 10)
      } catch (e) {
        // Vibration not supported
      }
    }
  }

  // Play sound
  const playSound = async (type: keyof typeof SOUNDS = 'notification') => {
    if (!isSoundEnabled.value) return
    
    try {
      // Try to use cached audio
      let audio = audioCache.get(type)
      
      if (!audio) {
        audio = new Audio(SOUNDS[type])
        audio.volume = 0.5
        audioCache.set(type, audio)
      }
      
      // Reset and play
      audio.currentTime = 0
      await audio.play()
    } catch (e) {
      // Fallback to beep
      const frequencies: Record<string, number> = {
        newJob: 880,
        success: 660,
        error: 220,
        notification: 440
      }
      createBeep(frequencies[type] || 440, 200)
    }
  }

  // Combined feedback (haptic + sound)
  const feedback = (type: 'newJob' | 'success' | 'error' | 'tap' = 'tap') => {
    const config: Record<string, { haptic: Parameters<typeof vibrate>[0]; sound?: keyof typeof SOUNDS }> = {
      newJob: { haptic: 'heavy', sound: 'newJob' },
      success: { haptic: 'success', sound: 'success' },
      error: { haptic: 'error', sound: 'error' },
      tap: { haptic: 'light' }
    }
    
    const { haptic, sound } = config[type] || config.tap
    vibrate(haptic)
    if (sound) playSound(sound)
  }

  // New job notification (special case with repeat)
  const notifyNewJob = () => {
    feedback('newJob')
    
    // Repeat vibration after 500ms for emphasis
    setTimeout(() => {
      vibrate('medium')
    }, 500)
  }

  // Cleanup
  onUnmounted(() => {
    audioCache.forEach(audio => {
      audio.pause()
      audio.src = ''
    })
    audioCache.clear()
  })

  return {
    isEnabled,
    isSoundEnabled,
    toggleHaptic,
    toggleSound,
    vibrate,
    playSound,
    feedback,
    notifyNewJob
  }
}

export type HapticFeedback = ReturnType<typeof useHapticFeedback>
