import { useEffect, useRef } from "react";
import { Sun, Moon, LogOut, Eye, X } from "lucide-react";
import { useAdminStore } from "../store/adminStore";

export function AdminHeader() {
  const { user, darkMode, userMenuOpen, toggleDarkMode, setUserMenuOpen, impersonatedUser, setImpersonatedUser } =
    useAdminStore((state) => ({
      user: state.user,
      darkMode: state.darkMode,
      userMenuOpen: state.userMenuOpen,
      toggleDarkMode: state.toggleDarkMode,
      setUserMenuOpen: state.setUserMenuOpen,
      impersonatedUser: state.impersonatedUser,
      setImpersonatedUser: state.setImpersonatedUser,
    }));
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen, setUserMenuOpen]);

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
