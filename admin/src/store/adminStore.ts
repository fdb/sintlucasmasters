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
  userEmail?: string | null;
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

export type StudentForImpersonation = {
  id: string;
  email: string;
  name: string | null;
  academic_year: string;
  project_id?: string;
};

export type StudentProject = {
  id: string;
  student_name: string;
  project_title: string;
  academic_year: string;
  context: string;
  status: string;
};

export type ProjectImageType = "web" | "print";

export type ProjectImage = {
  id: string;
  cloudflare_id: string;
  sort_order: number;
  caption: string | null;
  type: ProjectImageType;
};

export type EditDraft = {
  student_name: string;
  project_title: string;
  context: string;
  program: string;
  academic_year: string;
  bio: string;
  description: string;
  location: string;
  private_email: string;
  status: string;
  tags: string[];
  social_links: string[];
};

type SessionStatus = "loading" | "ready" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type UserCreateStatus = "idle" | "creating" | "success" | "error";
type UserModalTab = "single" | "bulk";
type PrintImageStatus = "idle" | "validating" | "uploading" | "error";
type SubmitStatus = "idle" | "submitting" | "success" | "error";

export type SubmitValidationResult = {
  valid: boolean;
  errors: string[];
  status: string;
};

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
  selectedStatus: string;
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
  // Impersonation state
  impersonatedUser: StudentForImpersonation | null;
  studentsForImpersonation: StudentForImpersonation[];
  impersonationDropdownOpen: boolean;
  // Print image state
  printImage: ProjectImage | null;
  printImageStatus: PrintImageStatus;
  printImageError: string | null;
  // Submit state
  submitValidation: SubmitValidationResult | null;
  submitStatus: SubmitStatus;
  submitError: string | null;
  // Student page state
  studentProjects: StudentProject[];
  studentProjectsStatus: LoadStatus;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  setUserMenuOpen: (open: boolean) => void;
  setSearchExpanded: (expanded: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedYear: (year: string) => void;
  setSelectedContext: (context: string) => void;
  setSelectedStatus: (status: string) => void;
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
  updateImageCaption: (imageId: string, caption: string) => void;
  uploadImages: (files: File[]) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  uploadStatus: "idle" | "uploading" | "error";
  uploadError: string | null;
  saveProject: (options?: { closeOnSuccess?: boolean }) => Promise<boolean>;
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
  bulkCreateUsers: (csvData: string, program?: string, academicYear?: string) => Promise<void>;
  // Impersonation actions
  loadStudentsForImpersonation: () => Promise<void>;
  setImpersonatedUser: (student: StudentForImpersonation | null) => void;
  setImpersonationDropdownOpen: (open: boolean) => void;
  // Print image actions
  uploadPrintImage: (file: File) => Promise<void>;
  updatePrintImageCaption: (caption: string) => Promise<void>;
  deletePrintImage: () => Promise<void>;
  // Submit actions
  loadSubmitValidation: () => Promise<void>;
  submitProject: () => Promise<void>;
  // Student page actions
  loadStudentProjects: (userId?: string) => Promise<void>;
  selectStudentProject: (projectId: string) => Promise<void>;
  // Computed helpers
  isStudentMode: () => boolean;
  canEditProject: () => { allowed: boolean; reason?: string };
  getWebImages: () => ProjectImage[];
  getPrintImage: () => ProjectImage | null;
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
  location: String(project.location || ""),
  private_email: String(project.private_email || ""),
  tags: parseTags(project.tags),
  social_links: parseSocialLinks(project.social_links),
});

const normalizeImages = (images: Array<Record<string, unknown>>): ProjectImage[] =>
  images.map((img, index) => ({
    id: String(img.id),
    cloudflare_id: String(img.cloudflare_id),
    sort_order: Number(img.sort_order ?? index),
    caption: img.caption ? String(img.caption) : null,
    type: (img.type as ProjectImageType) || "web",
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
      selectedStatus: "",
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
      impersonatedUser: null,
      studentsForImpersonation: [],
      impersonationDropdownOpen: false,
      // Print image state
      printImage: null,
      printImageStatus: "idle",
      printImageError: null,
      // Submit state
      submitValidation: null,
      submitStatus: "idle",
      submitError: null,
      // Student page state
      studentProjects: [],
      studentProjectsStatus: "idle",
      setDarkMode: (value) => set({ darkMode: value }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setUserMenuOpen: (open) => set({ userMenuOpen: open }),
      setSearchExpanded: (expanded) => set({ searchExpanded: expanded }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      setSelectedContext: (context) => set({ selectedContext: context }),
      setSelectedStatus: (status) => set({ selectedStatus: status }),
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
          selectedStatus: "",
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
        const allImages = normalizeImages(detail.images);
        const webImages = allImages.filter((img) => img.type !== "print");
        const printImg = allImages.find((img) => img.type === "print") || null;
        set({
          editModalOpen: true,
          editDraft: buildEditDraft(detail.project),
          editImages: webImages,
          printImage: printImg,
          saveStatus: "idle",
          newTag: "",
          submitValidation: null,
          submitStatus: "idle",
          submitError: null,
        });
      },
      resetEditSession: () =>
        set({
          editModalOpen: false,
          editDraft: null,
          editImages: [],
          printImage: null,
          printImageStatus: "idle",
          printImageError: null,
          submitValidation: null,
          submitStatus: "idle",
          submitError: null,
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
                  type: data.image.type || "web",
                },
              ],
            }));
          }

          set({ uploadStatus: "idle" });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          set({ uploadStatus: "error", uploadError: message });
          setTimeout(() => set({ uploadStatus: "idle", uploadError: null }), 3000);
        }
      },
      deleteImage: async (imageId) => {
        const { selectedProjectId, editImages } = get();
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

          set({
            editImages: reorderedImages,
          });
        } catch (err) {
          console.error("Delete image error:", err);
        }
      },
      saveProject: async (options) => {
        const { editDraft, selectedProjectId, editImages, saveStatus } = get();
        if (!editDraft || !selectedProjectId) return false;
        if (saveStatus === "saving") return false;
        const closeOnSuccess = options?.closeOnSuccess ?? true;
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
              location: editDraft.location || null,
              private_email: editDraft.private_email || null,
              status: editDraft.status,
              tags: editDraft.tags.length > 0 ? JSON.stringify(editDraft.tags) : null,
              social_links:
                editDraft.social_links.filter(Boolean).length > 0
                  ? JSON.stringify(editDraft.social_links.filter(Boolean))
                  : null,
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

          if (closeOnSuccess) {
            setTimeout(() => {
              get().closeEdit();
            }, 800);
          }
          return true;
        } catch (err) {
          console.error("Save error:", err);
          set({ saveStatus: "error" });
          return false;
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
      bulkCreateUsers: async (csvData, program, academicYear) => {
        set({ userCreateStatus: "creating", userCreateError: null, userCreateSuccess: null });
        try {
          const res = await fetch("/api/admin/users/bulk-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              csvData,
              program,
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
      // Impersonation actions
      loadStudentsForImpersonation: async () => {
        try {
          const res = await fetch("/api/admin/students-with-projects");
          if (res.ok) {
            const data = (await res.json()) as { students: StudentForImpersonation[] };
            set({ studentsForImpersonation: data.students });
          }
        } catch {
          // Silently fail - impersonation is optional
        }
      },
      setImpersonatedUser: (student) => set({ impersonatedUser: student, impersonationDropdownOpen: false }),
      setImpersonationDropdownOpen: (open) => {
        set({ impersonationDropdownOpen: open });
        // Load students when opening dropdown if not already loaded
        if (open && get().studentsForImpersonation.length === 0) {
          get().loadStudentsForImpersonation();
        }
      },
      // Print image actions
      uploadPrintImage: async (file) => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return;

        set({ printImageStatus: "uploading", printImageError: null });

        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(`/api/admin/projects/${selectedProjectId}/print-image/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const error = (await res.json()) as { error?: string };
            throw new Error(error.error || "Failed to upload print image");
          }

          const data = (await res.json()) as { image: ProjectImage };
          set({
            printImage: {
              id: data.image.id,
              cloudflare_id: data.image.cloudflare_id,
              sort_order: 0,
              caption: data.image.caption,
              type: "print",
            },
            printImageStatus: "idle",
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          set({ printImageStatus: "error", printImageError: message });
          setTimeout(() => set({ printImageStatus: "idle", printImageError: null }), 3000);
        }
      },
      updatePrintImageCaption: async (caption) => {
        const { selectedProjectId, printImage } = get();
        if (!selectedProjectId || !printImage) return;

        try {
          const res = await fetch(`/api/admin/projects/${selectedProjectId}/print-image/caption`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caption }),
          });

          if (!res.ok) {
            throw new Error("Failed to update caption");
          }

          set({
            printImage: {
              ...printImage,
              caption: caption || null,
            },
          });
        } catch (err) {
          console.error("Update print image caption error:", err);
        }
      },
      deletePrintImage: async () => {
        const { selectedProjectId, printImage } = get();
        if (!selectedProjectId || !printImage) return;

        try {
          const res = await fetch(`/api/admin/projects/${selectedProjectId}/print-image`, {
            method: "DELETE",
          });

          if (!res.ok) {
            throw new Error("Failed to delete print image");
          }

          set({ printImage: null });
        } catch (err) {
          console.error("Delete print image error:", err);
        }
      },
      // Submit actions
      loadSubmitValidation: async () => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return;

        try {
          const res = await fetch(`/api/admin/projects/${selectedProjectId}/submit/validate`);
          if (!res.ok) return;

          const data = (await res.json()) as SubmitValidationResult;
          set({ submitValidation: data });
        } catch {
          // Silently fail
        }
      },
      submitProject: async () => {
        const { selectedProjectId } = get();
        if (!selectedProjectId) return;

        set({ submitStatus: "submitting", submitError: null });

        try {
          const res = await fetch(`/api/admin/projects/${selectedProjectId}/submit`, {
            method: "POST",
          });

          if (!res.ok) {
            const error = (await res.json()) as { error?: string; validationErrors?: string[] };
            const message = error.validationErrors?.join(", ") || error.error || "Submission failed";
            throw new Error(message);
          }

          set({ submitStatus: "success" });

          // Refresh project detail to get updated status
          try {
            const refreshed = await fetchProjectDetail(selectedProjectId);
            set((state) => {
              const updates = {
                projectDetail: refreshed,
                projectStatus: "ready" as const,
                tableData: state.tableData
                  ? {
                      ...state.tableData,
                      rows: state.tableData.rows.map((row) =>
                        row.id === selectedProjectId ? { ...row, ...refreshed.project } : row
                      ),
                    }
                  : state.tableData,
              };

              // Also update editDraft to reflect the new status
              if (state.editDraft) {
                return {
                  ...updates,
                  editDraft: {
                    ...state.editDraft,
                    status: String(refreshed.project.status || "submitted"),
                  },
                };
              }

              return updates;
            });
          } catch {
            // ignore refresh failure
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Submission failed";
          set({ submitStatus: "error", submitError: message });
        }
      },
      // Student page actions
      loadStudentProjects: async (userId?: string) => {
        const { user, impersonatedUser } = get();
        const targetUserId = userId ?? impersonatedUser?.id ?? user?.id;
        if (!targetUserId) return;

        set({ studentProjectsStatus: "loading" });
        try {
          const res = await fetch(`/api/admin/table/projects?limit=1000`);
          if (!res.ok) {
            set({ studentProjectsStatus: "error" });
            return;
          }
          const data = (await res.json()) as TableResponse;

          // Filter projects to only those belonging to the target user
          const userProjects = data.rows
            .filter((row) => row.user_id === targetUserId)
            .map((row) => ({
              id: String(row.id),
              student_name: String(row.student_name || ""),
              project_title: String(row.project_title || ""),
              academic_year: String(row.academic_year || ""),
              context: String(row.context || ""),
              status: String(row.status || "draft"),
            }));

          set({
            studentProjects: userProjects,
            studentProjectsStatus: "ready",
          });

          // Auto-select the first project if none selected
          if (userProjects.length > 0 && !get().selectedProjectId) {
            await get().selectProject(userProjects[0].id);
          }
        } catch {
          set({ studentProjectsStatus: "error" });
        }
      },
      selectStudentProject: async (projectId: string) => {
        await get().selectProject(projectId);
      },
      // Computed helpers
      isStudentMode: () => {
        const { user, impersonatedUser } = get();
        // If impersonating, we're in student mode
        if (impersonatedUser) return true;
        // If actual user is a student, we're in student mode
        if (user?.role === "student") return true;
        return false;
      },
      canEditProject: () => {
        const { projectDetail, isStudentMode } = get();
        if (!projectDetail) return { allowed: false, reason: "No project loaded" };

        const status = projectDetail.project.status as string;

        // Students cannot edit submitted or ready_for_print projects
        if (isStudentMode()) {
          if (status === "submitted") {
            return {
              allowed: false,
              reason: "Project is submitted. Click 'Return to Draft' to make changes.",
            };
          }
          if (status === "ready_for_print") {
            return {
              allowed: false,
              reason: "Project is locked for printing. Contact an administrator if changes are needed.",
            };
          }
        }

        return { allowed: true };
      },
      getWebImages: () => {
        const { editImages } = get();
        return editImages.filter((img) => img.type !== "print");
      },
      getPrintImage: () => {
        return get().printImage;
      },
    }),
    {
      name: "admin-ui",
      partialize: (state) => ({
        darkMode: state.darkMode,
        impersonatedUser: state.impersonatedUser,
      }),
    }
  )
);
