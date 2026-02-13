import { useAdminStore } from "../store/adminStore";

type LanguageTabsProps = {
  className?: string;
};

export function LanguageTabs({ className = "" }: LanguageTabsProps) {
  const { editLanguage, setEditLanguage } = useAdminStore((state) => ({
    editLanguage: state.editLanguage,
    setEditLanguage: state.setEditLanguage,
  }));

  const classes = `language-tabs ${className}`.trim();

  return (
    <div className={classes} role="tablist" aria-label="Content language">
      <button
        type="button"
        role="tab"
        className={`language-tab ${editLanguage === "nl" ? "active" : ""}`}
        aria-selected={editLanguage === "nl"}
        onClick={() => setEditLanguage("nl")}
      >
        NL
      </button>
      <button
        type="button"
        role="tab"
        className={`language-tab ${editLanguage === "en" ? "active" : ""}`}
        aria-selected={editLanguage === "en"}
        onClick={() => setEditLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
