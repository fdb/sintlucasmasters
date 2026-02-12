// E2E test data constants
// These must match the data in scripts/seed-e2e.mjs

export const E2E_ADMIN = {
  id: "e2e-admin-001",
  email: "e2e-admin@example.com",
  role: "admin",
};

export const E2E_STUDENT = {
  id: "e2e-student-001",
  email: "existing-student@example.com",
  name: "Existing Student",
  role: "student",
};

export const E2E_PROJECTS = [
  {
    id: "e2e-project-001",
    slug: "alice-smith",
    student_name: "Alice Smith",
    project_title: "Digital Dreams",
    context: "digital",
    academic_year: "2024-2025",
    status: "published",
  },
  {
    id: "e2e-project-002",
    slug: "bob-jones",
    student_name: "Bob Jones",
    project_title: "Autonomous Sculptures",
    context: "autonomous",
    academic_year: "2024-2025",
    status: "draft",
  },
  {
    id: "e2e-project-003",
    slug: "carol-white",
    student_name: "Carol White",
    project_title: "Applied Design Systems",
    context: "applied",
    academic_year: "2023-2024",
    status: "published",
  },
];

export const CONTEXTS = ["All", "autonomous", "applied", "digital", "sociopolitical", "jewelry"];

export const YEARS = ["All", "2024-2025", "2023-2024"];
