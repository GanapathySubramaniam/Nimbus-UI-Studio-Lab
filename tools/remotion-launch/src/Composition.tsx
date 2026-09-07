import {
  AbsoluteFill,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LAUNCH_SCENES, type LaunchScene } from "./story";
import { PRODUCT_CHAPTERS, type ProductChapter } from "./visual-plan";

const typeTo = (value: string, frame: number, startFrame: number): string => {
  const characterCount = Math.floor(
    interpolate(frame, [startFrame, startFrame + value.length * 2.4], [0, value.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return value.slice(0, characterCount);
};

const NimbusBrand: React.FC<{ inverse?: boolean }> = ({ inverse = false }) => (
  <div className={`nimbus-brand ${inverse ? "nimbus-brand--inverse" : ""}`}>
    <span className="nimbus-brand__image-wrap">
      <Img src={staticFile("nimbus-studio-logo.jpg")} className="nimbus-brand__image" />
    </span>
    <span>NIMBUS</span>
  </div>
);

const StatementCard: React.FC<{ scene: LaunchScene; closing?: boolean }> = ({ scene, closing = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200, stiffness: 115, mass: 0.7 } });
  const titleX = interpolate(reveal, [0, 1], [-54, 0]);
  const supportOpacity = interpolate(frame, [23, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const orangeScale = interpolate(frame, [0, 24], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className={`statement-card ${closing ? "statement-card--closing" : ""}`}>
      <div className="statement-card__orange" style={{ transform: `scaleX(${orangeScale})` }} />
      <div className="statement-card__dots" aria-hidden="true" />
      <div className="statement-card__brand"><NimbusBrand inverse /></div>
      <div className="statement-card__count">NIMBUS UI STUDIO LAB / 2026</div>
      <div className="statement-card__copy">
        <p className="statement-card__eyebrow">{scene.eyebrow}</p>
        <h1 style={{ transform: `translateX(${titleX}px)` }}>{scene.headline}</h1>
        <p className="statement-card__support" style={{ opacity: supportOpacity }}>{scene.supporting}</p>
      </div>
      <div className="statement-card__signal" aria-hidden="true"><span /> <span /> <span /></div>
    </AbsoluteFill>
  );
};

const ChapterPrelude: React.FC<{ scene: LaunchScene; chapter: ProductChapter }> = ({ scene, chapter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200, stiffness: 130, mass: 0.7 } });
  const lineWidth = interpolate(reveal, [0, 1], [0, 118]);
  const titleY = interpolate(reveal, [0, 1], [44, 0]);

  return (
    <AbsoluteFill className="chapter-prelude">
      <div className="chapter-prelude__white-slice" />
      <div className="chapter-prelude__brand"><NimbusBrand inverse /></div>
      <div className="chapter-prelude__copy">
        <p>{chapter.featureLabel}</p>
        <span className="chapter-prelude__line" style={{ width: lineWidth }} />
        <h2 style={{ transform: `translateY(${titleY}px)` }}>{scene.headline}</h2>
      </div>
      <div className="chapter-prelude__index">{scene.eyebrow}</div>
    </AbsoluteFill>
  );
};

const ProductFeature: React.FC<{ chapter: ProductChapter; scene: LaunchScene }> = ({ chapter, scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cameraZoom = interpolate(frame, [0, durationInFrames * 0.68, durationInFrames], [1.005, 1.095, 1.06], {
    extrapolateRight: "clamp",
  });
  const frameReveal = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const typed = typeTo(chapter.typingLabel, frame, 38);

  return (
    <AbsoluteFill className="product-feature">
      <div className="product-feature__screen" style={{ transform: `scale(${cameraZoom})` }}>
        <Video src={staticFile("studio-workflow.mp4")} startFrom={chapter.sourceStartFrame} className="product-feature__video" />
      </div>
      <div className="product-feature__topline">
        <NimbusBrand />
        <div className="product-feature__feature-label">{chapter.featureLabel}</div>
        <div className="product-feature__scene-index">{scene.eyebrow}</div>
      </div>
      <div className="product-feature__focus" style={{ opacity: frameReveal }} aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="product-feature__typing">
        <span className="product-feature__typing-key">TYPE</span>
        <span>{typed}<b>▍</b></span>
      </div>
      <div className="product-feature__progress" style={{ transform: `scaleX(${interpolate(frame, [0, durationInFrames], [0.12, 1], { extrapolateRight: "clamp" })})` }} />
    </AbsoluteFill>
  );
};

const ProductChapterScene: React.FC<{ scene: LaunchScene; chapter: ProductChapter }> = ({ scene, chapter }) => {
  const chapterLength = scene.end - scene.start;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={chapter.preludeFrames}>
        <ChapterPrelude scene={scene} chapter={chapter} />
      </Sequence>
      <Sequence from={chapter.preludeFrames} durationInFrames={chapterLength - chapter.preludeFrames}>
        <ProductFeature scene={scene} chapter={chapter} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const NimbusLaunch: React.FC = () => (
  <AbsoluteFill className="launch-root">
    <Sequence from={LAUNCH_SCENES[0].start} durationInFrames={LAUNCH_SCENES[0].end - LAUNCH_SCENES[0].start}>
      <StatementCard scene={LAUNCH_SCENES[0]} />
    </Sequence>
    {PRODUCT_CHAPTERS.map((chapter) => {
      const scene = LAUNCH_SCENES.find((entry) => entry.id === chapter.id);
      if (!scene) return null;
      return (
        <Sequence key={chapter.id} from={scene.start} durationInFrames={scene.end - scene.start}>
          <ProductChapterScene scene={scene} chapter={chapter} />
        </Sequence>
      );
    })}
    <Sequence from={LAUNCH_SCENES[4].start} durationInFrames={LAUNCH_SCENES[4].end - LAUNCH_SCENES[4].start}>
      <StatementCard scene={LAUNCH_SCENES[4]} closing />
    </Sequence>
  </AbsoluteFill>
);
