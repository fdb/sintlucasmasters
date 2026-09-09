import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useAdminStore } from "./adminStore";

vi.hoisted(() => {
  const storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    localStorage: storage,
    matchMedia: () => ({ matches: false }),
  });
});

const initialState = useAdminStore.getInitialState();

beforeEach(() => {
  useAdminStore.setState(initialState, true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("selection during table reload", () => {
  test.each(["projects", "users"] as const)(
    "preserves a newer %s selection when the reload finishes",
    async (table) => {
      let finishReload!: (response: Response) => void;
      const pendingReload = new Promise<Response>((resolve) => {
        finishReload = resolve;
      });
      const detail =
        table === "projects" ? { project: { id: "selected" }, images: [] } : { user: { id: "selected" }, projects: [] };
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => (url.includes("/table/") ? pendingReload : Promise.resolve(Response.json(detail))))
      );

      // The tab starts a reload, then the user selects a still-visible cached row.
      const reload = useAdminStore.getState().setActiveTable(table);
      if (table === "projects") {
        await useAdminStore.getState().selectProject("selected");
      } else {
        await useAdminStore.getState().selectUser("selected");
      }

      finishReload(Response.json({ table, rows: [{ id: "selected" }], count: 1, limit: 1000 }));
      await reload;

      const state = useAdminStore.getState();
      expect(state.tableStatus).toBe("ready");
      if (table === "projects") {
        expect(state.selectedProjectId).toBe("selected");
        expect(state.projectDetail).toEqual(detail);
        expect(state.projectStatus).toBe("ready");
      } else {
        expect(state.selectedUserId).toBe("selected");
        expect(state.userDetail).toEqual(detail);
        expect(state.userDetailStatus).toBe("ready");
      }
    }
  );
});
