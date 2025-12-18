-- Migration: 052_shopping_favorites_and_images.sql
-- Feature: F04a - Shopping Favorite Lists & Image Upload
-- Description: Add favorite shopping lists and image attachments for shopping requests

-- =====================================================
-- 1. Shopping Favorite Lists Table
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_favorite_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  items TEXT NOT NULL, -- JSON array of items or newline-separated list
  store_name VARCHAR(255),
  store_address TEXT,
  store_lat DECIMAL(10, 8),
  store_lng DECIMAL(11, 8),
  estimated_budget DECIMAL(10, 2),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_shopping_favorite_lists_user ON shopping_favorite_lists(user_id);
CREATE INDEX idx_shopping_favorite_lists_use_count ON shopping_favorite_lists(user_id, use_count DESC);

-- =====================================================
-- 2. Shopping Request Images Table
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_request_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_request_id UUID REFERENCES shopping_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for request lookups
CREATE INDEX idx_shopping_request_images_request ON shopping_request_images(shopping_request_id);
CREATE INDEX idx_shopping_request_images_user ON shopping_request_images(user_id);

-- =====================================================
-- 3. Add images column to shopping_requests
-- =====================================================
ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS reference_images TEXT[]; -- Array of image URLs

-- =====================================================
-- 4. RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE shopping_favorite_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_request_images ENABLE ROW LEVEL SECURITY;

-- Shopping Favorite Lists Policies
CREATE POLICY "Users can view own favorite lists"
  ON shopping_favorite_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorite lists"
  ON shopping_favorite_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite lists"
  ON shopping_favorite_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite lists"
  ON shopping_favorite_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Shopping Request Images Policies
CREATE POLICY "Users can view own request images"
  ON shopping_request_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own request images"
  ON shopping_request_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own request images"
  ON shopping_request_images FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admin can view all favorite lists"
  ON shopping_favorite_lists FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view all request images"
  ON shopping_request_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Provider can view images for their assigned requests
CREATE POLICY "Provider can view assigned request images"
  ON shopping_request_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shopping_requests sr
      WHERE sr.id = shopping_request_images.shopping_request_id
      AND sr.provider_id = auth.uid()
    )
  );


-- =====================================================
-- 5. Functions
-- =====================================================

-- Function to save favorite list
CREATE OR REPLACE FUNCTION save_shopping_favorite_list(
  p_user_id UUID,
  p_name VARCHAR(100),
  p_items TEXT,
  p_store_name VARCHAR(255) DEFAULT NULL,
  p_store_address TEXT DEFAULT NULL,
  p_store_lat DECIMAL(10, 8) DEFAULT NULL,
  p_store_lng DECIMAL(11, 8) DEFAULT NULL,
  p_estimated_budget DECIMAL(10, 2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_list_id UUID;
BEGIN
  INSERT INTO shopping_favorite_lists (
    user_id, name, items, store_name, store_address, 
    store_lat, store_lng, estimated_budget
  ) VALUES (
    p_user_id, p_name, p_items, p_store_name, p_store_address,
    p_store_lat, p_store_lng, p_estimated_budget
  )
  RETURNING id INTO v_list_id;
  
  RETURN v_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use favorite list (increment counter)
CREATE OR REPLACE FUNCTION use_shopping_favorite_list(p_list_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE shopping_favorite_lists
  SET use_count = use_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorite lists
CREATE OR REPLACE FUNCTION get_user_shopping_favorites(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  items TEXT,
  store_name VARCHAR(255),
  store_address TEXT,
  store_lat DECIMAL(10, 8),
  store_lng DECIMAL(11, 8),
  estimated_budget DECIMAL(10, 2),
  use_count INTEGER,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sfl.id, sfl.name, sfl.items, sfl.store_name, sfl.store_address,
    sfl.store_lat, sfl.store_lng, sfl.estimated_budget,
    sfl.use_count, sfl.last_used_at, sfl.created_at
  FROM shopping_favorite_lists sfl
  WHERE sfl.user_id = p_user_id
  ORDER BY sfl.use_count DESC, sfl.last_used_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Storage Bucket for Shopping Images
-- =====================================================
-- Note: Run this in Supabase Dashboard or via API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('shopping-images', 'shopping-images', true);
