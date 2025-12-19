import { ref } from 'vue'

export type SoundType = 'status_change' | 'message' | 'success' | 'error' | 'arrival'

const soundConfigs: Record<SoundType, { frequency: number; duration: number; type: OscillatorType }> = {
  status_change: { frequency: 800, duration: 150, type: 'sine' },
  message: { frequency: 600, duration: 100, type: 'sine' },
  success: { frequency: 1000, duration: 200, type: 'sine' },
  error: { frequency: 300, duration: 300, type: 'square' },
  arrival: { frequency: 900, duration: 250, type: 'sine' }
}

const vibrationPatterns: Record<SoundType, number[]> = {
  status_change: [100, 50, 100],
  message: [50, 30, 50],
  success: [100, 50, 100, 50, 100],
  error: [200, 100, 200],
  arrival: [100, 50, 100, 50, 200]
}

export function useSoundNotification() {
  const isMuted = ref(false)
  let audioContext: AudioContext | null = null

  const getAudioContext = (): AudioContext | null => {
    if (!audioContext) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        if (AC) audioContext = new AC()
      } catch (e) {
        console.warn('Web Audio API not supported:', e)
        return null
      }
    }
    return audioContext
  }

  const playBeep = (frequency: number, duration: number, oscType: OscillatorType = 'sine') => {
    const ctx = getAudioContext()
    if (!ctx) return

    try {
      if (ctx.state === 'suspended') ctx.resume()

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = oscType
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration / 1000)
    } catch (e) {
      console.warn('Error playing sound:', e)
    }
  }

  const playSound = (type: SoundType) => {
    if (isMuted.value) return
    const config = soundConfigs[type]
    if (!config) return

    if (type === 'success') {
      playBeep(800, 100, 'sine')
      setTimeout(() => playBeep(1000, 150, 'sine'), 120)
    } else if (type === 'arrival') {
      playBeep(700, 100, 'sine')
      setTimeout(() => playBeep(900, 100, 'sine'), 120)
      setTimeout(() => playBeep(1100, 150, 'sine'), 240)
    } else {
      playBeep(config.frequency, config.duration, config.type)
    }
  }

  const vibrate = (pattern?: number[]) => {
    if (isMuted.value) return
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    try {
      navigator.vibrate(pattern || [100])
    } catch (e) { /* ignore */ }
  }

  const notify = (type: SoundType, shouldVibrate = true) => {
    if (isMuted.value) return
    playSound(type)
    if (shouldVibrate) vibrate(vibrationPatterns[type])
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value
    try {
      localStorage.setItem('sound_notification_muted', String(isMuted.value))
    } catch { /* ignore */ }
  }

  // Load preference
  try {
    const saved = localStorage.getItem('sound_notification_muted')
    if (saved !== null) isMuted.value = saved === 'true'
  } catch { /* ignore */ }

  return { isMuted, playSound, vibrate, notify, toggleMute }
}
