#!/usr/bin/env node
// Thin launcher: registers tsx's runtime API so src/index.ts runs straight
// from source, with no separate build step, from any working directory.
import { register } from "tsx/esm/api";

register();
await import("../src/index.ts");
