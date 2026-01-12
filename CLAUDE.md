# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-year static website for Sint Lucas Masters student exhibitions, built with Eleventy (11ty). Each academic year has its own separate directory (2021, 2022, 2023, 2024, 2025) with independent Eleventy configurations.

## Commands

```bash
# Install dependencies
npm install

# Development (watches 2025 folder, serves at localhost:3000)
npm start

# Build all years
npm run build

# Build a specific year
npm run build:2025
```

## Architecture

### Year-based Structure
- Each year folder (e.g., `2025/`) is a complete Eleventy site with:
  - `.eleventy.js` - Eleventy configuration with custom collections
  - `_includes/` - Liquid templates (base.liquid, student.liquid, etc.)
  - `students/` - Markdown files for each student (frontmatter + content)
  - `static/` - CSS and JavaScript assets

### Student Data Model
Student markdown files use this frontmatter structure:
```yaml
student_name: "Name"
project_title: "Title"
context: "Digital Context" | "Autonomous Context" | "Applied Context" | "Socio-Political Context" | "Jewelry Context"
year: "2024-2025"
main_image: "slug/image-id.jpeg"
images: []
social_links: []
```

### Collections
Eleventy collections in `.eleventy.js` filter students by context (digitalContext, autonomousContext, appliedContext, sociopoliticalContext) and a general `students` collection.

### CMS Integration
- `admin/` contains Decap CMS (formerly Netlify CMS) configuration
- Uses Cloudflare for media library storage
- Deployed on Netlify (see `netlify.toml`)

## Data Import Workflow

When importing new student data from Google Forms:
1. Download CSV with headers: `timestamp,email,name,gsm,context,project_title,summary,website,main_image,main_caption,description,images,instagram`
2. Run `node scripts/csv_to_markdown.mjs <csv-file>` to generate student markdown files
3. Download images via `scripts/download_image_uploads.mjs` to `_uploads/`
4. Upload images to media service and run `scripts/convert_to_uploadcare.mjs` to update image references
