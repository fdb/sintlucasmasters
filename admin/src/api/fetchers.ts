import type {
  AuthUser,
  AuthResponse,
  TableResponse,
  ProjectDetailResponse,
  UserDetailResponse,
  StudentForImpersonation,
  SubmitValidationResult,
  ProjectImage,
} from "../store/adminStore";

// ============================================================================
// Session / Auth
// ============================================================================

export type SessionData = {
  user: AuthUser;
  tables: string[];
} | null;

export async function fetchSession(): Promise<SessionData> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    throw new Error("Failed to load session");
  }

  const data = (await res.json()) as AuthResponse;
  if (!data.authenticated) {
    return null;
  }

  // Also fetch available tables
  const tablesRes = await fetch("/api/admin/tables");
  if (!tablesRes.ok) {
    throw new Error("Failed to load available tables");
  }
  const tablesData = (await tablesRes.json()) as { tables: string[] };

  return {
    user: data.user,
    tables: tablesData.tables,
  };
}

export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to logout");
  }
}

// ============================================================================
// Tables
// ============================================================================

export async function fetchTable(tableName: string): Promise<TableResponse> {
  const res = await fetch(`/api/admin/table/${tableName}?limit=1000`);
  if (!res.ok) {
    throw new Error(`Failed to load table: ${tableName}`);
  }
  return (await res.json()) as TableResponse;
}

// ============================================================================
// Projects
// ============================================================================

export async function fetchProject(projectId: string): Promise<ProjectDetailResponse> {
  const res = await fetch(`/api/admin/projects/${projectId}`);
  if (!res.ok) {
    throw new Error("Failed to load project detail");
  }
  return (await res.json()) as ProjectDetailResponse;
}

export type SaveProjectData = {
  student_name: string;
  project_title_en: string;
  project_title_nl: string;
  context: string;
  program: string;
  academic_year: string;
  bio_en: string | null;
  bio_nl: string | null;
  description_en: string;
  description_nl: string;
  location_en: string | null;
  location_nl: string | null;
  private_email: string | null;
  status: string;
  tags: string | null;
  social_links: string | null;
};

export async function saveProject(projectId: string, data: SaveProjectData): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error("Failed to save project");
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete project");
  }
}

// ============================================================================
// Images
// ============================================================================

export async function uploadImage(projectId: string, file: File): Promise<ProjectImage> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/admin/projects/${projectId}/images/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    let message = error.error || `Failed to upload ${file.name}`;

    // Make Cloudflare errors more user-friendly
    if (res.status === 413 || message.toLowerCase().includes("too large")) {
      message = `"${file.name}" is too large. Maximum file size is 10MB.`;
    }
    if (message.includes("dimension") || message.includes("12000")) {
      message = `"${file.name}" exceeds maximum dimensions (12,000px on longest side).`;
    }

    throw new Error(message);
  }

  const data = (await res.json()) as { image: ProjectImage };
  return data.image;
}

export async function deleteImage(projectId: string, imageId: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/images/${imageId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete image");
  }
}

export type ImageOrderItem = {
  id: string;
  sort_order: number;
  caption: string | null;
};

export async function reorderImages(projectId: string, imageOrder: ImageOrderItem[]): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/images/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageOrder }),
  });
  if (!res.ok) {
    throw new Error("Failed to save image order");
  }
}

// ============================================================================
// Print Images
// ============================================================================

export async function uploadPrintImage(projectId: string, file: File): Promise<ProjectImage> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/admin/projects/${projectId}/print-image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    let message = error.error || `Failed to upload ${file.name}`;

    // Make Cloudflare errors more user-friendly
    if (res.status === 413 || message.toLowerCase().includes("too large")) {
      message = `"${file.name}" is too large. Maximum file size is 10MB.`;
    }
    if (message.includes("dimension") || message.includes("12000")) {
      message = `"${file.name}" exceeds maximum dimensions (12,000px on longest side).`;
    }

    throw new Error(message);
  }

  const data = (await res.json()) as { image: ProjectImage };
  return data.image;
}

export async function updatePrintImageCaption(projectId: string, caption: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/print-image/caption`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caption }),
  });
  if (!res.ok) {
    throw new Error("Failed to update caption");
  }
}

export async function deletePrintImage(projectId: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/print-image`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete print image");
  }
}

// ============================================================================
// Submission
// ============================================================================

export async function fetchSubmitValidation(projectId: string): Promise<SubmitValidationResult> {
  const res = await fetch(`/api/admin/projects/${projectId}/submit/validate`);
  if (!res.ok) {
    throw new Error("Failed to load validation");
  }
  return (await res.json()) as SubmitValidationResult;
}

export async function submitProject(projectId: string): Promise<void> {
  const res = await fetch(`/api/admin/projects/${projectId}/submit`, {
    method: "POST",
  });

  if (!res.ok) {
    const error = (await res.json()) as { error?: string; validationErrors?: string[] };
    const message = error.validationErrors?.join(", ") || error.error || "Submission failed";
    throw new Error(message);
  }
}

// ============================================================================
// Translation
// ============================================================================

export type TranslateFieldRequest = {
  field: "bio" | "description";
  text: string;
  direction: "nl-to-en" | "en-to-nl";
};

export type TranslateFieldResponse = {
  translation: string;
  status: "ok" | "failed";
  reason?: string;
};

export async function translateField(projectId: string, data: TranslateFieldRequest): Promise<TranslateFieldResponse> {
  const res = await fetch(`/api/admin/projects/${projectId}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error || "Translation failed");
  }

  return (await res.json()) as TranslateFieldResponse;
}

// ============================================================================
// Users
// ============================================================================

export async function fetchUser(userId: string): Promise<UserDetailResponse> {
  const res = await fetch(`/api/admin/users/${userId}`);
  if (!res.ok) {
    throw new Error("Failed to load user detail");
  }
  return (await res.json()) as UserDetailResponse;
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete user");
  }
}

export type CreateUserData = {
  email: string;
  name: string;
  role: string;
};

export async function createUser(data: CreateUserData): Promise<void> {
  const res = await fetch("/api/admin/users/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = (await res.json()) as { error?: string };
    throw new Error(errorData.error || "Failed to create user");
  }
}

export type BulkCreateUsersData = {
  csvData: string;
  program?: string;
  academic_year?: string;
};

export type BulkCreateUsersResult = {
  usersCreated: number;
  usersExisting: number;
  projectsCreated: number;
  projectsSkipped: number;
  errors: string[];
};

export async function bulkCreateUsers(data: BulkCreateUsersData): Promise<BulkCreateUsersResult> {
  const res = await fetch("/api/admin/users/bulk-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = (await res.json()) as { error?: string };
    throw new Error(errorData.error || "Failed to create users");
  }

  return (await res.json()) as BulkCreateUsersResult;
}

// ============================================================================
// Impersonation
// ============================================================================

export async function fetchStudentsForImpersonation(): Promise<StudentForImpersonation[]> {
  const res = await fetch("/api/admin/students-with-projects");
  if (!res.ok) {
    throw new Error("Failed to load students");
  }
  const data = (await res.json()) as { students: StudentForImpersonation[] };
  return data.students;
}
