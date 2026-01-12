-- Migration: 246_fix_ride_requests_provider_fk.sql
-- Fix: ride_requests.provider_id FK should reference providers_v2 instead of service_providers
-- This allows providers registered via providers_v2 to accept jobs

BEGIN;

-- 1. Drop the old foreign key constraint
ALTER TABLE ride_requests 
DROP CONSTRAINT IF EXISTS ride_requests_provider_id_fkey;

-- 2. Add new foreign key to providers_v2
-- Using ON DELETE SET NULL so if provider is deleted, ride keeps history
ALTER TABLE ride_requests
ADD CONSTRAINT ride_requests_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES providers_v2(id) ON DELETE SET NULL;

-- 3. Also fix delivery_requests if it has the same issue
ALTER TABLE delivery_requests 
DROP CONSTRAINT IF EXISTS delivery_requests_provider_id_fkey;

ALTER TABLE delivery_requests
ADD CONSTRAINT delivery_requests_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES providers_v2(id) ON DELETE SET NULL;

-- 4. Also fix shopping_requests if it has the same issue
ALTER TABLE shopping_requests 
DROP CONSTRAINT IF EXISTS shopping_requests_provider_id_fkey;

ALTER TABLE shopping_requests
ADD CONSTRAINT shopping_requests_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES providers_v2(id) ON DELETE SET NULL;

-- 5. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_v2 ON ride_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_provider_v2 ON delivery_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_shopping_requests_provider_v2 ON shopping_requests(provider_id);

COMMIT;
