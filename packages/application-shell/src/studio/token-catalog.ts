// @ts-ignore Native Node strip-types requires explicit extensions; the library also emits declarations.
import { auditTokens, contrastRatio, validateTokens } from './tokens.ts';
import type { FontCategory, ThemeMode, TokenPreset, TokenSet } from './tokens';

/** Original recipes authored from GOAL.md's descriptive grammar, without brand
 * source palettes, fonts, logos or DESIGN.md files. Layout/gradient intentions in
 * descriptions are not additional TokenSet fields; widgets implement that grammar.
 * Tuple columns keep all 75 deliberate choices visible in one place:
 * palette = accent hue/chroma, neutral hue/chroma, dark canvas lightness;
 * type = body/display category, body/display px, leading, heading weight, tracking em;
 * rhythm = base spacing px, small radius px, border px, control height px.
 */
interface Recipe {
  name: string; description: string;
  palette: [number, number, number, number, number];
  typography: [FontCategory, FontCategory, number, number, number, number, number];
  rhythm: [number, number, number, number];
  depth: 'flat' | 'soft' | 'lift' | 'hard'; tempo: number; preferredTheme: ThemeMode;
}
const r = (name: string, description: string, palette: Recipe['palette'], typography: Recipe['typography'], rhythm: Recipe['rhythm'], depth: Recipe['depth'], tempo: number, preferredTheme: ThemeMode): Recipe => ({ name, description, palette, typography, rhythm, depth, tempo, preferredTheme });

const families: readonly [string, readonly Recipe[]][] = [
  ['AI and agent platforms', [
    r('Editorial Warm', 'warm neutral canvas, serif display, generous leading, single earth accent', [24, .48, 36, .26, .055], ['sans', 'serif', 16, 48, 1.7, 600, -.015], [5, 5, 1, 44], 'soft', 280, 'light'),
    r('Void Terminal', 'near-black canvas, monospace, one vivid accent, no elevation', [164, .79, 230, .10, .016], ['mono', 'mono', 14, 36, 1.5, 600, 0], [4, 0, 1, 36], 'flat', 120, 'dark'),
    r('Neon Slate', 'dark slate with saturated neon accent pair, tight radii', [184, .88, 222, .23, .066], ['sans', 'sans', 14, 42, 1.45, 700, -.025], [4, 2, 1, 36], 'lift', 160, 'dark'),
    r('Waveform Dark', 'cinematic black, curved dividers, gradient accent', [283, .76, 264, .19, .012], ['sans', 'sans', 16, 56, 1.65, 500, -.02], [6, 12, 1, 48], 'soft', 380, 'dark'),
    r('Gradient Compute', 'light canvas, multi-stop gradient headers, data-dense cards', [252, .73, 237, .20, .060], ['sans', 'sans', 13, 40, 1.45, 650, -.01], [3.5, 4, 1, 34], 'lift', 220, 'light'),
    r('Monochrome Local', 'pure greyscale, terminal spacing, zero chroma', [0, 0, 0, 0, .032], ['mono', 'mono', 13, 32, 1.55, 600, 0], [4, 0, 1, 32], 'flat', 100, 'light'),
    r('Coral Canvas', 'off-white with a single warm coral action colour, editorial rhythm', [12, .67, 28, .32, .052], ['sans', 'serif', 16, 46, 1.65, 600, -.012], [5.5, 6, 1, 46], 'soft', 260, 'light'),
    r('Blueprint Model', 'technical grid lines, annotation labels, drafting aesthetic', [209, .67, 210, .31, .047], ['sans', 'mono', 13, 34, 1.55, 600, .015], [4, 1, 1, 36], 'flat', 150, 'light'),
  ]],
  ['Developer tools', [
    r('IDE Graphite', 'editor-chrome greys, monospace UI, dense vertical rhythm', [217, .42, 224, .08, .070], ['mono', 'mono', 13, 30, 1.4, 600, 0], [3, 2, 1, 30], 'flat', 100, 'dark'),
    r('Terminal Native', 'true black, phosphor accent, boxed borders', [132, .72, 138, .07, 0], ['mono', 'mono', 14, 32, 1.5, 700, .01], [4, 0, 2, 36], 'flat', 80, 'dark'),
    r('Diff Contrast', 'red and green semantic pair carried through the whole system', [151, .52, 155, .12, .040], ['mono', 'sans', 13, 34, 1.5, 650, 0], [3.5, 2, 1, 34], 'flat', 140, 'dark'),
    r('Docs Paper', 'high-legibility long-form reading, wide measure, quiet chrome', [215, .55, 43, .16, .064], ['sans', 'serif', 18, 44, 1.8, 600, -.008], [6, 3, 1, 44], 'flat', 220, 'light'),
    r('Package Neutral', 'registry-flat, small type, hairline dividers', [264, .37, 250, .07, .075], ['sans', 'sans', 13, 28, 1.5, 600, 0], [3, 2, .75, 32], 'flat', 120, 'light'),
    r('Commit Ledger', 'timeline-first, left rule, monospace metadata', [173, .47, 165, .10, .046], ['sans', 'mono', 14, 32, 1.65, 600, .005], [4, 1, 2, 36], 'flat', 180, 'light'),
    r('Syntax Bright', 'light canvas with a full syntax-derived accent palette', [287, .58, 229, .13, .055], ['mono', 'sans', 14, 38, 1.55, 650, -.015], [4, 3, 1, 38], 'soft', 170, 'light'),
    r('Console Amber', 'dark with amber and warm grey, retro terminal warmth', [39, .83, 34, .21, .022], ['mono', 'mono', 14, 34, 1.6, 600, .02], [4.5, 0, 1, 38], 'flat', 130, 'dark'),
  ]],
  ['Infrastructure and backend', [
    r('Rack Steel', 'cool industrial greys, sharp corners, heavy borders', [205, .31, 208, .13, .074], ['sans', 'mono', 14, 34, 1.45, 700, .012], [4, 0, 2, 38], 'hard', 140, 'dark'),
    r('Observability Dark', 'charcoal, chart-first, threshold colour semantics', [178, .63, 215, .11, .035], ['sans', 'sans', 13, 36, 1.45, 650, -.01], [3.5, 3, 1, 34], 'flat', 160, 'dark'),
    r('Status Grid', 'tile-heavy, status colour as primary signal, minimal type', [144, .49, 165, .12, .058], ['sans', 'sans', 14, 30, 1.5, 650, 0], [4.5, 4, 1, 40], 'soft', 180, 'light'),
    r('Latency Cool', 'desaturated blues, sparkline-centric, compact rows', [214, .29, 215, .21, .061], ['sans', 'mono', 12, 28, 1.4, 600, .005], [3, 2, 1, 28], 'flat', 110, 'light'),
    r('Pipeline Slate', 'directional arrows, stage chips, flow-oriented spacing', [228, .43, 220, .17, .067], ['sans', 'sans', 14, 34, 1.5, 600, -.01], [4.5, 5, 1, 38], 'soft', 230, 'dark'),
    r('Region Map', 'map-adjacent muted earth palette, pin and label components', [78, .30, 66, .20, .054], ['sans', 'sans', 14, 36, 1.6, 600, .005], [5, 4, 1, 40], 'soft', 260, 'light'),
    r('Node Mesh', 'graph-first, connector lines, node cards with ports', [272, .48, 251, .14, .043], ['sans', 'mono', 13, 32, 1.5, 650, 0], [4, 6, 1.5, 36], 'lift', 240, 'dark'),
  ]],
  ['Productivity and workspace', [
    r('Soft Neutral', 'off-white, large radii, low contrast, airy spacing', [31, .28, 38, .20, .080], ['sans', 'sans', 16, 42, 1.7, 500, -.015], [6, 10, .75, 48], 'soft', 300, 'light'),
    r('Notebook Cream', 'paper-warm, serif body, ruled dividers', [29, .45, 45, .38, .070], ['serif', 'serif', 17, 40, 1.8, 600, 0], [5.5, 2, 1, 44], 'flat', 260, 'light'),
    r('Kanban Calm', 'column-oriented, pastel status tints, medium radii', [166, .35, 158, .18, .077], ['sans', 'sans', 15, 36, 1.6, 600, -.008], [5, 6, 1, 42], 'soft', 280, 'light'),
    r('Focus Minimal', 'maximum whitespace, one accent, near-invisible chrome', [237, .40, 240, .035, .084], ['sans', 'sans', 17, 46, 1.75, 500, -.025], [8, 3, .5, 48], 'flat', 220, 'light'),
    r('Inbox Crisp', 'list-dense, unread weight contrast, tight leading', [206, .61, 212, .08, .072], ['sans', 'sans', 14, 32, 1.4, 750, -.01], [3.5, 3, 1, 34], 'flat', 120, 'light'),
    r('Sidebar Deep', 'dark navigation against light content, strong split', [231, .52, 228, .25, .034], ['sans', 'sans', 15, 38, 1.55, 650, -.015], [4.5, 4, 1, 40], 'lift', 240, 'light'),
    r('Meeting Light', 'time-block grid, soft shadows, rounded chips', [193, .45, 198, .18, .079], ['sans', 'sans', 15, 38, 1.6, 550, -.01], [5.5, 9, 1, 44], 'soft', 290, 'light'),
    r('Task Dense', 'highest information density in the family, small type, tight rows', [254, .34, 249, .06, .063], ['sans', 'sans', 12, 28, 1.4, 650, 0], [2.5, 2, 1, 28], 'flat', 100, 'light'),
  ]],
  ['Design and creative tools', [
    r('Canvas Grey', 'neutral mid-grey chrome framing a light artboard', [202, .24, 220, .025, .088], ['sans', 'sans', 14, 36, 1.5, 550, -.012], [4, 3, 1, 36], 'lift', 200, 'light'),
    r('Swatch Studio', 'colour-forward, large swatch tiles, minimal type', [318, .68, 310, .09, .057], ['sans', 'sans', 14, 32, 1.55, 500, 0], [7, 8, 1, 48], 'soft', 260, 'light'),
    r('Layer Panel', 'nested indentation, drag affordances, compact controls', [222, .39, 226, .10, .079], ['sans', 'sans', 12, 28, 1.45, 600, .005], [3, 2, 1, 28], 'flat', 130, 'dark'),
    r('Vector Precision', 'hairline everything, zero radius, exact numeric inputs', [186, .51, 200, .08, .064], ['mono', 'sans', 13, 32, 1.5, 500, 0], [4, 0, .5, 32], 'flat', 100, 'light'),
    r('Palette Vivid', 'saturated multi-accent, playful chips', [303, .82, 289, .20, .060], ['sans', 'sans', 16, 48, 1.6, 750, -.025], [5, 10, 1.5, 44], 'hard', 320, 'light'),
    r('Grid Draft', 'visible baseline grid, measurement annotations', [199, .48, 205, .22, .050], ['mono', 'mono', 13, 36, 1.6, 600, .02], [4, 0, 1, 36], 'flat', 140, 'light'),
    r('Type Specimen', 'oversized display type, minimal colour, spec-sheet layout', [17, .20, 35, .04, .075], ['sans', 'serif', 16, 80, 1.65, 500, -.035], [6, 0, 1, 44], 'flat', 240, 'light'),
  ]],
  ['Fintech and data', [
    r('Ledger Precision', 'tabular figures, right-aligned numerics, hairline rules', [207, .38, 219, .09, .060], ['mono', 'sans', 13, 32, 1.5, 600, 0], [3.5, 1, .75, 32], 'flat', 120, 'light'),
    r('Dense Data', 'compact rows, small type, maximum density, muted chrome', [221, .24, 222, .05, .074], ['sans', 'mono', 12, 26, 1.35, 600, 0], [2, 1, 1, 24], 'flat', 90, 'light'),
    r('Trading Dark', 'black canvas, red and green semantics, monospace numerics', [156, .64, 160, .06, .008], ['mono', 'mono', 13, 32, 1.4, 650, .005], [3, 1, 1, 30], 'flat', 80, 'dark'),
    r('Statement Serif', 'serif headings on white, formal document rhythm', [216, .40, 42, .11, .069], ['sans', 'serif', 16, 44, 1.7, 600, -.01], [6, 1, 1, 44], 'flat', 240, 'light'),
    r('Vault Navy', 'deep navy, gold accent, conservative elevation', [46, .64, 228, .39, .026], ['sans', 'serif', 15, 42, 1.65, 600, .018], [5, 3, 1, 44], 'soft', 300, 'dark'),
    r('Chart Muted', 'desaturated categorical palette designed for many series', [188, .28, 195, .12, .070], ['sans', 'sans', 14, 34, 1.55, 550, 0], [4.5, 4, 1, 38], 'flat', 200, 'light'),
    r('Compliance Neutral', 'accessible by default, no decoration, high contrast', [213, .30, 220, .03, .038], ['sans', 'sans', 16, 36, 1.7, 700, 0], [5, 0, 2, 48], 'flat', 120, 'light'),
    r('Yield Emerald', 'white canvas, single emerald accent, generous card padding', [158, .60, 152, .13, .059], ['sans', 'sans', 16, 44, 1.65, 600, -.02], [7, 7, 1, 48], 'soft', 280, 'light'),
  ]],
  ['Commerce and retail', [
    r('Product Bright', 'large imagery, white canvas, bold price typography', [20, .69, 38, .07, .067], ['sans', 'sans', 16, 56, 1.6, 800, -.025], [6, 5, 1, 48], 'soft', 240, 'light'),
    r('Marketplace Warm', 'warm neutrals, card grid, review and rating components', [33, .62, 40, .29, .072], ['sans', 'sans', 15, 40, 1.65, 650, -.01], [5, 7, 1, 44], 'soft', 260, 'light'),
    r('Checkout Clean', 'single-column focus, step indicator, minimal distraction', [169, .51, 174, .08, .077], ['sans', 'sans', 16, 38, 1.7, 600, -.012], [6, 4, 1, 48], 'flat', 200, 'light'),
    r('Catalog Grid', 'tight image grid, hover reveal, filter rail', [211, .46, 225, .09, .070], ['sans', 'sans', 13, 34, 1.45, 650, -.005], [3.5, 3, 1, 34], 'lift', 180, 'light'),
    r('Boutique Serif', 'luxury retail, serif display, wide margins', [334, .29, 24, .22, .063], ['sans', 'serif', 16, 58, 1.75, 500, .012], [8, 1, .75, 48], 'flat', 400, 'light'),
    r('Flash Vivid', 'high-saturation promotional accents, countdown components', [341, .84, 345, .13, .045], ['sans', 'sans', 16, 60, 1.5, 850, -.03], [5, 6, 2, 48], 'hard', 160, 'light'),
    r('Cart Compact', 'dense line items, sticky summary, tight controls', [177, .39, 186, .09, .076], ['sans', 'sans', 13, 30, 1.45, 650, 0], [3, 3, 1, 32], 'soft', 140, 'light'),
  ]],
  ['Editorial and media', [
    r('Broadsheet Ink', 'paper white, serif body, ink-blue links, high density', [218, .58, 46, .12, .051], ['serif', 'serif', 16, 46, 1.65, 700, -.018], [4, 0, 1, 36], 'flat', 180, 'light'),
    r('Magazine Contrast', 'full-bleed imagery, oversized display, strong black', [348, .68, 355, .035, .017], ['sans', 'sans', 17, 76, 1.6, 850, -.04], [7, 0, 2, 48], 'flat', 320, 'light'),
    r('Longform Serif', 'reading-first, wide measure, drop caps, quiet chrome', [26, .34, 43, .23, .070], ['serif', 'serif', 19, 52, 1.85, 500, -.008], [8, 2, .75, 48], 'flat', 300, 'light'),
    r('Feed Compact', 'infinite-scroll rhythm, small thumbnails, timestamp emphasis', [203, .47, 210, .10, .078], ['sans', 'sans', 13, 32, 1.5, 650, 0], [3.5, 4, 1, 34], 'flat', 160, 'light'),
    r('Ink Blue', 'near-black text, single deep blue accent, print restraint', [223, .65, 220, .08, .031], ['sans', 'serif', 16, 42, 1.7, 600, -.015], [5, 0, 1, 42], 'flat', 220, 'light'),
    r('Masthead Bold', 'heavy uppercase display, rule-separated sections', [14, .61, 30, .10, .033], ['sans', 'sans', 16, 68, 1.55, 900, .025], [6, 0, 3, 44], 'flat', 180, 'light'),
    r('Column Rule', 'multi-column layout, vertical rules, justified rhythm', [192, .32, 50, .12, .065], ['serif', 'serif', 16, 40, 1.75, 650, -.005], [4.5, 0, 1.5, 40], 'flat', 200, 'light'),
    r('Byline Quiet', 'author-forward, small caps metadata, minimal colour', [285, .21, 35, .16, .081], ['serif', 'sans', 16, 36, 1.8, 500, .025], [6, 2, .5, 44], 'flat', 280, 'light'),
  ]],
  ['Luxury and automotive', [
    r('Cinema Black', 'true black, monumental display, extreme sparseness', [35, .38, 0, 0, 0], ['sans', 'sans', 18, 88, 1.75, 500, -.035], [10, 0, 1, 56], 'flat', 480, 'dark'),
    r('Chiaroscuro', 'black and white editorial with one saturated accent', [354, .80, 0, 0, .019], ['sans', 'serif', 17, 72, 1.7, 650, -.025], [8, 0, 1.5, 52], 'flat', 380, 'dark'),
    r('Monolith Gold', 'dark cathedral surfaces, gold accent, wide letter spacing', [48, .57, 44, .15, .021], ['sans', 'serif', 16, 64, 1.75, 500, .065], [9, 1, 1, 52], 'soft', 440, 'dark'),
    r('Chrome Precision', 'dark premium surfaces, engineered spacing, metallic hairlines', [204, .22, 217, .12, .038], ['sans', 'sans', 14, 48, 1.6, 550, .035], [6, 1, .75, 44], 'soft', 280, 'dark'),
    r('Aurora Vivid', 'vivid multi-stop gradients, zero-radius controls', [276, .87, 255, .24, .023], ['sans', 'sans', 16, 72, 1.6, 750, -.03], [7, 0, 1, 48], 'lift', 360, 'dark'),
    r('Radical Subtraction', 'near-empty layouts, full-viewport imagery, minimal chrome', [18, .18, 26, .04, .009], ['sans', 'sans', 18, 84, 1.8, 400, -.035], [12, 0, .5, 56], 'flat', 520, 'light'),
    r('Showroom Light', 'bright white, large product imagery, thin type', [197, .31, 206, .05, .086], ['sans', 'sans', 18, 72, 1.8, 300, -.02], [9, 2, .75, 52], 'soft', 400, 'light'),
  ]],
  ['Enterprise and institutional', [
    r('Muted Enterprise', 'conservative corporate neutral, accessible defaults', [217, .38, 218, .10, .069], ['sans', 'sans', 15, 36, 1.6, 600, -.01], [4.5, 4, 1, 40], 'soft', 200, 'light'),
    r('Government Neutral', 'plain, high-legibility, zero decoration', [213, .43, 210, .035, .045], ['sans', 'sans', 18, 40, 1.75, 700, 0], [6, 0, 2, 48], 'flat', 120, 'light'),
    r('Health Calm', 'soft cool palette, generous spacing, gentle elevation', [181, .34, 187, .19, .078], ['sans', 'sans', 17, 42, 1.75, 550, -.012], [7, 8, 1, 52], 'soft', 320, 'light'),
    r('Telecom Bold', 'monumental uppercase display, saturated chapter bands', [326, .75, 318, .12, .029], ['sans', 'sans', 16, 76, 1.55, 850, .02], [6, 2, 2, 48], 'hard', 240, 'light'),
    r('Print Grid', 'Swiss discipline, strong baseline grid, black on white', [8, .64, 0, 0, .030], ['sans', 'sans', 16, 60, 1.5, 750, -.02], [4, 0, 2, 40], 'flat', 140, 'light'),
    r('Accessible Default', 'WCAG AAA contrast throughout, largest targets', [211, .57, 215, .025, .011], ['sans', 'sans', 18, 48, 1.8, 750, 0], [8, 5, 2, 64], 'flat', 100, 'light'),
    r('High Contrast Max', 'forced-colors-ready, maximum contrast, no reliance on colour alone', [57, .64, 0, 0, 0], ['sans', 'sans', 18, 44, 1.8, 800, .01], [7, 0, 3, 60], 'flat', 0, 'dark'),
  ]],
];

function hex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
}
function hsl(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360 / 30;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const k = (offset + h) % 12;
    return (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return hex(channel(0), channel(8), channel(4));
}

/** Correct along the authored color's tint/shade path, stopping at the first
 * quantized sRGB value that satisfies every surface. Never return a failed color.
 */
function readable(candidate: string, backgrounds: readonly string[], minimum: number, light: boolean): string {
  const channels = [1, 3, 5].map(index => parseInt(candidate.slice(index, index + 2), 16));
  const destination = light ? 0 : 255;
  for (let step = 0; step <= 1000; step++) {
    const mixed = channels.map(channel => channel + (destination - channel) * step / 1000) as [number, number, number];
    const adjusted = hex(...mixed);
    if (backgrounds.every(background => contrastRatio(adjusted, background) >= minimum)) return adjusted;
  }
  throw new Error('Authored recipe has no accessible color along its correction path');
}

function compile(recipe: Recipe, theme: ThemeMode): TokenSet {
  const light = theme === 'light';
  const [hue, chroma, neutralHue, neutralChroma, night] = recipe.palette;
  const [bodyFont, displayFont, body, display, leading, headingWeight, tracking] = recipe.typography;
  const [unit, radius, borderWidth, controlHeight] = recipe.rhythm;
  const monochrome = chroma === 0;
  const aaa = recipe.name === 'Accessible Default' || recipe.name === 'High Contrast Max';
  const maxContrast = recipe.name === 'High Contrast Max';
  const minimum = aaa ? 7.05 : 4.55; // Margin is applied before 8-bit measurement, never rounding a failure.
  const neutral = (l: number) => hsl(neutralHue, neutralChroma, l);
  const canvas = maxContrast ? (light ? '#ffffff' : '#000000') : neutral(light ? .982 : night);
  const surface = neutral(light ? .994 : night + .018);
  const raised = neutral(light ? .998 : night + .035);
  const muted = neutral(light ? .943 : night + .050);
  const backgrounds = [canvas, surface, raised, muted];
  const ink = (candidate: string, threshold = minimum) => readable(candidate, backgrounds, threshold, light);
  const accent = ink(hsl(hue, chroma, light ? .46 : .68));
  const accentHover = ink(hsl(hue + (monochrome ? 0 : 3), chroma, light ? .39 : .76));
  const statusChroma = monochrome ? 0 : Math.min(.66, chroma * .65 + .16);
  const semantic = (semanticHue: number) => ink(hsl(semanticHue, statusChroma, light ? .37 : .72));
  const color: TokenSet['color'] = {
    canvas, surface, raised, muted,
    text: ink(maxContrast ? (light ? '#000000' : '#ffffff') : neutral(light ? .13 : .94)),
    textMuted: ink(neutral(light ? .37 : .72)),
    border: ink(neutral(light ? .44 : .58), 3.05),
    borderMuted: ink(neutral(light ? .54 : .46), 3.05),
    accent, accentHover,
    onAccent: readable(neutral(light ? .997 : .035), [accent, accentHover], minimum, !light),
    focus: ink(hsl(hue, chroma, light ? .37 : .81), 3.05),
    success: semantic(148 + neutralChroma * 30), warning: semantic(40 + neutralChroma * 20), danger: semantic(351 + neutralChroma * 15),
    info: semantic(recipe.name === 'Neon Slate' || recipe.name === 'Palette Vivid' ? hue + 100 : 211 + neutralChroma * 35),
  };
  const shadowColor = `${neutral(.10)}${light ? '24' : '80'}`;
  const shadowAt = (scale: number): string => {
    if (recipe.depth === 'flat') return 'none';
    const hard = recipe.depth === 'hard';
    const y = unit * scale;
    return `${hard ? y : 0}px ${y}px ${hard ? 0 : y * (recipe.depth === 'soft' ? 3 : 2)}px 0px ${shadowColor}`;
  };
  const duration = (scale: number) => Math.round(recipe.tempo * scale);
  const tokens: TokenSet = {
    color,
    font: { body: bodyFont, display: displayFont, mono: 'mono' },
    type: {
      caption: Math.max(11, body - 3), body, label: Math.max(12, body - 1), heading: Math.round(display * .62), display,
      lineHeight: leading, headingLineHeight: displayFont === 'serif' ? 1.2 : display >= 60 ? 1.05 : 1.15,
      weight: 400, headingWeight, tracking,
    },
    space: { xs: unit, sm: unit * 2, md: unit * 4, lg: unit * 6, xl: unit * 8, xxl: unit * 12 },
    shape: { radiusSmall: radius, radiusMedium: radius * 2, radiusLarge: radius * 3, borderWidth, controlHeight },
    elevation: { small: shadowAt(.5), medium: shadowAt(1), large: shadowAt(2) },
    motion: {
      instant: duration(1 / 3), rapid: duration(.5), fast: duration(2 / 3), standard: duration(1), slow: duration(1.5), expressive: duration(2.2),
      easingStandard: recipe.depth === 'hard' ? [.3, 0, .1, 1] : [.2, 0, 0, 1],
      easingAccelerate: [.4, 0, 1, 1], easingDecelerate: [0, 0, .2, 1],
      easingEmphasized: recipe.depth === 'hard' ? [.2, 0, .1, 1.25] : [.2, 0, 0, 1],
    },
  };
  const validated = validateTokens(tokens);
  const failure = auditTokens(validated, aaa ? 7 : 4.5).find(check => !check.pass);
  if (failure) throw new Error(`${recipe.name}/${theme}: ${failure.foreground}/${failure.background} contrast ${failure.ratio}`);
  return validated;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Stable ordering, kebab-case IDs and immutable originals; validateTokens returns
 * editable copies for consumers. Each mode is independently compiled and audited.
 */
export const tokenPresets: readonly TokenPreset[] = freeze(families.flatMap(([family, recipes]) => recipes.map(recipe => ({
  id: recipe.name.toLowerCase().replace(/ /g, '-'), name: recipe.name, family, description: recipe.description,
  density: recipe.rhythm[3] <= 36 ? 'compact' as const : recipe.rhythm[3] >= 48 ? 'spacious' as const : 'comfortable' as const,
  preferredTheme: recipe.preferredTheme,
  themes: { light: compile(recipe, 'light'), dark: compile(recipe, 'dark') },
}))));
