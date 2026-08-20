/**
 * The trusted half. Creates and drives diagram sandboxes; never renders
 * anything itself.
 *
 * One `DiagramRenderer` per app, one `DiagramSurface` per diagram block. The
 * surface owns an iframe and the conversation with it — the shell holds a
 * handle, calls `render`, and is told what happened. No framework here: this is
 * DOM and `postMessage`, so a future `apps/web` shell can use it unchanged
 * (SPEC §4).
 */

import {
  PROTOCOL_VERSION,
  isSandboxMessage,
  type RenderRequest,
  type SandboxMessage,
} from "./protocol";

export interface RenderOptions {
  source: string;
  theme?: string | undefined;
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
}

export type RenderResult =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string; line?: number | undefined };

export interface DiagramSurface {
  /** The iframe, so the shell can place it. Core sets security attributes only. */
  readonly element: HTMLIFrameElement;
  /**
   * Renders `source`, resolving when the sandbox reports back.
   *
   * Calling again before the previous call settles supersedes it, and the
   * superseded promise resolves with the *newer* outcome rather than hanging.
   * That matters because the sandbox deliberately drops stale renders — a
   * keystroke per character means most requests are stale before Mermaid
   * finishes — and a caller awaiting one should not be left holding a promise
   * nobody will ever keep.
   */
  render(options: RenderOptions): Promise<RenderResult>;
  destroy(): void;
}

/**
 * The first render is slow: the sandbox has a megabyte of Mermaid to parse
 * before it can answer anything. These are not performance budgets, they are
 * the point where "still working" becomes "never going to answer", so both are
 * deliberately generous. Without them a sandbox that fails to boot — a missing
 * asset, a CSP that blocks its script — leaves every diagram spinning forever
 * with nothing in the console to explain it.
 */
const READY_TIMEOUT_MS = 30_000;
const RENDER_TIMEOUT_MS = 15_000;

const destroyed: RenderResult = { ok: false, message: "Diagram surface was destroyed" };

export interface DiagramRendererOptions {
  /**
   * URL of the sandbox document. The app owns this because the app owns its own
   * build output — `./sandbox.html` under Vite, a packaged path under Electron.
   */
  sandboxUrl: string;
}

export class DiagramRenderer {
  readonly #sandboxUrl: string;

  constructor(options: DiagramRendererOptions) {
    this.#sandboxUrl = options.sandboxUrl;
  }

  /** `title` names the iframe for assistive technology; see `Surface`. */
  createSurface(title: string): DiagramSurface {
    return new Surface(this.#sandboxUrl, title);
  }
}

interface Pending {
  requestId: string;
  resolve: (result: RenderResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

class Surface implements DiagramSurface {
  readonly element: HTMLIFrameElement;
  readonly #ready: Promise<boolean>;
  #pending: Pending | null = null;
  #sequence = 0;
  #destroyed = false;
  readonly #onMessage: (event: MessageEvent<unknown>) => void;

  constructor(sandboxUrl: string, title: string) {
    const frame = document.createElement("iframe");
    // The security boundary, in one attribute. `allow-scripts` and nothing
    // else: no `allow-same-origin` — which would hand the sandbox our origin
    // and make the whole exercise theatre — no forms, no popups, no top-level
    // navigation.
    frame.setAttribute("sandbox", "allow-scripts");
    // An iframe is a document and screen readers navigate into it. Naming it
    // after the diagram is both the a11y contract (SPEC §9) and what keeps
    // axe's frame-title rule from firing on every block.
    frame.title = title;
    frame.style.border = "0";
    frame.style.display = "block";
    frame.src = sandboxUrl;
    this.element = frame;

    let announce!: (ok: boolean) => void;
    this.#ready = new Promise<boolean>((resolve) => {
      announce = resolve;
    });
    const readyTimer = setTimeout(() => announce(false), READY_TIMEOUT_MS);

    this.#onMessage = (event: MessageEvent<unknown>) => {
      // Identity by window reference, not origin: the sandbox posts from an
      // opaque origin, so `event.origin` is the string "null" and proves
      // nothing. The reference cannot be forged by anything inside the frame.
      if (event.source !== frame.contentWindow) return;
      if (!isSandboxMessage(event.data)) return;
      if (event.data.kind === "vellum:ready") {
        clearTimeout(readyTimer);
        announce(true);
        return;
      }
      this.#settle(event.data);
    };
    window.addEventListener("message", this.#onMessage);
  }

  #settle(message: Exclude<SandboxMessage, { kind: "vellum:ready" }>): void {
    const pending = this.#pending;
    if (!pending || pending.requestId !== message.requestId) return;
    this.#pending = null;
    clearTimeout(pending.timer);
    if (message.kind === "vellum:rendered") {
      // An iframe has no intrinsic size — left alone it is 300×150 and clips
      // whatever it holds. Core sizes its own element rather than handing the
      // numbers to the shell and hoping: the frame is core's, and a diagram
      // cropped to a default box is not a layout choice anyone made.
      this.element.style.width = `${message.width}px`;
      this.element.style.height = `${message.height}px`;
    }
    pending.resolve(
      message.kind === "vellum:rendered"
        ? { ok: true, width: message.width, height: message.height }
        : { ok: false, message: message.message, line: message.line },
    );
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    if (this.#destroyed) return destroyed;
    if (!(await this.#ready)) {
      return { ok: false, message: "Diagram sandbox failed to start" };
    }
    if (this.#destroyed) return destroyed;

    const requestId = `${++this.#sequence}`;
    const result = new Promise<RenderResult>((resolve) => {
      const timer = setTimeout(() => {
        if (this.#pending?.requestId === requestId) this.#pending = null;
        resolve({ ok: false, message: "Diagram rendering timed out" });
      }, RENDER_TIMEOUT_MS);
      const superseded = this.#pending;
      this.#pending = { requestId, resolve, timer };
      // Hand the older caller this render's outcome. The sandbox will never
      // answer their request — it dropped it the moment this one arrived.
      if (superseded) {
        clearTimeout(superseded.timer);
        void result.then(superseded.resolve);
      }
    });

    const request: RenderRequest = {
      kind: "vellum:render",
      v: PROTOCOL_VERSION,
      requestId,
      source: options.source,
      theme: options.theme,
      colorScheme: options.colorScheme,
      reducedMotion: options.reducedMotion,
    };
    // "*" because the sandbox has an opaque origin and cannot be named. Nothing
    // secret travels this way — it is document text the app already displays on
    // screen — and only this one frame receives it.
    this.element.contentWindow?.postMessage(request, "*");
    return result;
  }

  destroy(): void {
    this.#destroyed = true;
    window.removeEventListener("message", this.#onMessage);
    const pending = this.#pending;
    this.#pending = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(destroyed);
    }
    this.element.remove();
  }
}
