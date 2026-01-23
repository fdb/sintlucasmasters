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
  draggedImageId: string | null;
  newTag: string;
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
  setDraggedImageId: (imageId: string | null) => void;
  reorderImages: (targetId: string) => void;
  setMainImage: (cloudflareId: string) => void;
  saveProject: () => Promise<void>;
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
      draggedImageId: null,
      newTag: "",
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
          draggedImageId: null,
          newTag: "",
        });
      },
      resetEditSession: () =>
        set({
          editModalOpen: false,
          editDraft: null,
          editImages: [],
          saveStatus: "idle",
          draggedImageId: null,
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
      setDraggedImageId: (imageId) => set({ draggedImageId: imageId }),
      reorderImages: (targetId) => {
        set((state) => {
          if (!state.draggedImageId) return {};
          if (state.draggedImageId === targetId) {
            return { draggedImageId: null };
          }
          const draggedIndex = state.editImages.findIndex((img) => img.id === state.draggedImageId);
          const targetIndex = state.editImages.findIndex((img) => img.id === targetId);
          if (draggedIndex === -1 || targetIndex === -1) {
            return { draggedImageId: null };
          }
          const newImages = [...state.editImages];
          const [draggedItem] = newImages.splice(draggedIndex, 1);
          newImages.splice(targetIndex, 0, draggedItem);
          const reordered = newImages.map((img, idx) => ({
            ...img,
            sort_order: idx,
          }));
          return { editImages: reordered, draggedImageId: null };
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
    }),
    {
      name: "admin-ui",
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
