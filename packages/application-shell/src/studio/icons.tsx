import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-4h3a3 3 0 0 0 3-3 9 9 0 0 0-9-7 M7 9h.01 M10 6h.01 M15 6h.01 M18 9h.01",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 5v14 M5 12h14",
  close: "m6 6 12 12 M18 6 6 18",
  undo: "M9 4 4 9l5 5 M4 9h10a6 6 0 0 1 0 12",
  redo: "m15 4 5 5-5 5 M20 9H10a6 6 0 0 0 0 12",
  code: "m8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  monitor: "M3 3h18v13H3z M8 21h8 M12 16v5",
  tablet: "M5 2h14v20H5z M11 18h2",
  phone: "M7 2h10v20H7z M11 18h2",
  arrow: "M5 12h14 m-6-6 6 6-6 6",
  down: "m7 10 5 5 5-5",
  upload: "M12 16V3 m-5 5 5-5 5 5 M3 15v6h18v-6",
  download: "M12 3v13 m-5-5 5 5 5-5 M3 17v4h18v-4",
  copy: "M8 8h13v13H8z M16 8V3H3v13h5",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  unlock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0",
  check: "m5 12 4 4L19 6",
  folder: "M3 6h7l2 3h9v12H3z",
  image: "M3 3h18v18H3z m0 14 5-5 4 4 3-3 6 6 M8 7h.01",
  move: "M12 2v20 M2 12h20 m-13-7 3-3 3 3 M9 19l3 3 3-3 M5 9l-3 3 3 3 M19 9l3 3-3 3",
  play: "m8 4 12 8-12 8z",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  help: "M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  chart: "M4 3v17h17 M8 16v-5 M13 16V7 M18 16V4",
  text: "M4 4h16 M12 4v17 M8 21h8",
};
export function Icon({
  name,
  size = 16,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] ?? paths["grid"]} />
    </svg>
  );
}
