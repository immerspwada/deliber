import { describe, it, expect } from 'vitest'
import { formatOrderNumber, useOrderNumber } from '../composables/useOrderNumber'

describe('useOrderNumber', () => {
  describe('formatOrderNumber', () => {
    const testUuid = '550e8400-e29b-41d4-a716-446655440000'

    it('should format UUID to short format with # prefix', () => {
      const result = formatOrderNumber(testUuid, 'short')
      expect(result).toBe('#550E8400')
    })

    it('should format UUID to short format by default', () => {
      const result = formatOrderNumber(testUuid)
      expect(result).toBe('#550E8400')
    })

    it('should return full UUID when format is full', () => {
      const result = formatOrderNumber(testUuid, 'full')
      expect(result).toBe(testUuid)
    })

    it('should uppercase the short format', () => {
      const lowercaseUuid = '550e8400-e29b-41d4-a716-446655440000'
      const result = formatOrderNumber(lowercaseUuid, 'short')
      expect(result).toBe('#550E8400')
      expect(result).not.toContain('e')
    })

    it('should handle empty string', () => {
      const result = formatOrderNumber('', 'short')
      expect(result).toBe('')
    })

    it('should handle whitespace', () => {
      const uuidWithSpaces = '  550e8400-e29b-41d4-a716-446655440000  '
      const result = formatOrderNumber(uuidWithSpaces, 'short')
      expect(result).toBe('#550E8400')
    })

    it('should handle short UUIDs gracefully', () => {
      const shortUuid = '550e84'
      const result = formatOrderNumber(shortUuid, 'short')
      expect(result).toBe('#550E84')
    })

    it('should handle RID- prefixed IDs', () => {
      const result = formatOrderNumber('RID-MKJ5EEA8', 'short')
      expect(result).toBe('#RID-MKJ5EEA8')
    })

    it('should handle DEL- prefixed IDs', () => {
      const result = formatOrderNumber('DEL-ABC12345', 'short')
      expect(result).toBe('#DEL-ABC12345')
    })

    it('should handle SHP- prefixed IDs', () => {
      const result = formatOrderNumber('SHP-XYZ98765', 'short')
      expect(result).toBe('#SHP-XYZ98765')
    })

    it('should handle non-string input', () => {
      // @ts-expect-error Testing invalid input
      const result = formatOrderNumber(null, 'short')
      expect(result).toBe('')
    })

    it('should handle undefined input', () => {
      // @ts-expect-error Testing invalid input
      const result = formatOrderNumber(undefined, 'short')
      expect(result).toBe('')
    })
  })

  describe('useOrderNumber composable', () => {
    it('should return formatOrderNumber function', () => {
      const { formatOrderNumber: fn } = useOrderNumber()
      expect(typeof fn).toBe('function')
    })

    it('should format correctly when called from composable', () => {
      const { formatOrderNumber: fn } = useOrderNumber()
      const testUuid = '550e8400-e29b-41d4-a716-446655440000'
      const result = fn(testUuid, 'short')
      expect(result).toBe('#550E8400')
    })
  })
})
