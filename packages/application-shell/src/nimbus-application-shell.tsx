"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export interface NimbusApplicationShellProps {
  readonly journeyCount: number;
  readonly runtime: "Vite" | "Next.js";
}

type IconName = "activity" | "agent" | "arrow" | "bell" | "blocks" | "check" | "chevron" | "code" | "copy" | "frame" | "menu" | "message" | "plus" | "search" | "send" | "settings" | "spark" | "tokens";

const iconPaths: Record<IconName, ReactNode> = {
  activity: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  agent: <><rect x="5" y="5" width="14" height="14" rx="4" /><path d="M9 9h.01M15 9h.01M9 15h6M12 2v3" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  blocks: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  code: <path d="m8 9-4 3 4 3m8-6 4 3-4 3m-3-9-2 12" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  frame: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><rect x="8" y="8" width="8" height="8" rx="2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  send: <path d="m4 12 16-8-6 16-2-6zM12 14l8-10" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 15.2a1.8 1.8 0 0 0 .4 2l-2.2 2.2a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.2 1.7V21h-4v-.3A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-2.2-2.2a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3.3 14H3v-4h.3A1.8 1.8 0 0 0 5 8.8a1.8 1.8 0 0 0-.4-2l2.2-2.2a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3.3V3h4v.3A1.8 1.8 0 0 0 15.2 5a1.8 1.8 0 0 0 2-.4l2.2 2.2a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.2h.3v4h-.3a1.8 1.8 0 0 0-1.7 1.2Z" /></>,
  spark: <path d="m12 3 1.4 4.1 4.1 1.4-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />,
  tokens: <><circle cx="8" cy="8" r="4" /><circle cx="16" cy="16" r="4" /><path d="M12 8h5a3 3 0 0 1 3 3v1M12 16H7a3 3 0 0 1-3-3v-1" /></>,
};

function Icon({ name, size = 18 }: { readonly name: IconName; readonly size?: number }) {
  return <svg aria-hidden="true" className="nimbus-icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>{iconPaths[name]}</svg>;
}

const palettes = {
  blue: { accent: "#3157d5", soft: "#eef2ff", label: "Blue" },
  indigo: { accent: "#5746af", soft: "#f1effb", label: "Indigo" },
  teal: { accent: "#08777f", soft: "#e7f5f4", label: "Teal" },
} as const;

type EditableComponent = "action" | "agent-card" | "prompt-field";
type CanvasBackground = "white" | "soft" | "slate" | "ink";
type Variant = "solid" | "outline" | "quiet";

const componentCatalog: ReadonlyArray<{ id: EditableComponent; name: string; description: string; icon: IconName }> = [
  { id: "action", name: "Button", description: "Actions and commands", icon: "arrow" },
  { id: "agent-card", name: "Agent card", description: "Agent identity and health", icon: "agent" },
  { id: "prompt-field", name: "Prompt field", description: "Agent instructions", icon: "message" },
];

function componentCode(component: EditableComponent, variant: Variant, radius: number, label: string) {
  const safeLabel = JSON.stringify(label);
  if (component === "agent-card") return `import { AgentCard } from "@nimbus-ui-studio/agent-ui";\n\n<AgentCard\n  name=${safeLabel}\n  status="available"\n  tools={12}\n  variant="${variant}"\n  radius={${radius}}\n/>`;
  if (component === "prompt-field") return `import { PromptField } from "@nimbus-ui-studio/agent-ui";\n\n<PromptField\n  label="Prompt instruction"\n  defaultValue=${safeLabel}\n  variant="${variant}"\n  radius={${radius}}\n  onSubmit={handleSubmit}\n/>`;
  return `import { Button } from "@nimbus-ui-studio/primitives";\n\n<Button\n  variant="${variant}"\n  radius={${radius}}\n  trailingIcon="arrow-right"\n>\n  ${label}\n</Button>`;
}

function ComponentPreview({ component, label, variant }: { readonly component: EditableComponent; readonly label: string; readonly variant: Variant }) {
  if (component === "agent-card") return <article className={`nimbus-preview-card is-${variant}`}><div className="nimbus-agent-avatar"><Icon name="agent" size={20} /></div><div><small>RESEARCH OPERATIONS</small><h3>{label}</h3><p><span /> Available · 12 tools connected</p></div><button aria-label="Open agent details" type="button"><Icon name="chevron" size={16} /></button></article>;
  if (component === "prompt-field") return <div className={`nimbus-preview-field is-${variant}`}><label htmlFor="preview-prompt">Prompt instruction</label><div><input defaultValue={label} id="preview-prompt" /><button aria-label="Send prompt" type="button"><Icon name="send" size={16} /></button></div><footer><span>Use / for commands</span><span>2,048 tokens</span></footer></div>;
  return <button className={`nimbus-preview-action is-${variant}`} type="button"><span>{label}</span><Icon name="arrow" size={16} /></button>;
}

function ComponentLab({ accent }: { readonly accent: string }) {
  const [component, setComponent] = useState<EditableComponent>("action");
  const [background, setBackground] = useState<CanvasBackground>("soft");
  const [label, setLabel] = useState("Launch agent run");
  const [variant, setVariant] = useState<Variant>("solid");
  const [componentRadius, setComponentRadius] = useState(10);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const code = componentCode(component, variant, componentRadius, label);
  const previewStyle = { "--component-radius": `${componentRadius}px`, "--component-accent": accent } as CSSProperties;

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch { setCopyState("error"); }
  }

  return <section className="nimbus-studio" aria-labelledby="studio-title">
    <div className="nimbus-inventory">
      <div className="nimbus-section-title"><div><p>Library</p><h2 id="studio-title">Component inventory</h2></div><span>3</span></div>
      <label className="nimbus-library-search"><Icon name="search" size={15} /><span className="nimbus-sr-only">Filter components</span><input placeholder="Filter components" /></label>
      <div className="nimbus-component-group"><p>Agent foundations</p>{componentCatalog.map((item) => <button aria-pressed={component === item.id} className={component === item.id ? "is-selected" : ""} key={item.id} onClick={() => { setComponent(item.id); setCopyState("idle"); }} type="button"><span className="nimbus-item-icon"><Icon name={item.icon} size={16} /></span><span><b>{item.name}</b><small>{item.description}</small></span><Icon name="chevron" size={14} /></button>)}</div>
      <button className="nimbus-library-more" type="button"><Icon name="plus" size={15} /> Request a component</button>
    </div>

    <div className="nimbus-workspace">
      <div className="nimbus-canvas-bar"><div><span className="nimbus-live-dot" />Live preview</div><div><button aria-label="Fit preview to frame" type="button"><Icon name="frame" size={15} /></button><span>100%</span><span>Desktop · 1280</span></div></div>
      <div className={`nimbus-canvas is-${background}`} style={previewStyle}><div className="nimbus-preview-enter" key={`${component}-${background}-${variant}`}><ComponentPreview component={component} label={label} variant={variant} /></div></div>
      <div className="nimbus-code-panel"><div className="nimbus-code-head"><div><Icon name="code" size={16} /><div><p>Code output</p><span>React · TypeScript</span></div></div><button className={copyState === "copied" ? "is-copied" : ""} onClick={() => void copyCode()} type="button"><Icon name={copyState === "copied" ? "check" : "copy"} size={15} />{copyState === "copied" ? "Copied" : copyState === "error" ? "Retry copy" : "Copy code"}</button></div><pre><code>{code}</code></pre><span className="nimbus-sr-only" aria-live="polite">{copyState === "copied" ? "Component code copied to clipboard" : copyState === "error" ? "Could not copy component code" : ""}</span></div>
    </div>

    <form className="nimbus-inspector" onSubmit={(event) => event.preventDefault()}>
      <div className="nimbus-section-title"><div><p>Properties</p><h2>Component inspector</h2></div><button aria-label="Inspector settings" type="button"><Icon name="settings" size={16} /></button></div>
      <div className="nimbus-inspector-section"><h3>Content</h3><label className="nimbus-field"><span>Label</span><input maxLength={42} onChange={(event) => setLabel(event.target.value)} value={label} /></label></div>
      <div className="nimbus-inspector-section"><h3>Appearance</h3><fieldset><legend>Variant</legend><div className="nimbus-segmented">{(["solid", "outline", "quiet"] as const).map((item) => <button aria-pressed={variant === item} key={item} onClick={() => setVariant(item)} type="button">{item}</button>)}</div></fieldset><label className="nimbus-range"><span>Corner radius <output>{componentRadius}px</output></span><input max="20" min="0" onChange={(event) => setComponentRadius(Number(event.target.value))} type="range" value={componentRadius} /></label></div>
      <div className="nimbus-inspector-section"><h3>Canvas</h3><fieldset><legend>Background</legend><div className="nimbus-background-options">{([{ id: "white", label: "White", color: "#ffffff" }, { id: "soft", label: "Soft gray", color: "#f2f4f7" }, { id: "slate", label: "Slate", color: "#dfe4ea" }, { id: "ink", label: "Ink", color: "#17191d" }] as const).map((item) => <button aria-label={`${item.label} background`} aria-pressed={background === item.id} key={item.id} onClick={() => setBackground(item.id)} title={item.label} type="button"><i style={{ background: item.color }} /><span>{item.label}</span></button>)}</div></fieldset></div>
      <div className="nimbus-inspector-footer"><div><span>Accessibility</span><b><Icon name="check" size={13} /> AA passed</b></div><div><span>Package</span><code>@nimbus-ui-studio</code></div></div>
    </form>
  </section>;
}

const navItems: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: "Studio", icon: "frame" }, { label: "Components", icon: "blocks" }, { label: "Patterns", icon: "spark" }, { label: "Design tokens", icon: "tokens" }, { label: "Agent UI", icon: "agent" }, { label: "Accessibility", icon: "check" },
];

function AgentPattern() {
  return <section className="nimbus-pattern-card" aria-labelledby="agent-pattern-title"><header><div><span className="nimbus-pattern-icon"><Icon name="message" size={18} /></span><div><p>Application pattern</p><h2 id="agent-pattern-title">Agent conversation</h2></div></div><span className="nimbus-status-badge"><i /> Running</span></header><div className="nimbus-chat"><div className="nimbus-user-message"><p>Prepare a board-ready market brief with cited evidence.</p><time>09:42</time></div><div className="nimbus-agent-message"><div className="nimbus-agent-line"><span><Icon name="agent" size={15} /></span><b>Research orchestrator</b><small>Now</small></div><div className="nimbus-thinking"><div className="nimbus-activity-mark"><i /><i /><i /></div><div><b>Reviewing evidence</b><p>Comparing adoption signals and governance maturity.</p></div></div><ol><li className="is-complete"><i><Icon name="check" size={12} /></i><span>Scope confirmed</span><small>0.4s</small></li><li className="is-complete"><i><Icon name="check" size={12} /></i><span>Sources retrieved</span><small>12 records</small></li><li className="is-active"><i /><span>Synthesizing brief</span><small>In progress</small></li></ol></div></div><footer><button aria-label="Attach a file" type="button"><Icon name="plus" size={16} /></button><span>Ask a follow-up or use / for commands</span><button aria-label="Send message" type="button"><Icon name="send" size={16} /></button></footer></section>;
}

function RunPattern() {
  const runs = [{ name: "Market intelligence brief", id: "NR-2841", agent: "Orchestrator", status: "Running", cost: "$1.42" }, { name: "Feedback synthesis", id: "NR-2840", agent: "Analyst", status: "Complete", cost: "$2.17" }, { name: "Access review", id: "NR-2839", agent: "Policy", status: "Approval", cost: "$0.38" }];
  return <section className="nimbus-pattern-card" aria-labelledby="run-pattern-title"><header><div><span className="nimbus-pattern-icon"><Icon name="activity" size={18} /></span><div><p>Operational pattern</p><h2 id="run-pattern-title">Run activity</h2></div></div><button className="nimbus-text-button" type="button">View all <Icon name="arrow" size={14} /></button></header><div className="nimbus-run-table"><div className="nimbus-table-head"><span>Run</span><span>Agent</span><span>Status</span><span>Cost</span></div>{runs.map((run) => <button className="nimbus-table-row" key={run.id} type="button"><span><b>{run.name}</b><small>{run.id}</small></span><span>{run.agent}</span><span><i className={`is-${run.status.toLowerCase()}`} />{run.status}</span><span>{run.cost}</span></button>)}</div><div className="nimbus-run-summary"><div><span>Success rate</span><strong>98.6%</strong><small>+2.1% this week</small></div><div><span>Median latency</span><strong>1.8s</strong><small>Within target</small></div><div><span>Monthly spend</span><strong>$842</strong><small>42% of budget</small></div></div></section>;
}

export function NimbusApplicationShell({ journeyCount, runtime }: NimbusApplicationShellProps) {
  const [paletteName, setPaletteName] = useState<keyof typeof palettes>("blue");
  const [motion, setMotion] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const palette = palettes[paletteName];
  const style = { "--nimbus-accent": palette.accent, "--nimbus-accent-soft": palette.soft } as CSSProperties;
  return <div className={`nimbus-root${motion ? "" : " nimbus-motion-off"}${mobileNavOpen ? " is-mobile-nav-open" : ""}`} style={style}>
    <a className="nimbus-skip" href="#nimbus-main">Skip to component studio</a>
    <aside className="nimbus-sidebar" aria-label="Primary navigation"><div className="nimbus-brand"><span className="nimbus-mark" aria-hidden="true"><i /><i /><i /><i /></span><span><b>Nimbus</b><small>UI Studio Lab</small></span><button aria-label="Close navigation" className="nimbus-sidebar-close" onClick={() => setMobileNavOpen(false)} type="button"><Icon name="menu" size={17} /></button></div><nav id="nimbus-primary-navigation">{navItems.map((item, index) => <button className={index === 0 ? "is-active" : ""} key={item.label} type="button"><Icon name={item.icon} size={17} /><span>{item.label}</span>{item.label === "Components" && <small>48</small>}</button>)}</nav><div className="nimbus-sidebar-bottom"><button type="button"><Icon name="settings" size={17} /><span>Settings</span></button><div><span className="nimbus-avatar">GS</span><span><b>Ganapathy</b><small>Workspace owner</small></span><Icon name="chevron" size={14} /></div></div></aside>
    <header className="nimbus-topbar"><div className="nimbus-topbar-left"><button aria-controls="nimbus-primary-navigation" aria-expanded={mobileNavOpen} aria-label="Toggle navigation" className="nimbus-mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} type="button"><Icon name="menu" /></button><div className="nimbus-breadcrumb"><span>Design system</span><Icon name="chevron" size={13} /><b>Studio</b></div></div><label className="nimbus-global-search"><Icon name="search" size={16} /><span className="nimbus-sr-only">Search Nimbus</span><input placeholder="Search components, tokens, and patterns" /><kbd>Ctrl K</kbd></label><div className="nimbus-top-actions"><span className="nimbus-runtime">{runtime}</span><button aria-label="Notifications" type="button"><Icon name="bell" size={17} /><i /></button><button aria-label="Open account menu" className="nimbus-top-avatar" type="button">GS</button></div></header>
    <main className="nimbus-main" id="nimbus-main"><section className="nimbus-page-head"><div><div className="nimbus-title-row"><h1>Component Studio</h1><span>Stable preview</span></div><p>Edit production-ready React components, validate their states, and copy the code.</p></div><div className="nimbus-page-actions"><div className="nimbus-palette-control" aria-label="Accent color">{(Object.keys(palettes) as Array<keyof typeof palettes>).map((name) => <button aria-label={`Use ${palettes[name].label} accent`} aria-pressed={paletteName === name} key={name} onClick={() => setPaletteName(name)} style={{ background: palettes[name].accent }} type="button" />)}</div><button aria-checked={motion} className="nimbus-motion-toggle" onClick={() => setMotion((value) => !value)} role="switch" type="button"><i /><span>Motion</span></button></div></section><ComponentLab accent={palette.accent} /><section className="nimbus-patterns-head"><div><p>Enterprise patterns</p><h2>Agentic application components</h2></div><span>{journeyCount} verified journeys</span></section><div className="nimbus-pattern-grid"><AgentPattern /><RunPattern /></div><footer className="nimbus-footer"><span>Nimbus UI Studio Lab · Apache-2.0</span><span>Keyboard accessible · WCAG 2.2 AA target</span></footer></main>
  </div>;
}
