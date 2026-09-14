/**
 * Framework-free re-export of the Studio's design engine: everything needed
 * to create, edit, and export a Nimbus project without React or a browser.
 * This is the single source of truth the running app, the exported React
 * ZIP, and any external tool (e.g. an MCP server) all share — a design
 * built through this module opens and exports identically in the app.
 */
export type {
  WidgetKind,
  Widget,
  WidgetState,
  WidgetStyle,
  WidgetDefinition,
  StudioDocument,
  DesignPreset,
  Background,
  TextStyle,
  TextRole,
} from "./types";
export { widgetCatalog } from "./catalog";
export {
  DEFAULT_STYLE,
  createDocument,
  createWidget,
  constrainWidget,
  duplicateInDocument,
  updateWidgetContent,
  parseDocument,
} from "./model";
export type { StudioProject, StudioPage } from "./project";
export {
  MAX_PAGES,
  MAX_PROJECT_SIZE,
  createProject,
  parseProject,
  replacePage,
  addPage,
  duplicatePage,
  removePage,
} from "./project";
export { templateCatalog, createTemplate, type TemplateId } from "./templates";
export { designPresets, themedPreset, applyPresetStyle } from "./presets";
export { exportProjectHtml } from "./export";
export {
  scopeProject,
  exportProjectReact,
  createReactPackage,
  exportReactZip,
  type ExportOptions,
} from "./package-export";
export { createZip, type ZipEntry } from "./zip";
