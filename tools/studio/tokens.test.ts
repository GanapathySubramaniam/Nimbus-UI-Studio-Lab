import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { TokenSet, TokenPreset } from '../../packages/application-shell/src/studio/tokens.ts';

// A missing implementation is an explicit assertion failure during the initial RED run.
let importFailure: unknown;
const modules = Promise.all([
  import('../../packages/application-shell/src/studio/tokens.ts'),
  import('../../packages/application-shell/src/studio/token-catalog.ts'),
]).catch(error => { importFailure = error; return undefined; });
async function api() {
  const loaded = await modules;
  assert.ok(loaded, `The pure token compiler and catalog must exist and load: ${String(importFailure)}`);
  return { ...loaded[0], ...loaded[1] };
}

const fixture: TokenSet = {
  color: { canvas: '#ffffff', surface: '#fafafa', raised: '#ffffff', muted: '#eeeeee', text: '#111111', textMuted: '#333333', border: '#777777', borderMuted: '#777777', accent: '#134c70', accentHover: '#103954', onAccent: '#ffffff', focus: '#134c70', success: '#17653b', warning: '#765100', danger: '#9c2435', info: '#234e91' },
  font: { body: 'sans', display: 'serif', mono: 'mono' },
  type: { caption: 12, body: 16, label: 14, heading: 28, display: 48, lineHeight: 1.6, headingLineHeight: 1.15, weight: 400, headingWeight: 700, tracking: -0.02 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  shape: { radiusSmall: 4, radiusMedium: 8, radiusLarge: 16, borderWidth: 1, controlHeight: 44 },
  elevation: { small: 'none', medium: '0px 4px 12px 0px #00000020', large: '0px 8px 24px -2px #00000030' },
  motion: { instant: 80, rapid: 120, fast: 160, standard: 240, slow: 360, expressive: 520, easingStandard: [0.2, 0, 0, 1], easingAccelerate: [0.4, 0, 1, 1], easingDecelerate: [0, 0, 0.2, 1], easingEmphasized: [0.2, 0, 0, 1.4] },
};
const preset: TokenPreset = { id: 'test-preset', name: 'Test Preset', family: 'Test family', description: 'Independent serializer fixture', density: 'comfortable', preferredTheme: 'light', themes: { light: fixture, dark: fixture } };
const surfaces = ['canvas', 'surface', 'raised', 'muted'] as const;
const foregrounds = ['text', 'textMuted', 'accent', 'accentHover', 'success', 'warning', 'danger', 'info'] as const;

test('catalog preserves all 75 exact names, descriptions and ten families from the product contract', async () => {
  const { tokenPresets } = await api();
  const section = readFileSync(new URL('../../GOAL.md', import.meta.url), 'utf8').split('## 10. The 75 Presets')[1]!.split('## 11.')[0]!;
  let family = '';
  const expected: { name: string; description: string; family: string }[] = [];
  for (const line of section.split(/\r?\n/)) {
    const group = /^\*\*[A-J]\. (.+) \(\d+\)\*\*$/.exec(line);
    if (group) family = group[1]!;
    const row = /^\d+\. (.+) — (.+)$/.exec(line);
    if (row) expected.push({ name: row[1]!, description: row[2]!, family });
  }
  assert.equal(expected.length, 75);
  assert.deepEqual(tokenPresets.map(({ name, description, family }) => ({ name, description, family })), expected);
  assert.equal(new Set(tokenPresets.map(p => p.id)).size, 75);
  assert.equal(new Set(tokenPresets.map(p => p.family)).size, 10);
  for (const p of tokenPresets) assert.match(p.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test('every theme is complete, valid and distinct in palette and full design recipe', async () => {
  const { tokenPresets, validateTokens } = await api();
  for (const mode of ['light', 'dark'] as const) {
    const themes = tokenPresets.map(p => p.themes[mode]);
    assert.equal(new Set(themes.map(t => JSON.stringify(t))).size, 75);
    assert.ok(new Set(themes.map(t => JSON.stringify(t.color))).size >= 70, 'Distinct palettes cannot be manufactured by names alone');
    assert.ok(new Set(themes.map(({ color: _color, ...rest }) => JSON.stringify(rest))).size >= 60, 'Recipes must vary beyond palette');
    for (const t of themes) assert.deepEqual(validateTokens(t), t);
  }
  for (const p of tokenPresets) assert.notDeepEqual(p.themes.light, p.themes.dark);
});

test('authored archetypes retain their stated typography, geometry, density and grayscale character', async () => {
  const { tokenPresets } = await api();
  const byName = (name: string) => { const p = tokenPresets.find(p => p.name === name); assert.ok(p); return p; };
  assert.equal(byName('Editorial Warm').themes.light.font.display, 'serif');
  assert.equal(byName('Notebook Cream').themes.light.font.body, 'serif');
  assert.equal(byName('Void Terminal').themes.dark.font.body, 'mono');
  assert.deepEqual(Object.values(byName('Void Terminal').themes.dark.elevation), ['none', 'none', 'none']);
  assert.equal(byName('Terminal Native').themes.dark.color.canvas, '#000000');
  assert.equal(byName('Cinema Black').themes.dark.color.canvas, '#000000');
  assert.equal(byName('Vector Precision').themes.light.shape.radiusLarge, 0);
  assert.equal(byName('Aurora Vivid').themes.light.shape.radiusSmall, 0);
  assert.ok(byName('Type Specimen').themes.light.type.display >= 64);
  assert.ok(byName('Task Dense').themes.light.shape.controlHeight < byName('Soft Neutral').themes.light.shape.controlHeight);
  assert.ok(byName('Accessible Default').themes.light.shape.controlHeight >= 48);
  assert.ok(byName('High Contrast Max').themes.light.shape.borderWidth >= 2);
  for (const t of Object.values(byName('Monochrome Local').themes)) {
    for (const hex of Object.values(t.color)) assert.match(hex, /^#([0-9a-f]{2})\1\1$/);
  }
  for (const p of tokenPresets) for (const t of Object.values(p.themes)) {
    assert.ok(['compact', 'comfortable', 'spacious'].includes(p.density));
    for (const font of Object.values(t.font)) assert.ok(['sans', 'serif', 'mono'].includes(font));
  }
});

test('contrast uses linearized sRGB and unrounded WCAG ratios', async () => {
  const { contrastRatio } = await api();
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#aabbcc', '#aabbcc'), 1);
  assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.478089453577214) < 1e-12);
  // Primary-color fixtures independently protect the luminance channel weights.
  assert.ok(Math.abs(contrastRatio('#ff0000', '#ffffff') - 3.9984767707539985) < 1e-12);
  assert.ok(Math.abs(contrastRatio('#00ff00', '#000000') - 15.304) < 1e-12);
  assert.ok(Math.abs(contrastRatio('#0000ff', '#000000') - 2.444) < 1e-12);
  assert.equal(contrastRatio('#ABCDEF', '#123456'), contrastRatio('#123456', '#abcdef'));
  for (const bad of ['red', '#fff', '#ffffff00', 'var(--x)', '#12345g', '#ffffff; color:red', '', null]) {
    assert.throws(() => contrastRatio(bad as string, '#ffffff'));
  }
});

test('audit covers all 46 required pairs and reports a real threshold failure', async () => {
  const { auditTokens } = await api();
  const checks = auditTokens(fixture);
  const expected = foregrounds.flatMap(foreground => surfaces.map(background => `${foreground}/${background}`));
  expected.push('onAccent/accent', 'onAccent/accentHover');
  for (const foreground of ['border', 'borderMuted', 'focus']) for (const background of surfaces) expected.push(`${foreground}/${background}`);
  assert.deepEqual(checks.map(c => `${c.foreground}/${c.background}`).sort(), expected.sort());
  assert.ok(checks.every(c => c.minimum === (['border', 'borderMuted', 'focus'].includes(c.foreground) ? 3 : 4.5)));
  const bad = structuredClone(fixture);
  bad.color.text = '#777777';
  const failed = auditTokens(bad).find(c => c.foreground === 'text' && c.background === 'canvas')!;
  assert.equal(failed.pass, false);
  assert.ok(failed.ratio < 4.5);
  for (const minimum of [NaN, Infinity, 0, 22]) assert.throws(() => auditTokens(fixture, minimum));
});

test('all 75 × 2 themes pass measured AA and both accessibility presets pass AAA text', async () => {
  const { tokenPresets, auditTokens } = await api();
  for (const p of tokenPresets) for (const mode of ['light', 'dark'] as const) {
    const minimum = ['Accessible Default', 'High Contrast Max'].includes(p.name) ? 7 : 4.5;
    for (const c of auditTokens(p.themes[mode], minimum)) assert.ok(c.pass, `${p.name}/${mode}: ${c.foreground}/${c.background} ${c.ratio} < ${c.minimum}`);
  }
});

test('validator returns a detached canonical snapshot without altering input', async () => {
  const { validateTokens } = await api();
  const input = structuredClone(fixture);
  input.color.canvas = '#FFFFFF';
  const parsed = validateTokens(input);
  assert.equal(parsed.color.canvas, '#ffffff');
  assert.equal(input.color.canvas, '#FFFFFF');
  parsed.motion.easingStandard[0] = 0.9;
  parsed.color.text = '#000000';
  assert.equal(input.motion.easingStandard[0], 0.2);
  assert.equal(input.color.text, '#111111');
  assert.deepEqual(validateTokens(JSON.parse(JSON.stringify(fixture))), fixture);
});

test('accepted tiny shadow snapshots revalidate and serialize without losing their numeric values', async () => {
  const { validateTokens, tokenVariables, tokenCss, tokenJson } = await api();
  const input = structuredClone(fixture);
  input.elevation.small = '0px 0px 0.0000001px 0px #000000';
  input.elevation.medium = '-0.0000002px 0.0000003px 0.0000004px -0.0000005px #12345678';
  input.elevation.large = '0.0000001px -0.0000002px 0.0000003px -0.0000004px #ABCDEF';
  const snapshot = validateTokens(input);
  assert.deepEqual(snapshot.elevation, {
    small: '0px 0px 1e-7px 0px #000000',
    medium: '-2e-7px 3e-7px 4e-7px -5e-7px #12345678',
    large: '1e-7px -2e-7px 3e-7px -4e-7px #abcdef',
  });
  assert.deepEqual(validateTokens(snapshot), snapshot);
  assert.deepEqual(validateTokens(JSON.parse(JSON.stringify(snapshot))), snapshot);
  const exponentInput = structuredClone(input);
  exponentInput.elevation.large = '1e-7px -2E-7px 3e-7px -4e-7px #ABCDEF';
  assert.deepEqual(validateTokens(exponentInput), snapshot);
  const variables = tokenVariables(snapshot);
  const css = tokenCss(snapshot);
  for (const [key, value] of Object.entries(snapshot.elevation)) {
    assert.equal(variables[`--nimbus-elevation-${key}`], value);
    assert.ok(css.includes(`--nimbus-elevation-${key}: ${value};`));
  }
  assert.equal(tokenCss(input), css);
  const json = JSON.parse(tokenJson({ ...preset, themes: { light: snapshot, dark: snapshot } }, 'light'));
  assert.deepEqual(json.$extensions['org.nimbus-ui.studio'].elevationCss, snapshot.elevation);
});

test('validator rejects missing/extra fields, arrays, inherited data and dangerous properties', async () => {
  const { validateTokens } = await api();
  for (const bad of [null, undefined, false, 3, '', [], {}, Object.create(fixture), JSON.stringify(fixture)]) assert.throws(() => validateTokens(bad));
  for (const [group, values] of Object.entries(fixture)) {
    const missingGroup = structuredClone(fixture) as unknown as Record<string, unknown>;
    delete missingGroup[group];
    assert.throws(() => validateTokens(missingGroup));
    for (const key of Object.keys(values)) {
      const bad = structuredClone(fixture) as unknown as Record<string, Record<string, unknown>>;
      delete bad[group]![key];
      assert.throws(() => validateTokens(bad), `${group}.${key} must be required`);
    }
  }
  for (const key of ['surprise', '__proto__', 'constructor', 'toJSON']) {
    const bad = structuredClone(fixture);
    Object.defineProperty(bad.color, key, { value: '#ffffff', enumerable: true });
    assert.throws(() => validateTokens(bad));
  }
  const symbolic = structuredClone(fixture);
  Object.defineProperty(symbolic, Symbol('injected'), { value: true });
  assert.throws(() => validateTokens(symbolic));
  let getterCalls = 0;
  const getter = structuredClone(fixture);
  Object.defineProperty(getter.color, 'text', { get: () => { getterCalls++; return '#000000'; }, enumerable: true });
  assert.throws(() => validateTokens(getter));
  assert.equal(getterCalls, 0, 'Validation must not execute input accessors');
});

test('validator rejects unsafe CSS, non-finite and out-of-range numeric values and malformed easing', async () => {
  const { validateTokens } = await api();
  const invalid: [string, string, unknown][] = [
    ['color', 'accent', 'url(https://example.invalid)'], ['color', 'text', '#fff; } body { color:red'],
    ['font', 'body', 'Downloaded Font'], ['font', 'mono', 'sans'],
    ['type', 'body', 0], ['type', 'body', '16'], ['type', 'body', Infinity], ['type', 'body', NaN],
    ['type', 'weight', 1001], ['type', 'lineHeight', -1], ['type', 'tracking', 1e100],
    ['space', 'xs', -1], ['space', 'xxl', 10001], ['shape', 'controlHeight', 23], ['shape', 'borderWidth', -1],
    ['motion', 'standard', -1], ['motion', 'slow', Infinity], ['motion', 'easingStandard', [0, 0, 1]],
    ['motion', 'easingStandard', [0, 0, 2, 1]], ['motion', 'easingStandard', [0, NaN, 1, 1]],
    ['motion', 'easingStandard', [0, 0, 1, 1, 0]],
    ['elevation', 'small', '0px 1px 2px 0px #000000; color:red'], ['elevation', 'large', 'var(--untrusted)'],
    ['elevation', 'small', '0px 1px -2px 0px #000000'], ['elevation', 'small', '0px 1px 2px 0px #000000\n'],
    ['elevation', 'small', '0px 0px 1e309px 0px #000000'], ['elevation', 'small', '0px 0px 3e2px 0px #000000'],
    ['elevation', 'small', '0px 0px -1e-7px 0px #000000'], ['elevation', 'small', '0px 0px 1e-px 0px #000000'],
    ['elevation', 'small', '0px 0px 1e-7px 0px #000000; color:red'],
  ];
  for (const [group, key, value] of invalid) {
    const bad = structuredClone(fixture) as unknown as Record<string, Record<string, unknown>>;
    bad[group]![key] = value;
    assert.throws(() => validateTokens(bad), `${group}.${key}: ${String(value)}`);
  }
  for (const [group, values] of Object.entries(fixture)) for (const [key, original] of Object.entries(values)) {
    if (typeof original !== 'number') continue;
    for (const invalidNumber of [NaN, Infinity, -Infinity, 1e100, '12', null]) {
      const bad = structuredClone(fixture) as unknown as Record<string, Record<string, unknown>>;
      bad[group]![key] = invalidNumber;
      assert.throws(() => validateTokens(bad), `${group}.${key} must validate its numeric domain`);
    }
  }
  const validOvershoot = structuredClone(fixture);
  validOvershoot.motion.easingEmphasized = [0.2, -0.4, 0.8, 1.4];
  assert.deepEqual(validateTokens(validOvershoot).motion.easingEmphasized, [0.2, -0.4, 0.8, 1.4]);
});

test('CSS exposes complete kebab-case declarations, correct units, system stacks and motion aliases', async () => {
  const { tokenVariables, tokenCss } = await api();
  const vars = tokenVariables(fixture);
  assert.equal(vars['--nimbus-color-text-muted'], '#333333');
  assert.equal(vars['--nimbus-type-body'], '16px');
  assert.equal(vars['--nimbus-type-line-height'], '1.6');
  assert.equal(vars['--nimbus-type-heading-weight'], '700');
  assert.equal(vars['--nimbus-type-tracking'], '-0.02em');
  assert.equal(vars['--nimbus-shape-control-height'], '44px');
  assert.equal(vars['--nimbus-motion-standard'], '240ms');
  assert.equal(vars['--nimbus-motion-easing-emphasized'], 'cubic-bezier(0.2, 0, 0, 1.4)');
  assert.equal(vars['--nimbus-duration-standard'], '240ms');
  assert.equal(vars['--nimbus-easing-emphasized'], 'cubic-bezier(0.2, 0, 0, 1.4)');
  assert.equal(vars['--nimbus-font-body'], 'system-ui, sans-serif');
  assert.equal(vars['--nimbus-font-display'], 'ui-serif, serif');
  assert.equal(vars['--nimbus-font-mono'], 'ui-monospace, monospace');
  for (const [group, values] of Object.entries(fixture)) for (const key of Object.keys(values)) {
    const kebab = key.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`);
    assert.ok(vars[`--nimbus-${group}-${kebab}`], `Missing ${group}.${key}`);
  }
  assert.ok(Object.keys(vars).every(k => /^--nimbus-[a-z]+(?:-[a-z]+)+$/.test(k)));
  const css = tokenCss(fixture);
  assert.ok(css.startsWith('.nimbus-theme {\n'));
  assert.ok(css.endsWith('\n}'));
  assert.equal((css.match(/;/g) ?? []).length, Object.keys(vars).length);
  assert.doesNotMatch(css, /undefined|NaN|url\(|@import|var\(/);
  for (const [key, value] of Object.entries(vars)) assert.ok(css.includes(`  ${key}: ${value};`));
});

test('CSS and token JSON are deterministic for equivalent input key order and reject unsafe entry points', async () => {
  const { tokenCss, tokenVariables, tokenJson } = await api();
  const reversed = Object.fromEntries(Object.entries(fixture).reverse().map(([group, values]) => [group, Object.fromEntries(Object.entries(values).reverse())])) as unknown as TokenSet;
  assert.equal(tokenCss(reversed), tokenCss(fixture));
  assert.equal(tokenJson({ ...preset, themes: { light: reversed, dark: reversed } }, 'light'), tokenJson(preset, 'light'));
  const bad = structuredClone(fixture);
  bad.color.text = '</style><script>alert(1)</script>';
  assert.throws(() => tokenCss(bad));
  assert.throws(() => tokenVariables(bad));
  assert.throws(() => tokenJson({ ...preset, themes: { light: bad, dark: fixture } }, 'light'));
  for (const mode of ['system', '__proto__', null]) assert.throws(() => tokenJson(preset, mode as 'light'));
  assert.throws(() => tokenJson({ ...preset, name: '</script>' }, 'light'));
  assert.throws(() => tokenJson({ ...preset, density: 'bogus' } as unknown as TokenPreset, 'light'));
});

test('DTCG 2025.10 exports typed interoperable leaves and identifies Nimbus-only metadata explicitly', async () => {
  const { tokenJson } = await api();
  const json = JSON.parse(tokenJson(preset, 'light'));
  assert.deepEqual(json.color.canvas, { $type: 'color', $value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 1, hex: '#ffffff' } });
  assert.deepEqual(json.type.body, { $type: 'dimension', $value: { value: 16, unit: 'px' } });
  assert.deepEqual(json.type.weight, { $type: 'fontWeight', $value: 400 });
  assert.deepEqual(json.type.lineHeight, { $type: 'number', $value: 1.6 });
  assert.deepEqual(json.motion.standard, { $type: 'duration', $value: { value: 240, unit: 'ms' } });
  assert.deepEqual(json.motion.easingEmphasized, { $type: 'cubicBezier', $value: [0.2, 0, 0, 1.4] });
  assert.deepEqual(json.font.body, { $type: 'fontFamily', $value: ['system-ui', 'sans-serif'] });
  const metadata = json.$extensions['org.nimbus-ui.studio'];
  assert.equal(metadata.theme, 'light');
  assert.equal(metadata.preset.id, 'test-preset');
  assert.deepEqual(metadata.elevationCss, fixture.elevation);
  assert.deepEqual(metadata.tracking, { value: -0.02, unit: 'em' });
  assert.equal(json.type.tracking, undefined, 'em is not a DTCG dimension unit');
  assert.equal(json.elevation, undefined, 'Raw CSS shadows must not masquerade as DTCG leaves');
  const allowed = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number']);
  let leaves = 0;
  function walk(group: Record<string, unknown>) {
    for (const [key, value] of Object.entries(group)) {
      if (key.startsWith('$')) continue;
      assert.equal(typeof value, 'object');
      const token = value as Record<string, unknown>;
      if ('$value' in token) { assert.ok(allowed.has(token['$type'] as string)); leaves++; }
      else walk(token);
    }
  }
  walk(json);
  assert.equal(leaves, 49);
});

test('every catalog theme serializes to complete safe CSS and well-typed JSON without mutating the catalog', async () => {
  const { tokenPresets, tokenCss, tokenJson } = await api();
  const before = JSON.stringify(tokenPresets);
  for (const p of tokenPresets) for (const mode of ['light', 'dark'] as const) {
    const css = tokenCss(p.themes[mode]);
    assert.doesNotMatch(css, /undefined|NaN|Infinity|url\(|@|[<>]/);
    const json = JSON.parse(tokenJson(p, mode));
    assert.equal(json.$extensions['org.nimbus-ui.studio'].theme, mode);
    assert.equal(json.color.canvas.$value.hex, p.themes[mode].color.canvas);
    assert.equal(tokenJson(p, mode), tokenJson(p, mode));
  }
  assert.equal(JSON.stringify(tokenPresets), before);
});
