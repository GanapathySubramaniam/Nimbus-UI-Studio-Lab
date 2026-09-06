/** Pure, dependency-free token boundary. All public serializers validate at runtime. */
export type ThemeMode = 'light' | 'dark';
export type FontCategory = 'sans' | 'serif' | 'mono';
export interface TokenSet {
  color: Record<'canvas' | 'surface' | 'raised' | 'muted' | 'text' | 'textMuted' | 'border' | 'borderMuted' | 'accent' | 'accentHover' | 'onAccent' | 'focus' | 'success' | 'warning' | 'danger' | 'info', string>;
  font: { body: FontCategory; display: FontCategory; mono: 'mono' };
  type: { caption: number; body: number; label: number; heading: number; display: number; lineHeight: number; headingLineHeight: number; weight: number; headingWeight: number; tracking: number };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  shape: { radiusSmall: number; radiusMedium: number; radiusLarge: number; borderWidth: number; controlHeight: number };
  elevation: { small: string; medium: string; large: string };
  motion: { instant: number; rapid: number; fast: number; standard: number; slow: number; expressive: number; easingStandard: [number, number, number, number]; easingAccelerate: [number, number, number, number]; easingDecelerate: [number, number, number, number]; easingEmphasized: [number, number, number, number] };
}
export interface TokenPreset {
  id: string; name: string; family: string; description: string;
  density: 'compact' | 'comfortable' | 'spacious'; preferredTheme: ThemeMode;
  themes: Record<ThemeMode, TokenSet>;
}

type Validator = (input: unknown, path: string) => unknown;
function invalid(path: string): never { throw new TypeError(`Invalid Nimbus token: ${path}`); }

// Read only own data descriptors. Inherited keys, accessors, symbols and unknown fields
// are not JSON data and must never execute or become CSS declarations.
function record(input: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return invalid(path);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return invalid(path);
  const own = Reflect.ownKeys(input);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) return invalid(path);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return invalid(`${path}.${key}`);
    result[key] = descriptor.value;
  }
  return result;
}
function numberBetween(min: number, max: number): Validator {
  return (input, path) => typeof input === 'number' && Number.isFinite(input) && input >= min && input <= max ? (Object.is(input, -0) ? 0 : input) : invalid(path);
}
function choice<const T extends string>(options: readonly T[]): Validator {
  return (input, path) => typeof input === 'string' && options.includes(input as T) ? input : invalid(path);
}
function color(input: unknown, path: string): string {
  if (typeof input !== 'string' || input.length !== 7 || !/^#[0-9a-f]{6}$/i.test(input)) return invalid(path);
  return input.toLowerCase();
}
function easing(input: unknown, path: string): [number, number, number, number] {
  if (!Array.isArray(input) || input.length !== 4 || Object.getPrototypeOf(input) !== Array.prototype || Reflect.ownKeys(input).length !== 5) return invalid(path);
  const values: number[] = [];
  for (let index = 0; index < 4; index++) {
    const d = Object.getOwnPropertyDescriptor(input, String(index));
    if (!d || !('value' in d) || !d.enumerable) return invalid(path);
    // CSS permits y overshoot; Nimbus bounds it to prevent pathological animation.
    values.push(numberBetween(index % 2 === 0 ? 0 : -10, index % 2 === 0 ? 1 : 10)(d.value, `${path}[${index}]`) as number);
  }
  return values as [number, number, number, number];
}
function shadow(input: unknown, path: string): string {
  if (input === 'none') return input;
  // Supported safe subset: one outer shadow, four px lengths, opaque/alpha hex.
  // No functions, references, lists, stylesheets or external resources are accepted.
  if (typeof input !== 'string' || input.length > 120 || /[\r\n]/.test(input)) return invalid(path);
  // Number-to-string canonicalization can emit exponents for tiny accepted
  // decimals. Accept that CSS number syntax so snapshots remain revalidatable.
  const match = /^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)px (-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)px (\d+(?:\.\d+)?(?:e[+-]?\d+)?)px (-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)px (#[\da-f]{6}(?:[\da-f]{2})?)$/i.exec(input);
  if (!match) return invalid(path);
  const lengths = match.slice(1, 5).map(Number);
  lengths.forEach((n, index) => numberBetween(index === 2 ? 0 : -256, 256)(n, path));
  return `${lengths.map(n => `${n}px`).join(' ')} ${match[5]!.toLowerCase()}`;
}

const schema = {
  color: { canvas: color, surface: color, raised: color, muted: color, text: color, textMuted: color, border: color, borderMuted: color, accent: color, accentHover: color, onAccent: color, focus: color, success: color, warning: color, danger: color, info: color },
  font: { body: choice(['sans', 'serif', 'mono']), display: choice(['sans', 'serif', 'mono']), mono: choice(['mono']) },
  type: { caption: numberBetween(10, 128), body: numberBetween(12, 128), label: numberBetween(10, 128), heading: numberBetween(12, 256), display: numberBetween(12, 256), lineHeight: numberBetween(1, 3), headingLineHeight: numberBetween(1, 3), weight: numberBetween(1, 1000), headingWeight: numberBetween(1, 1000), tracking: numberBetween(-0.1, 1) },
  space: { xs: numberBetween(0, 512), sm: numberBetween(0, 512), md: numberBetween(0, 512), lg: numberBetween(0, 512), xl: numberBetween(0, 512), xxl: numberBetween(0, 512) },
  shape: { radiusSmall: numberBetween(0, 256), radiusMedium: numberBetween(0, 256), radiusLarge: numberBetween(0, 256), borderWidth: numberBetween(0, 8), controlHeight: numberBetween(24, 128) },
  elevation: { small: shadow, medium: shadow, large: shadow },
  motion: { instant: numberBetween(0, 10000), rapid: numberBetween(0, 10000), fast: numberBetween(0, 10000), standard: numberBetween(0, 10000), slow: numberBetween(0, 10000), expressive: numberBetween(0, 10000), easingStandard: easing, easingAccelerate: easing, easingDecelerate: easing, easingEmphasized: easing },
} satisfies Record<keyof TokenSet, Record<string, Validator>>;

/** Accept a complete Nimbus TokenSet, never a stylesheet or arbitrary DTCG document.
 * Returns a detached, canonical snapshot. Contrast is a separate measurable audit.
 */
export function validateTokens(input: unknown): TokenSet {
  const root = record(input, Object.keys(schema), 'tokens');
  const output: Record<string, Record<string, unknown>> = {};
  for (const [group, fields] of Object.entries(schema)) {
    const values = record(root[group], Object.keys(fields), group);
    const parsed: Record<string, unknown> = {};
    for (const [key, validate] of Object.entries(fields)) parsed[key] = validate(values[key], `${group}.${key}`);
    output[group] = parsed;
  }
  return output as unknown as TokenSet;
}

// Generic system stacks, without downloads, named proprietary faces or font assets.
const fontStacks: Record<FontCategory, string[]> = {
  sans: ['system-ui', 'sans-serif'], serif: ['ui-serif', 'serif'], mono: ['ui-monospace', 'monospace'],
};
const kebab = (key: string) => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const unitlessType = new Set(['lineHeight', 'headingLineHeight', 'weight', 'headingWeight']);

export function tokenVariables(tokens: TokenSet): Record<string, string> {
  const validated = validateTokens(tokens);
  const variables: Record<string, string> = {};
  for (const [group, fields] of Object.entries(validated)) {
    for (const [key, value] of Object.entries(fields)) {
      let css: string;
      if (group === 'font') css = fontStacks[value as FontCategory].join(', ');
      else if (group === 'motion') css = Array.isArray(value) ? `cubic-bezier(${value.join(', ')})` : `${value}ms`;
      else if (typeof value === 'number') css = `${value}${group === 'type' ? (key === 'tracking' ? 'em' : unitlessType.has(key) ? '' : 'px') : 'px'}`;
      else css = String(value);
      variables[`--nimbus-${group}-${kebab(key)}`] = css;
      // GOAL.md motion names are aliases of the stable group/key swatch contract.
      if (group === 'motion') variables[Array.isArray(value) ? `--nimbus-${kebab(key)}` : `--nimbus-duration-${key}`] = css;
    }
  }
  return variables;
}

/** Complete declarations only, with a fixed selector and no unresolved CSS inputs. */
export function tokenCss(tokens: TokenSet): string {
  return `.nimbus-theme {\n${Object.entries(tokenVariables(tokens)).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`;
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}
/** Opaque six-digit sRGB hex only; alpha colors require a known compositing surface. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(color(a, 'foreground'));
  const second = luminance(color(b, 'background'));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function auditTokens(tokens: TokenSet, minimumText = 4.5): Array<{ foreground: string; background: string; ratio: number; minimum: number; pass: boolean }> {
  numberBetween(1, 21)(minimumText, 'minimumText');
  const { color: colors } = validateTokens(tokens);
  const checks: Array<{ foreground: string; background: string; ratio: number; minimum: number; pass: boolean }> = [];
  const add = (foreground: keyof TokenSet['color'], background: keyof TokenSet['color'], minimum: number) => {
    const ratio = contrastRatio(colors[foreground], colors[background]);
    checks.push({ foreground, background, ratio, minimum, pass: ratio >= minimum });
  };
  const surfaces = ['canvas', 'surface', 'raised', 'muted'] as const;
  for (const foreground of ['text', 'textMuted', 'accent', 'accentHover', 'success', 'warning', 'danger', 'info'] as const) {
    for (const background of surfaces) add(foreground, background, minimumText);
  }
  add('onAccent', 'accent', minimumText);
  add('onAccent', 'accentHover', minimumText);
  for (const foreground of ['border', 'borderMuted', 'focus'] as const) {
    for (const background of surfaces) add(foreground, background, 3);
  }
  return checks;
}

function plainText(input: unknown, path: string, max = 500): string {
  if (typeof input !== 'string' || input.length < 1 || input.length > max || input.trim() !== input || /[\u0000-\u001f\u007f<>{}]/u.test(input)) return invalid(path);
  return input;
}
type LeafType = 'color' | 'dimension' | 'duration' | 'cubicBezier' | 'fontFamily' | 'fontWeight' | 'number';
interface Leaf { $type: LeafType; $value: unknown }
const leaf = ($type: LeafType, $value: unknown): Leaf => ({ $type, $value });

/** Export resolved DTCG 2025.10 leaves. Nimbus compound/application information is
 * namespaced metadata; this is not an arbitrary DTCG import or round-trip API.
 */
export function tokenJson(preset: TokenPreset, theme: ThemeMode): string {
  choice(['light', 'dark'])(theme, 'theme');
  const p = record(preset, ['id', 'name', 'family', 'description', 'density', 'preferredTheme', 'themes'], 'preset');
  const id = plainText(p['id'], 'preset.id', 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return invalid('preset.id');
  const metadata = {
    id, name: plainText(p['name'], 'preset.name', 100), family: plainText(p['family'], 'preset.family', 100),
    description: plainText(p['description'], 'preset.description'),
    density: choice(['compact', 'comfortable', 'spacious'])(p['density'], 'preset.density'),
    preferredTheme: choice(['light', 'dark'])(p['preferredTheme'], 'preset.preferredTheme'),
  };
  const themes = record(p['themes'], ['light', 'dark'], 'preset.themes');
  const validated = { light: validateTokens(themes['light']), dark: validateTokens(themes['dark']) };
  const tokens = validated[theme];
  const result: Record<string, unknown> = {
    $description: metadata.description,
    $extensions: { 'org.nimbus-ui.studio': {
      schemaVersion: 1, dtcgVersion: '2025.10', preset: metadata, theme,
      fontCategories: tokens.font,
      tracking: { value: tokens.type.tracking, unit: 'em' },
      elevationCss: tokens.elevation,
    } },
  };
  for (const [group, fields] of Object.entries(tokens)) {
    if (group === 'elevation') continue;
    const leaves: Record<string, Leaf> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (group === 'color') leaves[key] = leaf('color', { colorSpace: 'srgb', components: rgb(value as string).map(c => c / 255), alpha: 1, hex: value });
      else if (group === 'font') leaves[key] = leaf('fontFamily', fontStacks[value as FontCategory]);
      else if (group === 'motion') leaves[key] = Array.isArray(value) ? leaf('cubicBezier', value) : leaf('duration', { value, unit: 'ms' });
      else if (group === 'type' && key === 'tracking') continue;
      else if (group === 'type' && (key === 'weight' || key === 'headingWeight')) leaves[key] = leaf('fontWeight', value);
      else if (group === 'type' && unitlessType.has(key)) leaves[key] = leaf('number', value);
      else leaves[key] = leaf('dimension', { value, unit: 'px' });
    }
    result[group] = leaves;
  }
  return JSON.stringify(result, null, 2);
}
