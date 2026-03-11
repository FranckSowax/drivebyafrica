-- Fix vehicles with year = 0: treat them as current year (most recent)
-- These are typically new vehicles from scrapers that couldn't extract the year.

UPDATE vehicles
SET year = EXTRACT(YEAR FROM CURRENT_DATE)::int
WHERE year = 0 OR year IS NULL;

-- Prevent future year = 0 by setting a default and a check constraint
ALTER TABLE vehicles
  ALTER COLUMN year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::int;
