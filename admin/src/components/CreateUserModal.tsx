import { useEffect, useState, useMemo } from "react";
import { X, Plus } from "lucide-react";
import { useAdminStore } from "../store/adminStore";

const PROGRAMS = [
  { value: "MA_BK", label: "MA Fine Arts" },
  { value: "PREMA_BK", label: "PreMA Fine Arts" },
  { value: "BA_BK", label: "BA Fine Arts" },
  { value: "BA_FO", label: "BA Photography" },
] as const;

// Generate academic years from 2020-2021 to current+1
function generateAcademicYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear + 1; year >= 2020; year--) {
    years.push(`${year}-${year + 1}`);
  }
  return years;
}

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

  const academicYears = useMemo(() => generateAcademicYears(), []);
  const currentAcademicYear = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  }, []);

  const [singleUserForm, setSingleUserForm] = useState({ email: "", name: "", role: "student" });
  const [bulkCsvData, setBulkCsvData] = useState("");
  const [bulkSettings, setBulkSettings] = useState({
    program: "MA_BK",
    academicYear: currentAcademicYear,
  });

  // Context is required for MA_BK and PREMA_BK (provided in CSV)
  const contextRequired = bulkSettings.program === "MA_BK" || bulkSettings.program === "PREMA_BK";

  // Reset form when modal closes
  useEffect(() => {
    if (!userModalOpen) {
      setSingleUserForm({ email: "", name: "", role: "student" });
      setBulkCsvData("");
      setBulkSettings({
        program: "MA_BK",
        academicYear: currentAcademicYear,
      });
    }
  }, [userModalOpen, currentAcademicYear]);

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

    await bulkCreateUsers(bulkCsvData.trim(), bulkSettings.program, bulkSettings.academicYear);
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
            <>
              {/* Project Settings */}
              <div className="bulk-settings-box">
                <div className="bulk-settings-title">Project Settings</div>
                <div className="edit-row">
                  <div className="edit-field">
                    <label className="edit-label">Program</label>
                    <select
                      className="edit-select"
                      value={bulkSettings.program}
                      onChange={(e) => setBulkSettings({ ...bulkSettings, program: e.target.value })}
                      disabled={isCreating}
                    >
                      {PROGRAMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-field">
                    <label className="edit-label">Academic Year</label>
                    <select
                      className="edit-select"
                      value={bulkSettings.academicYear}
                      onChange={(e) => setBulkSettings({ ...bulkSettings, academicYear: e.target.value })}
                      disabled={isCreating}
                    >
                      {academicYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CSV Data */}
              <div className="edit-field" style={{ marginTop: "1.5rem" }}>
                <label className="edit-label">
                  Student List (CSV)
                  <span style={{ fontWeight: 400, color: "var(--gray)", marginLeft: "0.5rem" }}>
                    (Paste from Google Sheets or Excel)
                  </span>
                </label>
                <textarea
                  className="edit-textarea tall"
                  value={bulkCsvData}
                  onChange={(e) => setBulkCsvData(e.target.value)}
                  placeholder={
                    contextRequired
                      ? "name, email, context\nJane Doe, jane.doe@student.kdg.be, digital\nJohn Smith, john.smith@student.kdg.be, autonomous"
                      : "name, email\nJane Doe, jane.doe@student.kdg.be\nJohn Smith, john.smith@student.kdg.be"
                  }
                  disabled={isCreating}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--gray)", marginTop: "0.5rem" }}>
                  {contextRequired ? (
                    <>
                      Header row required: <strong>name</strong>, <strong>email</strong>, <strong>context</strong>.
                      Context values: autonomous, applied, digital, socio-political, jewelry.
                    </>
                  ) : (
                    <>
                      Header row required: <strong>name</strong>, <strong>email</strong>.
                    </>
                  )}{" "}
                  Only emails ending with <strong>@student.kdg.be</strong> are accepted.
                </p>
              </div>
            </>
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
            {userCreateStatus === "success" && <span className="save-indicator saved">{userCreateSuccess}</span>}
            {userCreateStatus === "error" && <span className="save-indicator error">{userCreateError}</span>}
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
