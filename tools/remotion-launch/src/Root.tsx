import "./index.css";
import { Composition } from "remotion";
import { NimbusLaunch } from "./Composition";
import { LAUNCH_DURATION_IN_FRAMES, LAUNCH_FPS } from "./story";

export const RemotionRoot: React.FC = () => {
  return <Composition id="NimbusLaunch" component={NimbusLaunch} durationInFrames={LAUNCH_DURATION_IN_FRAMES} fps={LAUNCH_FPS} width={1600} height={900} />;
};
