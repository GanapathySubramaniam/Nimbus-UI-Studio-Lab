export type WidgetKind =
  | "sidebar"
  | "navbar"
  | "heading"
  | "text"
  | "stat"
  | "line-chart"
  | "bar-chart"
  | "donut-chart"
  | "table"
  | "activity"
  | "card"
  | "button"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "badge"
  | "avatar"
  | "image"
  | "progress"
  | "alert"
  | "tabs"
  | "accordion"
  | "breadcrumb"
  | "pagination"
  | "divider"
  | "skeleton"
  | "pricing"
  | "login"
  | "search"
  | "chat"
  | "composer"
  | "agent"
  | "approval"
  | "file"
  | "calendar"
  | "list"
  | "kanban"
  | "tooltip";
export type WidgetState =
  | "default"
  | "loading"
  | "disabled"
  | "error"
  | "success";
export type Entrance = "none" | "fade" | "slide" | "scale";
export type InteractionMotion = "none" | "lift" | "scale" | "glow";
export interface GradientStop {
  color: string;
  position: number;
}
export type Background =
  | { type: "solid"; color: string }
  | { type: "linear"; angle: number; stops: GradientStop[] }
  | {
      type: "radial";
      shape: "circle" | "ellipse";
      centerX: number;
      centerY: number;
      stops: GradientStop[];
    }
  | {
      type: "image";
      src: string;
      size: "cover" | "contain" | "auto";
      positionX: number;
      positionY: number;
      repeat: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
    };
export interface TextStyle {
  color?: string;
  fontSize?: number;
  fontFamily?: "sans" | "serif" | "mono";
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right" | "justify";
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  decoration?: "none" | "underline" | "line-through";
  italic?: boolean;
}
export type TextRole = "title" | "subtitle" | "value";
export interface LogoStyle {
  width: number;
  height: number;
  fit: "contain" | "cover" | "fill" | "scale-down" | "none";
}
export type LoadingMotion = "shimmer" | "pulse" | "spinner" | "static";
export type MotionEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";
export interface WidgetStyle {
  backdrop?: Background | undefined;
  text?: Partial<Record<TextRole, TextStyle>>;
  logo?: LogoStyle;
  background: string;
  color: string;
  accent: string;
  borderColor: string;
  radius: number;
  borderWidth: number;
  padding: number;
  fontSize: number;
  fontFamily: "sans" | "serif" | "mono";
  fontWeight: number;
  shadow: "none" | "small" | "medium" | "large";
  opacity: number;
}
export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  source: string;
  style: WidgetStyle;
}
export interface Widget {
  /** Declarative project page IDs only. item:N uses the rendered nonblank item index. */
  actions?: Record<string, string>;
  id: string;
  kind: WidgetKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  presetId: string;
  style: WidgetStyle;
  content: {
    title: string;
    subtitle: string;
    value: string;
    items: string;
    image: string;
    imageAlt: string;
  };
  motion: {
    loading?: LoadingMotion;
    easing?: MotionEasing;
    repeat?: number | "infinite";
    entrance: Entrance;
    hover: InteractionMotion;
    click: "none" | "press" | "pulse";
    duration: number;
    delay: number;
  };
  state: WidgetState;
  locked: boolean;
  hidden: boolean;
}
export interface StudioDocument {
  backdrop?: Background | undefined;
  version: 1;
  name: string;
  width: number;
  height: number;
  background: string;
  grid: number;
  widgets: Widget[];
}
export interface WidgetDefinition {
  kind: WidgetKind;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  value: string;
  items: string;
}
