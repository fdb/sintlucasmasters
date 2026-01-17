-- Sint Lucas Masters D1 Schema

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    student_name TEXT NOT NULL,
    sort_name TEXT NOT NULL,
    project_title TEXT NOT NULL,
    program TEXT CHECK (program IN (
        'BA_FO',
        'BA_BK',
        'MA_BK',
        'PREMA_BK'
    )),
    context TEXT CHECK (context IN (
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
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_id TEXT REFERENCES users(id)
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
CREATE INDEX IF NOT EXISTS idx_projects_program ON projects(program);
CREATE INDEX IF NOT EXISTS idx_projects_context ON projects(context);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug_year ON projects(slug, academic_year);
CREATE INDEX IF NOT EXISTS idx_projects_sort_name ON projects(sort_name);
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);

-- Users table (students and admins)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- Magic link tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
