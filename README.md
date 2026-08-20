# Vellum

A Mermaid document renderer. This repository holds the Electron renderer shell
and the contracts it is built against.

The shell is **presentation-only by contract**: props-driven components, i18next
strings, design tokens, and fixture-driven states. Document parsing, the mermaid
pipeline and the agent client are injected dependencies, not code that lives
here. See [`docs/SPEC.md`](docs/SPEC.md) §4 for the architecture and
[`DESIGN.md`](DESIGN.md) for the visual system — both are authoritative.

## Layout

```
apps/
  electron/renderer/   the UI shell — React, Vite, Tailwind, TanStack Router
packages/
  core/                domain contracts (types only, no logic yet)
```

`packages/acp-client`, `packages/transport`, `packages/test-agents` and
`packages/design-tokens` are specified in SPEC §4 and not yet present.

## Development

Requires Node.js 22+ and pnpm. The pnpm version is pinned by `packageManager` in
the root `package.json`, so `corepack` will fetch the right one:

```bash
corepack enable pnpm
```

Then:

```bash
pnpm install
pnpm dev
```

The app runs fully offline — fonts and translations are bundled, and nothing is
fetched at runtime.

### Fixture states

There is no data layer, so every screen is driven by a fixture. In a dev build a
switcher appears in the corner; any state is also addressable directly:

```
/?state=<document>-<agent>
```

Both halves are enumerated in `apps/electron/renderer/src/fixtures/index.ts`.
The lists are derived from the fixtures themselves, so adding one wires it into
the dev switcher, the route's search-param validation and the test sweep at
once.

## Checks

`pnpm check` runs everything CI runs:

| Command               | What it enforces                                                 |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm typecheck`      | strict TypeScript across every package                           |
| `pnpm lint`           | ESLint, including a guard against server-side imports            |
| `pnpm format:check`   | Prettier                                                         |
| `pnpm check:contrast` | every token pair at WCAG 2.1 AA, both themes                     |
| `pnpm build`          | a static SPA with no server or worker bundle                     |
| `pnpm test`           | Playwright: render, axe at WCAG 2.1 AA, RTL, pseudo-localization |

The Playwright gates run against the **production build**, not the dev server.

## Built with

- React + Vite
- TanStack Router (memory history — this ships in Electron, there is no URL bar)
- Tailwind CSS v4
- i18next with ICU message formatting
- Playwright + axe-core
