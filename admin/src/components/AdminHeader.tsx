import { useEffect, useRef } from "react";
import { Sun, Moon, LogOut, Eye, X } from "lucide-react";
import { useAdminStore, type StudentForImpersonation } from "../store/adminStore";

export function AdminHeader() {
  const {
    user,
    darkMode,
    userMenuOpen,
    toggleDarkMode,
    setUserMenuOpen,
    impersonatedUser,
    studentsForImpersonation,
    impersonationDropdownOpen,
    setImpersonatedUser,
    setImpersonationDropdownOpen,
  } = useAdminStore((state) => ({
    user: state.user,
    darkMode: state.darkMode,
    userMenuOpen: state.userMenuOpen,
    toggleDarkMode: state.toggleDarkMode,
    setUserMenuOpen: state.setUserMenuOpen,
    impersonatedUser: state.impersonatedUser,
    studentsForImpersonation: state.studentsForImpersonation,
    impersonationDropdownOpen: state.impersonationDropdownOpen,
    setImpersonatedUser: state.setImpersonatedUser,
    setImpersonationDropdownOpen: state.setImpersonationDropdownOpen,
  }));
  const userMenuRef = useRef<HTMLDivElement>(null);
  const impersonationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (impersonationRef.current && !impersonationRef.current.contains(e.target as Node)) {
        setImpersonationDropdownOpen(false);
      }
    };
    if (userMenuOpen || impersonationDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen, setUserMenuOpen, impersonationDropdownOpen, setImpersonationDropdownOpen]);

  const handleSelectStudent = (student: StudentForImpersonation) => {
    setImpersonatedUser(student);
    // App.tsx will re-render and show StudentPage
  };

  const handleStopImpersonation = () => {
    setImpersonatedUser(null);
    // App.tsx will re-render and show AdminPage
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  return (
    <>
      {impersonatedUser && (
        <div className="impersonation-banner">
          <Eye size={14} />
          <span>
            Viewing as <strong>{impersonatedUser.name || impersonatedUser.email}</strong>
          </span>
          <button type="button" onClick={handleStopImpersonation} title="Stop impersonation">
            <X size={14} />
          </button>
        </div>
      )}
      <header className="admin-header">
        <div>
          <h1>Admin</h1>
          <p>Data viewer for Sint Lucas Masters.</p>
        </div>
        <div className="admin-actions">
          {/* Impersonation dropdown */}
          <div className="impersonation-menu" ref={impersonationRef}>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setImpersonationDropdownOpen(!impersonationDropdownOpen)}
              title="View as student"
            >
              <Eye size={16} />
            </button>
            {impersonationDropdownOpen && (
              <div className="impersonation-dropdown">
                <div className="impersonation-dropdown-header">View as student</div>
                <div className="impersonation-dropdown-list">
                  {studentsForImpersonation.length === 0 ? (
                    <div className="impersonation-dropdown-empty">No students with projects</div>
                  ) : (
                    studentsForImpersonation.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className={impersonatedUser?.id === student.id ? "active" : ""}
                        onClick={() => handleSelectStudent(student)}
                      >
                        <span className="student-name">{student.name || student.email}</span>
                        <span className="student-year">{student.academic_year}</span>
                      </button>
                    ))
                  )}
                </div>
                {impersonatedUser && (
                  <button type="button" className="impersonation-dropdown-stop" onClick={handleStopImpersonation}>
                    <X size={14} />
                    Stop viewing as student
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={user.email}
              >
                {user.email.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-email">{user.email}</div>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
