-- Migration: 048_order_notes.sql
-- Feature: F23 - Admin Dashboard (Order Notes)
-- Description: Create order_notes table for admin internal comments

-- Create order_notes table
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type VARCHAR(50) NOT NULL, -- ride, delivery, shopping, queue, moving, laundry
  note TEXT NOT NULL,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_type ON order_notes(order_type);
CREATE INDEX IF NOT EXISTS idx_order_notes_created_at ON order_notes(created_at DESC);

-- Enable RLS
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admin can view all order notes"
  ON order_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert order notes"
  ON order_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update order notes"
  ON order_notes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admin can delete order notes"
  ON order_notes FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE order_notes IS 'Internal admin notes/comments for orders - for team communication';
COMMENT ON COLUMN order_notes.order_id IS 'Reference to the order (ride_requests, delivery_requests, etc.)';
COMMENT ON COLUMN order_notes.order_type IS 'Type of order: ride, delivery, shopping, queue, moving, laundry';
COMMENT ON COLUMN order_notes.note IS 'The note content';
COMMENT ON COLUMN order_notes.created_by IS 'Who created the note (admin username or ID)';
