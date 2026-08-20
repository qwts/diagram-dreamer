# AUDIT.md — Phase 0, M1 hardening

**Snapshot:** working tree at `/Users/user/Code/Diagram Dreamer`, git branch `main` with **zero commits** (everything untracked).
**Method:** static read of every file under `src/`, `public/`, `.lovable/`, plus root config, audited against `CLAUDE.md`, `DESIGN.md`, the design document, and Lovable's shell description. No edits made. `node_modules` is absent, so nothing was built, type-checked, or run.
**Revision:** third pass, plus a documentation-layout fix applied at your request (§0 Document status — the only change made outside this file). `DESIGN.md` and the design document arrived after the first pass (sections **E** and **L**); Lovable's `docs/SPEC.md` arrived after the second (section **M**, and the §0 finding that the SPA amendment was deliberately reverted). Two original questions were resolved by the prose; one new gating question (**Q0**) was opened by the document collision.

---

## 0. Headline verdict — the binary check

### The SPA amendment did **not** land. SSR is fully intact.

This gates everything else, and it is not ambiguous:

| Evidence | Location |
| --- | --- |
| `@tanstack/react-start` `1.168.32` still a runtime dependency | `package.json:36` |
| `nitro` `3.0.260603-beta` still a devDependency; comment confirms it builds "using cloudflare as a default target" | `package.json:85`, `vite.config.ts:4` |
| Vite config explicitly wires a **server entry** | `vite.config.ts:9-13` |
| A server request handler exists and lazy-imports `@tanstack/react-start/server-entry` | `src/server.ts:1-61` |
| A Start instance with **server** request middleware + CSRF middleware for server functions | `src/start.ts:1-29` |
| Root route renders the full document shell — `<html>/<head>/<body>` with `<HeadContent/>` and `<Scripts/>` — which is the SSR document contract, not a SPA mount | `src/routes/__root.tsx:114-126` |
| No `index.html` anywhere in the repo — there is no static entry point | `find` over repo root |

The plan file Lovable wrote for the amendments (`.lovable/plan/vellum-ui-shell-approved-plan-revised-2026-08-20.md`) lists five changes. **Amendments 3 (warning tokens), 4 (self-hosted fonts) and 5 (diff feedback) landed and are verified good.** Amendment 1 (SPA-only routing) was not implemented at all. Amendment 2 (synchronous i18n) landed halfway — see below.

### The i18n raw-key defect is still reachable, and I can name the mechanism.

`src/i18n/index.ts:7-15` bundles `en.json` via a static import with no async backend — that half is correct. But it never sets `initImmediate: false`, and i18next's default is `initImmediate: true`, which defers applying the resource store into a `setTimeout`. Combined with `react: { useSuspense: false }` (`src/i18n/index.ts:13`), the first synchronous render — which under SSR is the render that produces the shipped HTML — resolves `t("workspace.save.unsaved")` to the literal key string. That is exactly the symptom observed on the deployed preview (`workspace.save.unsaved`, `agentChip.state.streaming`). Both halves of the defect are still present in this snapshot.

Killing SSR (A1) removes the visible symptom; setting `initImmediate: false` (B1) removes the cause. Do both.

### Lovable declined the SPA amendment deliberately, and wrote the refusal into a spec.

`docs/SPEC.md` is **Lovable-authored** — a description of the shell it built, not the design document. Two passages are decisive:

> §4 / §12: "The standard TanStack Start build path remains intact; **the `spa` option is intentionally not enabled because it breaks the build's prerender step**."
> §14 Changelog: "Added hash-history fallback for Electron while keeping the standard TanStack Start build path (**the `spa` option was removed because it broke the build's prerender step**)."

So amendment 1 was not overlooked. It was attempted, it broke the prerender step, and Lovable reverted it, substituted the *declined* hash-history fallback in its place, and documented both as intentional architecture. `docs/SPEC.md:15` lists "SPA routing with hash-history fallback for `file://` / Electron loading" as **in scope**; `docs/SPEC.md:319` states plainly that "the TanStack Start build emits a Cloudflare-compatible Worker entry."

**This changes the Phase 1 fix path.** Flipping `spa: true` is the cheap repair and it is known not to work — Lovable already tried it. A1's full removal of TanStack Start is therefore the correct route, not the conservative one.

### Document status — resolved

The repository briefly held three SPEC candidates, two of them named `SPEC.md`. Resolved as follows:

| Was | Now | Status |
| --- | --- | --- |
| `mermaid-renderer-design-doc.md` + a byte-identical `SPEC.md`, both at root | **`docs/SPEC.md`** | Authoritative. §4/§9/§10/§11 match CLAUDE.md's citations exactly, including §11 "defines your role". The duplicate was verified identical and deleted. |
| `docs/SPEC.md` (Lovable-authored) | **`docs/SHELL-AS-BUILT.md`** | Non-authoritative record, kept for §5 and §13. Carries a header naming its six known contradictions (§M). |
| `DESIGN.md` (root) | unchanged | Correct location per CLAUDE.md. |

CLAUDE.md's existing reference to `docs/SPEC.md` now resolves to the design document without any edit to CLAUDE.md itself. One optional addition is proposed in Q0 below.

Merging the two was considered and rejected: the design document is the contract, the Lovable file is a record of a non-compliant implementation, and combining them would launder the second into the first.

All three documents were read in full; nothing in sections E, L or M is provisional.

---

## Phase 1 status — completed 2026-08-19

Worked on branch `worktree-m1-phase1`, six commits on top of the baseline. Every
gate below was run, not assumed:

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | clean, with `noUnusedLocals` / `noUnusedParameters` now **on** |
| `eslint .` | **0 errors, 0 warnings** |
| `npm run check:contrast` | 36 token pairs, both themes, all ≥ AA; values match `styles.css` |
| `vite build` | `index.html` + assets, **no server or worker bundle** |
| `scripts/smoke-fixtures.mjs` | all 15 `?state=` combinations reachable |
| In-browser | light + dark + RTL rendered, **zero console errors, zero raw keys** |

**Resolved:** A1–A5, B1–B6, C1–C3, D1–D4, E2–E6, E9–E11, F1–F3, F5, H1–H3, I1–I3,
K2, K3, L1, L3, L6, M1, and the Q1 fixture-seam question.

**Two corrections to this audit, found by doing the work:**

1. **B1 was wrong.** The raw-key defect was not a missing `initImmediate: false`.
   i18next v26 renamed that option to `initAsync`, and init already runs
   synchronously whenever `resources` is supplied inline
   (`i18next.js:1882` — `if (this.options.resources || !this.options.initAsync)`).
   The option is set anyway to state the requirement, but the deployed symptom was
   SSR-specific and is moot now that SSR is gone. A client render was verified to
   emit zero raw keys.
2. **A defect the audit missed entirely.** Reading the source could not reveal it —
   `max-w-md` resolved to **16px**, because the Vellum spacing scale shadows
   Tailwind's container scale for the shared xs/sm/md/lg/xl keys. Every empty state
   and the settings dialog were collapsed to a few pixels wide. Only surfaced by
   rendering a fixture with an empty state. Fixed in `ee44ac9`.

**Deliberately not changed — flagged, not reinterpreted** (CLAUDE.md invariant 8):

- **E8** — more than one `button-primary` per view. DESIGN.md caps it at one; the
  permission and diff fixtures show two. Demoting the prompt-send button is a real
  affordance change, so it needs **Q5** answered first.
- **E12** — borders at ~1.2:1. Fine as dividers, questionable as the sole cue for
  `button-secondary`. Needs **Q7**.
- **Lagoon on the two decorative card icons** — DESIGN.md:108 says "if it isn't
  interactive or live, it isn't Lagoon", but both cards *are* live. Left as-is.

**Still open, and unblocked by anything here:** B5's ICU migration is done but only
`en` exists, so the pseudo-loc gate still needs a pseudo bundle (Phase 2). L2
(`packages/design-tokens` generating the theme), L4 (no Save control), L5 (no pan
control), L8 (Storybook, pending **Q9**) are Phase 2/3 by design. Questions Q2, Q3,
Q4, Q6, Q10 and Q11 were answered in the course of the work — the reasoning is in
each commit body; reverse any of them if you disagree.

---

## 1. Findings

Severity: **blocker** (contract cannot ship / gates cannot pass) · **contract-violation** (breaks a CLAUDE.md, DESIGN.md, or SPEC invariant) · **cleanup** (dead weight, inconsistency).
Effort: XS ≈ minutes · S ≈ under an hour · M ≈ a few hours · L ≈ a day or more.

### A. SSR / TanStack Start removal

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| A1 | blocker | App is a TanStack **Start** SSR app, not a SPA. Violates CLAUDE.md invariant 2 ("ships in Electron, there is no server"). | `package.json:36,85`; `vite.config.ts:9-13`; `src/routes/__root.tsx:114-126`; no `index.html` | Convert to plain Vite SPA: add `index.html` + a client entry that calls `createRoot().render(<RouterProvider/>)`; drop `shellComponent`, `HeadContent`, `Scripts`; move the stylesheet to an `import` in the entry; replace `@lovable.dev/vite-tanstack-config` with a hand-written `vite.config.ts` (react + tailwind + tsconfigPaths + tanstack router plugin). Add the CSP meta while you are there (L2). | L |
| A2 | blocker | `src/start.ts` installs server request middleware and CSRF protection for server functions — server runtime in an app with no server. | `src/start.ts:1-29` | Delete the file with A1. | XS |
| A3 | blocker | `src/server.ts` (61 lines) + `src/lib/error-capture.ts` (81 lines) + `src/lib/error-page.ts` (30 lines) are an SSR error-wrapper stack. `error-capture.ts:55-63` **monkey-patches global `console.error`** — that ships into the renderer today. | `src/server.ts`; `src/lib/error-capture.ts:55-63`; `src/lib/error-page.ts` | Delete all three with A1. | XS |
| A4 | blocker | Build target is a nitro/cloudflare server bundle, so `vite build` does not currently emit a static SPA. | `vite.config.ts:4`; `package.json:85` | Removed by A1; verify `dist/` contains only `index.html` + assets, no server bundle. | — |
| A5 | contract-violation | `@tanstack/react-query` `QueryClient` is constructed in the router and provided at the root. A data-fetching client in a shell that is forbidden from fetching data — CLAUDE.md invariant 1, SPEC §11 ("UI state only — no data fetching, no business logic"). | `src/router.tsx:1,6,16`; `src/routes/__root.tsx:1,132-137` | Remove the provider, the router-context type param, and the dependency. | S |

### B. i18n and strings

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| B1 | blocker | `initImmediate` unset → defaults to `true` → resources applied asynchronously → first render emits raw keys. Root cause of the observed defect. | `src/i18n/index.ts:8-14` | Add `initImmediate: false`. Keep the static `en.json` import and `useSuspense: false`. | XS |
| B2 | contract-violation | Seven hardcoded user-facing strings in the root 404 and error components: `"404"`, `"Page not found"`, `"The page you're looking for doesn't exist or has been moved."`, `"Go home"`, `"This page didn't load"`, `"Something went wrong on our end. You can try refreshing or head back home."`, `"Try again"`. | `src/routes/__root.tsx:23-34, 51-72` | Route through i18next with new `error.*` keys, or delete the components outright (see Q4). | S |
| B3 | contract-violation | `renderErrorPage()` emits an untranslated HTML page with hardcoded hex colors (`#fafafa`, `#111`, `#4b5563`, `#d1d5db`). | `src/lib/error-page.ts:9-16, 21-22` | Deleted by A3. | — |
| B4 | contract-violation | The language selector is inert and RTL is unwired: `SettingsDialog` writes to `WorkspaceLayout` local state only and never calls `i18n.changeLanguage`; `<html lang="en">` is hardcoded; `dir` is never set anywhere; `RTL_LANGUAGES` is exported and referenced by nothing. SPEC §9 requires RTL as a first-class target and a pseudo-loc CI gate; neither can pass. | `WorkspaceLayout.tsx:42,139-140`; `src/routes/__root.tsx:116`; `src/i18n/index.ts:5` | Decide the seam (Q3), then drive `lang`/`dir` from the resolved language in one place. | M |
| B5 | contract-violation | **ICU message format is not in use.** SPEC §9 specifies "i18next with ICU message format". The app uses i18next's native interpolation and native plural suffixes — `workspace.status.diagnostics_one` / `_other` in `en.json` — which is not ICU. | `src/i18n/index.ts:8-14`; `src/i18n/en.json` (`workspace.status`) | Add `i18next-icu` + `intl-messageformat`, rewrite plurals to ICU `{count, plural, one{…} other{…}}`. Add both to the permitted-dependency list. | M |
| B6 | cleanup | Nine dead `en.json` keys, verified against both literal `t("…")` calls and every dynamic `` t(`…${x}`) `` template: `app.name`, `app.tagline`, `agentChip.label`, `agent.toolCall.label`, `editor.mountNote`, `workspace.region.agent`, `workspace.region.status`, `workspace.toolbar.theme`, `preview.diagnostic.unknownType`. | `src/i18n/en.json` | Remove — except `preview.diagnostic.unknownType`, see Q6. Note each removal in the commit body per working rules. | XS |
| B7 | — (clean) | **Zero missing keys.** Every literal key and every dynamic template expansion resolves against `en.json`. Zero hardcoded `aria-label` / `placeholder` / `title` / `alt` values outside `components/ui/`. | verified by script over all `.ts`/`.tsx` | No action. | — |

### C. Routing

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| C1 | contract-violation | Router uses **hash** history selected by **runtime detection** — `window.location.protocol === "file:"` OR a `VITE_ROUTER_HISTORY` env var. Invariant 2 requires **memory** history behind a single constructor parameter and explicitly forbids runtime detection/fallback. This is the declined "router mode fallback/detection logic," partially built. | `src/router.tsx:8-15` | `export const getRouter = ({ history }: { history: RouterHistory }) => …`; caller passes `createMemoryHistory()`. Delete the detection branch and the env read. | S |
| C2 | cleanup | `import.meta.env['VITE_ROUTER_HISTORY']` is the only env-driven config in the app — adjacent residue to the declined typed-env helpers. (No typed-env helper module itself survives; that part of the decline held.) | `src/router.tsx:10` | Removed by C1. | — |
| C3 | cleanup | `src/routes/README.md` is TanStack Start file-routing boilerplate documenting conventions this app will no longer follow. | `src/routes/README.md` | Delete or rewrite after A1/C1. | XS |

### D. SEO and Lovable residue (declined features)

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| D1 | cleanup | Full SEO/social meta stack — `og:title`, `og:description`, `og:type`, `twitter:card`, `twitter:site: "@Lovable"` — at the root and duplicated per route. SEO was declined; no crawler ever sees an Electron renderer. | `__root.tsx:80-99`; `index.tsx:21-36`; `welcome.tsx:9-23` | Delete all `head()` meta except `charSet`, `viewport`, and the window title. | S |
| D2 | cleanup | `public/robots.txt` with per-crawler allow rules (Googlebot, Bingbot, Twitterbot, facebookexternalhit). | `public/robots.txt` | Delete. | XS |
| D3 | cleanup | `src/lib/lovable-error-reporting.ts` ships editor-preview telemetry into the app: `window.__lovableEvents.captureException` and `window.__lovableReportRuntimeError`, wired from the root error boundary. | `lovable-error-reporting.ts:26-57`; `__root.tsx:13,45` | Delete the module and the call site. | XS |
| D4 | cleanup | `README.md` is the Lovable template readme ("Built with TanStack Start"). `package.json` `name` is `tanstack_start_ts`. | `README.md`; `package.json:2` | Rewrite README; rename package to `vellum-renderer`. Keep `.lovable/plan/*.md` — they are the only surviving record of the contract prompt and the amendments. | S |

### E. Design tokens — audited against DESIGN.md

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| E1 | — (clean) | **Every DESIGN.md token value is reproduced exactly.** All 17 colors (`#16181A`→`--foreground`, `#0E7C7B`→`--tertiary`, `#FAFAF8`→`--background`, the full dark set, etc.), all 6 typography styles (size / line-height / weight / letter-spacing), all 3 radii (4/8/12), all 5 spacing steps (4/8/16/24/40), and `button-primary-hover: #0B6362` → `--tertiary-hover`. Zero hex/rgb literals, zero raw Tailwind palette colors, zero arbitrary color values in any shell component. | `src/styles.css:21-116` vs `DESIGN.md:5-64,72` | No action. This is the strongest part of the Lovable output. | — |
| E2 | contract-violation | **`--muted` is an invented color.** `#f2f1ed` / `#23272c` appear nowhere in DESIGN.md. SPEC §9: "Lovable consumes tokens, never invents them." DESIGN.md: "Don't introduce new colors for features; new semantics must map to existing roles or be added here first, through a lint-gated PR." Used for the StatusPill neutral tone, both `VellumButton` hover states, the diagram-type badge, the disconnected agent chip. | `styles.css:92,109`; `StatusPill.tsx:7`; `VellumButton.tsx:14-15`; `DiagramFrame.tsx:63`; `AgentChip.tsx:8` | Either remap those five sites onto existing roles (`surface-raised` + `border`), or add `muted` / `muted-dark` to DESIGN.md through the lint-gated PR path. Recommend the latter — the role is genuinely needed and the values are well-chosen (5.29:1 / 5.89:1 against slate). | S |
| E3 | contract-violation | **The dark diagnostic palette is invented.** DESIGN.md's dark set defines only `neutral/surface-raised/primary/secondary/tertiary/border-dark`. `.dark` additionally invents `--on-tertiary #0b1416`, `--tertiary-hover #58cdc8`, `--danger #f2b8b5`, `--danger-surface #38211f`, `--warning #e0a949`, `--warning-surface #33280f`, `--success #6cd48a`, `--muted #23272c`. In fairness this is partly a **DESIGN.md gap** — the prose promises "the same semantic roles map to the `*-dark` tokens" but provides no dark diagnostic tokens to map to, so Lovable had to invent them. | `styles.css:101-116` vs `DESIGN.md:17-22,102,112` | **Ratify into DESIGN.md, don't change the code.** All eight values pass AA comfortably (6.41:1 – 10.62:1, measured — see E5). | S |
| E4 | contract-violation | `--warning-surface` (`#fdf3e0` / `#33280f`) is likewise absent from DESIGN.md, although it was explicitly authorized by amendment 3. | `styles.css:97,114`; amendment 3 in the Lovable plan | Add to DESIGN.md alongside `danger-surface`. Same lint-gated PR as E3. | XS |
| E5 | contract-violation | **`bg-lagoon/10` fails WCAG AA in the light theme.** Lagoon text on the 10% tint measures **4.39:1** over surface-raised and **4.19:1** over paper — both under 4.5. Dark theme passes (5.99 / 6.75). Affects the "saving" save-state pill, the streaming and awaiting-permission agent chips, the prompt context pill, and the dev switcher's active option. This will fail the Phase 2 axe gate. | measured from `styles.css:87,90-92`; `StatusPill.tsx:8`; `AgentChip.tsx:10-11`; `AgentPanel.tsx:138`; `StateSwitcher.tsx:37,50` | Add a real `tertiary-surface` token to DESIGN.md mirroring `danger-surface` / `warning-surface` (both of which pass at 5.62 and 5.38), and replace the five ad-hoc `/10` alphas with it. Ad-hoc alpha is what caused this; a token fixes it once. | S |
| E6 | contract-violation | **`label-caps` applied to translatable strings — 7 sites.** DESIGN.md is explicit: "Don't use `label-caps` on translatable strings" (many scripts have no casing). Every site pairs `text-label-caps uppercase` with `t(…)` output. | `AgentPanel.tsx:52`; `EditorHost.tsx:36`; `PreviewPane.tsx:25`; `SessionTranscript.tsx:52`; `DiffPreviewCard.tsx:36,47`; `StateSwitcher.tsx:29` | Drop the `uppercase` utility at all seven sites (the token itself carries the weight and tracking and is fine to keep). See Q2 — DESIGN.md's own prose is internally in tension here. | S |
| E7 | contract-violation | The root 404/error components bypass the Vellum layer entirely: shadcn aliases (`bg-background`, `text-foreground`, `bg-primary`, `border-input`) plus the raw Tailwind scale (`text-7xl`, `text-xl`, `text-sm`, `mt-4/2/6`, `px-4`, `py-2`, `gap-2`). | `src/routes/__root.tsx:21-37, 49-75` | Fixed together with B2. | S |
| E8 | contract-violation | **More than one `button-primary` per view.** DESIGN.md: "button-primary: One per view maximum." The workspace shows two in the `permission` fixture (prompt send + Allow once) and two in the `diff` fixture (prompt send + Accept edit); three with the settings dialog open. | `AgentPanel.tsx:75,171`; `PermissionCard.tsx:88`; `DiffPreviewCard.tsx:62`; `SettingsDialog.tsx:132` | See Q5 — needs a design call on whether the icon-only send button counts. | S |
| E9 | cleanup | Arbitrary-value spacing literals in shipped components: `py-[2px]`, `p-[2px]`, `mt-[2px]`, `h-[1.6em]`. Off the DESIGN.md 4/8/16/24/40 scale. | `StatusPill.tsx:31`; `SettingsDialog.tsx:59`; `PermissionCard.tsx:57`; `DiagramFrame.tsx:63,130`; `EditorHost.tsx:79,126` | Add a 2px step and an editor line-height token to DESIGN.md + `@theme inline`, then use the utilities. | S |
| E10 | cleanup | Components reach through to raw CSS vars — `bg-[var(--muted)]`, `hover:bg-[var(--tertiary-hover)]` — because `@theme inline` never exposes `--color-muted` or `--color-tertiary-hover` as utilities. | `StatusPill.tsx:7`; `VellumButton.tsx:13-15`; `DiagramFrame.tsx:63`; `welcome.tsx:64` | Add the two `--color-*` mappings; switch to `bg-muted` / `hover:bg-tertiary-hover`. | XS |
| E11 | cleanup | `StatusPill` warning tone uses `bg-warning/10` while danger uses `bg-danger-surface` — inconsistent, and `--warning-surface` exists. (Contrast passes either way: 5.16:1 vs 5.38:1.) | `StatusPill.tsx:9-10` | Use `bg-warning-surface`. | XS |
| E12 | question | Borders measure **1.25:1** (light) and **1.20:1** (dark) against their surfaces. Not automatically a failure — WCAG 1.4.11 applies to boundaries *needed to identify* a control — but DESIGN.md defines `button-secondary` as "paper-on-paper **with a border**", making the border the sole affordance cue for the default button. | measured from `styles.css:91-93,108-110`; `VellumButton.tsx:14` | See Q7. This is exactly what SPEC §9's `design.md lint` "WCAG contrast on component pairs" gate is meant to catch. | — |
| E13 | — (clean) | Motion, elevation and the agent chip all conform. `vellum-motion` is 120ms (under the 150ms rule); the reduced-motion block neutralizes animation and transition durations globally; the awaiting-permission chip adds a Lagoon ring and pulses only when reduced-motion is unset, exactly as specified; shadows appear only on the permission prompt and the dev overlay, border-first everywhere else. | `styles.css:141-158`; `AgentChip.tsx:11`; `PermissionCard.tsx:54` | No action. | — |

### F. Accessibility

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| F1 | contract-violation | The global focus ring is **overridden** in 23 shadcn wrappers via `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`. Four ship today (dialog, dropdown-menu, select, resizable); `resizable.tsx:24` is the pane splitter — a primary keyboard control — and gets `ring-1` + `ring-offset-1`, not 2px/2px. DESIGN.md calls the 2px/2px ring "**Non-negotiable**". | `styles.css:134-137` vs `ui/resizable.tsx:24`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx` | Strip the overrides from the four shipping components so the global rule applies. The other 19 disappear with I1. | S |
| F2 | contract-violation | Nested polite live regions in the status bar: `role="status"` on the container is implicitly `aria-live="polite"` and wraps a second explicit `aria-live="polite"`. The container also holds **cursor line/column**, so once a real editor mounts every keystroke will be announced. | `StatusBar.tsx:12-14, 25-32` | Drop `role="status"` from the container; keep the single polite region on the diagnostics count. | S |
| F3 | contract-violation | `PermissionCard` focuses itself in an effect on mount and whenever `resolution` is falsy, moving focus without user action. SPEC §7.2 requires a "**non-blocking** approval surface"; a card that seizes focus mid-typing is blocking in effect. Escape sends focus to the transcript, not to wherever the user was. | `PermissionCard.tsx:15, 21-23, 26-30` | Announce via the existing polite live region and leave focus alone; if focus must move, record and restore the prior element on resolve. See Q6. | S |
| F4 | cleanup | Diagram scaling uses the `zoom` CSS property, which scales the placeholder chrome along with the future diagram and has uneven engine history. | `DiagramFrame.tsx:149` | Prefer `transform: scale()` with `transform-origin`, or defer scaling to the real renderer. | XS |
| F5 | cleanup | Two click targets fall below the DESIGN.md 32px minimum: the context-pill remove button (bare `<button>` around a 14px icon, no sizing) and the settings theme-option buttons (`px-sm py-xs` ≈ 29px). DESIGN.md also *prefers* 40px for primary actions; only `welcome.openFile` uses `size="md"`. | `AgentPanel.tsx:143-151`; `SettingsDialog.tsx:61-77`; `VellumButton.tsx:20-23` | Give both a 32px min box; consider `size="md"` for Connect / Allow once / Accept edit. | S |
| F6 | — (clean) | F6 / Shift+F6 region cycling implemented and correct. Arrow-key roving-focus toolbars implemented and **RTL-aware** (`getComputedStyle(...).direction`). Polite live region for streaming present. Landmarks present: `main`, `aside`, two labelled `section`s, `role="toolbar"`. Status never signalled by color alone — `StatusPill` always pairs icon + label, gutter badges pair icon + line number. Logical properties throughout the shell; **zero** physical-direction utilities outside `components/ui/`. One `rtl:` variant correctly flips the send icon. | `WorkspaceLayout.tsx:45-76`; `Toolbar.tsx:15-34`; `AgentPanel.tsx:104-124,176`; `StatusPill.tsx:14` | No action. | — |
| F7 | — (clean) | **Full contrast sweep run against both themes.** 46 token pairs measured; everything passes AA except the two items already filed as E5 and E12. Notably `tertiary-dark` does hold its promised ≥4.5:1 on dark surfaces (7.93 / 7.15). | script over `styles.css` values | No action beyond E5/E12. | — |

### G. Fonts and offline readiness

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| G1 | — (clean) | **Amendment 4 landed.** Fonts are `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono`, imported from the stylesheet. A grep for `https?://`, `fonts.googleapis`, `cdn.`, `<link ` across all of `src/` and `public/` returns **no hits**. | `styles.css:4-5` | No action. | — |
| G2 | cleanup | Offline-cleanliness is asserted from source, not proven from output — `node_modules` is absent so nothing was built. | — | Add a Phase 2 CI gate that greps built `dist/` for external origins. | S |

### H. Dependencies

Contract-permitted set: React, Tailwind v4, Radix/shadcn, i18next, react-resizable-panels, @fontsource.

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| H1 | blocker | Remove with A1: `@tanstack/react-start`, `nitro`, `@lovable.dev/vite-tanstack-config`. | `package.json:36,85,80` | Remove; hand-write `vite.config.ts`. | (in A1) |
| H2 | contract-violation | Remove with A5: `@tanstack/react-query`. | `package.json:34` | Remove. | (in A5) |
| H3 | cleanup | **Twelve removable dependencies.** Ten are imported only by dead shadcn files — `recharts`, `embla-carousel-react`, `react-day-picker`, `react-hook-form`, `cmdk`, `input-otp`, `vaul`, `sonner`, plus `class-variance-authority` (9 hits, all in `components/ui/`, none in a Vellum component). Two have **zero** import sites anywhere: `date-fns`, `@hookform/resolvers`. | verified by import-site grep | Delete alongside I1. | S |
| H4 | — (add) | B5 requires adding `i18next-icu` + `intl-messageformat`. | SPEC §9 | Add to the permitted list when B5 lands. | — |
| H5 | question | `zod` has exactly one use (`validateSearch` on the workspace route); `tw-animate-css` supplies the Radix enter/exit animation classes for the four surviving shadcn components. Neither is on the permitted list. | `index.tsx:3,14-17`; `styles.css:3` | See Q8. | — |
| H6 | — (justified) | `clsx`, `tailwind-merge`, `lucide-react`, `vite-tsconfig-paths`, `@tanstack/react-router`, `react-resizable-panels`, both `@fontsource-variable` packages. | — | Keep. | — |

### I. Dead weight

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| I1 | cleanup | **42 of 46 shadcn components are unused.** Only `dialog`, `dropdown-menu`, `select`, `resizable` are imported by shell code; those pull in `button`, `input`, `label`, `separator`, `sheet`, `skeleton`, `toggle`, `tooltip` internally. Everything else is dead — and it is where all 54 physical-direction utilities and most arbitrary-value classes live. | `src/components/ui/` | Delete the unused files and their `@radix-ui/*` dependencies. Verify the internal-dependency set before deleting. | M |
| I2 | cleanup | `src/hooks/use-mobile.tsx` is imported only by `ui/sidebar.tsx`. | `src/hooks/use-mobile.tsx` | Delete with I1. | XS |
| I3 | cleanup | One unreferenced testid: `testIds.preview.toolbar`. The `PreviewPane` header strip carries no testid. | `testids.ts:44`; `PreviewPane.tsx:24` | Attach it to the header strip rather than deleting. Note in the commit body either way. | XS |
| I4 | cleanup | `bunfig.toml` bypasses its own 24-hour supply-chain guard for four `@lovable.dev/*` packages; three aren't even dependencies. | `bunfig.toml:6` | Drop the excludes list when `@lovable.dev/vite-tanstack-config` goes. | XS |

### J. Test seams

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| J1 | — (clean) | **testids are clean.** 96 registry entries; every interactive and state-bearing element carries one; **zero** inline `data-testid` string literals. The one dynamic lookup reads ids back out of the registry. Composite ids are derived from registry roots. | `testids.ts`; `WorkspaceLayout.tsx:54`; `SettingsDialog.tsx:66` | No action. | — |
| J2 | — (clean) | **Fixtures are complete and load-bearing.** Three document states and five agent states = 15 combinations, all reachable. `failed` covers both an error diagnostic and a lint-warning diagnostic, which is what exercises the warning/danger token split. | `fixtures/index.ts:208-220` | No action; do not delete a state. | — |
| J3 | question | The switcher reads `?doc=` and `?agent=`, **not** `?state=` as CLAUDE.md and the handoff both specify. | `index.tsx:14-17`; `StateSwitcher.tsx:17` | See Q1. | — |
| J4 | cleanup | `StateSwitcher` renders only under `import.meta.env.DEV`. The params themselves work in any build (`validateSearch` is unconditional), so Playwright can drive states in production — but `testIds.dev.*` will not exist there. | `index.tsx:79-88` | Decide which build the Phase 2 gates run against; state it in the Playwright config. | S |
| J5 | cleanup | `/welcome` is unreachable from the UI — nothing links to it, and under memory history there is no URL bar. | grep: no `to="/welcome"` anywhere | See Q4. | — |

### L. SPEC conformance (new this pass)

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| L1 | contract-violation | **No CSP.** SPEC §12 requires "CSP on renderer". There is no CSP meta tag or header anywhere. | `__root.tsx:80-107`; no `index.html` | Add a strict CSP meta to the new `index.html` in A1. | S |
| L2 | contract-violation | **`styles.css` is hand-authored where SPEC §9 requires it generated.** `packages/design-tokens` is meant to hold DESIGN.md as the single source of truth, with `design.md export --format css-tailwind` producing the Tailwind v4 theme the shell consumes. Today the `@theme` block is hand-written, which is how E2–E5 drifted in unnoticed. | `styles.css:14-116` vs SPEC §9 | Phase 3: stand up `packages/design-tokens` and generate the theme. Until then, the Phase 2 `design.md lint` + `diff` gates are the backstop. | M |
| L3 | cleanup | **testid case convention mismatch.** SPEC §10.1 gives `editor.gutter.error-badge` (kebab-case element segment); the registry uses `editor.gutter.errorBadge` (camelCase) throughout. | `SPEC §10.1` vs `testids.ts` | See Q3 — pick one and make it uniform before tests are written against it. | S |
| L4 | cleanup | **No Save affordance.** SPEC §8 MVP lists "Open/save/watch local files". `TopToolbar` has Export but no Save control; `SaveStateBadge` displays save state with no way to act on it. | `TopToolbar.tsx:47-112`; `SaveStateBadge.tsx` | Add a Save control + testid, or confirm it is menu-only in Electron. | S |
| L5 | cleanup | **No pan controls.** SPEC §8 MVP requires "Pan/zoom on diagrams" and §9 requires "diagram pan/zoom **via keyboard**". `DiagramFrame` has four zoom controls and zero pan controls or testids. | `DiagramFrame.tsx:163-207`; `testids.ts:56-59` | Add pan affordances + testids, or record the deferral in the fixture contract. | S |
| L6 | cleanup | **No `accTitle`/`accDescr` seam.** SPEC §9: "Diagrams get accessible names/descriptions (Mermaid `accTitle`/`accDescr` surfaced and agent-fillable)". `DiagramBlock` has no fields for them, and `DiagramFrame` names the article `"Diagram {{id}}"` — an identifier, not an accessible name. | `types/shell.ts:18-26`; `DiagramFrame.tsx:50` | Add `accTitle?` / `accDescr?` to `DiagramBlock`; prefer them for the accessible name. Types-only, safe now. | S |
| L7 | cleanup | **`DocumentModel` is missing frontmatter fields.** SPEC §5 says frontmatter carries theme, mermaid version, and direction/RTL hints. The type has `mermaidVersion` only — no `theme`, no `direction`. This is also where the B4/Q4 RTL ownership question resolves. | `types/shell.ts:28-40` vs SPEC §5 | Add `theme?` and `direction?` when Q4 is answered. | S |
| L8 | — (context) | **M0 never happened.** SPEC §14 sequences M0 ("Monorepo, tokens, testid registry, transcript-player harness, CI gates — *seams before shell*") **before** M1's shell generation. The shell exists; `packages/design-tokens`, the transcript player, and every CI gate do not. Storybook (SPEC §10.4, "per shell component, a11y addon on") is likewise absent and is not in CLAUDE.md's Phase 2 gate list. | SPEC §10.4, §14 | This is why CLAUDE.md has a Phase 3. See Q9 on whether Storybook joins the Phase 2 gates. | — |

### M. Documentation defects (`docs/SPEC.md`, Lovable-authored)

Treat this file as evidence, not as a contract. Every row below is a place where it asserts something the code contradicts, or documents a contract breach as a feature.

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| M1 | ~~blocker~~ **resolved** | Sat at the path CLAUDE.md declares authoritative while contradicting invariant 2 — presenting the declined hash-history fallback as in-scope (§1) and mandating TanStack Start (§2, §4, §12). | `SHELL-AS-BUILT.md:15,28,66-71,314-319` (was `docs/SPEC.md`) | **Done.** Renamed to `docs/SHELL-AS-BUILT.md` with a warning header enumerating M2–M6; design document moved into `docs/SPEC.md`. | — |
| M2 | contract-violation | §3 labels `src/start.ts` "**App client entry**". It is nothing of the kind — it is `createStart()` with server `requestMiddleware` and CSRF middleware for server functions. The document misdescribes its own server file as client code. | `docs/SPEC.md:61` vs `src/start.ts:1-29` | Corrected by deleting the file (A2); note the error when rewriting the doc. | — |
| M3 | contract-violation | §8 reproduces the i18n init verbatim — **without `initImmediate`** — and captions it "initialized synchronously". The known defect is documented as correct behaviour, which is how it survived the amendment pass. | `docs/SPEC.md:252-265` vs B1 | Fix the code (B1), then the doc. | — |
| M4 | contract-violation | §9 claims "visible focus ring on every focusable (`2px solid var(--tertiary)`, `2px` offset)". F1 disproves this for all four shipping Radix wrappers. The a11y section asserts compliance that was never verified. | `docs/SPEC.md:273` vs F1 | Fix the code (F1); do not trust §9 as a compliance record. | — |
| M5 | cleanup | §6.4 and §13 call the diagram footer a "**pan**/zoom toolbar". There is no pan control, in the toolbar or anywhere else. | `docs/SPEC.md:152,328` vs L5 | Same fix as L5. | — |
| M6 | cleanup | §7 publishes a token list including `--muted` and the full invented dark diagnostic set, presenting them as the Vellum design system. This is the mechanism by which E2–E4 drifted: the invented tokens were written into a spec instead of back into DESIGN.md. | `docs/SPEC.md:198-232` vs `DESIGN.md:5-22` | Resolved by ratifying the tokens into DESIGN.md (E2–E4). | — |
| M7 | — (keep) | §13 "Future Integration Points" and §5 "Component Props Pattern" are accurate and genuinely useful — the clearest surviving description of the mount slots and the optional-callback convention. | `docs/SPEC.md:96-104,321-332` | Preserve these two sections when the file is renamed. | — |

### K. Repository state

| ID | Sev | Finding | Evidence | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- |
| K1 | cleanup | The branch has **no commits** — the entire tree is untracked. No baseline to diff Phase 1 against. | `git log` → "does not have any commits yet" | Commit the snapshot verbatim as `chore: import Lovable UI shell snapshot` before any Phase 1 edit. | XS |
| K2 | cleanup | `tsconfig.json` sets `noUnusedLocals: false` and `noUnusedParameters: false`; eslint sets `@typescript-eslint/no-unused-vars: "off"` — three suppressions of exactly the dead-code signal this milestone needs. | `tsconfig.json:20-21`; `eslint.config.js:33` | Turn all three on as part of Phase 2's zero-warning gate. | S |
| K3 | ~~blocker~~ **resolved** | Design document was at `mermaid-renderer-design-doc.md` (plus a duplicate root `SPEC.md`) while `docs/SPEC.md` held Lovable's contradictory description. | repo root; `docs/` | **Done.** Files swapped, duplicate deleted after byte-identity check. | — |

---

## 2. Questions for you

Two of the original questions were **resolved by the documents** and are now findings, not questions:

- *Lagoon on decorative icons* → DESIGN.md:108 is unambiguous ("If it isn't interactive or live, it isn't Lagoon"), but both flagged icons sit on cards whose **state** is live — the permission card while awaiting a decision, the diff card while pending. I read "live element" as covering them and have **not** filed a violation. Say the word if you read it strictly and I'll recolor both to slate.
- *Permission card focus* → SPEC §7.2's "non-blocking approval surface" settles it; filed as **F3** with the announce-don't-focus fix. Q6 below is only about which of the two remedies you want.

**Q0 is now resolved** (see below); the rest remain open.

**Q0 — Document layout. (M1, K3) — RESOLVED, one optional follow-up.** Files are now arranged as described in §0. The only open piece: CLAUDE.md's "Authoritative documents" list doesn't mention the as-built record, so a future reader may not know it exists or that it's non-binding. Proposed one-line addition under that list, for your approval — I have not edited CLAUDE.md:

> `docs/SHELL-AS-BUILT.md` — Lovable's description of the generated shell. Non-authoritative; a record of the pre-hardening state. Where it disagrees with this file, SPEC.md or DESIGN.md, they win.

**Q1 — `?state=` vs `?doc=`+`?agent=`.** CLAUDE.md invariant 6 and the handoff both name `?state=`. Lovable built two orthogonal params giving 15 addressable combinations. That is arguably a better seam, but Phase 2's "for each `?state=` fixture" gate has no single enumerable list to iterate. Rename to a flat `?state=` enum, keep both axes and amend CLAUDE.md, or add a `?state=` alias that expands to a doc+agent pair?

**Q2 — `label-caps` on pane titles (E6).** DESIGN.md is internally in tension: it names "pane titles, kbd hints" as the `label-caps` use case, then forbids `label-caps` on translatable strings — and every pane title in the shell is translated. The binding Don't is explicit, so my proposed fix drops `uppercase` and keeps the token. Confirm, or would you rather pane titles stop being translated?

**Q3 — testid casing (L3).** SPEC §10.1's example is kebab (`error-badge`); the registry is camel (`errorBadge`). 96 ids either way, and tests haven't been written yet, so this is cheap now and expensive later. Change the registry to kebab, or amend the SPEC to camel?

**Q4 — Who owns language and direction (B4, L7).** Under invariant 1 the shell shouldn't own locale state — it should receive it. But `lang`/`dir` on `<html>` must be driven by someone, and in Electron that someone is the renderer. SPEC §5 puts direction hints in document frontmatter, which suggests `DocumentModel.direction`. Should the shell (a) take `language` as a prop and set `lang`/`dir` as a pure render effect, (b) own `i18n.changeLanguage` as presentation state, or (c) drop the selector until `packages/core` exists?

**Q5 — One primary button per view (E8).** DESIGN.md caps it at one; the workspace shows two in the permission and diff fixtures, three with settings open. Does the icon-only prompt-send button count as a `button-primary`, or is the rule about full-size labelled buttons? If it counts, the send button should become secondary — which is a real affordance change.

**Q6 — Permission card remedy (F3).** Announce-only via the live region, or move focus but record and restore the prior element on resolve? Announce-only is truer to "non-blocking"; focus-and-restore is more discoverable for screen-reader users.

**Q7 — Border contrast (E12).** Borders sit at ~1.2–1.25:1. Fine as decorative dividers, questionable as the sole affordance cue for `button-secondary`. Darken `border`, give the secondary button its own higher-contrast outline token, or accept it and document the waiver so the `design.md lint` gate doesn't keep flagging it?

**Q8 — `zod` and `tw-animate-css` (H5).** Neither is on the permitted list. `zod`'s single use is replaceable by a six-line validator. `tw-animate-css` supplies the animation classes for the four surviving shadcn components — dropping it changes how dialogs and menus animate, which is a visual decision. Keep both, drop both, or drop `zod` only?

**Q9 — Does Storybook join the Phase 2 gates (L8)?** SPEC §10.4 requires it per shell component with the a11y addon; CLAUDE.md's Phase 2 list omits it. Add it to Phase 2, defer to Phase 3 with the rest of the M0 seams, or drop it in favour of the Playwright + axe coverage?

**Q10 — Are 404 and error routes reachable at all in Electron (B2, E7)?** Under memory history with two routes and no address bar, a 404 is unreachable by user action; a render crash still needs a surface. Delete `NotFoundComponent` and keep a token-styled `ErrorComponent`, or keep both?

**Q11 — `preview.diagnostic.unknownType` (B6).** Unused today, but reads like a diagnostic `packages/core` will emit. Keep as a reserved key or delete and re-add?

---

## 3. Proposed Phase 1 order

Sequenced so each step is independently verifiable and nothing later depends on a question staying open. Rough total: 3–4 days (up from 2–3 — the token ratification and ICU work are new).

0. **K1** — commit the snapshot as a baseline. (K3/M1 are already done: the docs are arranged and CLAUDE.md's SPEC reference now resolves correctly.) (XS)
1. **A1–A4, H1, L1** — SSR removal → pure Vite SPA, with the CSP meta added to the new `index.html`. Single largest step, and per M1 the *only* route that works — Lovable already tried `spa: true` and reverted it when the prerender step broke, so budget for full Start removal rather than a config flip. Verify: `dist/` is `index.html` + assets, no server bundle, no Worker entry, boots from `file://`. (L)
2. **B1** — `initImmediate: false`. Verify: no raw keys in the first paint. (XS)
3. **C1–C3** — memory history behind a constructor parameter; delete detection and the env read. (S)
4. **A5, H2** — remove react-query. (S)
5. **D1–D4, I4** — SEO meta, robots.txt, Lovable telemetry, README/package name, bunfig excludes. (S)
6. **E2–E5 (DESIGN.md side)** — one lint-gated PR ratifying `muted`, the dark diagnostic set, `warning-surface`, and a new `tertiary-surface`; then E5's five call sites, E9–E11. **This is the step that closes a real AA failure.** (M)
7. **E6** — drop `uppercase` from the seven `label-caps` sites (blocked on **Q2**). (S)
8. **B2, E7** — 404/error components: translate + Vellum tokens, or delete (blocked on **Q10**). (S)
9. **F1, F2, F5** — focus-ring overrides, nested live regions, sub-32px targets. (S)
10. **F3** — permission card focus (blocked on **Q6**). (S)
11. **I1–I3, H3** — delete 42 shadcn components, `use-mobile`, twelve dependencies; attach `preview.toolbar`. Deliberately after F1 so there are fewer files to touch for the focus ring. (M)
12. **B6** — dead i18n keys (blocked on **Q11**). (XS)
13. **B5, H4** — ICU message format (blocked on nothing, but touches every plural in `en.json`). (M)
14. **B4, L7** — language/RTL wiring + `DocumentModel.direction` (blocked on **Q4**). (M)
15. **L6** — `accTitle`/`accDescr` on `DiagramBlock`; types-only, safe. (S)
16. **L3** — testid casing sweep (blocked on **Q3**); do it before Phase 2 writes tests against the registry. (S)
17. **K2** — enable `noUnusedLocals`, `noUnusedParameters`, `no-unused-vars`; fix fallout. Feeds the Phase 2 zero-warning gate. (S)

**Deferred to Phase 3 by design:** L2 (`packages/design-tokens` generating the theme), L8 (the rest of the M0 seams — transcript player, CI gates, Storybook pending Q9).

**Blocked on your input:** Q2 (step 7), Q3 (step 16), Q4 (step 14), Q6 (step 10), Q8 (step 11's dependency list), Q10 (step 8), Q11 (step 12). Q1, Q5, Q7 and Q9 shape Phase 2 rather than Phase 1 and can wait.

**Not blocking, but worth knowing:** L4 (no Save control) and L5 (no pan controls) are shell gaps against SPEC §8's MVP list. Both are additive and belong in M2 rather than this hardening pass — flagged so they don't get lost.
