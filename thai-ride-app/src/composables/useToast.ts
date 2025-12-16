import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
}

const toasts = ref<Toast[]>([])
let toastId = 0

export function useToast() {
  const show = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = ++toastId
    toasts.value.push({ id, message, type, duration })
    
    setTimeout(() => {
      remove(id)
    }, duration)
    
    return id
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const info = (message: string, duration?: number) => show(message, 'info', duration)
  const success = (message: string, duration?: number) => show(message, 'success', duration)
  const warning = (message: string, duration?: number) => show(message, 'warning', duration)
  const error = (message: string, duration?: number) => show(message, 'error', duration)

  return {
    toasts,
    show,
    remove,
    info,
    success,
    warning,
    error
  }
}
