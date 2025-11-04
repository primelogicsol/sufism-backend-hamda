-- Migration: Add vendorId to shipments table for per-vendor labeling
-- This allows tracking which vendor each shipment belongs to
-- Required for multi-vendor order support

-- Add vendorId column to shipments table
ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;

-- Add foreign key constraint
ALTER TABLE "shipments" 
  ADD CONSTRAINT "shipments_vendorId_fkey" 
  FOREIGN KEY ("vendorId") 
  REFERENCES "users"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "shipments_vendorId_idx" ON "shipments"("vendorId");

