import { hostGateConfig } from "../playwright.shared.ts";

/**
 * The same specs `apps/desktop` runs, against this host's build instead. Ports
 * are offset by ten from desktop's 4173/4174 so a CI run can gate both hosts
 * concurrently.
 */
export default hostGateConfig({ port: 4183, pseudoPort: 4184 });
