import type { FC, PropsWithChildren } from "hono/jsx";
import type { AuthUser } from "../../middleware/auth";

type AdminLayoutProps = PropsWithChildren<{
  title?: string;
  user: AuthUser;
}>;

const SITE_NAME = "Sint Lucas Masters Admin";

export const AdminLayout: FC<AdminLayoutProps> = ({ title, user, children }) => {
  const pageTitle = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
  const userInitial = user.email.charAt(0).toUpperCase();

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{pageTitle}</title>

        {/* Google Fonts - Space Grotesk */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Styles */}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/admin.css" />
      </head>
      <body>
        <div class="admin-shell">
          <header class="admin-header">
            <div>
              <h1>Admin</h1>
              <p>Sint Lucas Masters</p>
            </div>
            <div class="admin-actions">
              <button type="button" class="theme-toggle" id="theme-toggle" title="Toggle dark mode">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
              </button>
              <div class="user-menu">
                <button type="button" class="user-avatar" id="user-avatar">
                  {userInitial}
                </button>
                <div class="user-dropdown" id="user-dropdown" style="display: none;">
                  <div class="user-dropdown-email">{user.email}</div>
                  <a href="/auth/logout">
                    <button type="button">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
        <script src="/admin/admin.js" type="module"></script>
      </body>
    </html>
  );
};
