import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import {
  logout,
  saveProject,
  deleteProject,
  uploadImage,
  deleteImage,
  reorderImages,
  uploadPrintImage,
  updatePrintImageCaption,
  deletePrintImage,
  submitProject,
  createUser,
  bulkCreateUsers,
  deleteUser,
  type SaveProjectData,
  type ImageOrderItem,
  type CreateUserData,
  type BulkCreateUsersData,
} from "./fetchers";

// ============================================================================
// Auth
// ============================================================================

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
}

// ============================================================================
// Projects
// ============================================================================

export function useSaveProject(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveProjectData) => {
      if (!projectId) throw new Error("No project selected");
      return saveProject(projectId, data);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
      }
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
    },
  });
}

// ============================================================================
// Images
// ============================================================================

export function useUploadImage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!projectId) throw new Error("No project selected");
      return uploadImage(projectId, file);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

export function useDeleteImage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => {
      if (!projectId) throw new Error("No project selected");
      return deleteImage(projectId, imageId);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

export function useReorderImages(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageOrder: ImageOrderItem[]) => {
      if (!projectId) throw new Error("No project selected");
      return reorderImages(projectId, imageOrder);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

// ============================================================================
// Print Images
// ============================================================================

export function useUploadPrintImage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!projectId) throw new Error("No project selected");
      return uploadPrintImage(projectId, file);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

export function useUpdatePrintImageCaption(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (caption: string) => {
      if (!projectId) throw new Error("No project selected");
      return updatePrintImageCaption(projectId, caption);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

export function useDeletePrintImage(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project selected");
      return deletePrintImage(projectId);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      }
    },
  });
}

// ============================================================================
// Submission
// ============================================================================

export function useSubmitProject(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error("No project selected");
      return submitProject(projectId);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.submitValidation(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
      }
    },
  });
}

// ============================================================================
// Users
// ============================================================================

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table("users") });
    },
  });
}

export function useBulkCreateUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateUsersData) => bulkCreateUsers(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table("users") });
      queryClient.invalidateQueries({ queryKey: queryKeys.table("projects") });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table("users") });
    },
  });
}
