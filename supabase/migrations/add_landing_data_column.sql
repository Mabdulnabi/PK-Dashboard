-- Add landing_data column for Puck editor JSON
-- landing_blocks (old) is kept for backward compatibility
ALTER TABLE shop_tools ADD COLUMN IF NOT EXISTS landing_data jsonb;
