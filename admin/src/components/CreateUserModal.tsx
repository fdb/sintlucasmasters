import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { useAdminStore } from "../store/adminStore";

export function CreateUserModal() {
  const {
    userModalOpen,
    userModalTab,
    userCreateStatus,
    userCreateError,
    userCreateSuccess,
    closeUserModal,
    setUserModalTab,
    createUser,
    bulkCreateUsers,
  } = useAdminStore((state) => ({
    userModalOpen: state.userModalOpen,
    userModalTab: state.userModalTab,
    userCreateStatus: state.userCreateStatus,
    userCreateError: state.userCreateError,
    userCreateSuccess: state.userCreateSuccess,
    closeUserModal: state.closeUserModal,
    setUserModalTab: state.setUserModalTab,
    createUser: state.createUser,
    bulkCreateUsers: state.bulkCreateUsers,
  }));

  const [singleUserForm, setSingleUserForm] = useState({ email: "", name: "", role: "student" });
  const [bulkCsvData, setBulkCsvData] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!userModalOpen) {
      setSingleUserForm({ email: "", name: "", role: "student" });
      setBulkCsvData("");
    }
  }, [userModalOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && userModalOpen) {
        closeUserModal();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [userModalOpen, closeUserModal]);

  const handleSingleUserSubmit = async () => {
    if (!singleUserForm.email.trim()) return;

    await createUser(singleUserForm.email.trim(), singleUserForm.name.trim(), singleUserForm.role);
    if (userCreateStatus !== "error") {
      setSingleUserForm({ email: "", name: "", role: "student" });
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkCsvData.trim()) return;

    await bulkCreateUsers(bulkCsvData.trim());
  };

  const isCreating = userCreateStatus === "creating";

  return (
    <div className={`edit-modal-overlay ${userModalOpen ? "is-open" : ""}`} onClick={closeUserModal}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Create User</h2>
          <button type="button" className="edit-modal-close" onClick={closeUserModal}>
            <X size={18} />
          </button>
        </div>

        <div className="edit-modal-body">
          {/* Tab navigation */}
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${userModalTab === "single" ? "active" : ""}`}
              onClick={() => setUserModalTab("single")}
            >
              Create User
            </button>
            <button
              type="button"
              className={`modal-tab ${userModalTab === "bulk" ? "active" : ""}`}
              onClick={() => setUserModalTab("bulk")}
            >
              Bulk Create
            </button>
          </div>

          {/* Single User Tab */}
          {userModalTab === "single" && (
            <>
              <div className="edit-row">
                <div className="edit-field">
                  <label className="edit-label">Email</label>
                  <input
                    type="email"
                    className="edit-input"
                    value={singleUserForm.email}
                    onChange={(e) => setSingleUserForm({ ...singleUserForm, email: e.target.value })}
                    placeholder="user@example.com"
                    disabled={isCreating}
                    required
                  />
                </div>
                <div className="edit-field">
                  <label className="edit-label">Name</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={singleUserForm.name}
                    onChange={(e) => setSingleUserForm({ ...singleUserForm, name: e.target.value })}
                    placeholder="John Doe"
                    disabled={isCreating}
                  />
                </div>
              </div>
              <div className="edit-row" style={{ marginTop: "1rem" }}>
                <div className="edit-field">
                  <label className="edit-label">Role</label>
                  <select
                    className="edit-select"
                    value={singleUserForm.role}
                    onChange={(e) => setSingleUserForm({ ...singleUserForm, role: e.target.value })}
                    disabled={isCreating}
                  >
                    <option value="student">Student</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Bulk Create Tab */}
          {userModalTab === "bulk" && (
            <div className="edit-field">
              <label className="edit-label">
                CSV Data
                <span style={{ fontWeight: 400, color: "var(--gray)", marginLeft: "0.5rem" }}>
                  (Paste from Google Sheets or Excel)
                </span>
              </label>
              <textarea
                className="edit-textarea tall"
                value={bulkCsvData}
                onChange={(e) => setBulkCsvData(e.target.value)}
                placeholder="Student Name&#10;jane.doe@student.kdg.be&#10;&#10;Or with headers:&#10;Name,Email&#10;John Smith,john.smith@student.kdg.be"
                disabled={isCreating}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--gray)", marginTop: "0.5rem" }}>
                Accepts tab or comma-separated values. Auto-detects column order.
                Only emails ending with <strong>@student.kdg.be</strong> are accepted.
                Creates users as students.
              </p>
            </div>
          )}
        </div>

        <div className="edit-modal-footer">
          <div className="edit-modal-footer-left">
            {isCreating && (
              <span className="save-indicator saving">
                <span className="spinner" />
                Creating...
              </span>
            )}
            {userCreateStatus === "success" && (
              <span className="save-indicator saved">{userCreateSuccess}</span>
            )}
            {userCreateStatus === "error" && (
              <span className="save-indicator error">{userCreateError}</span>
            )}
          </div>
          <div className="edit-modal-footer-right">
            <button type="button" className="btn btn-secondary" onClick={closeUserModal} disabled={isCreating}>
              Cancel
            </button>
            {userModalTab === "single" ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSingleUserSubmit}
                disabled={isCreating || !singleUserForm.email.trim()}
              >
                Create User
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBulkSubmit}
                disabled={isCreating || !bulkCsvData.trim()}
              >
                <Plus size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "0.375rem" }} />
                Bulk Create
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
