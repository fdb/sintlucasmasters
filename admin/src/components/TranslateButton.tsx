import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { translateField } from "../api/fetchers";

type TranslateButtonProps = {
  projectId: string;
  field: "bio" | "description";
  sourceText: string | null;
  currentText: string | null;
  direction: "nl-to-en" | "en-to-nl";
  disabled: boolean;
  onTranslated: (text: string) => void;
};

export function TranslateButton({
  projectId,
  field,
  sourceText,
  currentText,
  direction,
  disabled,
  onTranslated,
}: TranslateButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const hasSource = Boolean(sourceText?.trim());
  const isEmpty = !currentText?.trim();
  const visible = hasSource && isEmpty && !disabled;

  if (!visible) return null;

  const label = direction === "nl-to-en" ? "Translate from NL" : "Translate from EN";

  const handleClick = async () => {
    if (state === "loading" || !sourceText?.trim()) return;

    setState("loading");
    setErrorMessage("");

    try {
      const result = await translateField(projectId, {
        field,
        text: sourceText.trim(),
        direction,
      });

      if (result.status === "ok" && result.translation) {
        onTranslated(result.translation);
        setState("idle");
      } else {
        setState("error");
        setErrorMessage(result.reason || "Translation failed");
        setTimeout(() => {
          setState("idle");
          setErrorMessage("");
        }, 3000);
      }
    } catch {
      setState("error");
      setErrorMessage("Translation failed");
      setTimeout(() => {
        setState("idle");
        setErrorMessage("");
      }, 3000);
    }
  };

  const className = `translate-btn${state === "error" ? " translate-btn-error" : ""}`;

  return (
    <button type="button" className={className} onClick={handleClick} disabled={state === "loading"}>
      {state === "loading" ? (
        <>
          <Loader2 size={12} className="translate-spinner" />
          <span>Translating...</span>
        </>
      ) : state === "error" ? (
        <span>{errorMessage}</span>
      ) : (
        <>
          <Languages size={12} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
