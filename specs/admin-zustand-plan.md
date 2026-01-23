# Admin Zustand Migration Plan

## Goal
Reduce complexity in `admin/src/App.tsx` by moving admin state management to Zustand, with a special focus on cleaning up the edit flow and its intermediate state.

## Scope
- Admin UI only (`admin/src`)
- State currently managed via local React `useState` in `admin/src/App.tsx`
- No UI redesigns or backend API changes

## Current Pain Points
- Many `useState` hooks in `admin/src/App.tsx` with intertwined update logic
- Edit flow depends on intermediate local state (`pendingEdit`, `editFormData`, `editImages`)
- Some derived state is recomputed inline instead of centrally managed

## Proposed Approach

### 1) State Audit and Slices
- [ ] Group the existing state into slices:
  - [ ] **Auth/session**: `user`, `status`
  - [ ] **Tables**: `tables`, `activeTable`, `tableData`, `tableStatus`
  - [ ] **Project detail**: `selectedProjectId`, `projectDetail`, `projectStatus`
  - [ ] **Filters/search**: `selectedYear`, `selectedContext`, `searchQuery`, `searchExpanded`
  - [ ] **UI chrome**: `darkMode`, `userMenuOpen`
  - [ ] **Edit session**: `editModalOpen`, `editDraft`, `editImages`, `saveStatus`, `draggedImageId`, `newTag`

### 2) Store Setup
- [ ] Create `admin/src/store/adminStore.ts` with typed Zustand store.
- [ ] Define actions for:
  - [ ] Loading auth/user and tables
  - [ ] Loading table data
  - [ ] Selecting project and loading detail
  - [ ] Opening/closing edit session
  - [ ] Editing fields, tags, and social links
  - [ ] Image reorder and main image selection
  - [ ] Save workflow (project update + image reorder + refresh)
- [ ] Add a `resetEditSession` action for table switching or modal close.
- [ ] Use `persist` middleware for `darkMode` only.

### 3) Refactor `App.tsx`
- [ ] Replace `useState` and most `useEffect` data flows with store actions and selectors.
- [ ] Keep local effects only for DOM concerns:
  - [ ] click-outside close for user menu
  - [ ] escape-to-close modal
- [ ] Keep derived values (e.g., `allYears`, `allContexts`, filtered rows) as selectors or local computed values based on store state.

### 4) Edit Flow Simplification
- [ ] Introduce `editDraft` as the single source of truth for the edit form.
- [ ] Remove `pendingEdit` by making `openEdit` call `loadProject` inside the store, then hydrate `editDraft` and `editImages`.
- [ ] Consolidate tag/social link manipulation into store actions.
- [ ] Consolidate drag-and-drop reorder logic into a store action to minimize component-level state.

### 5) Verification
Manual checks:
- [ ] Auth + table list load
- [ ] Table switching resets filters and edit state
- [ ] Project selection + detail load
- [ ] Edit modal open, edit, save, and auto-close
- [ ] Image drag reorder and main image updates
- [ ] Dark mode persistence

## Deliverables
- [ ] `admin/src/store/adminStore.ts` (new)
- [ ] `admin/src/App.tsx` refactor to Zustand
- [ ] Remove no-longer-needed state and effects

## Non-Goals
- New UI components or layout changes
- API contract changes
- Admin routing or auth updates
