# Mermaid Document Renderer — UI Shell Plan

Presentation-only shell. Every component is props-driven, strings go through i18next, all visuals come from the Vellum tokens.

## Foundations

- **Tokens**: map DESIGN.md colors, radii (4/8/12), spacing (4/8/16/24/40) and type styles into `src/styles.css` `@theme inline` as semantic vars (`--color-primary`, `--color-tertiary`, `--color-surface-raised`, `--color-danger-surface`, etc.) with a `.dark` block using the `*-dark` set. Inter + JetBrains Mono loaded via `<link>` in `__root.tsx`. Global focus-ring utility: 2px tertiary outline, 2px offset. Motion utility capped at 150ms and disabled under `prefers-reduced-motion`.
- **i18n**: `i18next` + `react-i18next`, single `src/i18n/en.json` with region-namespaced keys (`workspace.*`, `editor.*`, `preview.*`, `agent.*`, `settings.*`, `welcome.*`, `a11y.*`). No literal user-facing strings anywhere. Logical properties only (`ms-/me-/ps-/pe-`, `start/end`), `dir` driven from the i18n language.
- **Test seams**: `src/testids.ts` exports every id as a constant in `region.component.element` form; components import constants only.
- **Fixtures**: `src/fixtures/` — documents (empty, multi-block, one-failed-block), agent sessions (disconnected, idle, streaming, permission-pending, diff-pending), recent files, templates. Dev state switcher reads `?state=` (e.g. `?state=agent.streaming`) and renders a floating dev menu listing all fixture combos, mounted only in dev.
- **Types**: `src/types/shell.ts` — `DocumentModel`, `DiagramBlock`, `Diagnostic`, `AgentSession`, `AgentItem`, `PermissionRequest`, `DiffPreview`. All UI state lives in a small `WorkspaceUIProvider` (theme, panel sizes, open dialog, agent panel open). No fetching, no storage.

## Screens

### 1. Main workspace (`/`)
```text
WorkspaceLayout (main)
├── TopToolbar (role=toolbar, arrow-key roving)
│   ├── FileNameLabel + SaveStateBadge (icon+text: saved/unsaved/saving)
│   ├── ExportMenu (dropdown)  ThemeToggle  SettingsButton
│   └── AgentChip (disconnected | idle | streaming | awaiting-permission)
├── SplitPane (react-resizable-panels, mirrors under RTL)
│   ├── EditorPane → EditorHost (placeholder slot)
│   │   ├── EditorToolbar
│   │   ├── GutterColumn (line numbers + ErrorBadge slots: icon + line no.)
│   │   └── ScrollContainer with mono placeholder text
│   └── PreviewPane (see 2)
├── AgentPanel drawer (complementary) (see 3)
└── StatusBar (role=status): cursor pos, mermaid version, diagnostics count (aria-live=polite)
```
Region cycling with F6/Shift+F6 across editor → preview → agent panel → status.

### 2. Preview pane
`PreviewPane` → vertical stack of `DiagramFrame` cards. Each card:
- CaptionBar: block id (mono), diagram type, diagnostics indicator.
- HoverToolbar (also keyboard-reachable): copy, export SVG, export PNG, ask-agent-about-block.
- Body variants: `empty` (bordered placeholder awaiting iframe), `ready` (frame + PanZoomControls: zoom in/out, reset, fit), `error` (ErrorCard using error-card tokens: icon + message + line reference; siblings unaffected).
- Empty-document state: centered guidance panel.

### 3. Agent panel (drawer, `complementary`)
- `SessionTranscript` rendering three item types: `AgentTextItem`, `PlanStepsItem` (steps with pending/active/done state, icon + label), `ToolCallRow` (mono payload summary + status pill).
- `StreamingIndicator` with `aria-live="polite"` region for streamed text.
- `PromptInput` with `BlockContextPill` (removable), send button.
- `DiffPreview` view: before/after mono columns with change markers, Accept / Reject actions.
- Disconnected state: connect-agent empty state.

### 4. Permission prompt
`PermissionCard` — inline, non-blocking card inside the transcript (never a modal): tool name, target summary (mono), three buttons — Allow once (primary), Always this session, Deny. Roving arrow-key focus between actions, Enter/Space activate, Escape moves focus back to the transcript; the card receives focus when it appears and announces via polite live region. Lagoon ring on the agent chip while pending (pulse only without reduced-motion).

### 5. Welcome screen (`/welcome`)
`RecentFilesList` (rows: name, path, timestamp, empty variant), `OpenFileButton` (single primary), `TemplateGallery` grid of static placeholder cards.

### 6. Settings dialog
Radix Dialog with focus trap + restore: theme (light/dark/system segmented control), default mermaid version (select), language (select). Cancel / Save actions.

## Component state matrix (built for every variant)

| Component | States |
|---|---|
| SaveStateBadge | saved, unsaved, saving, error |
| AgentChip | disconnected, idle, streaming, awaiting-permission |
| DiagramFrame | empty, ready, error, loading |
| ErrorCard | parse error, lint warning |
| ToolCallRow | pending, running, success, failed |
| PlanStepsItem | pending, active, done |
| PermissionCard | pending, resolved (allowed/denied, read-only) |
| DiffPreview | pending, accepted, rejected |
| RecentFilesList | populated, empty |
| EditorHost gutter | clean, with error badges |

## Accessibility

Landmarks (`main`, `complementary`, `toolbar`, `status`), aria-labels via i18n on every icon-only button, focus ring on all focusables in both themes, focus trap + restore in dialogs, arrow-key toolbars, F6 region cycling, polite live regions for streaming output and diagnostics count, no color-only signals (always icon or text).

## Technical notes

React 19 + TanStack Start (already the project stack) + Tailwind v4 + shadcn/Radix primitives for dialog, dropdown, select, tooltip. New deps: `i18next`, `react-i18next`. `react-resizable-panels` already present. No backend, no data fetching, no persistence.

## Out of scope
Mermaid rendering, markdown parsing, file I/O, Electron/IPC, ACP networking, undo/redo, command palette, tabs, real editor.
