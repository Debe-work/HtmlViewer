import { describe, expect, it } from 'vitest'
import { resolveRepoPath, rewriteCssUrls, rewriteHtml } from './rewriteHtml.ts'

describe('resolveRepoPath', () => {
  it('resolves relative and root-relative paths', () => {
    expect(resolveRepoPath('docs/index.html', 'style.css')).toBe('docs/style.css')
    expect(resolveRepoPath('docs/index.html', '../assets/app.js')).toBe('assets/app.js')
    expect(resolveRepoPath('docs/index.html', '/css/site.css')).toBe('css/site.css')
  })

  it('ignores absolute and special urls', () => {
    expect(resolveRepoPath('index.html', 'https://cdn.example.com/app.css')).toBeNull()
    expect(resolveRepoPath('index.html', '//cdn.example.com/app.css')).toBeNull()
    expect(resolveRepoPath('index.html', 'data:text/plain,hi')).toBeNull()
    expect(resolveRepoPath('index.html', '#top')).toBeNull()
  })
})

describe('rewriteCssUrls', () => {
  it('rewrites relative url() values', () => {
    const css = 'body{background:url("./bg.png")} .icon{background:url(../fonts/a.woff)}'
    expect(rewriteCssUrls(css, 'docs/app.css', (path) => `https://raw.example/${path}`)).toBe(
      'body{background:url("https://raw.example/docs/bg.png")} .icon{background:url(https://raw.example/fonts/a.woff)}',
    )
  })
})

describe('rewriteHtml', () => {
  it('inlines relative css/js and rewrites images and html links', async () => {
    const html = `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="./style.css" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'" />
  </head>
  <body>
    <img src="pic.svg" />
    <a href="other.html">next</a>
    <script src="./app.js"></script>
  </body>
</html>`

    const files: Record<string, string> = {
      'docs/style.css': 'h1{color:red;background:url(bg.png)}',
      'docs/app.js': 'window.ready = true;',
    }

    const rewritten = await rewriteHtml(html, {
      filePath: 'docs/index.html',
      fetchText: async (path) => {
        const content = files[path]
        if (!content) throw new Error(`missing ${path}`)
        return content
      },
      resolveMediaUrl: (path) => `https://raw.example/${path}`,
      rewriteHtmlHref: (path) => `#/preview/${path}`,
    })

    expect(rewritten).toContain('h1{color:red;background:url(https://raw.example/docs/bg.png)}')
    expect(rewritten).not.toContain('rel="stylesheet"')
    expect(rewritten).toContain('window.ready = true;')
    expect(rewritten).not.toContain('src="./app.js"')
    expect(rewritten).toContain('src="https://raw.example/docs/pic.svg"')
    expect(rewritten).toContain('href="#/preview/docs/other.html"')
    expect(rewritten).toContain('target="_parent"')
    expect(rewritten).not.toContain('Content-Security-Policy')
  })
})
