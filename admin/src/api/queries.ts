import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  fetchSession,
  fetchTable,
  fetchProject,
  fetchUser,
  fetchSubmitValidation,
  fetchStudentsForImpersonation,
  fetchExportStatus,
} from "./fetchers";

// ============================================================================
// Session
// ============================================================================

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000, // 5 minutes - session doesn't change often
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Tables
// ============================================================================

export function useTable(tableName: string | undefined) {
  return useQuery({
    queryKey: queryKeys.table(tableName || ""),
    queryFn: () => fetchTable(tableName!),
    enabled: !!tableName,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Poll every minute for multi-editor sync
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Projects
// ============================================================================

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.project(projectId || ""),
    queryFn: () => fetchProject(projectId!),
    enabled: !!projectId,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Poll every minute for multi-editor sync
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Users
// ============================================================================

export function useUser(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.user(userId || ""),
    queryFn: () => fetchUser(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Submit Validation
// ============================================================================

export function useSubmitValidation(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.submitValidation(projectId || ""),
    queryFn: () => fetchSubmitValidation(projectId!),
    enabled: !!projectId,
    staleTime: 10_000, // 10 seconds - validation can change as user edits
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Impersonation
// ============================================================================

export function useStudentsForImpersonation(enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.studentsForImpersonation,
    queryFn: fetchStudentsForImpersonation,
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Export Status
// ============================================================================

export function useExportStatus(year: string | undefined, program: string | undefined) {
  return useQuery({
    queryKey: queryKeys.exportStatus(year || "", program || ""),
    queryFn: () => fetchExportStatus(year!, program!),
    enabled: !!year && !!program,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// Student Projects (filtered by user)
// ============================================================================

export function useStudentProjects(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.studentProjects(userId || ""),
    queryFn: async () => {
      const data = await fetchTable("projects");
      // Filter projects to only those belonging to the target user
      return data.rows
        .filter((row) => row.user_id === userId)
        .map((row) => ({
          id: String(row.id),
          student_name: String(row.student_name || ""),
          project_title: String(row.project_title || ""),
          academic_year: String(row.academic_year || ""),
          context: String(row.context || ""),
          status: String(row.status || "draft"),
        }));
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
