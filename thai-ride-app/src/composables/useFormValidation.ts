/**
 * Form Validation System
 * Feature: F258 - Professional Form Validation
 * 
 * Real-time validation with Thai + English error messages
 * Accessible error announcements, integration with design tokens
 */

import { ref, computed, watch } from 'vue'

export interface ValidationRule {
  validator: (value: any) => boolean
  message: string
  messageTh?: string
}

export interface FieldValidation {
  value: any
  rules: ValidationRule[]
  touched: boolean
  dirty: boolean
}

export interface FormValidationState {
  [key: string]: FieldValidation
}

export function useFormValidation() {
  const fields = ref<FormValidationState>({})
  const isSubmitting = ref(false)
  const submitCount = ref(0)

  // Register a field with validation rules
  const registerField = (
    name: string,
    initialValue: any = '',
    rules: ValidationRule[] = []
  ) => {
    fields.value[name] = {
      value: initialValue,
      rules,
      touched: false,
      dirty: false
    }
  }

  // Update field value
  const setFieldValue = (name: string, value: any) => {
    if (fields.value[name]) {
      fields.value[name].value = value
      fields.value[name].dirty = true
    }
  }

  // Mark field as touched
  const setFieldTouched = (name: string, touched = true) => {
    if (fields.value[name]) {
      fields.value[name].touched = touched
    }
  }

  // Validate a single field
  const validateField = (name: string): string | null => {
    const field = fields.value[name]
    if (!field) return null

    for (const rule of field.rules) {
      if (!rule.validator(field.value)) {
        return rule.messageTh || rule.message
      }
    }

    return null
  }

  // Validate all fields
  const validateForm = (): boolean => {
    let isValid = true

    Object.keys(fields.value).forEach(name => {
      const error = validateField(name)
      if (error) {
        isValid = false
        setFieldTouched(name, true)
      }
    })

    return isValid
  }

  // Get field error
  const getFieldError = (name: string): string | null => {
    const field = fields.value[name]
    if (!field || (!field.touched && submitCount.value === 0)) {
      return null
    }

    return validateField(name)
  }

  // Check if field has error
  const hasFieldError = (name: string): boolean => {
    return getFieldError(name) !== null
  }

  // Get all errors
  const errors = computed(() => {
    const errorMap: Record<string, string> = {}

    Object.keys(fields.value).forEach(name => {
      const error = getFieldError(name)
      if (error) {
        errorMap[name] = error
      }
    })

    return errorMap
  })

  // Check if form is valid
  const isValid = computed(() => {
    return Object.keys(errors.value).length === 0
  })

  // Check if form is dirty
  const isDirty = computed(() => {
    return Object.values(fields.value).some(field => field.dirty)
  })

  // Reset form
  const resetForm = () => {
    Object.keys(fields.value).forEach(name => {
      fields.value[name].touched = false
      fields.value[name].dirty = false
    })
    submitCount.value = 0
  }

  // Handle form submit
  const handleSubmit = async (onSubmit: () => Promise<void> | void) => {
    submitCount.value++
    
    if (!validateForm()) {
      // Announce errors to screen readers
      const errorMessages = Object.values(errors.value).join(', ')
      announceError(errorMessages)
      return
    }

    isSubmitting.value = true

    try {
      await onSubmit()
    } finally {
      isSubmitting.value = false
    }
  }

  // Announce error to screen readers
  const announceError = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'alert')
    announcement.setAttribute('aria-live', 'assertive')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  return {
    // State
    fields,
    isSubmitting,
    errors,
    isValid,
    isDirty,

    // Methods
    registerField,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    resetForm,
    handleSubmit
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required', messageTh = 'กรุณากรอกข้อมูล'): ValidationRule => ({
    validator: (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return value !== null && value !== undefined
    },
    message,
    messageTh
  }),

  email: (message = 'Invalid email address', messageTh = 'อีเมลไม่ถูกต้อง'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    message,
    messageTh
  }),

  phone: (message = 'Invalid phone number', messageTh = 'เบอร์โทรศัพท์ไม่ถูกต้อง'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      // Thai phone number: 0X-XXXX-XXXX or 0XXXXXXXXX
      return /^0\d{9}$|^0\d-\d{4}-\d{4}$/.test(value.replace(/\s/g, ''))
    },
    message,
    messageTh
  }),

  minLength: (min: number, message?: string, messageTh?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      return value.length >= min
    },
    message: message || `Minimum ${min} characters`,
    messageTh: messageTh || `ต้องมีอย่างน้อย ${min} ตัวอักษร`
  }),

  maxLength: (max: number, message?: string, messageTh?: string): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      return value.length <= max
    },
    message: message || `Maximum ${max} characters`,
    messageTh: messageTh || `ต้องไม่เกิน ${max} ตัวอักษร`
  }),

  min: (min: number, message?: string, messageTh?: string): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true
      return value >= min
    },
    message: message || `Minimum value is ${min}`,
    messageTh: messageTh || `ค่าต่ำสุดคือ ${min}`
  }),

  max: (max: number, message?: string, messageTh?: string): ValidationRule => ({
    validator: (value: number) => {
      if (value === null || value === undefined) return true
      return value <= max
    },
    message: message || `Maximum value is ${max}`,
    messageTh: messageTh || `ค่าสูงสุดคือ ${max}`
  }),

  pattern: (regex: RegExp, message = 'Invalid format', messageTh = 'รูปแบบไม่ถูกต้อง'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      return regex.test(value)
    },
    message,
    messageTh
  }),

  url: (message = 'Invalid URL', messageTh = 'URL ไม่ถูกต้อง'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    message,
    messageTh
  }),

  numeric: (message = 'Must be a number', messageTh = 'ต้องเป็นตัวเลข'): ValidationRule => ({
    validator: (value: any) => {
      if (!value) return true
      return !isNaN(Number(value))
    },
    message,
    messageTh
  }),

  alphanumeric: (message = 'Only letters and numbers allowed', messageTh = 'ใช้ได้เฉพาะตัวอักษรและตัวเลข'): ValidationRule => ({
    validator: (value: string) => {
      if (!value) return true
      return /^[a-zA-Z0-9]+$/.test(value)
    },
    message,
    messageTh
  }),

  match: (otherField: string, message = 'Fields do not match', messageTh = 'ข้อมูลไม่ตรงกัน'): ValidationRule => ({
    validator: (value: any, formValues?: any) => {
      if (!value || !formValues) return true
      return value === formValues[otherField]
    },
    message,
    messageTh
  })
}

/**
 * Usage Example:
 * 
 * ```vue
 * <script setup>
 * import { useFormValidation, validationRules } from '@/composables/useFormValidation'
 * 
 * const {
 *   registerField,
 *   setFieldValue,
 *   setFieldTouched,
 *   getFieldError,
 *   hasFieldError,
 *   handleSubmit,
 *   isValid
 * } = useFormValidation()
 * 
 * // Register fields
 * registerField('email', '', [
 *   validationRules.required(),
 *   validationRules.email()
 * ])
 * 
 * registerField('phone', '', [
 *   validationRules.required(),
 *   validationRules.phone()
 * ])
 * 
 * // Handle submit
 * const onSubmit = () => {
 *   handleSubmit(async () => {
 *     // Submit form
 *     console.log('Form submitted!')
 *   })
 * }
 * </script>
 * 
 * <template>
 *   <form @submit.prevent="onSubmit">
 *     <FormInput
 *       name="email"
 *       :error="getFieldError('email')"
 *       @update:modelValue="setFieldValue('email', $event)"
 *       @blur="setFieldTouched('email')"
 *     />
 *     
 *     <button type="submit" :disabled="!isValid">
 *       Submit
 *     </button>
 *   </form>
 * </template>
 * ```
 */
