-- Add print_image_width and print_image_height columns that were added to
-- the baseline but never migrated on the production database.
ALTER TABLE projects ADD COLUMN print_image_width INTEGER;
ALTER TABLE projects ADD COLUMN print_image_height INTEGER;
