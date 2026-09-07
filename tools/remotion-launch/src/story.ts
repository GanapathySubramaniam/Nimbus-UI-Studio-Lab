export const LAUNCH_FPS = 30;
export const LAUNCH_DURATION_IN_FRAMES = 2040;

export const LAUNCH_SCENES = [
  {
    id: "opening",
    start: 0,
    end: 240,
    eyebrow: "NIMBUS UI STUDIO LAB",
    headline: "A visual system for AI-built products.",
    supporting:
      "Design the interface once. Export code that stays on-system.",
  },
  {
    id: "canvas",
    start: 240,
    end: 690,
    eyebrow: "01  /  BUILD VISUALLY",
    headline: "Create the screen before your agent writes it.",
    supporting:
      "Compose dashboards in the canvas. Tune content, layout, and interaction in context.",
  },
  {
    id: "system",
    start: 690,
    end: 1140,
    eyebrow: "02  /  ONE SYSTEM",
    headline: "75 original styles. One UI contract.",
    supporting:
      "Mix color, typography, density, shape, elevation, and motion without creating one-off screens.",
  },
  {
    id: "context",
    start: 1140,
    end: 1590,
    eyebrow: "03  /  AGENT CONTEXT",
    headline: "20× fewer UI-code tokens.",
    supporting:
      "A proven reduction for Claude Code and Cursor. Let your agent focus on the important stuff.",
  },
  {
    id: "close",
    start: 1590,
    end: 2040,
    eyebrow: "NIMBUS UI STUDIO LAB",
    headline: "Let your agent focus on the important stuff.",
    supporting:
      "Nimbus takes care of the UI contract, so your context goes to the product work that matters.",
  },
] as const;

export type LaunchScene = (typeof LAUNCH_SCENES)[number];

export const sceneForFrame = (frame: number): LaunchScene | undefined =>
  LAUNCH_SCENES.find((scene) => frame >= scene.start && frame < scene.end);
