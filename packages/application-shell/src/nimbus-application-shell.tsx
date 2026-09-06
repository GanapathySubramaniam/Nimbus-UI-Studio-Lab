"use client";
import { VisualStudio } from "./studio/studio";
export interface NimbusApplicationShellProps {
  readonly journeyCount: number;
  readonly runtime: "Vite" | "Next.js";
}
/** Compatibility entry point shared by both reference applications. */
export function NimbusApplicationShell(_props: NimbusApplicationShellProps) {
  return <VisualStudio />;
}
