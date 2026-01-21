/**
 * Job Alert Composable
 * Sound + Vibration alert for new jobs (15 seconds)
 * 
 * Note: Browser security requires user interaction before audio/vibration.
 * Call `enableAlerts()` after a user gesture (click/tap) to unlock audio.
 */
import { ref, onUnmounted } from 'vue'

// Audio context for generating alert sound
let audioContext: AudioContext | null = null
// Track if user has interacted (unlocks audio/vibration)
let userHasInteracted = false

// Listen for first user interaction to unlock audio
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    userHasInteracted = true
    // Try to resume any suspended audio context
    if (audioContext?.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }
    // Remove listeners after first interaction
    document.removeEventListener('click', unlockAudio)
    document.removeEventListener('touchstart', unlockAudio)
    document.removeEventListener('keydown', unlockAudio)
  }
  document.addEventListener('click', unlockAudio, { once: true })
  document.addEventListener('touchstart', unlockAudio, { once: true })
  document.addEventListener('keydown', unlockAudio, { once: true })
}

export function useJobAlert() {
  const isPlaying = ref(false)
  const alertTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
  const isEnabled = ref(userHasInteracted)
  let oscillator: OscillatorNode | null = null
  let gainNode: GainNode | null = null

  // Initialize audio context
  function initAudio(): AudioContext | null {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch {
        return null
      }
    }
    return audioContext
  }

  // Manually enable alerts (call after user interaction)
  function enableAlerts() {
    userHasInteracted = true
    isEnabled.value = true
    const ctx = initAudio()
    if (ctx?.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }

  // Generate alert sound pattern (15 seconds)
  function playAlertSound() {
    // Skip if no user interaction yet (browser will block anyway)
    if (!userHasInteracted) {
      console.debug('[JobAlert] Skipping sound - waiting for user interaction')
      return
    }

    try {
      const ctx = initAudio()
      if (!ctx) return
      
      // Resume context if suspended
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
        return // Will play on next attempt after resume
      }

      // Create oscillator for beep sound
      oscillator = ctx.createOscillator()
      gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Set frequency pattern (alternating tones)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)

      // Create pulsing pattern
      const duration = 15 // 15 seconds
      const pulseInterval = 0.5 // pulse every 0.5 seconds
      
      for (let i = 0; i < duration / pulseInterval; i++) {
        const time = ctx.currentTime + (i * pulseInterval)
        // Alternate between two frequencies
        const freq = i % 2 === 0 ? 800 : 600
        oscillator.frequency.setValueAtTime(freq, time)
        
        // Volume envelope (beep pattern)
        gainNode.gain.setValueAtTime(0, time)
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05)
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.2)
        gainNode.gain.linearRampToValueAtTime(0, time + 0.25)
      }

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)

      isPlaying.value = true

      // Auto stop after duration
      alertTimeout.value = setTimeout(() => {
        stopAlert()
      }, duration * 1000)

    } catch (err) {
      console.error('[JobAlert] Sound error:', err)
    }
  }

  // Vibration pattern (15 seconds)
  function vibratePattern() {
    // Skip if no user interaction yet (browser will block anyway)
    if (!userHasInteracted || !navigator.vibrate) return

    // Pattern: vibrate 500ms, pause 300ms, repeat for 15 seconds
    const pattern: number[] = []
    const cycles = 18 // ~15 seconds
    
    for (let i = 0; i < cycles; i++) {
      pattern.push(500) // vibrate
      pattern.push(300) // pause
    }

    try {
      navigator.vibrate(pattern)
    } catch {
      // Vibration not allowed yet
    }
  }

  // Play full alert (sound + vibration)
  function playAlert() {
    if (isPlaying.value) return

    playAlertSound()
    vibratePattern()
  }

  // Stop alert
  function stopAlert() {
    isPlaying.value = false

    // Stop sound
    if (oscillator) {
      try {
        oscillator.stop()
        oscillator.disconnect()
      } catch {
        // Already stopped
      }
      oscillator = null
    }

    if (gainNode) {
      gainNode.disconnect()
      gainNode = null
    }

    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0)
    }

    // Clear timeout
    if (alertTimeout.value) {
      clearTimeout(alertTimeout.value)
      alertTimeout.value = null
    }
  }

  // Quick beep for UI feedback
  function quickBeep() {
    if (!userHasInteracted) return
    
    try {
      const ctx = initAudio()
      if (!ctx || ctx.state === 'suspended') return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = 1000

      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.1)
    } catch {
      // Ignore errors
    }
  }

  // Quick vibration
  function quickVibrate() {
    if (!userHasInteracted || !navigator.vibrate) return
    
    try {
      navigator.vibrate(100)
    } catch {
      // Vibration not allowed
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopAlert()
  })

  return {
    isPlaying,
    isEnabled,
    playAlert,
    stopAlert,
    quickBeep,
    quickVibrate,
    enableAlerts
  }
}
