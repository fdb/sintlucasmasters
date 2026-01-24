import type { FC } from "hono/jsx";

type Tab = "projects" | "users";

interface TabsProps {
  activeTab: Tab;
}

export const AdminTabs: FC<TabsProps> = ({ activeTab }) => {
  return (
    <nav class="admin-tabs">
      <a href="/admin" class={`admin-tab ${activeTab === "projects" ? "active" : ""}`}>
        Projects
      </a>
      <a href="/admin/users" class={`admin-tab ${activeTab === "users" ? "active" : ""}`}>
        Users
      </a>
    </nav>
  );
};
