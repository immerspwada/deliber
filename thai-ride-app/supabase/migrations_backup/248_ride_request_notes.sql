-- Migration: Add notes column to ride_requests
-- Purpose: Allow customers to add special instructions for providers (max 500 chars)

BEGIN;

-- Add notes column to ride_requests
ALTER TABLE ride_requests
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraint for max length (500 characters)
ALTER TABLE ride_requests
ADD CONSTRAINT ride_requests_notes_length
CHECK (notes IS NULL OR LENGTH(notes) <= 500);

-- Comment for documentation
COMMENT ON COLUMN ride_requests.notes IS 'Customer notes/instructions for the provider (max 500 chars)';

COMMIT;
