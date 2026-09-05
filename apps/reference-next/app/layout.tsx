import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@nimbus-ui-studio/application-shell/styles.css";

export const metadata: Metadata = { title: "Nimbus UI Studio Lab", description: "Enterprise agentic AI interface system" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
