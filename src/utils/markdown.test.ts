import { describe, expect, it } from "vitest";
import {
  extractClipboardSource,
  htmlToMarkdown,
  renderAttachmentImageMarkdown,
  withClipboardSource,
} from "./markdown";

describe("htmlToMarkdown", () => {
  it("converts common rich clipboard HTML to markdown", () => {
    const markdown = htmlToMarkdown(`
      <h2>Launch Plan</h2>
      <p>Review the <strong>critical</strong> <a href="https://example.com">notes</a>.</p>
      <ul><li>Scope</li><li>Risks</li></ul>
    `);

    expect(markdown).toContain("## Launch Plan");
    expect(markdown).toContain("**critical**");
    expect(markdown).toContain("[notes](https://example.com)");
    expect(markdown).toContain("- Scope");
  });

  it("converts simple headerless tables to GFM tables", () => {
    const markdown = htmlToMarkdown(`
      <table>
        <tbody>
          <tr><td>Name</td><td>Status</td></tr>
          <tr><td>API</td><td>Ready</td></tr>
        </tbody>
      </table>
    `);

    expect(markdown).toContain("| Name | Status |");
    expect(markdown).toContain("| --- | --- |");
    expect(markdown).toContain("| API | Ready |");
  });

  it("can omit HTML image tags when clipboard also provides image files", () => {
    const markdown = htmlToMarkdown(
      '<p>Screenshot</p><img src="https://example.com/image.png" alt="Remote">',
      { omitImages: true },
    );

    expect(markdown).toBe("Screenshot");
  });

  it("extracts explicit source URLs from rich clipboard HTML", () => {
    const source = extractClipboardSource(`
      <html>
        <head>
          <base href="https://example.com/docs/launch">
          <title>Launch Notes</title>
        </head>
        <body><p>Copied text</p></body>
      </html>
    `);

    expect(withClipboardSource("Copied text", source)).toBe(
      "Source: [Launch Notes](https://example.com/docs/launch)\n\nCopied text",
    );
  });

  it("does not infer a source when clipboard HTML has no explicit URL", () => {
    const source = extractClipboardSource("<p>Copied text</p>");

    expect(withClipboardSource("Copied text", source)).toBe("Copied text");
  });

  it("renders image attachment references as markdown images", () => {
    expect(
      renderAttachmentImageMarkdown({
        fileName: "screen [draft].png",
        relativePath: "projects/prj/attachments/task/screen draft.png",
      }),
    ).toBe("![screen \\[draft\\].png](projects/prj/attachments/task/screen%20draft.png)");
  });
});
