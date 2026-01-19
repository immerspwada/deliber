-- Migration: 236_fix_vehicle_types_columns.sql
-- Add missing columns to vehicle_types table for ride booking system

-- Add price_multiplier column (used for fare calculation)
ALTER TABLE vehicle_types 
ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- Add estimated_eta_minutes column (estimated time of arrival)
ALTER TABLE vehicle_types 
ADD COLUMN IF NOT EXISTS estimated_eta_minutes INTEGER DEFAULT 5;

-- Add sort_order column (for ordering in UI)
ALTER TABLE vehicle_types 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing records with appropriate values
UPDATE vehicle_types SET 
  price_multiplier = CASE 
    WHEN name = 'Motorcycle' OR name_th = 'มอเตอร์ไซค์' THEN 0.7
    WHEN name = 'Standard' OR name_th = 'มาตรฐาน' THEN 1.0
    WHEN name = 'Premium' OR name_th = 'พรีเมียม' THEN 1.5
    WHEN name = 'SUV' THEN 1.8
    ELSE 1.0
  END,
  estimated_eta_minutes = CASE 
    WHEN name = 'Motorcycle' OR name_th = 'มอเตอร์ไซค์' THEN 3
    WHEN name = 'Standard' OR name_th = 'มาตรฐาน' THEN 5
    WHEN name = 'Premium' OR name_th = 'พรีเมียม' THEN 7
    WHEN name = 'SUV' THEN 8
    ELSE 5
  END,
  sort_order = CASE 
    WHEN name = 'Motorcycle' OR name_th = 'มอเตอร์ไซค์' THEN 1
    WHEN name = 'Standard' OR name_th = 'มาตรฐาน' THEN 2
    WHEN name = 'Premium' OR name_th = 'พรีเมียม' THEN 3
    WHEN name = 'SUV' THEN 4
    ELSE 5
  END
WHERE price_multiplier IS NULL OR price_multiplier = 1.0;

-- Create index for sort_order
CREATE INDEX IF NOT EXISTS idx_vehicle_types_sort_order ON vehicle_types(sort_order);

-- Add comment for documentation
COMMENT ON COLUMN vehicle_types.price_multiplier IS 'Multiplier for base fare calculation (e.g., 0.7 for bike, 1.5 for premium)';
COMMENT ON COLUMN vehicle_types.estimated_eta_minutes IS 'Estimated time of arrival in minutes';
COMMENT ON COLUMN vehicle_types.sort_order IS 'Display order in UI';
