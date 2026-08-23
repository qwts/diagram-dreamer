import { test, expect } from "@playwright/test";
import { DEFAULT_MERMAID_VERSION, parseDocument } from "@vellum/core";

/**
 * The document parser (SPEC §5). No browser: this is a pure function of text,
 * and testing it through a rendered page would only make the failures harder to
 * read. It runs under the same Playwright project so there is one command and
 * one report.
 */

const doc = (...lines: string[]) => lines.join("\n");

test("finds fenced mermaid blocks and records where they are", () => {
  const { blocks } = parseDocument(
    doc("# Title", "", "```mermaid", "flowchart LR", "  A --> B", "```", "", "done"),
  );

  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("flowchart");
  expect(blocks[0]?.source).toBe("flowchart LR\n  A --> B");
  // Fence lines, 1-based: the opening ``` is line 3 and the closing one line 6.
  // The renderer adds the block's own line numbers to `startLine`, so an error
  // on `A --> B` must land on document line 5.
  expect(blocks[0]?.startLine).toBe(3);
  expect(blocks[0]?.endLine).toBe(6);
});

test("a mermaid fence inside another code block is example text, not a diagram", () => {
  // Documentation about Mermaid is the obvious case, and it is the one that
  // would otherwise render somebody's tutorial as a broken diagram.
  const { blocks } = parseDocument(
    doc(
      "````markdown",
      "```mermaid",
      "flowchart LR",
      "```",
      "````",
      "",
      "```mermaid",
      "sequenceDiagram",
      "```",
    ),
  );

  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("sequenceDiagram");
});

test("a tilde-fenced example hides the backtick fence inside it", () => {
  // The mirror of the case above, and the one that slipped through first: a
  // closing fence has to use the opening fence's character, or the outer block
  // ends at the inner example's ``` and the example becomes a diagram.
  const { blocks } = parseDocument(
    doc(
      "~~~markdown",
      "```mermaid",
      "flowchart LR",
      "```",
      "~~~",
      "",
      "```mermaid",
      "sequenceDiagram",
      "```",
    ),
  );

  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("sequenceDiagram");
});

test("a tilde-fenced diagram is a diagram", () => {
  const { blocks } = parseDocument(doc("~~~mermaid", "flowchart LR", "~~~"));
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("flowchart");
});

test("a fence indented four spaces is code, not a diagram", () => {
  // CommonMark: four spaces makes the line indented code. Documentation that
  // shows Mermaid source this way would otherwise render it.
  const { blocks } = parseDocument(
    doc("Here is how you write one:", "", "    ```mermaid", "    flowchart LR", "    ```"),
  );
  expect(blocks).toHaveLength(0);

  // Three is still a fence.
  expect(parseDocument(doc("   ```mermaid", "   flowchart LR", "   ```")).blocks).toHaveLength(1);
});

test("a diagram inside a list item is still a diagram", () => {
  // The three-space rule is relative to the enclosing block, not the left
  // margin. Applying it literally would silently drop every diagram written
  // inside a bullet — worse than the bug it fixes.
  const { blocks } = parseDocument(
    doc("- First step:", "", "  ```mermaid", "  flowchart LR", "    A --> B", "  ```", "", "Done."),
  );
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("flowchart");
});

test("block ids follow content, not position", () => {
  const first = parseDocument(doc("```mermaid", "flowchart LR", "  A --> B", "```"));
  const shifted = parseDocument(
    doc("# A heading added above", "", "```mermaid", "flowchart LR", "  A --> B", "```"),
  );

  // SPEC §5 asks for identity by content hash. An id that moved with the block
  // would rename it on every edit above it — breaking an agent's reference to
  // it, and remounting the frame, which throws away a loaded sandbox.
  expect(shifted.blocks[0]?.id).toBe(first.blocks[0]?.id);
  expect(first.blocks[0]?.id).toMatch(/^block-[0-9a-f]{8}$/);
});

test("identical diagrams stay individually addressable", () => {
  const { blocks } = parseDocument(
    doc("```mermaid", "flowchart LR", "```", "", "```mermaid", "flowchart LR", "```"),
  );

  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.id).not.toBe(blocks[1]?.id);
  // Ordinal only as a tie-break, so the first keeps the plain content id.
  expect(blocks[1]?.id).toBe(`${blocks[0]?.id}-2`);
});

test("reads document frontmatter, and ignores a horizontal rule", () => {
  const withFrontmatter = parseDocument(
    doc("---", "theme: forest", "mermaid: 11.17.0", "direction: rtl", "---", "", "# Title"),
  );
  expect(withFrontmatter.theme).toBe("forest");
  expect(withFrontmatter.mermaidVersion).toBe("11.17.0");
  expect(withFrontmatter.direction).toBe("rtl");

  // An opening `---` with no closing one is a rule or a setext heading, not
  // frontmatter, and swallowing the document to end-of-file would lose every
  // diagram in it.
  const rule = parseDocument(doc("---", "", "```mermaid", "flowchart LR", "```"));
  expect(rule.blocks).toHaveLength(1);
  expect(rule.mermaidVersion).toBe(DEFAULT_MERMAID_VERSION);
});

test("an unparseable direction is ignored rather than trusted", () => {
  const { direction } = parseDocument(doc("---", "direction: sideways", "---"));
  expect(direction).toBeUndefined();
});

test("surfaces accTitle and accDescr for the frame to use", () => {
  const inline = parseDocument(
    doc("```mermaid", "flowchart LR", "  accTitle: Deployment", "  accDescr: How it ships", "```"),
  );
  expect(inline.blocks[0]?.accTitle).toBe("Deployment");
  expect(inline.blocks[0]?.accDescr).toBe("How it ships");

  const block = parseDocument(
    doc("```mermaid", "flowchart LR", "  accDescr {", "    two", "    lines", "  }", "```"),
  );
  expect(block.blocks[0]?.accDescr).toBe("two lines");
});

test("the diagram's own frontmatter does not hide its type", () => {
  const { blocks } = parseDocument(
    doc("```mermaid", "---", "title: Ships", "---", "%% a comment", "stateDiagram-v2", "```"),
  );
  expect(blocks[0]?.diagramType).toBe("stateDiagram-v2");
});

test("an unclosed fence runs to the end of the document", () => {
  // What a Markdown renderer does, and what someone mid-typing expects.
  const { blocks } = parseDocument(doc("```mermaid", "flowchart LR", "  A --> B"));
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.source).toBe("flowchart LR\n  A --> B");
});

test("a raw .mmd file is one block", () => {
  // SPEC §5's degenerate case.
  const { blocks } = parseDocument(doc("flowchart LR", "  A --> B"), { singleBlock: true });
  expect(blocks).toHaveLength(1);
  expect(blocks[0]?.diagramType).toBe("flowchart");
  expect(parseDocument("   ", { singleBlock: true }).blocks).toHaveLength(0);
});

test("CRLF documents produce the same line numbers as LF ones", () => {
  const crlf = parseDocument("# Title\r\n\r\n```mermaid\r\nflowchart LR\r\n```\r\n");
  expect(crlf.blocks[0]?.startLine).toBe(3);
  expect(crlf.blocks[0]?.source).toBe("flowchart LR");
});
