/**
 * Provider Commission Unit Tests
 * ===============================
 * ทดสอบระบบคอมมิชชั่น Provider
 */
import { describe, it, expect } from 'vitest'
import {
  calculateCommission,
  formatCommissionDisplay,
  validateCommissionValue,
  DEFAULT_COMMISSION_RATES
} from '@/types/commission'

describe('Provider Commission System', () => {
  describe('calculateCommission', () => {
    it('should calculate percentage commission correctly', () => {
      const result = calculateCommission(100, 'percentage', 20)
      
      expect(result.fareAmount).toBe(100)
      expect(result.commissionAmount).toBe(20)
      expect(result.providerEarnings).toBe(80)
      expect(result.commissionType).toBe('percentage')
      expect(result.commissionValue).toBe(20)
    })

    it('should calculate fixed commission correctly', () => {
      const result = calculateCommission(100, 'fixed', 15)
      
      expect(result.fareAmount).toBe(100)
      expect(result.commissionAmount).toBe(15)
      expect(result.providerEarnings).toBe(85)
      expect(result.commissionType).toBe('fixed')
      expect(result.commissionValue).toBe(15)
    })

    it('should handle 0% commission', () => {
      const result = calculateCommission(100, 'percentage', 0)
      
      expect(result.commissionAmount).toBe(0)
      expect(result.providerEarnings).toBe(100)
    })

    it('should handle 100% commission', () => {
      const result = calculateCommission(100, 'percentage', 100)
      
      expect(result.commissionAmount).toBe(100)
      expect(result.providerEarnings).toBe(0)
    })

    it('should handle decimal percentages', () => {
      const result = calculateCommission(100, 'percentage', 15.5)
      
      expect(result.commissionAmount).toBe(15.5)
      expect(result.providerEarnings).toBe(84.5)
    })

    it('should handle large fare amounts', () => {
      const result = calculateCommission(10000, 'percentage', 20)
      
      expect(result.commissionAmount).toBe(2000)
      expect(result.providerEarnings).toBe(8000)
    })
  })

  describe('formatCommissionDisplay', () => {
    it('should format percentage commission', () => {
      expect(formatCommissionDisplay('percentage', 20)).toBe('20%')
      expect(formatCommissionDisplay('percentage', 15.5)).toBe('15.5%')
    })

    it('should format fixed commission', () => {
      expect(formatCommissionDisplay('fixed', 20)).toBe('20 บาท')
      expect(formatCommissionDisplay('fixed', 1000)).toBe('1,000 บาท')
    })
  })

  describe('validateCommissionValue', () => {
    it('should validate percentage commission', () => {
      expect(validateCommissionValue('percentage', 20).valid).toBe(true)
      expect(validateCommissionValue('percentage', 0).valid).toBe(true)
      expect(validateCommissionValue('percentage', 100).valid).toBe(true)
    })

    it('should reject negative values', () => {
      const result = validateCommissionValue('percentage', -1)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ค่าคอมมิชชั่นต้องไม่ต่ำกว่า 0')
    })

    it('should reject percentage > 100', () => {
      const result = validateCommissionValue('percentage', 101)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('เปอร์เซ็นต์ต้องไม่เกิน 100%')
    })

    it('should validate fixed commission', () => {
      expect(validateCommissionValue('fixed', 20).valid).toBe(true)
      expect(validateCommissionValue('fixed', 1000).valid).toBe(true)
    })

    it('should reject very large fixed amounts', () => {
      const result = validateCommissionValue('fixed', 1000000)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('จำนวนเงินสูงเกินไป')
    })
  })

  describe('DEFAULT_COMMISSION_RATES', () => {
    it('should have correct default rates', () => {
      expect(DEFAULT_COMMISSION_RATES.ride).toBe(20)
      expect(DEFAULT_COMMISSION_RATES.delivery).toBe(25)
      expect(DEFAULT_COMMISSION_RATES.shopping).toBe(15)
      expect(DEFAULT_COMMISSION_RATES.moving).toBe(18)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small fare amounts', () => {
      const result = calculateCommission(1, 'percentage', 20)
      expect(result.commissionAmount).toBe(0.2)
      expect(result.providerEarnings).toBe(0.8)
    })

    it('should handle fixed commission larger than fare', () => {
      const result = calculateCommission(50, 'fixed', 100)
      expect(result.commissionAmount).toBe(100)
      expect(result.providerEarnings).toBe(-50) // Negative earnings
    })

    it('should handle decimal fare amounts', () => {
      const result = calculateCommission(99.99, 'percentage', 20)
      expect(result.commissionAmount).toBeCloseTo(19.998, 2)
      expect(result.providerEarnings).toBeCloseTo(79.992, 2)
    })
  })
})
