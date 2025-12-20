/**
 * Input Validation Composable
 * Production-ready form validation with Thai language support
 */

import { ref, computed, watch } from 'vue'
import { validators, sanitize, ValidationSchema, ValidationResult } from '../lib/validation'

export interface FieldState {
  value: any
  error: string | null
  touched: boolean
  dirty: boolean
}

export interface FormState {
  [key: string]: FieldState
}

export function useInputValidation<T extends Record<string, any>>(
  initialValues: T,
  schema?: ValidationSchema
) {
  const formState = ref<FormState>({})
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)

  // Initialize form state
  for (const key in initialValues) {
    formState.value[key] = {
      value: initialValues[key],
      error: null,
      touched: false,
      dirty: false
    }
  }

  // Computed values
  const values = computed(() => {
    const result: Record<string, any> = {}
    for (const key in formState.value) {
      result[key] = formState.value[key].value
    }
    return result as T
  })

  const errors = computed(() => {
    const result: Record<string, string | null> = {}
    for (const key in formState.value) {
      result[key] = formState.value[key].error
    }
    return result
  })

  const isValid = computed(() => {
    return Object.values(formState.value).every(field => !field.error)
  })

  const isDirty = computed(() => {
    return Object.values(formState.value).some(field => field.dirty)
  })

  const touchedFields = computed(() => {
    return Object.entries(formState.value)
      .filter(([_, field]) => field.touched)
      .map(([key]) => key)
  })

  /**
   * Set field value
   */
  const setValue = (field: keyof T, value: any) => {
    if (formState.value[field as string]) {
      formState.value[field as string].value = value
      formState.value[field as string].dirty = true
    }
  }

  /**
   * Set field error
   */
  const setError = (field: keyof T, error: string | null) => {
    if (formState.value[field as string]) {
      formState.value[field as string].error = error
    }
  }

  /**
   * Touch field (mark as interacted)
   */
  const touchField = (field: keyof T) => {
    if (formState.value[field as string]) {
      formState.value[field as string].touched = true
    }
  }

  /**
   * Validate single field
   */
  const validateField = (field: keyof T, rules: Array<{
    validator: (value: any) => boolean
    message: string
  }>): boolean => {
    const value = formState.value[field as string]?.value
    
    for (const rule of rules) {
      if (!rule.validator(value)) {
        setError(field, rule.message)
        return false
      }
    }
    
    setError(field, null)
    return true
  }

  /**
   * Validate all fields using schema
   */
  const validate = (): ValidationResult => {
    if (!schema) {
      return { valid: true, errors: [] }
    }

    const result = schema.validate(values.value)
    
    // Clear all errors first
    for (const key in formState.value) {
      formState.value[key].error = null
    }
    
    // Set errors from validation
    for (const error of result.errors) {
      // Extract field name from error message
      const fieldMatch = error.match(/^(\w+)/)
      if (fieldMatch && formState.value[fieldMatch[1]]) {
        formState.value[fieldMatch[1]].error = error
      }
    }
    
    return result
  }

  /**
   * Reset form to initial values
   */
  const reset = () => {
    for (const key in initialValues) {
      formState.value[key] = {
        value: initialValues[key],
        error: null,
        touched: false,
        dirty: false
      }
    }
    submitError.value = null
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (
    onSubmit: (values: T) => Promise<void>,
    options?: {
      validateOnSubmit?: boolean
      sanitizeValues?: boolean
    }
  ) => {
    const { validateOnSubmit = true, sanitizeValues = true } = options || {}
    
    isSubmitting.value = true
    submitError.value = null
    
    try {
      // Touch all fields
      for (const key in formState.value) {
        formState.value[key].touched = true
      }
      
      // Validate if schema provided
      if (validateOnSubmit && schema) {
        const result = validate()
        if (!result.valid) {
          return
        }
      }
      
      // Sanitize values if requested
      let submitValues = values.value
      if (sanitizeValues) {
        submitValues = sanitize.object(submitValues)
      }
      
      await onSubmit(submitValues)
    } catch (error: any) {
      submitError.value = error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Create field binding for v-model
   */
  const field = (name: keyof T) => {
    return {
      modelValue: formState.value[name as string]?.value,
      'onUpdate:modelValue': (value: any) => setValue(name, value),
      onBlur: () => touchField(name),
      error: formState.value[name as string]?.error,
      touched: formState.value[name as string]?.touched
    }
  }

  return {
    // State
    formState,
    isSubmitting,
    submitError,
    
    // Computed
    values,
    errors,
    isValid,
    isDirty,
    touchedFields,
    
    // Methods
    setValue,
    setError,
    touchField,
    validateField,
    validate,
    reset,
    handleSubmit,
    field,
    
    // Validators (re-export for convenience)
    validators,
    sanitize
  }
}

// =====================================================
// Pre-built Field Validators
// =====================================================

export const fieldValidators = {
  required: (message = 'กรุณากรอกข้อมูล') => ({
    validator: validators.required,
    message
  }),
  
  email: (message = 'อีเมลไม่ถูกต้อง') => ({
    validator: validators.email,
    message
  }),
  
  thaiPhone: (message = 'เบอร์โทรไม่ถูกต้อง') => ({
    validator: validators.thaiPhone,
    message
  }),
  
  thaiNationalId: (message = 'เลขบัตรประชาชนไม่ถูกต้อง') => ({
    validator: validators.thaiNationalId,
    message
  }),
  
  minLength: (min: number, message?: string) => ({
    validator: validators.minLength(min),
    message: message || `ต้องมีอย่างน้อย ${min} ตัวอักษร`
  }),
  
  maxLength: (max: number, message?: string) => ({
    validator: validators.maxLength(max),
    message: message || `ต้องไม่เกิน ${max} ตัวอักษร`
  }),
  
  positive: (message = 'ต้องเป็นจำนวนบวก') => ({
    validator: validators.positive,
    message
  }),
  
  min: (minVal: number, message?: string) => ({
    validator: validators.min(minVal),
    message: message || `ต้องมากกว่าหรือเท่ากับ ${minVal}`
  }),
  
  max: (maxVal: number, message?: string) => ({
    validator: validators.max(maxVal),
    message: message || `ต้องน้อยกว่าหรือเท่ากับ ${maxVal}`
  })
}
