import { describe, expect, it } from "vitest";
import { buildTrajectory, validateProjectForSubmission } from "./admin-api";
import type { Project, ProjectImage } from "../types";

describe("buildTrajectory", () => {
  // BA Photography / BA Visual Arts have no context taxonomy — the schema's
  // `context` column is NULL for them. The postcard trajectory must be the
  // bilingual programme label only (mirroring getProjectMetaLabel).
  it("uses the programme label only for BA_FO with no context", () => {
    expect(buildTrajectory("BA_FO", null)).toBe(
      "Professionele bachelor fotografie / Professional Bachelor Photography"
    );
  });

  it("uses the programme label only for BA_BK with no context", () => {
    expect(buildTrajectory("BA_BK", null)).toBe(
      "Professionele bachelor beeldende kunsten / Professional Bachelor Visual Arts"
    );
  });

  // Regression: existing MA/PREMA postcards keep the capitalised-NL
  // "Programme Context / Context" print convention.
  it("keeps the Master + context format for MA_BK", () => {
    expect(buildTrajectory("MA_BK", "autonomous")).toBe("Master Autonome Context / Autonomous Context");
  });

  it("keeps the Premaster + context format for PREMA_BK", () => {
    expect(buildTrajectory("PREMA_BK", "jewelry")).toBe("Premaster Juwelencontext / Jewelry Context");
  });
});

describe("validateProjectForSubmission", () => {
  const baseProject: Project = {
    id: "proj-1",
    slug: "student-slug",
    student_name: "Student Name",
    sort_name: "Name, Student",
    project_title_en: "English Title",
    project_title_nl: "Dutch Title",
    program: "MA_BK",
    context: "autonomous",
    academic_year: "2024-2025",
    bio_en: "English bio",
    bio_nl: "Dutch bio",
    description_en: "English description",
    description_nl: "Dutch description",
    location_en: "English location",
    location_nl: "Dutch location",
    print_image_path: "path/to/print.jpg",
    print_caption: "Print caption",
    print_description: "Print description",
    print_language: "en",
    alumni_consent: 1,
    status: "draft",
    created_at: "now",
    updated_at: "now",
    user_id: "user-1",
    private_email: null,
    thumb_image_id: null,
    tags: null,
    social_links: null,
  };

  const webImages: ProjectImage[] = [
    {
      id: "img-1",
      project_id: "proj-1",
      cloudflare_id: "cf-1",
      sort_order: 0,
      caption: "Caption",
      type: "web",
    },
  ];

  it("passes validation for MA_BK with valid context", () => {
    const res = validateProjectForSubmission(baseProject, webImages);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("fails validation for MA_BK with missing context", () => {
    const project = { ...baseProject, context: null as any };
    const res = validateProjectForSubmission(project, webImages);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Context is required for MA BK and PREMA BK programmes");
  });

  it("fails validation for PREMA_BK with empty string context", () => {
    const project = { ...baseProject, program: "PREMA_BK" as const, context: "" as any };
    const res = validateProjectForSubmission(project, webImages);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Context is required for MA BK and PREMA BK programmes");
  });

  it("fails validation for MA_BK with invalid context value", () => {
    const project = { ...baseProject, context: "invalid-context" as any };
    const res = validateProjectForSubmission(project, webImages);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Context is required for MA BK and PREMA BK programmes");
  });

  it("passes validation for BA_FO with missing context", () => {
    const project = { ...baseProject, program: "BA_FO" as const, context: null as any };
    const res = validateProjectForSubmission(project, webImages);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("passes validation for BA_BK with empty string context", () => {
    const project = { ...baseProject, program: "BA_BK" as const, context: "" as any };
    const res = validateProjectForSubmission(project, webImages);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });
});
