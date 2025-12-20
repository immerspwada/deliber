import { ref } from 'vue'

export type SoundType = 
  | 'status_change' 
  | 'message' 
  | 'success' 
  | 'error' 
  | 'arrival' 
  | 'new_request' 
  | 'urgent'
  | 'accept'
  | 'decline'
  | 'complete'
  | 'cancel'
  | 'payment'
  | 'rating'

export type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'selection'
  | 'impact'

// Sound configurations for Web Audio API fallback
const soundConfigs: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; notes?: number[] }> = {
  status_change: { frequency: 800, duration: 150, type: 'sine' },
  message: { frequency: 600, duration: 100, type: 'sine' },
  success: { frequency: 1000, duration: 200, type: 'sine', notes: [523, 659, 784] },
  error: { frequency: 300, duration: 300, type: 'square' },
  arrival: { frequency: 900, duration: 250, type: 'sine', notes: [659, 784, 880] },
  new_request: { frequency: 880, duration: 200, type: 'sine', notes: [523, 659, 784, 1047] },
  urgent: { frequency: 1200, duration: 150, type: 'square', notes: [880, 1047, 880, 1047] },
  accept: { frequency: 700, duration: 120, type: 'sine', notes: [523, 784] },
  decline: { frequency: 400, duration: 150, type: 'triangle' },
  complete: { frequency: 880, duration: 200, type: 'sine', notes: [523, 659, 784, 1047, 1319] },
  cancel: { frequency: 350, duration: 200, type: 'square', notes: [440, 349] },
  payment: { frequency: 800, duration: 150, type: 'sine', notes: [659, 784, 880, 1047] },
  rating: { frequency: 600, duration: 100, type: 'sine', notes: [523, 659] }
}

// Audio file URLs - Base64 encoded short sounds for instant playback
// These are tiny audio clips that work without external files
const audioDataUrls: Partial<Record<SoundType, string>> = {
  // Short notification beep (base64 WAV)
  new_request: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAA',
  success: 'data:audio/wav;base64,UklGRl9vT19teleQAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAA',
}

// Enhanced vibration patterns (in milliseconds) - more nuanced haptic feedback
const vibrationPatterns: Record<SoundType, number[]> = {
  status_change: [80, 40, 80],
  message: [40, 20, 40],
  success: [50, 30, 50, 30, 100],
  error: [150, 80, 150, 80, 150],
  arrival: [100, 50, 100, 50, 150],
  new_request: [150, 80, 150, 80, 200, 100, 200],
  urgent: [200, 100, 200, 100, 200, 100, 300],
  accept: [60, 30, 100],
  decline: [100, 50, 50],
  complete: [50, 30, 50, 30, 50, 30, 150],
  cancel: [100, 50, 100],
  payment: [80, 40, 80, 40, 120],
  rating: [40, 20, 60]
}

// Haptic patterns for different feedback types
const hapticPatterns: Record<HapticType, number[]> = {
  light: [10],
  medium: [30],
  heavy: [50],
  success: [30, 20, 50],
  warning: [50, 30, 50],
  error: [80, 40, 80, 40, 80],
  selection: [15],
  impact: [40, 20, 20]
}

// Audio cache for preloaded sounds
const audioCache: Map<string, HTMLAudioElement> = new Map()

// Audio buffer cache for Web Audio API (reserved for future use with actual audio files)
// const audioBufferCache: Map<string, AudioBuffer> = new Map()

export function useSoundNotification() {
  const isMuted = ref(false)
  const volume = ref(0.5)
  const hapticEnabled = ref(true)
  let audioContext: AudioContext | null = null

  // Initialize AudioContext lazily
  const getAudioContext = (): AudioContext | null => {
    if (!audioContext) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          audioContext = new AudioContextClass()
        }
      } catch (e) {
        console.warn('Web Audio API not supported:', e)
        return null
      }
    }
    return audioContext
  }

  // Preload audio file
  const preloadAudio = (url: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      if (audioCache.has(url)) {
        resolve(audioCache.get(url)!)
        return
      }
      
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.volume = volume.value
      
      audio.addEventListener('canplaythrough', () => {
        audioCache.set(url, audio)
        resolve(audio)
      }, { once: true })
      
      audio.addEventListener('error', reject, { once: true })
      audio.load()
    })
  }

  // Play audio file if available (supports both URL and data URL)
  const playAudioFile = async (type: SoundType): Promise<boolean> => {
    const url = audioDataUrls[type]
    if (!url) return false
    
    try {
      let audio = audioCache.get(url)
      if (!audio) {
        audio = new Audio(url)
        audio.preload = 'auto'
        audioCache.set(url, audio)
      }
      
      audio.currentTime = 0
      audio.volume = volume.value
      await audio.play()
      return true
    } catch (e) {
      console.warn('Error playing audio file:', e)
      return false
    }
  }

  // Enhanced haptic feedback with different intensities
  const haptic = (type: HapticType = 'medium') => {
    if (!hapticEnabled.value || isMuted.value) return
    if (typeof navigator === 'undefined' || !navigator.vibrate) return

    try {
      const pattern = hapticPatterns[type] || hapticPatterns.medium
      navigator.vibrate(pattern)
    } catch (e) {
      // Vibration not supported
    }
  }

  // iOS-style haptic using AudioContext (for devices without vibration API)
  const iosHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (isMuted.value) return
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') ctx.resume()

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Very low frequency for haptic-like feel
      const freqMap = { light: 20, medium: 30, heavy: 40 }
      const durMap = { light: 0.01, medium: 0.02, heavy: 0.03 }
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freqMap[intensity], ctx.currentTime)
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durMap[intensity])
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + durMap[intensity])
    } catch (e) {
      // Ignore errors
    }
  }

  // Play a beep sound using Web Audio API
  const playBeep = (frequency: number, duration: number, oscType: OscillatorType = 'sine') => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = oscType
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

      const maxGain = volume.value * 0.6
      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(maxGain, ctx.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration / 1000)
    } catch (e) {
      console.warn('Error playing sound:', e)
    }
  }

  // Play multi-tone melody (generic version)
  const playMelody = (notes: number[], noteDuration = 0.12, oscType: OscillatorType = 'sine') => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') ctx.resume()
      
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        oscillator.type = oscType
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * noteDuration)
        
        const startTime = ctx.currentTime + i * noteDuration
        const maxGain = volume.value * 0.4
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(maxGain, startTime + 0.01)
        gainNode.gain.linearRampToValueAtTime(0, startTime + noteDuration - 0.02)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + noteDuration)
      })
    } catch (e) {
      console.warn('Error playing melody:', e)
    }
  }

  // Play multi-tone melody for new request
  const playNewRequestMelody = () => {
    playMelody([523, 659, 784, 1047], 0.12, 'sine') // C5, E5, G5, C6
  }

  // Play success melody (ascending)
  const playSuccessMelody = () => {
    playMelody([523, 659, 784], 0.1, 'sine')
  }

  // Play complete melody (triumphant)
  const playCompleteMelody = () => {
    playMelody([523, 659, 784, 1047, 1319], 0.1, 'sine')
  }

  // Play error sound (descending)
  const playErrorSound = () => {
    playMelody([440, 349], 0.15, 'square')
  }

  // Play payment success (cash register style)
  const playPaymentSound = () => {
    playMelody([659, 784, 880, 1047], 0.08, 'sine')
  }

  // Play sound based on type
  const playSound = async (type: SoundType) => {
    if (isMuted.value) return

    // Try audio file first
    const playedFile = await playAudioFile(type)
    if (playedFile) return

    // Fallback to Web Audio API
    const config = soundConfigs[type]
    if (!config) return

    // Use melody if notes are defined
    if (config.notes?.length) {
      playMelody(config.notes, 0.1, config.type)
      return
    }

    // Special handling for specific types
    switch (type) {
      case 'new_request':
        playNewRequestMelody()
        break
      case 'success':
        playSuccessMelody()
        break
      case 'complete':
        playCompleteMelody()
        break
      case 'error':
      case 'cancel':
        playErrorSound()
        break
      case 'payment':
        playPaymentSound()
        break
      case 'arrival':
        playMelody([659, 784, 880], 0.1, 'sine')
        break
      case 'urgent':
        playMelody([880, 1047, 880, 1047], 0.1, 'square')
        break
      case 'accept':
        playMelody([523, 784], 0.1, 'sine')
        break
      case 'decline':
        playBeep(400, 150, 'triangle')
        break
      case 'rating':
        playMelody([523, 659], 0.08, 'sine')
        break
      default:
        playBeep(config.frequency, config.duration, config.type)
    }
  }

  // Vibrate device
  const vibrate = (pattern?: number[]) => {
    if (isMuted.value) return
    if (typeof navigator === 'undefined' || !navigator.vibrate) return

    try {
      navigator.vibrate(pattern || [100])
    } catch (e) {
      // Vibration not supported
    }
  }

  // Combined notification (sound + vibration)
  const notify = (type: SoundType, shouldVibrate = true) => {
    if (isMuted.value) return

    playSound(type)
    
    if (shouldVibrate) {
      const pattern = vibrationPatterns[type]
      vibrate(pattern)
    }
  }

  // Toggle mute state
  const toggleMute = () => {
    isMuted.value = !isMuted.value
    
    try {
      localStorage.setItem('sound_notification_muted', String(isMuted.value))
    } catch {
      // Ignore localStorage errors
    }
  }

  // Toggle haptic feedback
  const toggleHaptic = () => {
    hapticEnabled.value = !hapticEnabled.value
    
    try {
      localStorage.setItem('haptic_enabled', String(hapticEnabled.value))
    } catch {
      // Ignore localStorage errors
    }
  }

  // Set volume (0-1)
  const setVolume = (val: number) => {
    volume.value = Math.max(0, Math.min(1, val))
    try {
      localStorage.setItem('sound_notification_volume', String(volume.value))
    } catch {
      // Ignore localStorage errors
    }
  }

  // Preload common sounds
  const preloadSounds = async () => {
    const urls = Object.values(audioDataUrls).filter(Boolean) as string[]
    await Promise.allSettled(urls.map(url => preloadAudio(url)))
  }

  // Quick action sounds with haptic
  const playAccept = () => {
    playSound('accept')
    haptic('success')
  }

  const playDecline = () => {
    playSound('decline')
    haptic('warning')
  }

  const playComplete = () => {
    playSound('complete')
    haptic('success')
  }

  const playCancel = () => {
    playSound('cancel')
    haptic('error')
  }

  const playPayment = () => {
    playSound('payment')
    haptic('success')
  }

  // Load preferences
  try {
    const savedMuted = localStorage.getItem('sound_notification_muted')
    if (savedMuted !== null) {
      isMuted.value = savedMuted === 'true'
    }
    const savedVolume = localStorage.getItem('sound_notification_volume')
    if (savedVolume !== null) {
      volume.value = parseFloat(savedVolume)
    }
    const savedHaptic = localStorage.getItem('haptic_enabled')
    if (savedHaptic !== null) {
      hapticEnabled.value = savedHaptic !== 'false'
    }
  } catch {
    // Ignore localStorage errors
  }

  return {
    // State
    isMuted,
    volume,
    hapticEnabled,
    
    // Core functions
    playSound,
    vibrate,
    notify,
    haptic,
    iosHaptic,
    
    // Settings
    toggleMute,
    toggleHaptic,
    setVolume,
    preloadSounds,
    
    // Quick action sounds
    playAccept,
    playDecline,
    playComplete,
    playCancel,
    playPayment,
    
    // Melody functions
    playNewRequestMelody,
    playSuccessMelody,
    playCompleteMelody,
    playErrorSound,
    playPaymentSound
  }
}
