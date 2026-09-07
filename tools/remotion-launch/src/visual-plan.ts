export const PRODUCT_CHAPTERS = [
  {
    id: "canvas",
    preludeFrames: 90,
    sourceStartFrame: 0,
    preludePalette: "orange-white",
    productTreatment: "full-resolution-close-up",
    featureLabel: "BUILD IN CONTEXT",
    typingLabel: "Monthly revenue",
  },
  {
    id: "system",
    preludeFrames: 90,
    sourceStartFrame: 360,
    preludePalette: "orange-white",
    productTreatment: "full-resolution-close-up",
    featureLabel: "TUNE THE SYSTEM",
    typingLabel: "Visual style applied",
  },
  {
    id: "context",
    preludeFrames: 90,
    sourceStartFrame: 900,
    preludePalette: "orange-white",
    productTreatment: "full-resolution-close-up",
    featureLabel: "EXPORT WITH CONFIDENCE",
    typingLabel: "NimbusApp.tsx",
  },
] as const;

export type ProductChapter = (typeof PRODUCT_CHAPTERS)[number];
