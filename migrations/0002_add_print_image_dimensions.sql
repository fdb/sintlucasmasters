-- Add print_image_width and print_image_height columns to the projects table.
ALTER TABLE projects ADD COLUMN print_image_width INTEGER;
ALTER TABLE projects ADD COLUMN print_image_height INTEGER;
