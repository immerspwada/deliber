/**
 * UI Service - บริการจัดการ UI/UX ที่สวยงามและใส่ใจทุกรายละเอียด ✨
 * 
 * ออกแบบมาเพื่อให้ผู้ใช้รู้สึกถึงความพิเศษในทุกการใช้งาน
 * พร้อมด้วยการจัดการ Animation, Theme, และ Responsive Design
 */

import { BaseService } from './BaseService'
import type { Result } from '../utils/result'

export interface ThemeConfig {
  name: string
  colors: {
    primary: string
    primaryHover: string
    primaryLight: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
    }
    fontWeight: {
      normal: number
      medium: number
      semibold: number
      bold: number
    }
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
    full: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export interface AnimationConfig {
  name: string
  duration: number
  easing: string
  keyframes: Record<string, Record<string, string>>
}

export interface ToastMessage {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
  icon?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

export interface ModalConfig {
  id: string
  title: string
  content?: string
  component?: string
  props?: Record<string, any>
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  backdrop?: boolean
  animation?: string
  onClose?: () => void
  onConfirm?: () => void
}

export interface LoadingState {
  id: string
  message?: string
  progress?: number
  type?: 'spinner' | 'progress' | 'skeleton'
  overlay?: boolean
}

export class UIService extends BaseService {
  private activeToasts = new Map<string, ToastMessage>()
  private activeModals = new Map<string, ModalConfig>()
  private activeLoadings = new Map<string, LoadingState>()
  private currentTheme: ThemeConfig | null = null
  private animations = new Map<string, AnimationConfig>()

  constructor() {
    super('UIService')
    this.initializeDefaultTheme()
    this.initializeAnimations()
  }

  /**
   * แสดง Toast Message ที่สวยงามและใส่ใจ
   */
  async showToast(toast: Omit<ToastMessage, 'id'>): Promise<Result<string>> {
    return this.execute(async () => {
      const id = this.generateId('toast')
      const toastWithId: ToastMessage = {
        id,
        duration: 4000,
        position: 'top-right',
        ...toast
      }

      // เพิ่ม emoji และสไตล์ตามประเภท
      const styledToast = this.styleToast(toastWithId)
      
      this.activeToasts.set(id, styledToast)
      
      // ส่งสัญญาณไปยัง UI components
      this.emitUIEvent('toast:show', styledToast)
      
      // ตั้งเวลาซ่อนอัตโนมัติ
      if (styledToast.duration && styledToast.duration > 0) {
        setTimeout(() => {
          this.hideToast(id)
        }, styledToast.duration)
      }
      
      this.log('info', '🍞 Toast displayed', {
        id,
        type: toast.type,
        title: toast.title
      })
      
      return id
    }, 'showToast', { type: toast.type })
  }

  /**
   * ซ่อน Toast Message อย่างนุ่มนวล
   */
  async hideToast(id: string): Promise<Result<boolean>> {
    return this.execute(async () => {
      const toast = this.activeToasts.get(id)
      if (!toast) {
        return false
      }
      
      // เล่น animation ก่อนซ่อน
      this.emitUIEvent('toast:hide', { id })
      
      // รอ animation เสร็จแล้วค่อยลบ
      setTimeout(() => {
        this.activeToasts.delete(id)
      }, 300)
      
      return true
    }, 'hideToast', { id })
  }

  /**
   * แสดง Modal ที่สวยงามและใช้งานง่าย
   */
  async showModal(config: Omit<ModalConfig, 'id'>): Promise<Result<string>> {
    return this.execute(async () => {
      const id = this.generateId('modal')
      const modalConfig: ModalConfig = {
        id,
        size: 'md',
        closable: true,
        backdrop: true,
        animation: 'fadeInScale',
        ...config
      }
      
      this.activeModals.set(id, modalConfig)
      
      // ส่งสัญญาณไปยัง UI components
      this.emitUIEvent('modal:show', modalConfig)
      
      this.log('info', '🪟 Modal displayed', {
        id,
        title: config.title,
        size: modalConfig.size
      })
      
      return id
    }, 'showModal', { title: config.title })
  }

  /**
   * ซ่อน Modal อย่างสวยงาม
   */
  async hideModal(id: string): Promise<Result<boolean>> {
    return this.execute(async () => {
      const modal = this.activeModals.get(id)
      if (!modal) {
        return false
      }
      
      // เรียก callback ก่อนปิด
      if (modal.onClose) {
        modal.onClose()
      }
      
      // เล่น animation ก่อนซ่อน
      this.emitUIEvent('modal:hide', { id })
      
      // รอ animation เสร็จแล้วค่อยลบ
      setTimeout(() => {
        this.activeModals.delete(id)
      }, 300)
      
      return true
    }, 'hideModal', { id })
  }

  /**
   * แสดง Loading State ที่สวยงาม
   */
  async showLoading(config: Omit<LoadingState, 'id'>): Promise<Result<string>> {
    return this.execute(async () => {
      const id = this.generateId('loading')
      const loadingState: LoadingState = {
        id,
        type: 'spinner',
        overlay: true,
        ...config
      }
      
      this.activeLoadings.set(id, loadingState)
      
      // ส่งสัญญาณไปยัง UI components
      this.emitUIEvent('loading:show', loadingState)
      
      this.log('debug', '⏳ Loading displayed', {
        id,
        message: config.message,
        type: loadingState.type
      })
      
      return id
    }, 'showLoading')
  }

  /**
   * อัพเดท Loading Progress
   */
  async updateLoadingProgress(id: string, progress: number, message?: string): Promise<Result<boolean>> {
    return this.execute(async () => {
      const loading = this.activeLoadings.get(id)
      if (!loading) {
        return false
      }
      
      loading.progress = Math.max(0, Math.min(100, progress))
      if (message) {
        loading.message = message
      }
      
      this.emitUIEvent('loading:update', loading)
      
      return true
    }, 'updateLoadingProgress', { id, progress })
  }

  /**
   * ซ่อน Loading State
   */
  async hideLoading(id: string): Promise<Result<boolean>> {
    return this.execute(async () => {
      const loading = this.activeLoadings.get(id)
      if (!loading) {
        return false
      }
      
      // เล่น animation ก่อนซ่อน
      this.emitUIEvent('loading:hide', { id })
      
      // รอ animation เสร็จแล้วค่อยลบ
      setTimeout(() => {
        this.activeLoadings.delete(id)
      }, 200)
      
      return true
    }, 'hideLoading', { id })
  }

  /**
   * เปลี่ยน Theme แบบ Smooth Transition
   */
  async setTheme(theme: ThemeConfig): Promise<Result<boolean>> {
    return this.execute(async () => {
      // บันทึก theme ใหม่
      this.currentTheme = theme
      
      // อัพเดท CSS Variables
      this.updateCSSVariables(theme)
      
      // บันทึกใน localStorage
      localStorage.setItem('ui_theme', JSON.stringify(theme))
      
      // ส่งสัญญาณไปยัง components
      this.emitUIEvent('theme:changed', theme)
      
      this.log('info', '🎨 Theme changed', {
        themeName: theme.name,
        primaryColor: theme.colors.primary
      })
      
      return true
    }, 'setTheme', { themeName: theme.name })
  }

  /**
   * เล่น Animation ที่กำหนดเอง
   */
  async playAnimation(
    element: HTMLElement | string,
    animationName: string,
    options?: {
      duration?: number
      easing?: string
      fillMode?: 'forwards' | 'backwards' | 'both' | 'none'
      onComplete?: () => void
    }
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const animation = this.animations.get(animationName)
      if (!animation) {
        throw new Error(`Animation '${animationName}' not found`)
      }
      
      const targetElement = typeof element === 'string' 
        ? document.querySelector(element) as HTMLElement
        : element
      
      if (!targetElement) {
        throw new Error('Target element not found')
      }
      
      // สร้าง keyframes
      const keyframes = Object.entries(animation.keyframes).map(([offset, styles]) => ({
        offset: parseFloat(offset) / 100,
        ...styles
      }))
      
      // เล่น animation
      const animationInstance = targetElement.animate(keyframes, {
        duration: options?.duration || animation.duration,
        easing: options?.easing || animation.easing,
        fill: options?.fillMode || 'forwards'
      })
      
      // รอให้ animation เสร็จ
      await animationInstance.finished
      
      if (options?.onComplete) {
        options.onComplete()
      }
      
      this.log('debug', '🎬 Animation completed', {
        animationName,
        duration: options?.duration || animation.duration
      })
      
      return true
    }, 'playAnimation', { animationName })
  }

  /**
   * สร้าง Ripple Effect ที่สวยงาม
   */
  async createRippleEffect(
    element: HTMLElement,
    event: MouseEvent | TouchEvent,
    color?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const rect = element.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const radius = size / 2
      
      // คำนวณตำแหน่งของ ripple
      let x: number, y: number
      
      if (event instanceof MouseEvent) {
        x = event.clientX - rect.left - radius
        y = event.clientY - rect.top - radius
      } else {
        const touch = event.touches[0] || event.changedTouches[0]
        x = touch.clientX - rect.left - radius
        y = touch.clientY - rect.top - radius
      }
      
      // สร้าง ripple element
      const ripple = document.createElement('div')
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: ${color || 'rgba(255, 255, 255, 0.3)'};
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
      `
      
      // เพิ่ม CSS animation ถ้ายังไม่มี
      this.ensureRippleCSS()
      
      // เพิ่ม ripple ลงใน element
      element.style.position = 'relative'
      element.style.overflow = 'hidden'
      element.appendChild(ripple)
      
      // ลบ ripple หลังจาก animation เสร็จ
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
      }, 600)
      
      return true
    }, 'createRippleEffect')
  }

  /**
   * จัดการ Responsive Breakpoints
   */
  getBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
    const width = window.innerWidth
    
    if (width < 640) return 'xs'
    if (width < 768) return 'sm'
    if (width < 1024) return 'md'
    if (width < 1280) return 'lg'
    if (width < 1536) return 'xl'
    return '2xl'
  }

  /**
   * ตรวจสอบว่าเป็น Mobile หรือไม่
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768
  }

  /**
   * ตรวจสอบว่าเป็น Touch Device หรือไม่
   */
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  /**
   * Private Methods
   */
  private initializeDefaultTheme(): void {
    this.currentTheme = {
      name: 'MUNEEF',
      colors: {
        primary: '#00A86B',
        primaryHover: '#008F5B',
        primaryLight: '#E8F5EF',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#1A1A1A',
        textSecondary: '#666666',
        border: '#E8E8E8',
        success: '#00A86B',
        warning: '#F5A623',
        error: '#E53935'
      },
      typography: {
        fontFamily: 'Sarabun, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem'
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem'
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }
    }
    
    this.updateCSSVariables(this.currentTheme)
  }

  private initializeAnimations(): void {
    // Fade In Scale Animation
    this.animations.set('fadeInScale', {
      name: 'fadeInScale',
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      keyframes: {
        '0': { opacity: '0', transform: 'scale(0.8)' },
        '100': { opacity: '1', transform: 'scale(1)' }
      }
    })
    
    // Slide In From Bottom
    this.animations.set('slideInBottom', {
      name: 'slideInBottom',
      duration: 400,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      keyframes: {
        '0': { opacity: '0', transform: 'translateY(100%)' },
        '100': { opacity: '1', transform: 'translateY(0)' }
      }
    })
    
    // Bounce In
    this.animations.set('bounceIn', {
      name: 'bounceIn',
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: {
        '0': { opacity: '0', transform: 'scale(0.3)' },
        '50': { opacity: '1', transform: 'scale(1.05)' },
        '70': { transform: 'scale(0.9)' },
        '100': { opacity: '1', transform: 'scale(1)' }
      }
    })
  }

  private styleToast(toast: ToastMessage): ToastMessage {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    }
    
    return {
      ...toast,
      icon: toast.icon || icons[toast.type],
      title: `${icons[toast.type]} ${toast.title}`
    }
  }

  private updateCSSVariables(theme: ThemeConfig): void {
    const root = document.documentElement
    
    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
    })
    
    // Typography
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value.toString())
    })
    
    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })
    
    // Border Radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value)
    })
    
    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value)
    })
  }

  private ensureRippleCSS(): void {
    if (!document.getElementById('ripple-styles')) {
      const style = document.createElement('style')
      style.id = 'ripple-styles'
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }
  }

  private emitUIEvent(eventName: string, data: any): void {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current active UI states
   */
  getActiveStates(): {
    toasts: ToastMessage[]
    modals: ModalConfig[]
    loadings: LoadingState[]
  } {
    return {
      toasts: Array.from(this.activeToasts.values()),
      modals: Array.from(this.activeModals.values()),
      loadings: Array.from(this.activeLoadings.values())
    }
  }

  /**
   * Clear all active UI states
   */
  async clearAll(): Promise<Result<boolean>> {
    return this.execute(async () => {
      // Clear all toasts
      for (const id of this.activeToasts.keys()) {
        await this.hideToast(id)
      }
      
      // Clear all modals
      for (const id of this.activeModals.keys()) {
        await this.hideModal(id)
      }
      
      // Clear all loadings
      for (const id of this.activeLoadings.keys()) {
        await this.hideLoading(id)
      }
      
      this.log('info', '🧹 All UI states cleared')
      
      return true
    }, 'clearAll')
  }
}