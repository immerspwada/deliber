# Migration Instructions

## How to Run Migrations

Since the project is not linked with Supabase CLI, you need to run migrations manually through the Supabase Dashboard.

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the content from the migration file you want to run
6. Paste it into the SQL Editor
7. Click **Run** or press `Ctrl+Enter`

### Latest Migration to Run:

**File:** `215_payment_slips_storage_v2.sql`

**Purpose:** Creates the `payment-slips` storage bucket for payment slip uploads

**SQL to run:**

```sql
-- =====================================================
-- Payment Slips Storage Bucket (Simplified)
-- =====================================================

-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips',
  'payment-slips',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own payment slips" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any payment slip" ON storage.objects;

-- Allow authenticated users to upload payment slips
CREATE POLICY "Users can upload payment slips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-slips');

-- Allow authenticated users to view payment slips
CREATE POLICY "Users can view payment slips"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow authenticated users to delete payment slips
CREATE POLICY "Users can delete payment slips"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-slips');

-- Allow public access to view payment slips
CREATE POLICY "Public can view payment slips"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-slips');
```

### Verification:

After running the migration, verify that:

1. The `payment-slips` bucket exists in **Storage** section
2. The bucket is set to **Public**
3. File size limit is **10MB**
4. Allowed MIME types include: `image/jpeg`, `image/png`, `image/webp`, `image/jpg`

### Troubleshooting:

If you get "Bucket not found" error:

- Make sure you ran the migration in the correct project
- Check that the bucket appears in Storage section
- Try refreshing your application

If policies fail:

- Check if policies with the same name already exist
- You may need to drop them manually first
