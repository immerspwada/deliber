-- Migration: 144_consolidate_user_columns.sql
-- Feature: F01 - Consolidate User Columns
-- Description: Sync name/phone columns and add triggers to keep them in sync

-- =====================================================
-- STEP 1: Sync existing data
-- =====================================================

-- Update 'name' from first_name/last_name where name is empty
UPDATE users 
SET name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE (name IS NULL OR name = '') 
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Update first_name/last_name from name where they are empty
UPDATE users 
SET 
  first_name = COALESCE(first_name, SPLIT_PART(name, ' ', 1)),
  last_name = COALESCE(last_name, TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1)))
WHERE name IS NOT NULL AND name != ''
  AND (first_name IS NULL OR first_name = '');

-- Update 'phone' from phone_number where phone is empty
UPDATE users 
SET phone = phone_number
WHERE (phone IS NULL OR phone = '') 
  AND phone_number IS NOT NULL;

-- Update phone_number from phone where phone_number is empty
UPDATE users 
SET phone_number = phone
WHERE (phone_number IS NULL OR phone_number = '') 
  AND phone IS NOT NULL;

-- =====================================================
-- STEP 2: Create trigger function to keep columns in sync
-- =====================================================

CREATE OR REPLACE FUNCTION sync_user_name_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync name <-> first_name/last_name
  IF NEW.name IS DISTINCT FROM OLD.name AND NEW.name IS NOT NULL AND NEW.name != '' THEN
    -- name was updated, sync to first_name/last_name
    NEW.first_name := SPLIT_PART(NEW.name, ' ', 1);
    NEW.last_name := TRIM(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1));
  ELSIF (NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name) THEN
    -- first_name or last_name was updated, sync to name
    NEW.name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  END IF;
  
  -- Sync phone <-> phone_number
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_number := NEW.phone;
  ELSIF NEW.phone_number IS DISTINCT FROM OLD.phone_number AND NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone := NEW.phone_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 3: Create trigger
-- =====================================================

DROP TRIGGER IF EXISTS sync_user_columns_trigger ON users;

CREATE TRIGGER sync_user_columns_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_name_columns();

-- =====================================================
-- STEP 4: Add comment for documentation
-- =====================================================

COMMENT ON FUNCTION sync_user_name_columns() IS 
'Keeps name/first_name/last_name and phone/phone_number columns in sync. 
When name is updated, it splits into first_name and last_name.
When first_name or last_name is updated, it concatenates into name.
Same logic applies to phone and phone_number.';
