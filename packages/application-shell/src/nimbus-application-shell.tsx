"use client";

import { useState, type CSSProperties } from "react";

export interface NimbusApplicationShellProps {
  readonly journeyCount: number;
  readonly runtime: "Vite" | "Next.js";
}

interface Palette {
  readonly accent: string;
  readonly accentRgb: string;
  readonly label: string;
  readonly secondary: string;
}

type NimbusStyle = CSSProperties & {
  "--nimbus-accent": string;
  "--nimbus-accent-rgb": string;
  "--nimbus-radius": string;
  "--nimbus-secondary": string;
};

const palettes = {
  aurora: {
    accent: "#62f6d2",
    secondary: "#7a8cff",
    accentRgb: "98, 246, 210",
    label: "Mint",
  },
  ember: {
    accent: "#ffb86b",
    secondary: "#ff6b8a",
    accentRgb: "255, 184, 107",
    label: "Amber",
  },
  cobalt: {
    accent: "#74a7ff",
    secondary: "#a881ff",
    accentRgb: "116, 167, 255",
    label: "Blue",
  },
} as const satisfies Record<string, Palette>;

const navigation = [
  "Command center",
  "Conversations",
  "Agents",
  "Workflows",
  "Knowledge",
  "Evaluations",
];
const runSteps = [
  { label: "Intent mapped", meta: "0.4s", state: "complete" },
  { label: "Sources retrieved", meta: "12 records", state: "complete" },
  { label: "Policy check", meta: "Passed", state: "complete" },
  { label: "Synthesizing brief", meta: "Active", state: "active" },
];

type EditableComponent = "action" | "agent-card" | "prompt-field";
type CanvasBackground = "grid" | "aurora" | "paper" | "void";

function ComponentLab() {
  const [component, setComponent] = useState<EditableComponent>("action");
  const [background, setBackground] = useState<CanvasBackground>("grid");
  const [label, setLabel] = useState("Launch agent run");
  const [variant, setVariant] = useState<"solid" | "outline" | "ghost">(
    "solid",
  );
  const [componentRadius, setComponentRadius] = useState(14);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const previewStyle = {
    "--component-radius": `${componentRadius}px`,
  } as CSSProperties;
  const componentName =
    component === "action"
      ? "Button"
      : component === "agent-card"
        ? "AgentCard"
        : "PromptField";
  const code = `<${componentName} variant="${variant}" radius={${componentRadius}} label=${JSON.stringify(label)} />`;

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access unavailable");
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section
      className="nimbus-panel nimbus-component-lab"
      aria-labelledby="component-lab-title"
    >
      <div className="nimbus-panel-head">
        <div>
          <p className="nimbus-overline">Component library</p>
          <h2 id="component-lab-title">Live component canvas</h2>
        </div>
        <span className="nimbus-lab-status">
          <i /> EDITABLE
        </span>
      </div>
      <div className="nimbus-lab-grid">
        <div className={`nimbus-canvas is-${background}`} style={previewStyle}>
          <div className="nimbus-canvas-toolbar">
            <span>PREVIEW / DEFAULT</span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="nimbus-preview-stage">
            {component === "action" && (
              <button
                className={`nimbus-preview-action is-${variant}`}
                type="button"
              >
                {label}
                <span aria-hidden="true">↗</span>
              </button>
            )}
            {component === "agent-card" && (
              <article className={`nimbus-preview-card is-${variant}`}>
                <div className="nimbus-preview-agent">N</div>
                <div>
                  <small>RESEARCH AGENT</small>
                  <h3>{label}</h3>
                  <p>Ready · 12 tools connected</p>
                </div>
                <span className="nimbus-status-dot" />
              </article>
            )}
            {component === "prompt-field" && (
              <label className={`nimbus-preview-field is-${variant}`}>
                <span>Prompt instruction</span>
                <div>
                  <input
                    defaultValue={label}
                    aria-label="Preview prompt instruction"
                  />
                  <button type="button">↑</button>
                </div>
                <small>⌘ Enter to run · 2,048 tokens available</small>
              </label>
            )}
          </div>
          <div className="nimbus-canvas-footer">
            <span>390 × 220</span>
            <span>100%</span>
          </div>
        </div>
        <form
          className="nimbus-lab-controls"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="nimbus-field-pair">
            <label>
              Component
              <select
                value={component}
                onChange={(event) =>
                  setComponent(event.target.value as EditableComponent)
                }
              >
                <option value="action">Action button</option>
                <option value="agent-card">Agent card</option>
                <option value="prompt-field">Prompt field</option>
              </select>
            </label>
            <label>
              Background
              <select
                value={background}
                onChange={(event) =>
                  setBackground(event.target.value as CanvasBackground)
                }
              >
                <option value="grid">Graphite</option>
                <option value="aurora">Cool gray</option>
                <option value="paper">Studio paper</option>
                <option value="void">Deep void</option>
              </select>
            </label>
          </div>
          <label className="nimbus-edit-label">
            Content
            <input
              value={label}
              maxLength={42}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <fieldset>
            <legend>Variant</legend>
            <div className="nimbus-segmented">
              {(["solid", "outline", "ghost"] as const).map((item) => (
                <button
                  aria-pressed={variant === item}
                  key={item}
                  onClick={() => setVariant(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="nimbus-edit-label nimbus-radius-editor">
            <span>
              Component radius <output>{componentRadius}px</output>
            </span>
            <input
              min="2"
              max="30"
              type="range"
              value={componentRadius}
              onChange={(event) =>
                setComponentRadius(Number(event.target.value))
              }
            />
          </label>
          <div className="nimbus-code-line">
            <code>{code}</code>
            <button type="button" onClick={() => void copyCode()} aria-label="Copy component code">
              {copyState === "copied" ? "Copied" : copyState === "error" ? "Retry" : "Copy"}
            </button>
            <span className="nimbus-sr-only" aria-live="polite">
              {copyState === "copied" ? "Component code copied to clipboard" : copyState === "error" ? "Could not copy component code" : ""}
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}

export function NimbusApplicationShell({
  journeyCount,
  runtime,
}: NimbusApplicationShellProps) {
  const [paletteName, setPaletteName] =
    useState<keyof typeof palettes>("aurora");
  const [radius, setRadius] = useState(18);
  const [motion, setMotion] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Command center");
  const palette = palettes[paletteName];
  const style: NimbusStyle = {
    "--nimbus-accent": palette.accent,
    "--nimbus-secondary": palette.secondary,
    "--nimbus-accent-rgb": palette.accentRgb,
    "--nimbus-radius": `${radius}px`,
  };

  const rootClassName = [
    "nimbus-root",
    motion ? "" : "nimbus-motion-off",
    mobileNavOpen ? "is-mobile-nav-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} style={style}>
      <a className="nimbus-skip" href="#nimbus-main">
        Skip to workspace
      </a>

      <aside className="nimbus-sidebar" aria-label="Primary navigation">
        <div className="nimbus-brand">
          <span className="nimbus-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>NIMBUS</b>
            <small>STUDIO LAB</small>
          </span>
        </div>
        <nav id="nimbus-primary-navigation">
          <p className="nimbus-overline">Workspace</p>
          {navigation.map((item, index) => (
            <button
              className={
                activeNav === item
                  ? "nimbus-nav-item is-active"
                  : "nimbus-nav-item"
              }
              key={item}
              onClick={() => {
                setActiveNav(item);
                setMobileNavOpen(false);
              }}
              type="button"
            >
              <span aria-hidden="true">
                {["⌁", "◫", "◇", "⌘", "◎", "△"][index]}
              </span>
              {item}
              {item === "Conversations" && <em>8</em>}
            </button>
          ))}
        </nav>
        <div className="nimbus-sidebar-foot">
          <span className="nimbus-status-dot" />
          <div>
            <b>All systems nominal</b>
            <small>{journeyCount} journeys monitored</small>
          </div>
        </div>
      </aside>

      <header className="nimbus-topbar">
        <button
          aria-controls="nimbus-primary-navigation"
          aria-expanded={mobileNavOpen}
          className="nimbus-mobile-menu"
          onClick={() => setMobileNavOpen((value) => !value)}
          type="button"
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
        >
          ⌘
        </button>
        <label className="nimbus-search">
          <span aria-hidden="true">⌕</span>
          <span className="nimbus-sr-only">Search commands and resources</span>
          <input placeholder="Search commands, agents, or runs…" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="nimbus-top-actions">
          <span className="nimbus-runtime">{runtime} reference</span>
          <button
            className="nimbus-icon-button"
            type="button"
            aria-label="Notifications"
          >
            ◌<i />
          </button>
          <button
            className="nimbus-avatar"
            type="button"
            aria-label="Open profile menu"
          >
            GS
          </button>
        </div>
      </header>

      <main id="nimbus-main" className="nimbus-main">
        <section className="nimbus-intro" aria-labelledby="page-title">
          <div>
            <p className="nimbus-eyebrow">
              <span /> LIVE WORKSPACE · SEP 05
            </p>
            <h1 id="page-title">Good evening, Ganapathy.</h1>
            <p>
              Your agent fleet is steady. One research run is waiting for your
              review.
            </p>
          </div>
          <button className="nimbus-primary" type="button">
            <span aria-hidden="true">＋</span> New agent run
          </button>
        </section>

        <ComponentLab />

        <section className="nimbus-metrics" aria-label="Workspace metrics">
          <article>
            <p>
              Active agents <span>↗ 12%</span>
            </p>
            <strong>24</strong>
            <div className="nimbus-spark">▁▂▃▂▄▅▆▅▇</div>
          </article>
          <article>
            <p>
              Tasks completed <span>↗ 8.4%</span>
            </p>
            <strong>1,284</strong>
            <div className="nimbus-spark">▂▃▂▄▃▅▆▅▇</div>
          </article>
          <article>
            <p>
              Success rate <span>↗ 2.1%</span>
            </p>
            <strong>
              98.6<small>%</small>
            </strong>
            <div className="nimbus-ring">
              <i>99</i>
            </div>
          </article>
          <article>
            <p>
              Cost this month <span className="neutral">On budget</span>
            </p>
            <strong>$842</strong>
            <div className="nimbus-budget">
              <i />
            </div>
          </article>
        </section>

        <div className="nimbus-workbench">
          <section
            className="nimbus-panel nimbus-conversation"
            aria-labelledby="conversation-title"
          >
            <div className="nimbus-panel-head">
              <div>
                <p className="nimbus-overline">Live run · NR-2841</p>
                <h2 id="conversation-title">Market intelligence brief</h2>
              </div>
              <div
                className="nimbus-agent-stack"
                aria-label="Three agents collaborating"
              >
                <span>OR</span>
                <span>AN</span>
                <span>＋1</span>
              </div>
            </div>

            <div className="nimbus-transcript">
              <article className="nimbus-message is-user">
                <div className="nimbus-message-meta">
                  <b>You</b>
                  <time>7:42 PM</time>
                </div>
                <p>
                  Analyze the enterprise agent platform landscape and prepare a
                  concise board-ready brief with cited evidence.
                </p>
              </article>
              <article className="nimbus-message is-agent">
                <div className="nimbus-message-meta">
                  <b>
                    <span className="nimbus-agent-glyph">N</span> Orchestrator
                  </b>
                  <time>7:42 PM</time>
                </div>
                <div className="nimbus-thinking" aria-live="polite">
                  <span className="nimbus-pulse" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <div>
                    <b>Building the evidence map</b>
                    <p>
                      Comparing category signals, adoption patterns, and
                      governance maturity.
                    </p>
                  </div>
                  <span className="nimbus-thinking-label">
                    Thinking summary
                  </span>
                </div>
                <ol className="nimbus-run-steps" aria-label="Agent run steps">
                  {runSteps.map((step) => (
                    <li
                      className={step.state === "active" ? "is-active" : ""}
                      key={step.label}
                    >
                      <i aria-hidden="true">
                        {step.state === "complete" ? "✓" : ""}
                      </i>
                      <span>{step.label}</span>
                      <small>{step.meta}</small>
                    </li>
                  ))}
                </ol>
              </article>
            </div>

            <div className="nimbus-composer">
              <div className="nimbus-attachment">
                <span>PDF</span>
                <div>
                  <b>strategy-notes.pdf</b>
                  <small>2.4 MB · Ready</small>
                </div>
                <button type="button" aria-label="Remove strategy-notes.pdf">
                  ×
                </button>
              </div>
              <label>
                <span className="nimbus-sr-only">Message the agent team</span>
                <textarea
                  rows={2}
                  placeholder="Ask Nimbus, use / for commands, @ to mention…"
                />
              </label>
              <div className="nimbus-composer-actions">
                <div>
                  <button type="button" aria-label="Attach file">
                    ⌁
                  </button>
                  <button type="button" aria-label="Open commands">
                    /
                  </button>
                  <button type="button" aria-label="Mention agent">
                    @
                  </button>
                </div>
                <button className="nimbus-send" type="button">
                  Send <span aria-hidden="true">↑</span>
                </button>
              </div>
            </div>
          </section>

          <aside
            className="nimbus-panel nimbus-inspector"
            aria-labelledby="inspector-title"
          >
            <div className="nimbus-panel-head">
              <div>
                <p className="nimbus-overline">Interactive</p>
                <h2 id="inspector-title">Theme lab</h2>
              </div>
              <span className="nimbus-beta">LIVE</span>
            </div>
            <div className="nimbus-control">
              <div>
                <label>Signal palette</label>
                <output>{palette.label}</output>
              </div>
              <div className="nimbus-swatches">
                {(Object.keys(palettes) as Array<keyof typeof palettes>).map(
                  (name) => (
                    <button
                      aria-label={`Use ${palettes[name].label} palette`}
                      aria-pressed={paletteName === name}
                      key={name}
                      onClick={() => setPaletteName(name)}
                      style={{ background: palettes[name].accent }}
                      type="button"
                    />
                  ),
                )}
              </div>
            </div>
            <div className="nimbus-control">
              <div>
                <label htmlFor="radius">Shape radius</label>
                <output>{radius}px</output>
              </div>
              <input
                id="radius"
                max="28"
                min="4"
                onChange={(event) => setRadius(Number(event.target.value))}
                type="range"
                value={radius}
              />
            </div>
            <div className="nimbus-control nimbus-toggle-row">
              <div>
                <label htmlFor="motion">Interface motion</label>
                <small>Respecting system preferences</small>
              </div>
              <button
                aria-checked={motion}
                className="nimbus-toggle"
                id="motion"
                onClick={() => setMotion((value) => !value)}
                role="switch"
                type="button"
              >
                <i />
              </button>
            </div>
            <div className="nimbus-token-preview">
              <p>Token preview</p>
              <div>
                <span>Agent / active</span>
                <code>var(--nimbus-accent)</code>
              </div>
              <div>
                <span>Shape / panel</span>
                <code>{radius}px</code>
              </div>
              <div>
                <span>Motion / status</span>
                <code>{motion ? "expressive" : "reduced"}</code>
              </div>
            </div>
            <button className="nimbus-secondary" type="button">
              Open full Studio <span>↗</span>
            </button>
          </aside>
        </div>

        <section
          className="nimbus-panel nimbus-runs"
          aria-labelledby="runs-title"
        >
          <div className="nimbus-panel-head">
            <div>
              <p className="nimbus-overline">Operations</p>
              <h2 id="runs-title">Recent agent runs</h2>
            </div>
            <button className="nimbus-link-button" type="button">
              View all runs →
            </button>
          </div>
          <div className="nimbus-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Agent</th>
                  <th scope="col">State</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>Market intelligence brief</b>
                    <small>NR-2841 · moments ago</small>
                  </td>
                  <td>Orchestrator</td>
                  <td>
                    <span className="nimbus-state is-running">Running</span>
                  </td>
                  <td>2m 18s</td>
                  <td>$1.42</td>
                </tr>
                <tr>
                  <td>
                    <b>Customer feedback synthesis</b>
                    <small>NR-2840 · 12 min ago</small>
                  </td>
                  <td>Analyst</td>
                  <td>
                    <span className="nimbus-state is-complete">Complete</span>
                  </td>
                  <td>4m 03s</td>
                  <td>$2.17</td>
                </tr>
                <tr>
                  <td>
                    <b>Production access review</b>
                    <small>NR-2839 · 26 min ago</small>
                  </td>
                  <td>Policy agent</td>
                  <td>
                    <span className="nimbus-state is-waiting">Approval</span>
                  </td>
                  <td>1m 11s</td>
                  <td>$0.38</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
