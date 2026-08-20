/**
 * Markdown → `DocumentModel` (SPEC §5). Pure: a string in, a model out. No
 * file system, no fetch, no clock — the host reads bytes, this decides what
 * they mean.
 *
 * Nothing here knows about React or i18next, which is the point of it living
 * in `core` rather than in the shell.
 */

import type { DiagramBlock, DocumentModel, SaveState } from "../index";

/**
 * Fallback when a document does not pin a version. Deliberately not "whatever
 * is bundled": SPEC §6 wants the resolved version to be a documented decision,
 * and a document that says nothing should not silently follow us across a
 * major.
 */
export const DEFAULT_MERMAID_VERSION = "11";

/**
 * A fenced code block's opening or closing line. Backticks or tildes, three or
 * more, optionally followed by an info string — Markdown allows one and Mermaid
 * ignores it, so refusing to parse the block would be stricter than either.
 */
const FENCE = /^([ \t]*)(`{3,}|~{3,})[ \t]*(\S*)(.*)$/;

/** A list marker, and the whitespace that sets its content indent. */
const LIST_ITEM = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)/;

const LEADING_SPACE = /^[ \t]*/;

/** CommonMark's limit: at four, the line is indented code rather than a fence. */
const MAX_FENCE_INDENT = 3;

const MERMAID_INFO = /^mermaid\b/i;

/** `key: value`, unquoted or quoted. Flat by design — see `readFrontmatter`. */
const FRONTMATTER_ENTRY = /^([A-Za-z][\w-]*)\s*:\s*("?)(.*?)\2\s*$/;

const ACC_TITLE = /^\s*accTitle\s*:\s*(.+?)\s*$/;
const ACC_DESCR_INLINE = /^\s*accDescr\s*:\s*(.+?)\s*$/;
const ACC_DESCR_BLOCK = /^\s*accDescr\s*\{\s*$/;

/** Mermaid's own per-diagram frontmatter, which is not the document's. */
const DIAGRAM_FRONTMATTER = /^\s*---\s*$/;
/** `%%` comments and Mermaid directives, neither of which name a diagram type. */
const DIAGRAM_COMMENT = /^\s*%%/;

export interface ParsedDocument {
  lines: string[];
  blocks: DiagramBlock[];
  theme?: string | undefined;
  mermaidVersion: string;
  direction?: "ltr" | "rtl" | undefined;
}

/**
 * FNV-1a, 32-bit. Identity, not security: SPEC §5 wants a block addressed by
 * its content so that inserting a diagram above it does not rename it — an id
 * that shifts would make an agent's reference to "block-2" mean something
 * different after every edit, and would remount the frame, discarding a loaded
 * sandbox.
 *
 * Web Crypto would be the stronger hash and is asynchronous, which would make
 * parsing a document an async operation for no gain. Collisions cost an
 * ordinal suffix, nothing more.
 */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

interface Fence {
  /** Columns of indentation, tabs expanded. */
  indent: number;
  /** The run of fence characters, whose length a closing fence must match or beat. */
  marker: string;
  char: string;
  info: string;
  /** Whatever followed the info string; a closing fence has none. */
  rest: string;
}

/** Tabs advance to the next multiple of four, as CommonMark counts them. */
function columns(indent: string): number {
  let width = 0;
  for (const character of indent) {
    width = character === "\t" ? width + 4 - (width % 4) : width + 1;
  }
  return width;
}

function readFence(line: string): Fence | null {
  const match = FENCE.exec(line);
  if (!match) return null;
  const marker = match[2] ?? "";
  const character = marker[0] ?? "`";
  const info = match[3] ?? "";
  const rest = match[4] ?? "";
  // A backtick fence's info string may not contain a backtick, or every
  // `inline code` span in a paragraph would open a code block. Tilde fences
  // carry no such restriction.
  if (character === "`" && (info.includes("`") || rest.includes("`"))) return null;
  return { indent: columns(match[1] ?? ""), marker, char: character, info, rest };
}

const closes = (fence: Fence, open: Fence): boolean =>
  fence.char === open.char &&
  fence.marker.length >= open.marker.length &&
  fence.info === "" &&
  fence.rest.trim() === "";

/**
 * The indentation a fence on the next line is measured from.
 *
 * CommonMark's three-space rule is relative to the enclosing block, not to the
 * left margin: a diagram inside a list item is legal at the list's content
 * indent plus three. Without this, applying the rule literally would silently
 * drop every diagram written inside a bullet — trading the bug it fixes for a
 * worse one.
 */
function containerIndent(line: string, current: number): number {
  if (line.trim() === "") return current;
  const item = LIST_ITEM.exec(line);
  if (item) {
    const spaces = columns(item[3] ?? " ");
    // Five or more spaces after the marker start indented code inside the item,
    // so the content indent is the marker plus one.
    return columns(item[1] ?? "") + (item[2] ?? "").length + (spaces >= 5 ? 1 : spaces);
  }
  return columns(LEADING_SPACE.exec(line)?.[0] ?? "") < current ? 0 : current;
}

/**
 * Document frontmatter. A flat `key: value` map and nothing else — no nesting,
 * no lists, no anchors. A parser for exactly that is a few lines and cannot
 * misread anything; a YAML dependency would accept a great deal this format
 * has never promised to support.
 */
function readFrontmatter(lines: string[]): {
  values: Map<string, string>;
  end: number;
} {
  const values = new Map<string, string>();
  if (lines[0]?.trim() !== "---") return { values, end: 0 };

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "---") return { values, end: i + 1 };
    const match = FRONTMATTER_ENTRY.exec(line);
    if (match?.[1] !== undefined && match[3] !== undefined) {
      values.set(match[1].toLowerCase(), match[3].trim());
    }
  }
  // No closing delimiter: this was never frontmatter, it was a horizontal rule
  // or a setext heading. Treat the whole document as content.
  return { values: new Map(), end: 0 };
}

/** The diagram's declared type, e.g. `flowchart`, `sequenceDiagram`. */
function diagramType(source: string[]): string {
  let inFrontmatter = false;
  for (const line of source) {
    if (DIAGRAM_FRONTMATTER.test(line)) {
      // Mermaid's own frontmatter, opened and closed by `---`. It carries the
      // diagram's title and config, never its type.
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    const trimmed = line.trim();
    if (trimmed === "" || DIAGRAM_COMMENT.test(trimmed)) continue;
    // `flowchart LR` is a flowchart; `stateDiagram-v2` is its own whole word.
    return trimmed.split(/[\s:]/)[0] ?? "unknown";
  }
  return "unknown";
}

/**
 * Mermaid's accessibility declarations, surfaced so the frame can name the
 * diagram (SPEC §9). Author-supplied and already in the document's language, so
 * these never go through i18next.
 */
function accessibility(source: string[]): { accTitle?: string; accDescr?: string } {
  const result: { accTitle?: string; accDescr?: string } = {};
  for (let i = 0; i < source.length; i += 1) {
    const line = source[i] ?? "";
    const title = ACC_TITLE.exec(line);
    if (title?.[1] !== undefined && result.accTitle === undefined) {
      result.accTitle = title[1];
      continue;
    }
    if (ACC_DESCR_BLOCK.test(line) && result.accDescr === undefined) {
      const body: string[] = [];
      for (let j = i + 1; j < source.length; j += 1) {
        const inner = source[j] ?? "";
        if (inner.trim() === "}") break;
        body.push(inner.trim());
      }
      result.accDescr = body.join(" ").trim();
      continue;
    }
    const descr = ACC_DESCR_INLINE.exec(line);
    if (descr?.[1] !== undefined && result.accDescr === undefined) {
      result.accDescr = descr[1];
    }
  }
  return result;
}

function toBlock(
  source: string[],
  startLine: number,
  endLine: number,
  seen: Set<string>,
): DiagramBlock {
  const text = source.join("\n");
  // Content hash first, ordinal only to break a tie — two identical diagrams in
  // one document are unusual but perfectly legal, and they still need to be
  // addressable apart from each other.
  const base = `block-${hash(text)}`;
  let id = base;
  for (let ordinal = 2; seen.has(id); ordinal += 1) id = `${base}-${ordinal}`;
  seen.add(id);

  const { accTitle, accDescr } = accessibility(source);
  return {
    id,
    diagramType: diagramType(source),
    startLine,
    endLine,
    state: "ready",
    source: text,
    ...(accTitle !== undefined && { accTitle }),
    ...(accDescr !== undefined && { accDescr }),
  };
}

export interface ParseOptions {
  /**
   * Treat the whole input as one diagram — SPEC §5's "raw .mmd support",
   * where a `.mmd` file is the degenerate one-block document. The caller
   * decides, because only the caller knows the file name.
   */
  singleBlock?: boolean | undefined;
  defaultMermaidVersion?: string | undefined;
}

export function parseDocument(text: string, options: ParseOptions = {}): ParsedDocument {
  // Split on \n after normalising \r\n. Keeping the line array authoritative
  // means every line number in the model indexes into the same thing the editor
  // shows, which is what makes a diagnostic's line reference meaningful.
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const fallbackVersion = options.defaultMermaidVersion ?? DEFAULT_MERMAID_VERSION;

  if (options.singleBlock) {
    const blocks = text.trim() === "" ? [] : [toBlock(lines, 0, lines.length + 1, new Set())];
    return { lines, blocks, mermaidVersion: fallbackVersion };
  }

  const { values, end } = readFrontmatter(lines);
  const direction = values.get("direction");
  const blocks: DiagramBlock[] = [];
  const seen = new Set<string>();

  let container = 0;

  for (let i = end; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const fence = readFence(line);
    // Too far in to be a fence: this is an indented code block, and a
    // ```mermaid inside one is somebody's example of Mermaid source.
    if (!fence || fence.indent > container + MAX_FENCE_INDENT) {
      container = containerIndent(line, container);
      continue;
    }

    if (!MERMAID_INFO.test(fence.info)) {
      // A fence that is not Mermaid still opens a code block, and a ```mermaid
      // *inside* it is example text, not a diagram. Skip to its close — which
      // must use the opener's character, so a tilde-fenced example holding a
      // backtick-fenced diagram is skipped whole.
      for (i += 1; i < lines.length; i += 1) {
        const candidate = readFence(lines[i] ?? "");
        if (candidate && closes(candidate, fence)) break;
      }
      continue;
    }

    const startLine = i + 1;
    const body: string[] = [];
    let closed = false;
    for (i += 1; i < lines.length; i += 1) {
      const candidate = readFence(lines[i] ?? "");
      if (candidate && closes(candidate, fence)) {
        closed = true;
        break;
      }
      body.push(lines[i] ?? "");
    }
    // An unclosed fence runs to the end of the document, which is what a
    // Markdown renderer does and what an author mid-typing expects.
    blocks.push(toBlock(body, startLine, closed ? i + 1 : lines.length + 1, seen));
  }

  return {
    lines,
    blocks,
    ...(values.has("theme") && { theme: values.get("theme") }),
    mermaidVersion: values.get("mermaid") ?? values.get("mermaidversion") ?? fallbackVersion,
    ...((direction === "ltr" || direction === "rtl") && { direction }),
  };
}

export interface DocumentIdentity {
  id: string;
  fileName: string;
  filePath: string;
  saveState?: SaveState | undefined;
}

/**
 * The parsed document plus the things only a host knows — where the file came
 * from and whether it has been saved. Kept separate from `parseDocument` so
 * parsing stays a pure function of the text.
 */
export function toDocumentModel(identity: DocumentIdentity, parsed: ParsedDocument): DocumentModel {
  return {
    id: identity.id,
    fileName: identity.fileName,
    filePath: identity.filePath,
    saveState: identity.saveState ?? "saved",
    lineCount: parsed.lines.length,
    sourcePreview: parsed.lines,
    blocks: parsed.blocks,
    diagnostics: [],
    cursor: { line: 1, column: 1 },
    ...(parsed.theme !== undefined && { theme: parsed.theme }),
    mermaidVersion: parsed.mermaidVersion,
    ...(parsed.direction !== undefined && { direction: parsed.direction }),
  };
}
