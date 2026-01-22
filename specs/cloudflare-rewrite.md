# Sint Lucas Masters Website Rewrite

A greenfield rewrite of the Sint Lucas Antwerpen Masters graduation showcase website. The system serves both web display and print production workflows.

## Goals

- Unified database of all student projects across all years (currently spread across year folders)
- Self-service student upload portal (replacing Google Forms workflow)
- Automated image validation for print requirements
- Admin workflow for review and print-ready approval
- Archive browsing by year and context
- **Full Cloudflare stack**: Workers for backend logic, D1 for database, Cloudflare Images for media hosting

## Tech Stack

- **Platform**: Cloudflare Pages + Workers
- **Framework**: Hono (SSR with JSX)
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images (already integrated)
- **Authentication**: TBD (Cloudflare Access? Custom auth?)
- **CSS**: Minimal system font stack only

---

## Development Phases

### Phase 1: Database & Data Migration

**Goal**: Validate the data model by importing all existing data

1. Design and create D1 schema locally
2. Write idempotent migration script to import existing markdown files
3. Verify all 307 projects import correctly
4. Test image ID extraction for both formats

### Phase 2: Simple SSR Frontend

**Goal**: Validate the Hono + D1 approach works end-to-end

1. Create Hono app with SSR
2. Build list view showing all projects
3. Build detail view for single project
4. Minimal CSS (system fonts, basic spacing)

### Phase 3: Public Pages with Filtering

**Goal**: Complete the public-facing website

1. Current year page with context filter
2. Archive page with year selector and context filter
3. Responsive grid layout
4. SEO metadata

### Phase 4: Admin Section (Future)

**Goal**: Replace Google Forms workflow

1. Authentication system
2. Student portal for self-service uploads
3. Admin dashboard for review workflow
4. Print-ready approval and ZIP export

---

## Data Model

### Design Decisions

- **No separate Student entity**: Student information is embedded directly in each Project. This keeps the model simple and matches the current markdown-based structure.
- **Multi-year students**: The same student can have projects in multiple years (e.g., Jewelry Context in 2023, Socio-Political Context in 2024). These are treated as independent Project records with no linking between them.
- **Student identification**: Students are identified by name string only. No unique student ID or email-based matching is implemented.

### Project

| Field          | Type        | Required | Description                                            |
| -------------- | ----------- | -------- | ------------------------------------------------------ |
| id             | uuid        | yes      | Primary key                                            |
| student_name   | string      | yes      | Full name of the student                               |
| project_title  | string      | yes      | Title of the master project                            |
| context        | enum        | yes      | One of the 5 contexts (see below)                      |
| academic_year  | string      | yes      | Format: "2025-2026" - default is current academic year |
| bio            | text        | no       | Student biography/artist statement                     |
| description    | text        | yes      | Project description (markdown)                         |
| main_image_id  | string      | yes      | Cloudflare Images ID - used for print                  |
| thumb_image_id | string      | no       | Square thumbnail (falls back to main_image)            |
| tags           | TEXT (JSON) | no       | Material/medium tags as JSON array                     |
| social_links   | TEXT (JSON) | no       | Portfolio, Instagram, etc. as JSON array               |
| status         | enum        | yes      | draft, submitted, ready_for_print, published           |
| created_at     | datetime    | yes      |                                                        |
| updated_at     | datetime    | yes      |                                                        |

### ProjectImage

| Field         | Type   | Required | Description            |
| ------------- | ------ | -------- | ---------------------- |
| id            | uuid   | yes      | Primary key            |
| project_id    | uuid   | yes      | Foreign key to Project |
| cloudflare_id | string | yes      | Cloudflare Images ID   |
| sort_order    | int    | yes      | Display order          |
| caption       | string | no       | Image caption          |

### Contexts (enum)

- Autonomous Context
- Applied Context
- Digital Context
- Socio-Political Context
- Jewelry Context

### Status (enum)

- `draft` - Student is still editing
- `submitted` - Student has submitted for review
- `ready_for_print` - Admin (Nicolas) approved for print
- `published` - Visible on public website

### Tags (enum)

Based on existing CMS config:
audio, ceramic, clay, digital, ink, installation, metal, paint, paper, performance, photography, screenprinting, sculpture, silver, textile, video

---

## D1 Schema

```sql
-- schema.sql

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON project_images(project_id);
```

---

## Phase 1: Data Migration

### Source Data Summary

| Year      | Students | Image Format                               |
| --------- | -------- | ------------------------------------------ |
| 2021      | ~60      | Full Cloudflare URLs                       |
| 2022      | ~60      | Full Cloudflare URLs                       |
| 2023      | ~60      | Full Cloudflare URLs                       |
| 2024      | ~60      | Full Cloudflare URLs                       |
| 2025      | ~67      | Relative paths (student-slug/image-id.ext) |
| **Total** | **~307** |                                            |

### Image Format Handling

**2021-2024 format** (full Cloudflare URLs):

```yaml
main_image: "https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/bf666892-6c85-4a27-b2f2-e46a66740e00"
images:
  - https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/84c53e0b-a621-4c69-724c-9b5c66f91000
```

Extract Cloudflare ID: `bf666892-6c85-4a27-b2f2-e46a66740e00`

**2025 format** (relative paths):

```yaml
main_image: alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg
images:
  - alix-spooren/1OervsXFuXVsr6XICtkQqoaxevUomFr9C.jpg
```

Cloudflare ID is the full path: `alix-spooren/13TDsml0WUunYSaBjfJA1A0WXuz-5_bRn.jpg`

### Migration Script (Idempotent)

```javascript
// scripts/migrate-to-d1.mjs

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import matter from "gray-matter";
import { createHash } from "crypto";

const CF_BASE = "https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/";
const YEARS = ["2021", "2022", "2023", "2024", "2025"];

function extractCloudflareId(imageRef) {
  if (!imageRef) return null;
  if (imageRef.startsWith(CF_BASE)) {
    return imageRef.replace(CF_BASE, "").replace(/\/.*$/, ""); // Remove variant suffix
  }
  return imageRef; // Already a relative path/ID
}

function normalizeYear(year) {
  // Convert "2020—2021" (em-dash) to "2020-2021" (hyphen)
  return year?.replace(/—/g, "-") || "";
}

function generateProjectId(studentName, academicYear) {
  // Deterministic ID based on student name + year for idempotent upserts
  const hash = createHash("sha256").update(`${studentName}:${academicYear}`).digest("hex");
  return hash.substring(0, 36); // UUID-length
}

function generateImageId(projectId, cloudflareId, sortOrder) {
  const hash = createHash("sha256").update(`${projectId}:${cloudflareId}:${sortOrder}`).digest("hex");
  return hash.substring(0, 36);
}

async function parseStudentFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  const { data: frontmatter, content: description } = matter(content);

  const academicYear = normalizeYear(frontmatter.year);
  const projectId = generateProjectId(frontmatter.student_name, academicYear);

  const project = {
    id: projectId,
    student_name: frontmatter.student_name,
    project_title: frontmatter.project_title,
    context: frontmatter.context,
    academic_year: academicYear,
    bio: frontmatter.bio || null,
    description: description.trim(),
    main_image_id: extractCloudflareId(frontmatter.main_image),
    thumb_image_id: extractCloudflareId(frontmatter.thumb_image),
    tags: frontmatter.tags ? JSON.stringify(frontmatter.tags) : null,
    social_links: frontmatter.social_links ? JSON.stringify(frontmatter.social_links) : null,
    status: "published",
  };

  const images = (frontmatter.images || []).map((img, index) => ({
    id: generateImageId(projectId, extractCloudflareId(img), index),
    project_id: projectId,
    cloudflare_id: extractCloudflareId(img),
    sort_order: index,
    caption: null,
  }));

  return { project, images };
}

async function migrate(db) {
  const allProjects = [];
  const allImages = [];

  for (const year of YEARS) {
    const studentsDir = join(process.cwd(), year, "students");
    const files = await readdir(studentsDir);

    for (const file of files.filter((f) => f.endsWith(".md"))) {
      const { project, images } = await parseStudentFile(join(studentsDir, file));
      allProjects.push(project);
      allImages.push(...images);
    }
  }

  // Upsert projects (INSERT OR REPLACE for idempotency)
  for (const project of allProjects) {
    await db
      .prepare(
        `
            INSERT OR REPLACE INTO projects
            (id, student_name, project_title, context, academic_year, bio, description,
             main_image_id, thumb_image_id, tags, social_links, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `
      )
      .bind(
        project.id,
        project.student_name,
        project.project_title,
        project.context,
        project.academic_year,
        project.bio,
        project.description,
        project.main_image_id,
        project.thumb_image_id,
        project.tags,
        project.social_links,
        project.status
      )
      .run();
  }

  // Upsert images
  for (const image of allImages) {
    await db
      .prepare(
        `
            INSERT OR REPLACE INTO project_images (id, project_id, cloudflare_id, sort_order, caption)
            VALUES (?, ?, ?, ?, ?)
        `
      )
      .bind(image.id, image.project_id, image.cloudflare_id, image.sort_order, image.caption)
      .run();
  }

  console.log(`Migrated ${allProjects.length} projects and ${allImages.length} images`);
}
```

### Migration Validation Checklist

- [ ] All 307 projects imported
- [ ] Each context has expected number of projects per year
- [ ] Image IDs are valid (spot-check 10 random images)
- [ ] Year format normalized to "YYYY-YYYY"
- [ ] No duplicate project IDs
- [ ] All required fields populated

---

## Phase 2: Simple SSR Frontend

### Project Structure

```
src/
├── index.ts          # Hono app entry point
├── routes/
│   ├── home.tsx      # List all projects
│   └── project.tsx   # Single project detail
├── components/
│   ├── Layout.tsx    # HTML shell with minimal CSS
│   ├── ProjectCard.tsx
│   └── ProjectDetail.tsx
└── db.ts             # D1 helper functions
```

### Minimal CSS

```css
/* Inline in Layout.tsx */
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
}
body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  background: white;
}
img {
  max-width: 100%;
  height: auto;
}
a {
  color: inherit;
}
```

### Routes

| Path             | Description                         |
| ---------------- | ----------------------------------- |
| `/`              | List all projects from current year |
| `/project/:id`   | Single project detail page          |
| `/archive`       | List projects from all years        |
| `/archive/:year` | List projects from specific year    |

---

## Phase 3: Public Pages with Filtering

### Current Year Page (`/`)

- Grid of project cards (main image + name + title)
- Context filter tabs/buttons (show all by default)
- Links to project detail pages

### Archive Page (`/archive`)

- Year selector dropdown or tabs
- Same context filter as current year
- Same card grid layout

### Project Detail Page (`/project/:id`)

- Student name and project title
- Main image (large)
- Description (rendered markdown)
- Gallery images
- Context and tags
- Social links

---

## Phase 4: Admin Section (Future)

### Features to Implement Later

1. **Authentication**
   - Decide on auth approach (Cloudflare Access vs custom)
   - Student login/registration flow
   - Admin login flow
   - Role-based access control middleware

2. **Student Portal**
   - Project creation form
   - Image upload with drag-and-drop
   - Real-time image validation feedback (resolution check)
   - Preview of project page
   - Submit for review button
   - Edit mode after submission (with warning about print)

3. **Admin Portal**
   - Dashboard with project list (filterable by status, context, year)
   - Project detail view with edit capability
   - "Mark as ready for print" action
   - "Publish" action
   - Bulk actions (publish all ready projects)
   - ZIP download for print production

### User Roles

**Student**

- Can create/edit their own project
- Can upload images
- Can submit project for review
- Can edit after print (but changes won't affect printed version)

**Admin (Nicolas, Chloé, Reg)**

- Can view all projects
- Can mark projects as "ready for print"
- Can edit any project
- Can filter/search projects
- Can download ZIP exports with high-res images
- Can manage student accounts

**Super Admin (Frederik)**

- All admin permissions
- Can manage admin accounts

---

## Image Requirements

### Main Image (for print)

- Minimum resolution: 3000x3000px (or equivalent ~9MP)
- Formats: JPEG, PNG, TIFF
- Color space: sRGB or CMYK
- This image is used for the printed catalog

### Gallery Images (web only)

- Minimum resolution: 1200px on longest side
- Formats: JPEG, PNG, GIF
- Automatically optimized by Cloudflare Images

### Thumbnail

- Should be square (1:1 aspect ratio)
- Minimum 800x800px
- If not provided, crop from main_image center

---

## Cloudflare Configuration

### Cloudflare Images Account

- Account hash: `7-GLn6-56OyK7JwwGe0hfg`
- Delivery URL pattern: `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/{image_id}/{variant}`
- Available variants: `xl`, `large`, `medium`, `thumb` (to be configured)

### Local Development

```bash
# Create local D1 database
wrangler d1 create sintlucas-masters --local

# Apply schema
wrangler d1 execute sintlucas-masters --local --file=./schema.sql

# Run migration
npm run migrate

# Start dev server
npm run dev
```

---

## Open Questions

- [ ] How do students authenticate? Magic link? Password? School SSO?
- [ ] Should students be able to delete their project entirely?
- [ ] What happens to projects after graduation? Permanent archive?
- [ ] Do we need revision history for projects?
- [ ] Print deadline workflow - lock edits after certain date?
- [ ] How do we handle initial "seeding" of students for every academic year?
