> [!WARNING]
> **Non-authoritative. This is a record, not a contract.**
>
> Lovable wrote this file to describe the shell it generated. It was previously at `docs/SPEC.md`,
> the path `CLAUDE.md` treats as law — it is not that document. The design document is
> [`docs/SPEC.md`](./SPEC.md); the visual contract is [`../DESIGN.md`](../DESIGN.md); binding
> invariants are in [`../CLAUDE.md`](../CLAUDE.md). Where this file disagrees with any of those,
> those win.
>
> Known to be wrong or contradictory (see [`docs/AUDIT.md`](./AUDIT.md) §M):
>
> - **§1, §2, §4, §12** present TanStack Start SSR and the hash-history fallback as intended
>   architecture. Both violate CLAUDE.md invariant 2. §4/§12/§14 record that the `spa` option was
>   tried, broke the prerender step, and was reverted — the reversal is documented here as a design
>   decision rather than reported as a failure.
> - **§3** labels `src/start.ts` an "App client entry". It is server request middleware with CSRF.
> - **§8** reproduces the i18n init without `initImmediate` and captions it "synchronous". That
>   omission is the cause of the raw-key defect.
> - **§9** claims a 2px/2px focus ring on every focusable. Four shipping Radix wrappers override it.
> - **§6.4, §13** describe a "pan/zoom toolbar". There is no pan control.
> - **§7** publishes `--muted` and a full dark diagnostic palette as Vellum tokens. Neither is in
>   DESIGN.md; they were invented during generation.
>
> Still accurate and worth keeping: **§5** (props conventions) and **§13** (future integration
> points) are the clearest surviving description of the shell's seams.

# Vellum UI Shell — Specification

A presentation-only UI shell for a desktop Mermaid document renderer. It is designed to ship inside an Electron wrapper with no backend server, no data fetching, and no persistent storage. All data arrives via props; the shell provides the chrome, layout, and accessibility scaffolding while leaving parsing, file I/O, and agent networking to future integration layers.

## 1. Purpose & Scope

**In scope**

- Resizable workspace for editing markdown and previewing Mermaid diagrams.
- Agent panel with transcript, tool calls, plan steps, permission prompts, and diff previews.
- Welcome screen with recent files and diagram templates.
- Settings dialog for theme, Mermaid version, and language.
- Synchronous, bundled i18n and self-hosted fonts so the app runs fully offline.
- Props-driven rendering with no global state, stores, or server logic.
- SPA routing with hash-history fallback for `file://` / Electron loading.
- Comprehensive test seams and dev fixture states.

**Out of scope**

- Real Mermaid rendering, markdown parsing, or CodeMirror integration.
- File I/O, Electron IPC, agent transport, undo/redo, command palette, tabs.
- Backend, server functions, auth, or persistence.

## 2. Tech Stack

| Layer       | Technology                                                          |
| ----------- | ------------------------------------------------------------------- |
| Framework   | React 19 + TanStack Start v1 + TanStack Router                      |
| Build tool  | Vite 8 via `@lovable.dev/vite-tanstack-config`                      |
| Styling     | Tailwind CSS v4 (`src/styles.css` with `@theme inline`)             |
| Primitives  | shadcn/ui + Radix (dialog, dropdown, select, tooltip, etc.)         |
| Panels      | `react-resizable-panels`                                            |
| Icons       | `lucide-react`                                                      |
| i18n        | `i18next` + `react-i18next`                                         |
| Fonts       | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` |
| Type safety | TypeScript 5.8 with `exactOptionalPropertyTypes` enabled            |

## 3. Directory Structure

```text
src/
├── components/
│   ├── agent/           # AgentChip, AgentPanel, DiffPreviewCard, PermissionCard, SessionTranscript
│   ├── common/          # ThemeProvider, Toolbar, VellumButton, StatusPill
│   ├── dev/             # StateSwitcher (dev-only fixture picker)
│   ├── editor/          # EditorHost
│   ├── preview/         # PreviewPane, DiagramFrame
│   └── workspace/       # WorkspaceLayout, TopToolbar, StatusBar, SaveStateBadge, SettingsDialog
├── fixtures/            # Document and agent fixture data
├── i18n/                # Synchronous i18n config + bundled English JSON
├── lib/                 # Utilities and error handling
├── routes/              # TanStack Router routes
│   ├── __root.tsx
│   ├── index.tsx        # Workspace
│   └── welcome.tsx
├── styles.css           # Vellum design tokens
├── testids.ts           # Single registry of `data-testid` constants
├── types/shell.ts       # Presentation contracts
├── router.tsx           # Router factory with hash-history fallback
├── server.ts            # SSR error wrapper (kept for TanStack Start compatibility)
└── start.ts             # App client entry
```

## 4. Routing

The app uses TanStack Router with a **hash-history fallback** for desktop loading. `src/router.tsx` creates a router that falls back to hash history when:

- `import.meta.env['VITE_ROUTER_HISTORY'] === "hash"`, or
- `window.location.protocol === "file:"` (Electron).

This lets the same code run in a browser and inside a `file://` Electron shell without path-history breakage. The standard TanStack Start build path remains intact; the `spa` option is intentionally not enabled because it breaks the build's prerender step.

### Routes

| Route      | File                     | Purpose                                                                      |
| ---------- | ------------------------ | ---------------------------------------------------------------------------- |
| `/`        | `src/routes/index.tsx`   | Workspace with dev fixture switcher via `?doc=` and `?agent=` search params. |
| `/welcome` | `src/routes/welcome.tsx` | Landing page with recent files and templates.                                |

`__root.tsx` provides the root layout, `ThemeProvider`, `QueryClientProvider`, and `HeadContent` for meta tags.

## 5. Data Model

All UI state is typed in `src/types/shell.ts` and passed through props. No component reads from a global store or makes network requests.

### Key Types

- `DocumentModel` — file metadata, source preview lines, diagram blocks, diagnostics, cursor, Mermaid version.
- `DiagramBlock` — block id, diagram type, line range, render state (`empty` | `loading` | `ready` | `error`), optional diagnostic.
- `Diagnostic` — id, severity (`error` | `warning`), i18n message key/values, line/column.
- `AgentSession` — connection state, agent name, transcript items, optional streaming text, permission, diff, and block context.
- `AgentItem` — union of `text`, `plan`, and `toolCall`.
- `PermissionRequest` — tool name, target summary, optional resolution.
- `DiffPreview` — id, title key, file path, before/after lines, status.

### Component Props Pattern

Every callback prop is typed as optional with explicit `undefined` support:

```ts
onAskAgent?: ((blockId: string) => void) | undefined;
```

Components must handle the undefined case gracefully (no-op).

## 6. Component Specification

### 6.1 Workspace Layout

`WorkspaceLayout` is the root of the `/` route. It renders:

1. `TopToolbar` with file name, save state, export menu, theme toggle, agent panel toggle, settings button, and `AgentChip`.
2. A `ResizablePanelGroup` containing:
   - `EditorPane` → `EditorHost`
   - `ResizableHandle`
   - `PreviewPane`
   - (optional) `ResizableHandle` + `AgentPanel` when the agent drawer is open
3. `StatusBar` at the bottom.
4. `SettingsDialog`.

**Keyboard:** F6 / Shift+F6 cycles focus across editor → preview → agent panel → status bar.

**Panel sizing:** `ResizablePanelGroup` is keyed by `agentOpen` so the panel group remounts and recalculates sizes when the agent drawer is toggled. Sizes are passed as strings (`"25"`, `"38"`, `"37"`, etc.).

### 6.2 Editor Host

`EditorHost` is a frame only. It renders:

- A toolbar with soft-wrap toggle and format action.
- A sticky gutter with line numbers and diagnostic badges (error or warning icons).
- A scroll container showing the document's `sourcePreview` lines.
- A placeholder note where CodeMirror will mount later.

Diagnostic badges in the gutter use `CircleAlert` for errors and `AlertTriangle` for warnings. Underline decorations in the source match the severity (`decoration-wavy` for errors, `decoration-dotted` for warnings).

### 6.3 Preview Pane

`PreviewPane` renders a vertical stack of `DiagramFrame` cards. When `blocks` is empty it shows a centered empty-state guidance panel.

### 6.4 Diagram Frame

`DiagramFrame` is the chrome around a single diagram block. It never renders Mermaid itself.

- **Caption bar:** block id (mono), diagram type badge, and an error/warning line reference when the block is in error state.
- **Hover toolbar:** copy, export SVG, export PNG, ask agent (visible on hover/focus on desktop, always visible on mobile).
- **Body:**
  - `loading` state shows a spinner.
  - `error` state shows an `ErrorCard` with severity-specific tokens:
    - `error` → `bg-danger-surface text-danger`
    - `warning` → `bg-warning-surface text-warning`
  - otherwise shows a dashed mount slot with zoom applied.
- **Footer pan/zoom toolbar:** zoom in/out, reset, fit.

### 6.5 Agent Panel

`AgentPanel` renders in a complementary `aside` region.

- **Disconnected state:** centered empty state with a connect button.
- **Active state:**
  - `SessionTranscript` for messages, plan steps, and tool calls.
  - `PermissionCard` (inline, non-blocking) when a permission is pending.
  - `DiffPreviewCard` when a diff is present.
  - `StreamingIndicator` in a polite live region.
  - `PromptInput` with a removable block-context pill.

**Diff accept/reject:** When the user accepts or rejects a diff, the result is announced in the live region (`agent.diff.status.accepted` / `rejected`) and focus is returned to the prompt textarea.

### 6.6 Permission Card

`PermissionCard` is an inline card inside the transcript, never a modal. It shows the tool name, target summary, and three actions: **Allow once**, **Always this session**, and **Deny**. It supports roving arrow-key focus and returns focus to the transcript on Escape.

### 6.7 Top Toolbar

`TopToolbar` uses `Toolbar` for roving arrow-key focus across icon-only buttons. It includes:

- File name + `SaveStateBadge` (`saved` | `unsaved` | `saving` | `error`).
- Export dropdown with SVG, PNG, and Markdown options.
- Theme toggle.
- Agent panel toggle.
- Settings button.
- `AgentChip` showing the current agent state with a pulsing ring while awaiting permission.

### 6.8 Status Bar

`StatusBar` is a `role="status"` region showing:

- Cursor position (`Line {{line}}, column {{column}}`).
- Mermaid version.
- Diagnostics count (with `aria-live="polite"`).
- Region-hint text.

## 7. Design System (Vellum Tokens)

All visual values live in `src/styles.css` as semantic CSS variables. No component hardcodes colors.

### Light Theme

```css
--foreground: #16181a;
--secondary: #5c6470;
--tertiary: #0e7c7b;
--tertiary-hover: #0b6362;
--on-tertiary: #ffffff;
--background: #fafaf8;
--surface-raised: #ffffff;
--muted: #f2f1ed;
--border: #e3e1dc;
--danger: #b3261e;
--danger-surface: #fbeae9;
--warning: #8a5a00;
--warning-surface: #fdf3e0;
--success: #1e7b34;
```

### Dark Theme

```css
--foreground: #e8e6e1;
--secondary: #9ba3ad;
--tertiary: #3fbdb8;
--tertiary-hover: #58cdc8;
--on-tertiary: #0b1416;
--background: #141619;
--surface-raised: #1d2024;
--muted: #23272c;
--border: #2a2e33;
--danger: #f2b8b5;
--danger-surface: #38211f;
--warning: #e0a949;
--warning-surface: #33280f;
--success: #6cd48a;
```

### Typography

- Sans: `Inter Variable`
- Mono: `JetBrains Mono Variable`

### Spacing & Radius

- Spacing: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=40`
- Radius: `control=4`, `panel=8`, `pill=12`

### Motion

- Default transition: `120ms ease-out` via the `vellum-motion` utility.
- Pulse animation: `1.2s` ring pulse on the agent chip while awaiting permission.
- All motion is disabled under `prefers-reduced-motion: reduce`.

## 8. Internationalization (i18n)

i18n is initialized synchronously in `src/i18n/index.ts` with the English bundle imported directly:

```ts
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
```

- No HTTP backend, no async loading, no language detector.
- The translation JSON is bundled into the client build.
- All user-facing strings come from `src/i18n/en.json` via `useTranslation()`.
- Logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`) are used for RTL support; `dir` can be driven from the i18n language in future work.

## 9. Accessibility Requirements

- **Landmarks:** `main`, `complementary` (agent panel), `toolbar` (toolbars), `status` (status bar).
- **Regions:** All major regions have `aria-label` values from i18n keys.
- **Focus:** visible focus ring on every focusable (`2px solid var(--tertiary)`, `2px` offset).
- **Toolbars:** arrow-key roving focus across icon-only buttons.
- **Region cycling:** F6 / Shift+F6 cycles editor → preview → agent panel → status bar.
- **Dialogs:** Radix Dialog provides focus trap and focus restoration.
- **Live regions:**
  - Diagnostics count uses `aria-live="polite"`.
  - Agent streaming output and diff accept/reject results use a polite live region in the agent panel.
- **No color-only signals:** error/warning states always pair color with an icon and text.
- **Icon-only buttons:** every icon-only button has an `aria-label` from i18n.

## 10. Test Seams

`src/testids.ts` exports a single registry of constants in `region.component.element` form. Every `data-testid` attribute in the app must import from this file. Examples:

```ts
workspace.toolbar.root;
preview.diagramFrame.root;
agent.prompt.input;
settings.dialog.theme;
```

## 11. Fixtures & Dev State Switcher

`src/fixtures/index.ts` provides static fixtures for every component state:

**Documents**

- `empty` — no blocks, saved state.
- `multi` — three ready blocks.
- `failed` — one parse error, one lint warning.

**Agent sessions**

- `disconnected`
- `idle`
- `streaming`
- `permission` — permission prompt pending.
- `diff` — diff preview pending.

In development, `src/components/dev/StateSwitcher.tsx` is mounted on the workspace route. It reads and writes `?doc=` and `?agent=` search params so designers and QA can quickly switch between states.

## 12. Build & Runtime Constraints

- **Hash-history for Electron:** `src/router.tsx` detects `file://` protocol and switches to hash history automatically. The standard TanStack Start build path remains intact and the `spa` option is intentionally not enabled, because it breaks the build's prerender step.
- **No server functions:** No `createServerFn` calls, no loaders, no API routes. `src/server.ts` is retained only as the TanStack Start server entry wrapper and is not used for business logic.
- **Offline-first:** fonts and i18n resources are bundled; no external network requests are required.
- **Worker runtime:** Even though the app is client-only, the TanStack Start build emits a Cloudflare-compatible Worker entry. Avoid Node-only APIs (`child_process`, `fs.watch`, native binaries, etc.) in any code that could reach the server bundle.

## 13. Future Integration Points

The shell leaves explicit seams for future work:

| Future system     | Integration point                                                   |
| ----------------- | ------------------------------------------------------------------- |
| CodeMirror editor | `EditorHost` scroll container / mount slot                          |
| Mermaid renderer  | `DiagramFrame` mount slot + zoom footer                             |
| File system       | `TopToolbar` export callbacks, `WelcomePage` open file action       |
| Agent transport   | `AgentPanel` `onSend`, `onConnect`, `onResolvePermission` callbacks |
| Diff application  | `DiffPreviewCard` `onAccept` / `onReject` callbacks                 |
| Undo/redo         | external state manager feeding `document` props                     |

## 14. Changelog Notes

- Added hash-history fallback for Electron while keeping the standard TanStack Start build path (the `spa` option was removed because it broke the build's prerender step).
- Replaced Google Fonts with self-hosted `@fontsource-variable` packages.
- Bundled i18n resources synchronously so no async loading occurs.
- Added warning surface tokens and applied them to lint-warning diagnostics.
- Implemented diff accept/reject focus return and polite live-region announcement.
