import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { tokenPresets } from './token-catalog';
import { auditTokens, tokenCss, tokenJson, tokenVariables, type ThemeMode } from './tokens';
import { themedPreset } from './presets';
import { download } from './download';
import type { DesignPreset, Widget } from './types';

const label = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

export function TokenStudio({ selected, onApply, onClose }: {
  selected?: Widget | undefined; onApply: (preset: DesignPreset) => void; onClose: () => void;
}) {
  const initial = tokenPresets.find(preset => preset.id === selected?.presetId) ?? tokenPresets.find(preset => preset.id === 'muted-enterprise')!;
  const [presetId, setPresetId] = useState(initial.id);
  const [theme, setTheme] = useState<ThemeMode>(initial.preferredTheme);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('All families');
  const [notice, setNotice] = useState('');
  const [replay, setReplay] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const preset = tokenPresets.find(item => item.id === presetId)!;
  const tokens = preset.themes[theme];
  const families = [...new Set(tokenPresets.map(item => item.family))];
  const filtered = tokenPresets.filter(item => (family === 'All families' || item.family === family) &&
    query.toLowerCase().trim().split(/\s+/).every(word => `${item.name} ${item.family} ${item.description}`.toLowerCase().includes(word)));
  const audit = useMemo(() => auditTokens(tokens, ['accessible-default', 'high-contrast-max'].includes(preset.id) ? 7 : 4.5), [tokens, preset.id]);
  const failed = audit.filter(item => !item.pass);
  const applyGuidance = !selected
    ? 'No widget is selected. Close Token Studio, select an unlocked widget on the canvas, then reopen to apply a style.'
    : selected.locked
      ? 'This widget is locked. Close Token Studio, unlock it, then reopen to apply a style.'
      : failed.length
        ? 'Choose a style and theme that pass the measured contrast checks before applying.'
        : 'Replaces base styling; keeps image/logo and text overrides.';
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    searchRef.current?.focus();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected && previous.getClientRects().length) previous.focus();
      else document.querySelector<HTMLElement>('.studio-mobile-tabs [aria-pressed="true"]')?.focus();
    };
  }, []);
  async function copyCss() {
    try { await navigator.clipboard.writeText(tokenCss(tokens)); setNotice('Theme CSS copied. Apply the nimbus-theme class to its container.'); }
    catch { setNotice('Clipboard unavailable. Use Download CSS instead.'); }
  }
  return (
    <dialog ref={dialogRef} className="token-studio" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input, select, summary, [tabindex="0"]')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="token-studio-header">
        <div><span className="token-eyebrow">NIMBUS / FOUNDATIONS</span><h1 id={`${id}-title`}>Token Studio</h1><p>75 original styles. Two themes. Every value visible.</p></div>
        <button className="studio-btn" onClick={onClose} aria-label="Close Token Studio">Close <span aria-hidden="true">×</span></button>
      </header>
      <div className="token-studio-workspace">
        <aside className="token-browser" aria-label="Find a style">
          <label>Search styles<input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try editorial, dense, serif…" /></label>
          <label>Style family<select value={family} onChange={event => setFamily(event.target.value)}><option>All families</option>{families.map(name => <option key={name}>{name}</option>)}</select></label>
          <p className="token-count">{filtered.length} of {tokenPresets.length} styles</p>
          <div ref={listRef} className="token-preset-options" role="listbox" aria-label="Style presets" onKeyDown={event => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !filtered.length) return;
            event.preventDefault();
            const index = Math.max(0, filtered.findIndex(item => item.id === presetId));
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : filtered.length - 1)) % filtered.length;
            const item = filtered[next]!; setPresetId(item.id);
            listRef.current?.querySelector<HTMLElement>(`[data-preset-option="${item.id}"]`)?.focus();
          }}>
            {filtered.map((item, index) => <button key={item.id} role="option" aria-selected={item.id === presetId} data-preset-option={item.id}
              tabIndex={item.id === presetId || (index === 0 && !filtered.some(candidate => candidate.id === presetId)) ? 0 : -1}
              onClick={() => setPresetId(item.id)} onFocus={() => setPresetId(item.id)}>
              <span className="token-preset-dot" style={{ background: item.themes[theme].color.accent }} aria-hidden="true" />
              <span><strong>{item.name}</strong><small>{item.family}</small></span>
              {item.id === presetId && <span aria-hidden="true">✓</span>}
            </button>)}
          </div>
          {!filtered.length && <p>No matching styles. Try a broader search or another family.</p>}
        </aside>
        <main className="token-detail">
          <div className="token-detail-heading"><div><span className="token-eyebrow">{preset.family} / {preset.density}</span><h2>{preset.name}</h2><p>{preset.description}</p></div>
            <fieldset className="token-mode"><legend>Theme</legend>{(['light', 'dark'] as const).map(mode => <label key={mode}><input type="radio" name={`${id}-theme`} checked={theme === mode} onChange={() => setTheme(mode)} />{label(mode)}</label>)}</fieldset>
          </div>
          <article className="token-sheet nimbus-theme" data-token-preset={preset.id} data-theme={theme} style={tokenVariables(tokens) as CSSProperties} aria-label={`${preset.name} ${theme} swatch sheet`}>
            <section className="token-specimen-hero"><div><span className="token-specimen-label">DESIGN LANGUAGE / {theme.toUpperCase()}</span><h3>Make room<br />for better work.</h3><p>A considered foundation for the interface you want to build.</p></div><div className="token-specimen-metric"><span>Weekly active teams</span><strong>12,840</strong><small>+18.6% this month</small></div></section>
            <section aria-label="Surface and controls" className="token-sample-row"><div className="token-sample-card"><h4>Project overview</h4><p>Everything your team needs, with space to focus.</p><button className="token-sample-button" onClick={() => setNotice(`${preset.name} ${theme}: primary action specimen activated.`)}>Create project <span aria-hidden="true">↗</span></button></div><div className="token-sample-card is-raised"><h4>Clear, useful hierarchy</h4><p className="token-sample-muted">Secondary text stays readable on every supported surface.</p><label>Workspace name<input defaultValue="Northstar Studio" aria-label="Workspace name specimen" /></label></div></section>
            <section><h4>Semantic palette</h4><div className="token-color-grid">{Object.entries(tokens.color).map(([key, value]) => <div className="token-color-item" key={key}><span style={{ background: `var(--nimbus-color-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)})` }} aria-hidden="true" /><strong>{label(key)}</strong><code>{value}</code></div>)}</div></section>
            <section><h4>Type & rhythm</h4><div className="token-type-sample"><strong>Design that speaks clearly.</strong><p>Readable body copy. Predictable spacing. Deliberate emphasis.</p><small>Metadata and captions / 0123456789</small></div><div className="token-space-grid">{Object.entries(tokens.space).map(([key, value]) => <div key={key}><span style={{ width: `var(--nimbus-space-${key})` }} /><code>{key} · {value}px</code></div>)}</div></section>
            <section><h4>Shape & elevation</h4><div className="token-elevation-grid">{(['small', 'medium', 'large'] as const).map(size => <div key={size} style={{ borderRadius: `var(--nimbus-shape-radius-${size})`, boxShadow: `var(--nimbus-elevation-${size})` }}><strong>{label(size)}</strong><span>{tokens.shape[`radius${label(size)}` as 'radiusSmall' | 'radiusMedium' | 'radiusLarge']}px radius</span></div>)}</div></section>
            <section><h4>Motion character</h4><p className="token-sample-muted">A token-timed entrance specimen. Full per-widget animation authoring arrives in the motion milestone.</p><div className="token-motion-row"><span key={`${preset.id}-${theme}-${replay}`} className="token-motion-mark" aria-hidden="true">N</span><div><strong>{tokens.motion.standard}ms standard</strong><code>cubic-bezier({tokens.motion.easingStandard.join(', ')})</code></div><button className="token-sample-button" onClick={() => setReplay(value => value + 1)}>Replay specimen</button></div></section>
          </article>
          <details className="token-audit"><summary>{failed.length ? `${failed.length} contrast checks need attention` : `${audit.length} semantic contrast checks pass`} <span>View measured ratios</span></summary><p>Token pair checks cover supported solid surfaces. User overrides, images, gradients and final component states still require their own checks.</p><table><caption>Unrounded ratios determine pass/fail; displayed values are rounded for readability.</caption><thead><tr><th>Foreground</th><th>Background</th><th>Ratio</th><th>Minimum</th><th>Result</th></tr></thead><tbody>{audit.map((item, index) => <tr key={index}><td>{item.foreground}</td><td>{item.background}</td><td>{item.ratio.toFixed(2)}:1</td><td>{item.minimum}:1</td><td>{item.pass ? 'Pass' : 'Needs attention'}</td></tr>)}</tbody></table></details>
        </main>
      </div>
      <footer className="token-studio-footer"><div><strong>{selected ? `Apply to ${selected.name}` : 'Explore freely'}</strong><p id={`${id}-apply-guidance`} className="token-apply-guidance">{applyGuidance}</p><span role="status">{notice}</span></div><div className="token-export-actions"><button className="studio-btn" onClick={copyCss}>Copy CSS</button><button className="studio-btn" onClick={() => download(tokenCss(tokens), `${preset.id}-${theme}.css`, 'text/css')}>Download CSS</button><button className="studio-btn" onClick={() => download(tokenJson(preset, theme), `${preset.id}-${theme}.tokens.json`, 'application/json')}>Download tokens</button><button className="studio-btn is-primary" aria-describedby={`${id}-apply-guidance`} disabled={!selected || selected.locked || !!failed.length} onClick={() => { onApply(themedPreset(preset.id, theme)); setNotice(`${preset.name} ${theme} applied. Canvas changes can be undone.`); }}>Apply {label(theme)} Style</button></div></footer>
    </dialog>
  );
}
