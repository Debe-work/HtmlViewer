export function resolveRepoPath(fromFile: string, href: string): string | null {
  const value = href.trim()
  if (!value) return null
  if (
    value.startsWith('#') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('mailto:') ||
    value.startsWith('javascript:') ||
    value.startsWith('//')
  ) {
    return null
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return null

  const hashIndex = value.indexOf('#')
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value
  const queryIndex = withoutHash.indexOf('?')
  const pathOnly = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  if (!pathOnly) return null

  if (pathOnly.startsWith('/')) {
    return normalizePath(pathOnly.slice(1))
  }

  const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/') + 1) : ''
  return normalizePath(dir + pathOnly)
}

export function normalizePath(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.join('/')
}

export function rewriteCssUrls(
  css: string,
  fromFile: string,
  resolveMediaUrl: (repoPath: string) => string,
): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, quote: string, rawUrl: string) => {
    const repoPath = resolveRepoPath(fromFile, rawUrl.trim())
    if (!repoPath) return match
    const resolved = resolveMediaUrl(repoPath)
    if (typeof resolved !== 'string') return match
    return `url(${quote}${resolved}${quote})`
  })
}

async function rewriteCssUrlsAsync(
  css: string,
  fromFile: string,
  resolveMediaUrl: (repoPath: string) => string | Promise<string>,
): Promise<string> {
  const matches = [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)]
  if (matches.length === 0) return css
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const repoPath = resolveRepoPath(fromFile, (match[2] ?? '').trim())
      if (!repoPath) return match[0]
      return `url(${match[1] ?? ''}${await resolveMediaUrl(repoPath)}${match[1] ?? ''})`
    }),
  )
  let index = 0
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, () => replacements[index++] ?? '')
}

const CSS_IMPORT_RE = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*;/gi

export function extractCssImports(css: string, fromFile: string): { cssWithoutImports: string; imports: string[] } {
  const imports: string[] = []
  const cssWithoutImports = css.replace(CSS_IMPORT_RE, (match, _q1: string, url1: string, _q2: string, url2: string) => {
    const href = (url1 || url2 || '').trim()
    const repoPath = resolveRepoPath(fromFile, href)
    if (!repoPath) return match
    imports.push(repoPath)
    return ''
  })
  return { cssWithoutImports, imports }
}

export type RewriteHtmlOptions = {
  filePath: string
  fetchText: (repoPath: string) => Promise<string>
  resolveMediaUrl: (repoPath: string) => string | Promise<string>
  rewriteHtmlHref: (repoPath: string) => string
}

export async function rewriteHtml(html: string, options: RewriteHtmlOptions): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const meta of [...doc.querySelectorAll('meta[http-equiv]')]) {
    if (meta.getAttribute('http-equiv')?.toLowerCase() === 'content-security-policy') {
      meta.remove()
    }
  }
  for (const base of [...doc.querySelectorAll('base')]) {
    base.remove()
  }

  const cssCache = new Map<string, string>()
  const loadCss = async (repoPath: string): Promise<string> => {
    const cached = cssCache.get(repoPath)
    if (cached !== undefined) return cached
    const raw = await options.fetchText(repoPath)
    const { cssWithoutImports, imports } = extractCssImports(raw, repoPath)
    const imported = await Promise.all(imports.map((item) => loadCss(item)))
    const rewritten = await rewriteCssUrlsAsync(cssWithoutImports, repoPath, options.resolveMediaUrl)
    const next = `${imported.join('\n')}\n${rewritten}`
    cssCache.set(repoPath, next)
    return next
  }

  const stylesheetLinks = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]
  await Promise.all(
    stylesheetLinks.map(async (link) => {
      const href = link.getAttribute('href')
      if (!href) return
      const repoPath = resolveRepoPath(options.filePath, href)
      if (!repoPath) return
      try {
        const css = await loadCss(repoPath)
        const style = doc.createElement('style')
        const media = link.getAttribute('media')
        if (media) style.setAttribute('media', media)
        style.textContent = css
        link.replaceWith(style)
      } catch {
        const comment = doc.createComment(` failed to load stylesheet: ${repoPath} `)
        link.replaceWith(comment)
      }
    }),
  )

  for (const style of [...doc.querySelectorAll('style')]) {
    const source = style.textContent ?? ''
    const { cssWithoutImports, imports } = extractCssImports(source, options.filePath)
    if (imports.length > 0) {
      const imported = await Promise.all(
        imports.map(async (item) => {
          try {
            return await loadCss(item)
          } catch {
            return `/* failed to load css import: ${item} */`
          }
        }),
      )
      style.textContent = `${imported.join('\n')}\n${await rewriteCssUrlsAsync(cssWithoutImports, options.filePath, options.resolveMediaUrl)}`
    } else {
      style.textContent = await rewriteCssUrlsAsync(source, options.filePath, options.resolveMediaUrl)
    }
  }

  const scripts = [...doc.querySelectorAll('script[src]')]
  for (const script of scripts) {
    const src = script.getAttribute('src')
    if (!src) continue
    const repoPath = resolveRepoPath(options.filePath, src)
    if (!repoPath) continue
    try {
      const code = await options.fetchText(repoPath)
      script.removeAttribute('src')
      script.textContent = code
    } catch {
      const comment = doc.createComment(` failed to load script: ${repoPath} `)
      script.replaceWith(comment)
    }
  }

  const mediaSelector = 'img, source, video, audio, track, embed, object, input[type="image"]'
  for (const el of [...doc.querySelectorAll(mediaSelector)]) {
    await rewriteAttr(el, 'src', options)
    await rewriteAttr(el, 'poster', options)
    await rewriteAttr(el, 'data', options)
    const srcset = el.getAttribute('srcset')
    if (srcset) {
      el.setAttribute('srcset', await rewriteSrcset(srcset, options))
    }
  }

  for (const el of [...doc.querySelectorAll('[style]')]) {
    const style = el.getAttribute('style')
    if (!style) continue
    el.setAttribute('style', await rewriteCssUrlsAsync(style, options.filePath, options.resolveMediaUrl))
  }

  for (const anchor of [...doc.querySelectorAll('a[href]')]) {
    const href = anchor.getAttribute('href')
    if (!href) continue
    const repoPath = resolveRepoPath(options.filePath, href)
    if (!repoPath) continue
    if (isHtmlHref(href) || isHtmlPath(repoPath)) {
      anchor.setAttribute('href', options.rewriteHtmlHref(repoPath))
      anchor.setAttribute('target', '_parent')
    } else {
      anchor.setAttribute('href', await options.resolveMediaUrl(repoPath))
    }
  }

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
}

async function rewriteAttr(el: Element, name: string, options: RewriteHtmlOptions) {
  const value = el.getAttribute(name)
  if (!value) return
  const repoPath = resolveRepoPath(options.filePath, value)
  if (!repoPath) return
  el.setAttribute(name, await options.resolveMediaUrl(repoPath))
}

async function rewriteSrcset(value: string, options: RewriteHtmlOptions): Promise<string> {
  const parts = await Promise.all(
    value.split(',').map(async (part) => {
      const trimmed = part.trim()
      if (!trimmed) return trimmed
      const chunks = trimmed.split(/\s+/)
      const url = chunks[0]
      const repoPath = resolveRepoPath(options.filePath, url)
      if (!repoPath) return trimmed
      return [await options.resolveMediaUrl(repoPath), ...chunks.slice(1)].join(' ')
    }),
  )
  return parts.join(', ')
}

function isHtmlHref(href: string): boolean {
  const withoutHash = href.split('#')[0].split('?')[0]
  return isHtmlPath(withoutHash)
}

function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path)
}
