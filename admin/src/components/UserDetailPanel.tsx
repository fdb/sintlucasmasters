import { Trash2 } from "lucide-react";
import { useAdminStore } from "../store/adminStore";
import { formatDate } from "../utils";

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function UserDetailPanel() {
  const activeTable = useAdminStore((s) => s.activeTable);
  const selectedUserId = useAdminStore((s) => s.selectedUserId);
  const userDetail = useAdminStore((s) => s.userDetail);
  const userDetailStatus = useAdminStore((s) => s.userDetailStatus);
  const deleteConfirmOpen = useAdminStore((s) => s.deleteConfirmOpen);
  const deleteStatus = useAdminStore((s) => s.deleteStatus);
  const openDeleteConfirm = useAdminStore((s) => s.openDeleteConfirm);
  const closeDeleteConfirm = useAdminStore((s) => s.closeDeleteConfirm);
  const deleteUser = useAdminStore((s) => s.deleteUser);

  const isUsersTable = activeTable === "users";

  return (
    <div className="admin-detail-panel">
      {!isUsersTable && (
        <div className="admin-detail-empty">
          <p>Select a row to view details</p>
        </div>
      )}

      {isUsersTable && !selectedUserId && (
        <div className="admin-detail-empty">
          <span className="detail-icon">←</span>
          <p>Select a user from the list</p>
        </div>
      )}

      {isUsersTable && userDetailStatus === "loading" && (
        <div className="admin-detail-empty">
          <p>Loading user…</p>
        </div>
      )}

      {isUsersTable && userDetailStatus === "error" && (
        <div className="admin-detail-empty">
          <p className="error-message">Failed to load user.</p>
        </div>
      )}

      {isUsersTable && userDetailStatus === "ready" && userDetail && (
        <div className="admin-detail-content">
          <div className="detail-header-row">
            <h3>{userDetail.user.name || userDetail.user.email}</h3>
            <div className="detail-header-actions">
              <div className={`role-pill role-${userDetail.user.role}`}>
                {formatRole(userDetail.user.role)}
              </div>
              <div className="detail-action-group">
                <button
                  type="button"
                  className="detail-action-btn has-label danger"
                  onClick={openDeleteConfirm}
                  title="Delete user"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-label">Email</div>
            <div className="detail-text">{userDetail.user.email}</div>
          </div>

          {userDetail.user.name && (
            <div className="detail-section">
              <div className="detail-section-label">Name</div>
              <div className="detail-text">{userDetail.user.name}</div>
            </div>
          )}

          <div className="detail-metadata">
            <div className="detail-meta-item">
              <span className="meta-label">ID</span>
              <span className="meta-value">{userDetail.user.id}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Role</span>
              <span className="meta-value">{formatRole(userDetail.user.role)}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Created</span>
              <span className="meta-value">{formatDate(userDetail.user.created_at)}</span>
            </div>
            <div className="detail-meta-item">
              <span className="meta-label">Last login</span>
              <span className="meta-value">{formatDate(userDetail.user.last_login_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmOpen && (
        <div className="confirm-overlay" onClick={closeDeleteConfirm}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete user?</h3>
            <p>
              Are you sure you want to delete <strong>{userDetail?.user.email}</strong>?
              This action cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDeleteConfirm}
                disabled={deleteStatus === "loading"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteUser}
                disabled={deleteStatus === "loading"}
              >
                {deleteStatus === "loading" ? "Deleting…" : "Delete"}
              </button>
            </div>
            {deleteStatus === "error" && (
              <p className="error-message" style={{ marginTop: "1rem" }}>
                Failed to delete user. Please try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
