# Vellum UI Shell — Approved Plan (revised)

The UI shell is already built. This revision applies the five requested changes so the shell runs as an offline, SSR-free desktop app.

## 1. SPA-only routing
- Turn off server rendering and prerendering so every route renders in the browser only.
- Remove reliance on loaders/server functions; all state stays props-driven and in-memory.
- Verify the app boots from a static entry and that the workspace route works without any server round-trip, so it can later be swapped to memory/hash history inside Electron.

## 2. Synchronous i18n
- Keep the English resource bundle imported directly and initialized before first render, so no translation keys ever appear raw on screen.
- No HTTP/async language backend, no suspense-based loading.

## 3. Warning tokens for lint diagnostics
- Add `warning-surface` alongside the existing `warning` token in both light and dark themes.
- The diagnostic card gains a severity distinction: errors keep the danger tokens, lint warnings use warning tokens only.

## 4. Self-hosted fonts
- Install `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` and import them in the stylesheet entry.
- Remove the Google Fonts preconnect/stylesheet links so nothing is fetched from the network.

## 5. Diff accept/reject feedback
- After Accept or Reject, focus returns to the agent prompt input.
- The polite live region announces the outcome ("Change accepted" / "Change rejected") using translated strings.

## Technical notes
- SPA mode: disable SSR/prerender in the app config and root route; keep TanStack Router (framework is fixed) with client-only rendering.
- New tokens: `--warning-surface` in `:root` and dark theme, exposed as `--color-warning-surface`.
- `DiagramFrame` diagnostic card takes a `severity` from the block diagnostic (`error` | `warning`) and picks token classes accordingly; fixtures gain a lint-warning example.
- Focus handling uses a ref passed from `AgentPanel` to the prompt input; announcement text is written into the existing polite live region.
- New test ids for the warning card and the announcement text.
