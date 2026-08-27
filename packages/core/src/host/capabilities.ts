/**
 * What a host can do, and therefore what the shell may offer.
 *
 * SPEC §4: "the web host serves the same shell as a static SPA and simply
 * supplies fewer capabilities." This is that difference, written down. A host
 * builds one of these in its composition root and hands it to the shell, the
 * same way it hands over history and the `DiagramRenderer` — so the shell never
 * detects which host it is running in (CLAUDE.md invariant 2). There is no
 * `isElectron` here and there must never be one.
 *
 * Types only, no logic: `core` describes the contract, hosts implement it.
 *
 * ---
 *
 * **Actions, not data.** Every member below is something the shell invokes *in
 * response to a user gesture*. Host-owned data — recent files, the document
 * itself, agent session state — continues to arrive as props, because a shell
 * that called `listRecentDocuments()` would be fetching its own data, which
 * invariant 1 forbids. A click handler supplied by the host is not fetching; an
 * autonomous read is.
 *
 * Two consequences worth stating, so neither reads as an oversight:
 *
 * **Watching is not a capability.** An externally-changed file reaches the
 * shell as new props pushed by the host. The shell never asks for it, so it is
 * invisible from inside the shell and has no place in a contract the shell
 * reads.
 *
 * **The agent is not a capability yet.** `packages/acp-client` does not exist.
 * Declaring its interface here would be stubbing logic rather than leaving a
 * seam (invariant 1); it joins when the client does.
 *
 * ---
 *
 * **Everything is optional, including `exportArtifact`, which both real hosts
 * will supply.** The `?state=` fixture switcher (invariant 6) runs the shell
 * with no host behind it at all, and a required member would force the fixture
 * harness to fabricate implementations of things it is not testing. Absence is
 * a first-class state here, not a degraded one.
 */

/** A document handed to the shell by the host. */
export interface OpenedDocument {
  fileName: string;
  /**
   * Where the document came from, in whatever terms the host uses — an absolute
   * path on desktop, and on a host with no filesystem, whatever it can honestly
   * say (often just the file name).
   *
   * The shell only ever displays this. It must not be parsed, joined, or
   * compared as a path: `DocumentModel.filePath` carries the same string under
   * the same restriction, and the two are deliberately the same shape so a host
   * does not have to translate between them.
   */
  filePath: string;
  text: string;
}

interface ExportArtifactBase {
  /**
   * A suggested name including its extension. A host that prompts (a native
   * save dialog) seeds the field with it; a host that does not (a browser
   * download) uses it as the file name.
   */
  suggestedFileName: string;
}

/**
 * What `exportArtifact` is asked to deliver.
 *
 * `svg` and `png` are single diagrams; `markdown` is the whole document. The
 * shell decides which, because the shell owns the control that was clicked; the
 * host decides where the bytes go.
 *
 * A discriminated union, rather than `format` and `contents` varying
 * independently. Text and bytes are not interchangeable — normalising to one
 * would mean base64-encoding every SVG or decoding every PNG for no reader's
 * benefit — so the pairing *is* the contract. Two loose unions would admit
 * `{ format: "png", contents: "…" }` and still leave a host that branches on
 * `format` unable to narrow `contents`, buying runtime validation of an
 * invariant the type can enforce outright.
 */
export type ExportArtifact =
  | (ExportArtifactBase & { format: "svg" | "markdown"; contents: string })
  // `Uint8Array<ArrayBuffer>`, not a bare `Uint8Array`. The default parameter is
  // `ArrayBufferLike`, which admits a `SharedArrayBuffer` — and `Blob` does not,
  // so a bare `Uint8Array` here is a type no web host can actually hand to the
  // browser without a cast. Nothing produces these bytes from shared memory, so
  // naming the buffer costs nothing and removes the cast from every consumer.
  | (ExportArtifactBase & { format: "png"; contents: Uint8Array<ArrayBuffer> });

/**
 * The formats above, addressable on their own.
 *
 * A shell offering one control per format needs to name a format without
 * carrying its payload. Derived from the union rather than written out again,
 * so the two cannot drift into disagreeing about what a format is.
 */
export type ExportFormat = ExportArtifact["format"];

export interface HostCapabilities {
  /**
   * Let the user choose a document and return it, or `null` if they cancelled.
   *
   * Cancellation is a return value rather than a rejection: on every host the
   * common path through a file picker is dismissing it, and a control whose
   * ordinary outcome throws is a control every caller has to wrap.
   */
  openDocument?: () => Promise<OpenedDocument | null>;
  /**
   * Persist the current text back to where the document came from.
   *
   * Absent on a host with no in-place target — a browser can hand the user a
   * copy but cannot write back to the file they opened, which is exactly the
   * difference this contract exists to express.
   */
  saveDocument?: (text: string) => Promise<void>;
  /** Deliver an exported artifact to the user, however this host delivers files. */
  exportArtifact?: (artifact: ExportArtifact) => Promise<void>;
}
