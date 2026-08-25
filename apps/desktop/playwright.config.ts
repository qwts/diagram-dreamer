import { hostGateConfig } from "../playwright.shared.ts";

/**
 * The specs are the shell's and live there; this host supplies only the servers
 * they run against. Ports are 4173/4174 — `apps/web` uses 4183/4184 so both
 * hosts can be gated in one CI run without colliding.
 */
export default hostGateConfig({ port: 4173, pseudoPort: 4174 });
