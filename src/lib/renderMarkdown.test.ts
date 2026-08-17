import { describe, expect, it } from 'vitest'
import { markdownToHtml, renderMarkdown } from './renderMarkdown.ts'

describe('markdownToHtml', () => {
  it('renders GFM tables, task lists, and emphasis', () => {
    const html = markdownToHtml(`
# Title

| Kind | Ext |
| --- | --- |
| Markdown | .md |

- [x] done
- [ ] todo

**bold** and \`code\`
`)

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<table>')
    expect(html).toContain('<th>Kind</th>')
    expect(html).toContain('<td>.md</td>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('checked')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>code</code>')
  })

  it('keeps relative images and links for later rewriting', () => {
    const html = markdownToHtml('![alt](./pic.svg)\n\n[next](./other.html)')
    expect(html).toContain('src="./pic.svg"')
    expect(html).toContain('href="./other.html"')
  })
})

describe('renderMarkdown', () => {
  it('wraps GFM output in a styled HTML document', () => {
    const documentHtml = renderMarkdown('# Hello')
    expect(documentHtml).toContain('<!DOCTYPE html>')
    expect(documentHtml).toContain('class="markdown-body"')
    expect(documentHtml).toContain('<h1>Hello</h1>')
    expect(documentHtml).toContain('<style>')
  })
})
