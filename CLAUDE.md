# CLAUDE.md — Vellum (Mermaid Document Renderer)

## What this codebase is

A Lovable-generated **UI shell** for a Mermaid document renderer. It is presentation-only by contract: props-driven components, i18next strings, Vellum design tokens, fixture-driven states. It becomes the renderer layer of an Electron app inside a monorepo (see SPEC §4). You are hardening it to production, not extending its scope.

Authoritative documents (keep in `docs/`):
- `docs/SPEC.md` — the design document. §4 architecture, §9 design system, §10 test seams, §11 defines your role.
- `DESIGN.md` — visual identity, Vellum. Tokens are law; prose Do's/Don'ts are binding.

## Invariants — enforce always, never "improve"

1. **Shell stays dumb.** No data fetching, no business logic, no persistence in the shell. All logic arrives via injected dependencies (`packages/core`, `packages/acp-client` — not yet present; leave seams, don't stub logic).
2. **This ships in Electron. There is no server.** No SSR, no server functions, no loaders doing work. Router uses memory history behind a single constructor parameter — no runtime detection/fallback logic.
3. **Tokens are law.** No color/radius/spacing/type literals outside the theme layer. Lagoon (`tertiary`) appears only on interactive or live elements. Warnings use `warning` tokens, never `danger`. Do not restyle, "modernize," or reinterpret the design.
4. **Zero hardcoded user-facing strings.** Every string through i18next, resources bundled synchronously at init. Logical CSS properties only (`ms-/me-/ps-/pe-`, `start/end`).
5. **testids.ts is the only source of test ids** (`region.component.element`). Every interactive/state-bearing element carries one.
6. **Fixtures + `?state=` dev switcher are load-bearing test seams.** Preserve and extend them; never delete a state.
7. **A11y contract:** focus ring (2px tertiary, 2px offset) on all focusables both themes; landmarks (`main`/`complementary`/`toolbar`/`status`); focus trap+restore in dialogs; arrow-key toolbars; F6 region cycling; polite live regions for streaming and diagnostics; no color-only signals.
8. When Lovable output violates the contract ambiguously, **flag it in your report — don't silently reinterpret.** Mechanical violations (a hex literal, a physical margin utility) fix directly.

## Current milestone: M1 hardening pass

### Phase 0 — Audit (read-only; produce `docs/AUDIT.md` before any edit)

- **SSR/Start residue:** grep for `createServerFn`, server routes, SSR entry points, loaders with logic. Confirm the build is a pure SPA. Note: the deployed Lovable preview was serving SSR markup with raw i18n keys — verify the fix actually landed in this snapshot.
- **i18n:** resources bundled sync (`initImmediate` semantics, no async backend); offline render shows zero raw keys; en.json keys match usage (dead keys, missing keys).
- **Token fidelity:** scan for literal colors/px values outside theme; audit every Lagoon usage against the interactive-only rule; verify warning vs danger separation; verify `.dark` mapping completeness.
- **Strings:** scan JSX for literal user-facing text, including aria-labels and placeholders.
- **Logical properties:** grep `ml-|mr-|pl-|pr-|left-|right-|text-left|text-right` physical utilities.
- **testids:** every interactive element covered; no inline testid strings.
- **Fonts:** self-hosted via @fontsource; no external `<link>` fetches of any kind at runtime.
- **Dependency audit:** flag anything beyond React, Tailwind v4, Radix/shadcn, i18next, react-resizable-panels, @fontsource. Lovable-added extras are guilty until justified.
- **Dead weight:** SEO artifacts, unused shadcn components, unused routes/helpers (typed-env helpers etc. were declined — remove if present).

### Phase 1 — Fix to contract
Work the audit findings. Priority: SSR removal → i18n → routing (memory history param) → tokens → strings/logical props → fonts → dead-weight removal. Small commits, one concern each.

### Phase 2 — Gates (make them pass, then make them required)
- Playwright: for each `?state=` fixture — renders, no console errors, key testids present.
- axe-core run per fixture state, zero violations at WCAG 2.1 AA.
- Pseudo-localization build: no raw keys, no clipped critical labels, RTL smoke (dir=rtl renders, panes mirror).
- `npx @google/design.md lint DESIGN.md` clean; add `diff` check to CI for token PRs.
- Type-check and build clean with zero warnings treated as acceptable.

### Phase 3 — Monorepo migration
Move to `apps/electron/renderer` per SPEC §4 layout. Extract shared shell types (`DocumentModel`, `DiagramBlock`, `AgentSession`, `PermissionRequest`, `DiffPreview`, `Diagnostic`) toward `packages/core` contracts — types only, no logic yet. Set up workspace tooling (pnpm workspaces or turbo) and CI running the Phase 2 gates.

### Definition of done (M1)
All gates green in CI; audit findings resolved or explicitly waived in AUDIT.md; repo in monorepo layout; zero Lovable-authored logic outside the presentation layer; a fresh clone runs fully offline.

## Working rules
- Estimate before large refactors; prefer many small verified steps.
- Never delete a fixture state, testid, or i18n key without noting it in the commit body.
- Anything ambiguous about visual or interaction design: DESIGN.md prose wins; if still ambiguous, flag, don't guess.
