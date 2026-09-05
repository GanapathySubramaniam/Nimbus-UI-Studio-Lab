import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@nimbus-ui-studio/application-shell/styles.css";
import { App } from "./App.js";

const root = document.querySelector("#root");
if (!root) throw new Error("Nimbus root element is missing");
createRoot(root).render(<StrictMode><App /></StrictMode>);
