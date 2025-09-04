-- Add color_tag to sessions to persist event color selection
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS color_tag text;

-- Backfill existing rows with a sensible default
UPDATE sessions
SET color_tag = 'Primary'
WHERE color_tag IS NULL;


