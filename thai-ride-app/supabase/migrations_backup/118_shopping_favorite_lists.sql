-- =====================================================
-- Migration: 118_shopping_favorite_lists.sql
-- Description: Create shopping_favorite_lists table for saving favorite shopping lists
-- Feature: F04 - Shopping Service
-- =====================================================

-- Create shopping_favorite_lists table
CREATE TABLE IF NOT EXISTS public.shopping_favorite_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  items TEXT NOT NULL,
  store_name VARCHAR(200),
  store_address TEXT,
  store_lat DECIMAL(10,8),
  store_lng DECIMAL(11,8),
  estimated_budget DECIMAL(10,2),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shopping_favorite_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite lists" ON public.shopping_favorite_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorite lists" ON public.shopping_favorite_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite lists" ON public.shopping_favorite_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite lists" ON public.shopping_favorite_lists
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_shopping_favorite_lists_user ON public.shopping_favorite_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_favorite_lists_use_count ON public.shopping_favorite_lists(use_count DESC);

-- Comment
COMMENT ON TABLE public.shopping_favorite_lists IS 'User favorite shopping lists for quick reuse';
