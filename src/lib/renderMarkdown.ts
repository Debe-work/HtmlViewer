import { marked } from 'marked'

const MARKDOWN_CSS = `
:root {
  color-scheme: light;
}
html, body {
  margin: 0;
  background: #fff;
}
.markdown-body {
  box-sizing: border-box;
  min-width: 0;
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 16px 48px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  word-wrap: break-word;
  color: #1f2328;
}
.markdown-body > :first-child {
  margin-top: 0 !important;
}
.markdown-body > :last-child {
  margin-bottom: 0 !important;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
.markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
.markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em; }
.markdown-body h5 { font-size: 0.875em; }
.markdown-body h6 { font-size: 0.85em; color: #59636e; }
.markdown-body p, .markdown-body blockquote, .markdown-body ul,
.markdown-body ol, .markdown-body dl, .markdown-body table, .markdown-body pre {
  margin-top: 0;
  margin-bottom: 16px;
}
.markdown-body a {
  color: #0969da;
  text-decoration: none;
}
.markdown-body a:hover {
  text-decoration: underline;
}
.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
  background: #fff;
}
.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #d1d9e0;
  border: 0;
}
.markdown-body blockquote {
  padding: 0 1em;
  color: #59636e;
  border-left: 0.25em solid #d1d9e0;
}
.markdown-body ul, .markdown-body ol {
  padding-left: 2em;
}
.markdown-body li + li {
  margin-top: 0.25em;
}
.markdown-body input[type="checkbox"] {
  margin: 0 0.2em 0.25em -1.4em;
  vertical-align: middle;
}
.markdown-body code, .markdown-body tt {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  white-space: break-spaces;
  background-color: #818b981f;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
}
.markdown-body pre code {
  padding: 0;
  margin: 0;
  background: transparent;
  border: 0;
  font-size: 100%;
  white-space: pre;
  word-break: normal;
}
.markdown-body table {
  width: max-content;
  max-width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  display: block;
}
.markdown-body table th, .markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #d1d9e0;
}
.markdown-body table th {
  font-weight: 600;
  background: #f6f8fa;
}
.markdown-body table tr:nth-child(2n) {
  background: #f6f8fa;
}
.markdown-body del {
  color: #59636e;
}
`.trim()

export function markdownToHtml(source: string): string {
  return marked.parse(source, { gfm: true, async: false })
}

export function renderMarkdown(source: string): string {
  const body = markdownToHtml(source)
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>${MARKDOWN_CSS}</style>
  </head>
  <body>
    <article class="markdown-body">
${body}
    </article>
  </body>
</html>`
}
