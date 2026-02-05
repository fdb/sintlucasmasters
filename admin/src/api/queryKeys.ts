// Centralized query keys for TanStack Query
// Using factory pattern for type-safe, consistent keys

export const queryKeys = {
  // Session/auth
  session: ["session"] as const,

  // Tables
  tables: ["tables"] as const,
  table: (name: string) => ["table", name] as const,

  // Projects
  project: (id: string) => ["project", id] as const,

  // Users
  user: (id: string) => ["user", id] as const,

  // Submit validation
  submitValidation: (projectId: string) => ["submitValidation", projectId] as const,

  // Impersonation
  studentsForImpersonation: ["students", "impersonation"] as const,

  // Student projects (filtered by user)
  studentProjects: (userId: string) => ["studentProjects", userId] as const,
};
