import type { ReactNode, KeyboardEvent } from "react";

/** Roving-tabindex tabs with arrow, Home and End navigation. */
export function PanelTabs({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { id: string; label: string; icon?: ReactNode }[];
  onChange: (value: string) => void;
}) {
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.id === value);
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % options.length
        : e.key === "ArrowLeft"
          ? (index + options.length - 1) % options.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? options.length - 1
              : -1;
    const option = options[next];
    if (!option) return;
    e.preventDefault();
    onChange(option.id);
    e.currentTarget
      .querySelectorAll<HTMLButtonElement>("button")
      [next]?.focus();
  }
  return (
    <div
      className="studio-panel-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={key}
    >
      {options.map((option) => (
        <button
          role="tab"
          id={`${id}-${option.id}`}
          aria-controls={`${id}-panel`}
          aria-selected={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          key={option.id}
          onClick={() => onChange(option.id)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
