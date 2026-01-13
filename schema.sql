-- Sint Lucas Masters D1 Schema

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    student_name TEXT NOT NULL,
    project_title TEXT NOT NULL,
    context TEXT NOT NULL CHECK (context IN (
        'Autonomous Context',
        'Applied Context',
        'Digital Context',
        'Socio-Political Context',
        'Jewelry Context'
    )),
    academic_year TEXT NOT NULL,
    bio TEXT,
    description TEXT NOT NULL,
    main_image_id TEXT NOT NULL,
    thumb_image_id TEXT,
    tags TEXT, -- JSON array
    social_links TEXT, -- JSON array
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN (
        'draft',
        'submitted',
        'ready_for_print',
        'published'
    )),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cloudflare_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_academic_year ON projects(academic_year);
CREATE INDEX IF NOT EXISTS idx_projects_context ON projects(context);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug_year ON projects(slug, academic_year);
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);
