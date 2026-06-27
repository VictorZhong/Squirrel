import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export interface ClipboardSource {
  url: string;
  title?: string;
}

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  headingStyle: "atx",
  strongDelimiter: "**",
});

turndown.use(gfm);
turndown.remove(["script", "style", "meta", "link"]);

turndown.addRule("headerlessTable", {
  filter: (node) =>
    node.nodeName === "TABLE" &&
    node instanceof HTMLTableElement &&
    node.rows.length > 0 &&
    !isHeadingRow(node.rows[0]),
  replacement: (_content, node) => {
    if (!(node instanceof HTMLTableElement)) {
      return "";
    }
    return renderHeaderlessTable(node);
  },
});

export function htmlToMarkdown(
  html: string,
  options: { omitImages?: boolean } = {},
): string {
  if (!html.trim()) {
    return "";
  }

  return turndown
    .turndown(prepareClipboardHtml(html, options))
    .replace(/\u00a0/g, " ")
    .replace(/^- {2,}/gm, "- ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatClipboardSource(source: ClipboardSource | undefined): string {
  if (!source) {
    return "";
  }

  const label = source.title?.trim() || readableUrlLabel(source.url);
  return `Source: [${escapeMarkdownLinkText(label)}](${source.url})`;
}

export function withClipboardSource(markdown: string, source: ClipboardSource | undefined): string {
  const sourceMarkdown = formatClipboardSource(source);
  if (!sourceMarkdown) {
    return markdown;
  }
  return [sourceMarkdown, markdown].filter(Boolean).join("\n\n");
}

export function renderAttachmentImageMarkdown({
  fileName,
  relativePath,
}: {
  fileName: string;
  relativePath: string;
}): string {
  return `![${escapeMarkdownLinkText(fileName)}](${encodeURI(relativePath)})`;
}

export function extractClipboardSource(
  html: string,
  readClipboardType?: (type: string) => string,
): ClipboardSource | undefined {
  const fromHtml = extractSourceFromHtml(html);
  if (fromHtml) {
    return fromHtml;
  }

  const fromClipboardType = extractSourceFromClipboardTypes(readClipboardType);
  if (fromClipboardType) {
    return fromClipboardType;
  }

  return undefined;
}

function extractSourceFromHtml(html: string): ClipboardSource | undefined {
  const headerUrl = html.match(/^SourceURL:(.+)$/im)?.[1]?.trim();
  const parser = new DOMParser();
  const doc = parser.parseFromString(stripClipboardHeader(html), "text/html");
  const url =
    normalizeSourceUrl(headerUrl) ??
    normalizeSourceUrl(queryContent(doc, 'meta[property="og:url"], meta[name="og:url"]')) ??
    normalizeSourceUrl(queryHref(doc, 'link[rel~="canonical"]')) ??
    normalizeSourceUrl(queryHref(doc, "base[href]"));

  if (!url) {
    return undefined;
  }

  return {
    url,
    title:
      queryContent(doc, 'meta[property="og:title"], meta[name="og:title"]') ??
      doc.querySelector("title")?.textContent?.trim() ??
      undefined,
  };
}

function extractSourceFromClipboardTypes(
  readClipboardType: ((type: string) => string) | undefined,
): ClipboardSource | undefined {
  if (!readClipboardType) {
    return undefined;
  }

  const mozUrl = readClipboardType("text/x-moz-url") || readClipboardType("text/x-moz-url-priv");
  const [mozSourceUrl, mozTitle] = mozUrl.split(/\r?\n/).map((line) => line.trim());
  const normalizedMozUrl = normalizeSourceUrl(mozSourceUrl);
  if (normalizedMozUrl) {
    return { url: normalizedMozUrl, title: mozTitle || undefined };
  }

  const uriList = readClipboardType("text/uri-list");
  const uri = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  const normalizedUri = normalizeSourceUrl(uri);
  if (normalizedUri) {
    return { url: normalizedUri };
  }

  return undefined;
}

function stripClipboardHeader(html: string): string {
  return html.replace(
    /^Version:.*?(?=<!doctype|<html|<body|<!--StartFragment|<div|<p|<table|<h[1-6]|<ul|<ol|<span)/ims,
    "",
  );
}

function prepareClipboardHtml(html: string, options: { omitImages?: boolean }): string {
  const stripped = stripClipboardHeader(html);
  if (!options.omitImages) {
    return stripped;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(stripped, "text/html");
  doc.querySelectorAll("img, picture, svg").forEach((node) => node.remove());
  return doc.body.innerHTML || stripped;
}

function renderHeaderlessTable(table: HTMLTableElement): string {
  const rows = Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => normalizeTableCell(cell.textContent ?? ""))
        .filter(Boolean),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return "";
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const [header, ...body] = rows.map((row) => padRow(row, columnCount));
  const separator = Array.from({ length: columnCount }, () => "---");

  return [
    "",
    renderTableRow(header),
    renderTableRow(separator),
    ...body.map(renderTableRow),
    "",
  ].join("\n");
}

function renderTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function padRow(row: string[], length: number): string[] {
  return [...row, ...Array.from({ length: length - row.length }, () => "")];
}

function normalizeTableCell(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function isHeadingRow(row: HTMLTableRowElement | undefined): boolean {
  return Boolean(row && Array.from(row.cells).every((cell) => cell.tagName === "TH"));
}

function queryContent(doc: Document, selector: string): string | undefined {
  return doc.querySelector(selector)?.getAttribute("content")?.trim() || undefined;
}

function queryHref(doc: Document, selector: string): string | undefined {
  return doc.querySelector(selector)?.getAttribute("href")?.trim() || undefined;
}

function normalizeSourceUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function readableUrlLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/[[\]\\]/g, "\\$&");
}
