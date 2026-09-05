import { NimbusApplicationShell } from "@nimbus-ui-studio/application-shell";
import { goldenJourneys } from "@nimbus-ui-studio/testing";

export default function HomePage() { return <NimbusApplicationShell journeyCount={goldenJourneys.length} runtime="Next.js" />; }
