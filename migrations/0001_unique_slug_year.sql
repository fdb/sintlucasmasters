-- Add unique constraint on (slug, academic_year) to prevent URL collisions
DROP INDEX IF EXISTS idx_projects_slug_year;
CREATE UNIQUE INDEX idx_projects_slug_year ON projects(slug, academic_year);
