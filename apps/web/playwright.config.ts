import { hostGateConfig } from "../playwright.shared.ts";

/**
 * The same specs `apps/desktop` runs, against this host's build instead, plus
 * the `tests/` beside this file — what *this* host's capabilities make the
 * shell offer, which is the one thing the shared gates cannot assert.
 *
 * Ports are offset by ten from desktop's 4173/4174 so a CI run can gate both
 * hosts concurrently.
 */
export default hostGateConfig({
  port: 4183,
  pseudoPort: 4184,
  capabilityTests: new URL("tests/", import.meta.url),
});
