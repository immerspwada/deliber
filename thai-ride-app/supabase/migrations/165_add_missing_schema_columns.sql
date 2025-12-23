-- Migration: 165_add_missing_schema_columns.sql
-- Feature: Full Functionality Integration - Phase 0
-- Description: Add missing columns that are blocking tests
-- Task: 0.2 - Add missing schema columns

-- ============================================================================
-- 1. Add held_balance to user_wallets
-- ============================================================================
-- This column tracks the amount held during pending transactions
-- Used by wallet hold system during service request creation

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wallets' 
    AND column_name = 'held_balance'
  ) THEN
    ALTER TABLE user_wallets 
    ADD COLUMN held_balance DECIMAL(10,2) DEFAULT 0 NOT NULL;
    
    -- Add check constraint to ensure held_balance is non-negative
    ALTER TABLE user_wallets 
    ADD CONSTRAINT held_balance_non_negative CHECK (held_balance >= 0);
    
    -- Add check constraint to ensure held_balance doesn't exceed balance
    ALTER TABLE user_wallets 
    ADD CONSTRAINT held_balance_within_balance CHECK (held_balance <= balance);
    
    RAISE NOTICE 'Added held_balance column to user_wallets';
  ELSE
    RAISE NOTICE 'held_balance column already exists in user_wallets';
  END IF;
END $$;

-- ============================================================================
-- 2. Add id_card_photo to service_providers
-- ============================================================================
-- This column stores the URL/path to the provider's ID card photo
-- Used by admin for provider verification

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' 
    AND column_name = 'id_card_photo'
  ) THEN
    ALTER TABLE service_providers 
    ADD COLUMN id_card_photo TEXT;
    
    RAISE NOTICE 'Added id_card_photo column to service_providers';
  ELSE
    RAISE NOTICE 'id_card_photo column already exists in service_providers';
  END IF;
END $$;

-- ============================================================================
-- 3. Verify vehicle_type exists in ride_requests
-- ============================================================================
-- This column should already exist, but we verify it here

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' 
    AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE ride_requests 
    ADD COLUMN vehicle_type VARCHAR(20);
    
    RAISE NOTICE 'Added vehicle_type column to ride_requests';
  ELSE
    RAISE NOTICE 'vehicle_type column already exists in ride_requests';
  END IF;
END $$;

-- ============================================================================
-- 4. Verify amount column in refunds table
-- ============================================================================
-- Check if refunds table exists and has amount column

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'refunds' 
      AND column_name = 'amount'
    ) THEN
      -- Check if it's named differently (refund_amount, etc.)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refunds' 
        AND column_name = 'refund_amount'
      ) THEN
        RAISE NOTICE 'refunds table uses refund_amount column instead of amount';
      ELSE
        ALTER TABLE refunds 
        ADD COLUMN amount DECIMAL(10,2) NOT NULL;
        
        RAISE NOTICE 'Added amount column to refunds';
      END IF;
    ELSE
      RAISE NOTICE 'amount column already exists in refunds';
    END IF;
  ELSE
    RAISE NOTICE 'refunds table does not exist yet';
  END IF;
END $$;

-- ============================================================================
-- 5. Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN user_wallets.held_balance IS 'Amount held during pending transactions (wallet hold system)';
COMMENT ON COLUMN service_providers.id_card_photo IS 'URL/path to provider ID card photo for verification';

-- ============================================================================
-- 6. Grant necessary permissions
-- ============================================================================

-- No additional permissions needed - existing RLS policies will apply
