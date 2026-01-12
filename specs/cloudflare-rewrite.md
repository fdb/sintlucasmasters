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
- **Database**: Cloudflare D1 (SQLite)
- **Media Storage**: Cloudflare Images (already integrated)
- **Authentication**: TBD (Cloudflare Access? Custom auth?)

---

## Data Model

### Project

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| student_name | string | yes | Full name of the student |
| project_title | string | yes | Title of the master project |
| context | enum | yes | One of the 5 contexts (see below) |
| academic_year | string | yes | Format: "2024-2025" |
| bio | text | no | Student biography/artist statement |
| description | text | yes | Project description (markdown) |
| main_image_id | string | yes | Cloudflare Images ID - used for print |
| thumb_image_id | string | no | Square thumbnail (falls back to main_image) |
| tags | string[] | no | Material/medium tags |
| social_links | string[] | no | Portfolio, Instagram, etc. |
| status | enum | yes | draft, submitted, ready_for_print, published |
| created_at | datetime | yes | |
| updated_at | datetime | yes | |

### ProjectImage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | yes | Primary key |
| project_id | uuid | yes | Foreign key to Project |
| cloudflare_id | string | yes | Cloudflare Images ID |
| sort_order | int | yes | Display order |
| caption | string | no | Image caption |

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

## User Roles

### Student
- Can create/edit their own project
- Can upload images
- Can submit project for review
- Can edit after print (but changes won't affect printed version)

### Admin (Nicolas)
- Can view all projects
- Can mark projects as "ready for print"
- Can edit any project
- Can filter/search projects

### Super Admin (Chloé)
- All admin permissions
- Can download ZIP exports with high-res images
- Can manage student accounts

---

## Features & Tasks

### 1. Database & API

- [ ] Design D1 schema with migrations
- [ ] Create Project CRUD API endpoints
- [ ] Create ProjectImage API endpoints
- [ ] Implement image upload endpoint with Cloudflare Images
- [ ] Add image dimension validation (reject if below minimum)
- [ ] Create bulk export endpoint (ZIP with high-res images)

### 2. Authentication

- [ ] Decide on auth approach (Cloudflare Access vs custom)
- [ ] Student login/registration flow
- [ ] Admin login flow
- [ ] Role-based access control middleware

### 3. Student Portal

- [ ] Project creation form
- [ ] Image upload with drag-and-drop
- [ ] Real-time image validation feedback (resolution check)
- [ ] Preview of project page
- [ ] Submit for review button
- [ ] Edit mode after submission (with warning about print)

### 4. Admin Portal

- [ ] Dashboard with project list (filterable by status, context, year)
- [ ] Project detail view with edit capability
- [ ] "Mark as ready for print" action
- [ ] "Publish" action
- [ ] Bulk actions (publish all ready projects)
- [ ] ZIP download for print production

### 5. Public Website

- [ ] Homepage with grid of current year projects
- [ ] Project detail page
- [ ] Archive page with year selector
- [ ] Filter by context
- [ ] Filter by tags
- [ ] Responsive design
- [ ] SEO metadata

### 6. Data Migration

- [ ] Script to import existing markdown files from 2021-2025
- [ ] Map existing Cloudflare/Uploadcare image IDs
- [ ] Validate migrated data

### 7. Infrastructure

- [ ] Set up Cloudflare Pages project
- [ ] Configure D1 database
- [ ] Set up Cloudflare Images bucket
- [ ] Configure custom domain
- [ ] Set up staging environment

---

## Migration Notes

### Existing Data Structure (from current codebase)

Current student markdown frontmatter:
```yaml
student_name: "Name"
project_title: "Title"
context: "Digital Context"
year: "2024-2025"
main_image: "slug/image-id.jpeg"
thumb_image: "slug/thumb.jpeg"  # optional
bio: "..."  # optional
tags: ["photography", "digital"]  # optional
images:
  - "slug/image1.jpeg"
  - "slug/image2.jpeg"
social_links:
  - "https://instagram.com/..."
  - "https://portfolio.com"
```

Body content is markdown description.

### Image Migration

Current images are stored as:
- Local files in `_uploads/{student-slug}/{image-id}.{ext}`
- Referenced by relative path in frontmatter
- Some already uploaded to Cloudflare Images (account hash: 7-GLn6-56OyK7JwwGe0hfg)

---

## Open Questions

- [ ] How do students authenticate? Magic link? Password? School SSO?
- [ ] Should students be able to delete their project entirely?
- [ ] What happens to projects after graduation? Permanent archive?
- [ ] Do we need revision history for projects?
- [ ] Print deadline workflow - lock edits after certain date?
