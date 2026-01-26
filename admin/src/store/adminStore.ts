import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "student" | "editor" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type AuthResponse = { authenticated: true; user: AuthUser } | { authenticated: false };

export type TableResponse = {
  table: string;
  limit: number;
  count: number;
  rows: Array<Record<string, unknown>>;
};

export type ProjectDetailResponse = {
  project: Record<string, unknown>;
  images: Array<Record<string, unknown>>;
};

export type UserDetailResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
    last_login_at: string | null;
  };
};

export type ProjectImage = {
  id: string;
  cloudflare_id: string;
  sort_order: number;
  caption: string | null;
};

export type EditDraft = {
  student_name: string;
  project_title: string;
  context: string;
  program: string;
  academic_year: string;
  bio: string;
  description: string;
  status: string;
  tags: string[];
  social_links: string[];
  main_image_id: string;
};

type SessionStatus = "loading" | "ready" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type UserCreateStatus = "idle" | "creating" | "success" | "error";
type UserModalTab = "single" | "bulk";

type AdminState = {
  user: AuthUser | null;
  status: SessionStatus;
  tables: string[];
  activeTable: string;
  tableData: TableResponse | null;
  tableStatus: LoadStatus;
  selectedProjectId: string | null;
  projectDetail: ProjectDetailResponse | null;
  projectStatus: LoadStatus;
  selectedYear: string;
  selectedContext: string;
  searchQuery: string;
  searchExpanded: boolean;
  darkMode: boolean;
  userMenuOpen: boolean;
  editModalOpen: boolean;
  editDraft: EditDraft | null;
  editImages: ProjectImage[];
  saveStatus: SaveStatus;
  newTag: string;
  // User selection and detail state
  selectedUserId: string | null;
  userDetail: UserDetailResponse | null;
  userDetailStatus: LoadStatus;
  deleteConfirmOpen: boolean;
  deleteStatus: LoadStatus;
  // User creation modal state
  userModalOpen: boolean;
  userModalTab: UserModalTab;
  userCreateStatus: UserCreateStatus;
  userCreateError: string | null;
  userCreateSuccess: string | null;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  setUserMenuOpen: (open: boolean) => void;
  setSearchExpanded: (expanded: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedYear: (year: string) => void;
  setSelectedContext: (context: string) => void;
  loadSession: () => Promise<void>;
  setActiveTable: (table: string) => Promise<void>;
  loadTable: (table: string) => Promise<void>;
  selectProject: (projectId: string | null) => Promise<void>;
  openEditForProject: (projectId?: string) => Promise<void>;
  closeEdit: () => void;
  resetEditSession: () => void;
  updateEditField: (field: keyof EditDraft, value: EditDraft[keyof EditDraft]) => void;
  setNewTag: (value: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
  addSocialLink: () => void;
  updateSocialLink: (index: number, value: string) => void;
  removeSocialLink: (index: number) => void;
  moveEditImage: (activeId: string, overId: string) => void;
  setMainImage: (cloudflareId: string) => void;
  updateImageCaption: (imageId: string, caption: string) => void;
  uploadImages: (files: File[]) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  uploadStatus: "idle" | "uploading" | "error";
  uploadError: string | null;
  saveProject: () => Promise<void>;
  // Project delete actions
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  deleteProject: () => Promise<void>;
  // User selection and delete actions
  selectUser: (userId: string | null) => Promise<void>;
  deleteUser: () => Promise<void>;
  // User creation actions
  openUserModal: () => void;
  closeUserModal: () => void;
  setUserModalTab: (tab: UserModalTab) => void;
  createUser: (email: string, name: string, role: string) => Promise<void>;
  bulkCreateUsers: (csvData: string, program?: string, context?: string | null, academicYear?: string) => Promise<void>;
};

const getInitialDarkMode = () => {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("admin-dark-mode");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const parseSocialLinks = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((l) => typeof l === "string");
    } catch {
      return value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (Array.isArray(value)) return value.filter((l) => typeof l === "string");
  return [];
};

const parseTags = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((t) => typeof t === "string");
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (Array.isArray(value)) return value.filter((t) => typeof t === "string");
  return [];
};

const buildEditDraft = (project: Record<string, unknown>): EditDraft => ({
  student_name: String(project.student_name || ""),
  project_title: String(project.project_title || ""),
  context: String(project.context || ""),
  program: String(project.program || ""),
  academic_year: String(project.academic_year || ""),
  status: String(project.status || "draft"),
  bio: String(project.bio || ""),
  description: String(project.description || ""),
  tags: parseTags(project.tags),
  social_links: parseSocialLinks(project.social_links),
  main_image_id: String(project.main_image_id || ""),
});

const normalizeImages = (images: Array<Record<string, unknown>>): ProjectImage[] =>
  images.map((img, index) => ({
    id: String(img.id),
    cloudflare_id: String(img.cloudflare_id),
    sort_order: Number(img.sort_order ?? index),
    caption: img.caption ? String(img.caption) : null,
  }));

const fetchProjectDetail = async (projectId: string): Promise<ProjectDetailResponse> => {
  const res = await fetch(`/api/admin/projects/${projectId}`);
  if (!res.ok) {
    throw new Error("Failed to load project detail");
  }
  return (await res.json()) as ProjectDetailResponse;
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      user: null,
      status: "loading",
      tables: [],
      activeTable: "",
      tableData: null,
      tableStatus: "idle",
      selectedProjectId: null,
      projectDetail: null,
      projectStatus: "idle",
      selectedYear: "",
      selectedContext: "",
      searchQuery: "",
      searchExpanded: false,
      darkMode: getInitialDarkMode(),
      userMenuOpen: false,
      editModalOpen: false,
      editDraft: null,
      editImages: [],
      saveStatus: "idle",
      uploadStatus: "idle",
      uploadError: null,
      newTag: "",
      selectedUserId: null,
      userDetail: null,
      userDetailStatus: "idle",
      deleteConfirmOpen: false,
      deleteStatus: "idle",
      userModalOpen: false,
      userModalTab: "single",
      userCreateStatus: "idle",
      userCreateError: null,
      userCreateSuccess: null,
      setDarkMode: (value) => set({ darkMode: value }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setUserMenuOpen: (open) => set({ userMenuOpen: open }),
      setSearchExpanded: (expanded) => set({ searchExpanded: expanded }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      setSelectedContext: (context) => set({ selectedContext: context }),
      loadSession: async () => {
        set({ status: "loading" });
        try {
          const res = await fetch("/api/auth/me");
          if (!res.ok) {
            set({ status: "error" });
            return;
          }
          const data = (await res.json()) as AuthResponse;
          if (!data.authenticated) {
            set({ user: null, status: "ready" });
            return;
          }
          set({ user: data.user });

          const tablesRes = await fetch("/api/admin/tables");
          if (tablesRes.ok) {
            const tablesData = (await tablesRes.json()) as { tables: string[] };
            set((state) => ({
              tables: tablesData.tables,
              activeTable: state.activeTable || tablesData.tables[0] || "",
            }));
          }

          const nextTable = get().activeTable;
          if (nextTable) {
            await get().loadTable(nextTable);
          }
          set({ status: "ready" });
        } catch {
          set({ status: "error" });
        }
      },
      setActiveTable: async (table) => {
        if (!table) return;
        set({
          activeTable: table,
          selectedYear: "",
          selectedContext: "",
          searchQuery: "",
          searchExpanded: false,
        });
        get().resetEditSession();
        await get().loadTable(table);
      },
      loadTable: async (table) => {
        if (!table) return;
        set({ tableStatus: "loading" });
        try {
          const res = await fetch(`/api/admin/table/${table}?limit=1000`);
          if (!res.ok) {
            set({ tableStatus: "error" });
            return;
          }
          const data = (await res.json()) as TableResponse;
          set({
            tableData: data,
            tableStatus: "ready",
            selectedProjectId: null,
            projectDetail: null,
            projectStatus: "idle",
            selectedUserId: null,
            userDetail: null,
            userDetailStatus: "idle",
          });
        } catch {
          set({ tableStatus: "error" });
        }
      },
      selectProject: async (projectId) => {
        if (!projectId) {
          set({
            selectedProjectId: null,
            projectDetail: null,
            projectStatus: "idle",
          });
          return;
        }
        if (projectId === get().selectedProjectId && get().projectStatus === "ready") {
          return;
        }
        set({
          selectedProjectId: projectId,
          projectDetail: null,
          projectStatus: "loading",
        });
        try {
          const detail = await fetchProjectDetail(projectId);
          set({
            projectDetail: detail,
            projectStatus: "ready",
          });
        } catch {
          set({ projectStatus: "error" });
        }
      },
      openEditForProject: async (projectId) => {
        const targetId = projectId ?? get().selectedProjectId;
        if (!targetId) return;

        let detail = get().projectDetail;
        if (!detail || get().selectedProjectId !== targetId || get().projectStatus !== "ready") {
          set({ selectedProjectId: targetId, projectStatus: "loading" });
          try {
            detail = await fetchProjectDetail(targetId);
            set({
              projectDetail: detail,
              projectStatus: "ready",
            });
          } catch {
            set({ projectStatus: "error" });
            return;
          }
        }

        if (!detail) return;
        set({
          editModalOpen: true,
          editDraft: buildEditDraft(detail.project),
          editImages: normalizeImages(detail.images),
          saveStatus: "idle",
          newTag: "",
        });
      },
      resetEditSession: () =>
        set({
          editModalOpen: false,
          editDraft: null,
          editImages: [],
          saveStatus: "idle",
          newTag: "",
        }),
      closeEdit: () => get().resetEditSession(),
      updateEditField: (field, value) => {
        set((state) => {
          if (!state.editDraft) return {};
          return {
            editDraft: {
              ...state.editDraft,
              [field]: value,
            },
          };
        });
      },
      setNewTag: (value) => set({ newTag: value }),
      addTag: () => {
        set((state) => {
          if (!state.editDraft) return { newTag: "" };
          const trimmed = state.newTag.trim();
          if (!trimmed) return { newTag: "" };
          if (state.editDraft.tags.includes(trimmed)) return { newTag: "" };
          return {
            editDraft: {
              ...state.editDraft,
              tags: [...state.editDraft.tags, trimmed],
            },
            newTag: "",
          };
        });
      },
      removeTag: (tag) => {
        set((state) => {
          if (!state.editDraft) return {};
          return {
            editDraft: {
              ...state.editDraft,
              tags: state.editDraft.tags.filter((t) => t !== tag),
            },
          };
        });
      },
      addSocialLink: () => {
        set((state) => {
          if (!state.editDraft) return {};
          return {
            editDraft: {
              ...state.editDraft,
              social_links: [...state.editDraft.social_links, ""],
            },
          };
        });
      },
      updateSocialLink: (index, value) => {
        set((state) => {
          if (!state.editDraft) return {};
          const links = [...state.editDraft.social_links];
          if (index < 0 || index >= links.length) return {};
          links[index] = value;
          return {
            editDraft: {
              ...state.editDraft,
              social_links: links,
            },
          };
        });
      },
      removeSocialLink: (index) => {
        set((state) => {
          if (!state.editDraft) return {};
          return {
            editDraft: {
              ...state.editDraft,
              social_links: state.editDraft.social_links.filter((_, i) => i !== index),
            },
          };
        });
      },
      moveEditImage: (activeId, overId) => {
        set((state) => {
          const activeIndex = state.editImages.findIndex((img) => img.id === activeId);
          const overIndex = state.editImages.findIndex((img) => img.id === overId);
          if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return {};
          const nextImages = [...state.editImages];
          const [moved] = nextImages.splice(activeIndex, 1);
          nextImages.splice(overIndex, 0, moved);
          const reordered = nextImages.map((img, idx) => ({
            ...img,
            sort_order: idx,
          }));
          return { editImages: reordered };
        });
      },
      setMainImage: (cloudflareId) => {
        set((state) => {
          if (!state.editDraft) return {};
          return {
            editDraft: {
              ...state.editDraft,
              main_image_id: cloudflareId,
            },
          };
        });
      },
      updateImageCaption: (imageId, caption) => {
        set((state) => ({
          editImages: state.editImages.map((img) => (img.id === imageId ? { ...img, caption: caption || null } : img)),
        }));
      },
      uploadImages: async (files) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId || files.length === 0) return;

        set({ uploadStatus: "uploading", uploadError: null });

        try {
          for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`/api/admin/projects/${selectedProjectId}/images/upload`, {
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
            set((state) => ({
              editImages: [
                ...state.editImages,
                {
                  id: data.image.id,
                  cloudflare_id: data.image.cloudflare_id,
                  sort_order: data.image.sort_order,
                  caption: data.image.caption,
                },
              ],
            }));

            // If this is the first image, set it as main
            const { editImages, editDraft } = get();
            if (editImages.length === 1 && editDraft && !editDraft.main_image_id) {
              set({
                editDraft: {
                  ...editDraft,
                  main_image_id: data.image.cloudflare_id,
                },
              });
            }
          }

          set({ uploadStatus: "idle" });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          set({ uploadStatus: "error", uploadError: message });
          setTimeout(() => set({ uploadStatus: "idle", uploadError: null }), 3000);
        }
      },
      deleteImage: async (imageId) => {
        const { selectedProjectId, editImages, editDraft } = get();
        if (!selectedProjectId) return;

        const imageToDelete = editImages.find((img) => img.id === imageId);
        if (!imageToDelete) return;

        try {
          const res = await fetch(`/api/admin/projects/${selectedProjectId}/images/${imageId}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            throw new Error("Failed to delete image");
          }

          // Remove from state
          const newImages = editImages.filter((img) => img.id !== imageId);

          // Update sort orders
          const reorderedImages = newImages.map((img, idx) => ({
            ...img,
            sort_order: idx,
          }));

          // If deleted image was main, set first remaining as main
          let newMainImageId = editDraft?.main_image_id || "";
          if (editDraft && imageToDelete.cloudflare_id === editDraft.main_image_id) {
            newMainImageId = reorderedImages[0]?.cloudflare_id || "";
          }

          set({
            editImages: reorderedImages,
            editDraft: editDraft ? { ...editDraft, main_image_id: newMainImageId } : null,
          });
        } catch (err) {
          console.error("Delete image error:", err);
        }
      },
      saveProject: async () => {
        const { editDraft, selectedProjectId, editImages } = get();
        if (!editDraft || !selectedProjectId) return;
        set({ saveStatus: "saving" });

        try {
          const projectRes = await fetch(`/api/admin/projects/${selectedProjectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_name: editDraft.student_name,
              project_title: editDraft.project_title,
              context: editDraft.context,
              program: editDraft.program,
              academic_year: editDraft.academic_year,
              bio: editDraft.bio || null,
              description: editDraft.description,
              status: editDraft.status,
              tags: editDraft.tags.length > 0 ? JSON.stringify(editDraft.tags) : null,
              social_links:
                editDraft.social_links.filter(Boolean).length > 0
                  ? JSON.stringify(editDraft.social_links.filter(Boolean))
                  : null,
              main_image_id: editDraft.main_image_id,
            }),
          });

          if (!projectRes.ok) {
            throw new Error("Failed to save project");
          }

          if (editImages.length > 0) {
            const imageOrderRes = await fetch(`/api/admin/projects/${selectedProjectId}/images/reorder`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageOrder: editImages.map((img) => ({
                  id: img.id,
                  sort_order: img.sort_order,
                  caption: img.caption,
                })),
                mainImageId: editDraft.main_image_id,
              }),
            });

            if (!imageOrderRes.ok) {
              throw new Error("Failed to save image order");
            }
          }

          set({ saveStatus: "saved" });

          try {
            const refreshed = await fetchProjectDetail(selectedProjectId);
            set((state) => ({
              projectDetail: refreshed,
              projectStatus: "ready",
              tableData: state.tableData
                ? {
                    ...state.tableData,
                    rows: state.tableData.rows.map((row) =>
                      row.id === selectedProjectId ? { ...row, ...refreshed.project } : row
                    ),
                  }
                : state.tableData,
            }));
          } catch {
            // ignore refresh failure
          }

          setTimeout(() => {
            get().closeEdit();
          }, 800);
        } catch (err) {
          console.error("Save error:", err);
          set({ saveStatus: "error" });
        }
      },
      // Project delete actions
      deleteProject: async () => {
        const projectId = get().selectedProjectId;
        if (!projectId) return;

        set({ deleteStatus: "loading" });
        try {
          const res = await fetch(`/api/admin/projects/${projectId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            set({ deleteStatus: "error" });
            return;
          }

          set({
            deleteConfirmOpen: false,
            deleteStatus: "idle",
            selectedProjectId: null,
            projectDetail: null,
            projectStatus: "idle",
          });

          // Refresh projects table
          const { activeTable, loadTable } = get();
          if (activeTable === "projects") {
            await loadTable("projects");
          }
        } catch {
          set({ deleteStatus: "error" });
        }
      },
      // User selection and delete actions
      selectUser: async (userId) => {
        if (!userId) {
          set({
            selectedUserId: null,
            userDetail: null,
            userDetailStatus: "idle",
          });
          return;
        }
        if (userId === get().selectedUserId && get().userDetailStatus === "ready") {
          return;
        }
        set({
          selectedUserId: userId,
          userDetail: null,
          userDetailStatus: "loading",
        });
        try {
          const res = await fetch(`/api/admin/users/${userId}`);
          if (!res.ok) {
            set({ userDetailStatus: "error" });
            return;
          }
          const data = (await res.json()) as UserDetailResponse;
          set({
            userDetail: data,
            userDetailStatus: "ready",
          });
        } catch {
          set({ userDetailStatus: "error" });
        }
      },
      openDeleteConfirm: () => set({ deleteConfirmOpen: true }),
      closeDeleteConfirm: () => set({ deleteConfirmOpen: false, deleteStatus: "idle" }),
      deleteUser: async () => {
        const userId = get().selectedUserId;
        if (!userId) return;

        set({ deleteStatus: "loading" });
        try {
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            set({ deleteStatus: "error" });
            return;
          }

          set({
            deleteConfirmOpen: false,
            deleteStatus: "idle",
            selectedUserId: null,
            userDetail: null,
            userDetailStatus: "idle",
          });

          // Refresh the users table
          const { activeTable, loadTable } = get();
          if (activeTable === "users") {
            await loadTable("users");
          }
        } catch {
          set({ deleteStatus: "error" });
        }
      },
      // User creation modal actions
      openUserModal: () =>
        set({
          userModalOpen: true,
          userModalTab: "single",
          userCreateStatus: "idle",
          userCreateError: null,
          userCreateSuccess: null,
        }),
      closeUserModal: () =>
        set({
          userModalOpen: false,
          userCreateStatus: "idle",
          userCreateError: null,
          userCreateSuccess: null,
        }),
      setUserModalTab: (tab) =>
        set({
          userModalTab: tab,
          userCreateStatus: "idle",
          userCreateError: null,
          userCreateSuccess: null,
        }),
      createUser: async (email, name, role) => {
        set({ userCreateStatus: "creating", userCreateError: null, userCreateSuccess: null });
        try {
          const res = await fetch("/api/admin/users/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, role }),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            set({ userCreateStatus: "error", userCreateError: data.error || "Failed to create user" });
            return;
          }

          set({ userCreateStatus: "success", userCreateSuccess: "User created successfully" });

          // Refresh the users table if it's the active table
          const { activeTable, loadTable } = get();
          if (activeTable === "users") {
            await loadTable("users");
          }

          setTimeout(() => {
            get().closeUserModal();
          }, 1000);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create user";
          set({ userCreateStatus: "error", userCreateError: message });
        }
      },
      bulkCreateUsers: async (csvData, program, context, academicYear) => {
        set({ userCreateStatus: "creating", userCreateError: null, userCreateSuccess: null });
        try {
          const res = await fetch("/api/admin/users/bulk-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              csvData,
              program,
              context,
              academic_year: academicYear,
            }),
          });

          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            set({ userCreateStatus: "error", userCreateError: data.error || "Failed to create users" });
            return;
          }

          const data = (await res.json()) as {
            usersCreated: number;
            usersExisting: number;
            projectsCreated: number;
            projectsSkipped: number;
            errors: string[];
          };

          // Build success message
          const parts: string[] = [];

          if (data.usersCreated > 0) {
            parts.push(`Created ${data.usersCreated} user${data.usersCreated !== 1 ? "s" : ""}`);
          }
          if (data.projectsCreated > 0) {
            parts.push(`${data.projectsCreated} project${data.projectsCreated !== 1 ? "s" : ""}`);
          }

          let message = parts.join(" and ");
          if (!message) {
            message = "No new users or projects created";
          }
          message += ".";

          if (data.usersExisting > 0) {
            message += ` ${data.usersExisting} existing user${data.usersExisting !== 1 ? "s" : ""} received new projects.`;
          }
          if (data.projectsSkipped > 0) {
            message += ` ${data.projectsSkipped} skipped (already have projects for this year).`;
          }
          if (data.errors.length > 0) {
            message += ` ${data.errors.length} error${data.errors.length !== 1 ? "s" : ""}: ${data.errors.slice(0, 3).join("; ")}`;
            if (data.errors.length > 3) {
              message += `... and ${data.errors.length - 3} more`;
            }
          }

          set({ userCreateStatus: "success", userCreateSuccess: message });

          // Refresh the users and projects tables
          const { activeTable, loadTable } = get();
          if (activeTable === "users" || activeTable === "projects") {
            await loadTable(activeTable);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create users";
          set({ userCreateStatus: "error", userCreateError: message });
        }
      },
    }),
    {
      name: "admin-ui",
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
