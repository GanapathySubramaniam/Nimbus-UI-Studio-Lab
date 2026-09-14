import {
  widgetCatalog,
  designPresets,
  themedPreset,
  type WidgetDefinition,
  type WidgetKind,
  type DesignPreset,
} from "@nimbus-ui-studio/application-shell/studio-engine";

export const WIDGET_KINDS = widgetCatalog.map((entry) => entry.kind) as unknown as readonly [
  WidgetKind,
  ...WidgetKind[],
];

export function findDefinition(kind: WidgetKind): WidgetDefinition {
  const def = widgetCatalog.find((entry) => entry.kind === kind);
  if (!def) throw new Error(`Unknown widget kind "${kind}".`);
  return def;
}

export function findPreset(presetId: string | undefined): DesignPreset {
  if (presetId) {
    const found = designPresets.find((entry) => entry.id === presetId);
    if (found) return found;
  }
  return themedPreset("muted-enterprise", "light");
}

export { widgetCatalog, designPresets };
