export interface GoldenJourney {
  readonly id: string;
  readonly label: string;
  readonly stage: "ready" | "planned";
}

export const goldenJourneys = [
  { id: "streaming-agent-conversation", label: "Streaming agent conversation", stage: "ready" },
  { id: "safe-thinking-summary", label: "Safe thinking summary", stage: "ready" },
  { id: "theme-preview", label: "Interactive theme preview", stage: "ready" },
  { id: "responsive-navigation", label: "Responsive navigation", stage: "ready" },
  { id: "keyboard-navigation", label: "Keyboard navigation", stage: "ready" },
  { id: "attachment-lifecycle", label: "Attachment lifecycle", stage: "planned" },
  { id: "approval-step-up", label: "Approval and step-up", stage: "planned" },
  { id: "connection-replay", label: "Connection loss and replay", stage: "planned" },
  { id: "workflow-outline", label: "Accessible workflow outline", stage: "planned" },
  { id: "reasoning-privacy", label: "Private reasoning containment", stage: "planned" },
] as const satisfies readonly GoldenJourney[];
