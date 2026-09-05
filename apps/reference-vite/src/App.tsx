import { NimbusApplicationShell } from "@nimbus-ui-studio/application-shell";
import { goldenJourneys } from "@nimbus-ui-studio/testing";

export function App() { return <NimbusApplicationShell journeyCount={goldenJourneys.length} runtime="Vite" />; }
