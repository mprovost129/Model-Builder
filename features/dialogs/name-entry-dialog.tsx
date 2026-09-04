/**
 * Small prompt used for naming a project, Layer Set, Saved Plan View, or group.
 * Extracted from app/model-builder-app.tsx.
 */
import { useEffect, useState } from "react";

export function NameEntryDialog({
  description,
  initialValue,
  label,
  onCancel,
  onSubmit,
  submitLabel,
  title,
}: {
  description: string;
  initialValue: string;
  label: string;
  onCancel: () => void;
  onSubmit: (name: string) => string | null;
  submitLabel: string;
  title: string;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeWithEscape, true);
    return () => window.removeEventListener("keydown", closeWithEscape, true);
  }, [onCancel]);

  const submit = () => {
    const message = onSubmit(draft);
    if (message) setError(message);
  };

  return (
    <div className="story-manager-backdrop name-entry-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="name-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="name-entry-title">
        <header><div><strong id="name-entry-title">{title}</strong><span>{description}</span></div><button type="button" onClick={onCancel} aria-label={`Close ${title}`}>×</button></header>
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label><span>{label}</span><input value={draft} maxLength={80} onChange={(event) => { setDraft(event.target.value); setError(""); }} /></label>
          {error ? <p role="alert">{error}</p> : null}
          <footer><button type="button" onClick={onCancel}>Cancel</button><button type="submit" className="story-save">{submitLabel}</button></footer>
        </form>
      </section>
    </div>
  );
}
