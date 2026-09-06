import type { DesignPreset, Widget, WidgetStyle } from './types';
// @ts-ignore Native strip-types runner requires explicit extensions.
import { tokenPresets } from './token-catalog.ts';
import type { ThemeMode, TokenSet } from './tokens';

/** Compatibility bridge: rendering keeps using explicit saved style values. */
export function presetWidgetStyle(tokens: TokenSet): WidgetStyle {
  return {
    background: tokens.color.surface, color: tokens.color.text,
    accent: tokens.color.accent, borderColor: tokens.color.borderMuted,
    radius: tokens.shape.radiusMedium, borderWidth: tokens.shape.borderWidth,
    padding: tokens.space.lg, fontSize: tokens.type.body,
    fontFamily: tokens.font.body, fontWeight: tokens.type.weight,
    shadow: tokens.elevation.small === 'none' ? 'none' : 'small', opacity: 100,
  };
}

export function themedPreset(id: string, theme: ThemeMode): DesignPreset {
  const preset = tokenPresets.find(item => item.id === id);
  if (!preset) throw new Error(`Unknown Nimbus preset: ${id}`);
  if (theme !== 'light' && theme !== 'dark') throw new Error('Unknown Nimbus theme.');
  return { id: preset.id, name: preset.name, category: preset.family,
    description: preset.description, source: '', style: presetWidgetStyle(preset.themes[theme]) };
}

export const designPresets: DesignPreset[] = tokenPresets.map(preset => themedPreset(preset.id, preset.preferredTheme));

/** Base style is replaceable; user content and element-level overrides are not. */
export function applyPresetStyle(widget: Widget, preset: DesignPreset): Widget {
  if (widget.locked) return widget;
  const style: WidgetStyle = structuredClone(preset.style);
  if (widget.style.logo) style.logo = structuredClone(widget.style.logo);
  if (widget.style.text) style.text = structuredClone(widget.style.text);
  if (widget.style.backdrop?.type === 'image') style.backdrop = structuredClone(widget.style.backdrop);
  return { ...widget, presetId: preset.id, style };
}
