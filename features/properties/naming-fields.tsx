/**
 * Inline naming and color fields used by Properties, the Model Explorer, and the
 * Layer Manager. Each owns its own draft text and validation state and reports
 * results through callbacks. Extracted from app/model-builder-app.tsx.
 */
import { useCallback, useRef, useState } from "react";

export function EditableObjectName({
  entity = "object",
  name,
  onRename,
}: {
  entity?: "group" | "object";
  name: string;
  onRename: (name: string) => boolean;
}) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const cancelingRef = useRef(false);
  const focusNameEditor = useCallback((input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const commit = () => {
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return;
    }
    const normalized = draft.trim();
    if (!normalized) {
      setError(`Enter a ${entity} name.`);
      return;
    }
    if (!onRename(normalized)) {
      setError(`${entity === "group" ? "Group" : "Object"} names must be unique.`);
      return;
    }
    setDraft(normalized);
    setError("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="selection-name"
        onClick={() => {
          setDraft(name);
          setError("");
          setEditing(true);
        }}
        aria-label={`Rename ${entity} ${name}`}
        title="Click to rename"
      >
        {name}
      </button>
    );
  }

  return (
    <div className="selection-name-editor">
      <input
        ref={focusNameEditor}
        value={draft}
        maxLength={120}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            cancelingRef.current = true;
            setDraft(name);
            setError("");
            setEditing(false);
          }
        }}
        aria-label={`Edit ${entity} name`}
        aria-invalid={Boolean(error)}
        spellCheck={false}
      />
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}

export function LayerNameField({
  name,
  onRename,
}: {
  name: string;
  onRename: (name: string) => boolean;
}) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState(false);

  const commit = () => {
    const normalized = draft.trim();
    if (!normalized || !onRename(normalized)) {
      setDraft(name);
      setError(true);
      return;
    }
    setDraft(normalized);
    setError(false);
  };

  return (
    <input
      className={error ? "layer-name-input is-invalid" : "layer-name-input"}
      value={draft}
      maxLength={80}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(name);
          setError(false);
          event.currentTarget.blur();
        }
      }}
      aria-label={`Layer name: ${name}`}
      title={error ? "Layer names must be unique" : "Edit layer name"}
      spellCheck={false}
    />
  );
}

export function LayerColorField({ color, label, onCommit }: { color: string; label: string; onCommit: (color: string) => void }) {
  const [draft, setDraft] = useState(color);
  return <input className="layer-color-input" type="color" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => onCommit(draft)} aria-label={label} title={label} />;
}
