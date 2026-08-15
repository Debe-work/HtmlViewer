export type ViewMode = 'tree' | 'blob' | 'preview'

export type GithubTarget = {
  owner: string
  repo: string
  ref?: string
  path?: string
  view: ViewMode
  gist?: boolean
}

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com'])

export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path)
}

export function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/i.test(path)
}

export function parseGithubUrl(input: string): GithubTarget | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (!trimmed.includes('://') && !/^www\./i.test(trimmed) && !/^github\.com\//i.test(trimmed)) {
    const parts = trimmed.replace(/^\/+/, '').split('/').filter(Boolean)
    return parseGithubPathParts(parts)
  }

  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  if (url.hostname === 'gist.github.com' || url.hostname === 'gist.githubusercontent.com') {
    return parseGistUrl(url)
  }

  if (url.hostname === 'raw.githubusercontent.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    const [owner, repo, ref, ...pathParts] = parts
    if (!owner || !repo) return null
    const path = pathParts.join('/')
    return {
      owner,
      repo,
      ref,
      path: path || undefined,
      view: path ? (isHtmlPath(path) ? 'preview' : 'blob') : 'tree',
    }
  }

  if (!GITHUB_HOSTS.has(url.hostname)) return null
  return parseGithubPathParts(url.pathname.split('/').filter(Boolean))
}

function parseGithubPathParts(parts: string[]): GithubTarget | null {
  if (parts.length < 2) return null
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/, '')
  if (!isGithubName(owner) || !isGithubName(repo)) return null

  if (parts.length === 2) {
    return { owner, repo, view: 'tree' }
  }

  const kind = parts[2]
  if (kind === 'blob' || kind === 'tree' || kind === 'raw') {
    const rest = parts.slice(3)
    if (rest.length === 0) return { owner, repo, view: 'tree' }
    const ref = rest[0]
    const path = rest.slice(1).join('/')
    if (kind === 'tree') {
      return { owner, repo, ref, path: path || undefined, view: 'tree' }
    }
    return {
      owner,
      repo,
      ref,
      path: path || undefined,
      view: path && isHtmlPath(path) ? 'preview' : 'blob',
    }
  }

  return { owner, repo, view: 'tree' }
}

function parseGistUrl(url: URL): GithubTarget | null {
  const parts = url.pathname.split('/').filter(Boolean)
  if (url.hostname === 'gist.githubusercontent.com') {
    if (parts.length < 4 || parts[2] !== 'raw') return null
    const [owner, gistId] = parts
    const path = parts.length >= 5 ? parts.slice(4).join('/') : parts[3]
    return {
      owner,
      repo: gistId,
      path,
      view: isHtmlPath(path) ? 'preview' : 'blob',
      gist: true,
    }
  }

  if (parts.length === 0) return null
  const owner = parts.length >= 2 ? parts[0] : 'anonymous'
  const gistId = parts.length >= 2 ? parts[1] : parts[0]
  if (!/^[a-f0-9]+$/i.test(gistId)) return null
  const path = gistFileFromHash(url.hash)
  return {
    owner,
    repo: gistId,
    path,
    view: path ? (isHtmlPath(path) ? 'preview' : 'blob') : 'tree',
    gist: true,
  }
}

function gistFileFromHash(hash: string): string | undefined {
  if (!hash.startsWith('#file-')) return undefined
  const slug = hash.slice('#file-'.length)
  if (slug.endsWith('-html')) return `${slug.slice(0, -'-html'.length)}.html`
  if (slug.endsWith('-htm')) return `${slug.slice(0, -'-htm'.length)}.htm`
  return slug
}

function isGithubName(value: string): boolean {
  return /^[\w.-]+$/.test(value)
}

export function repoHref(target: {
  owner: string
  repo: string
  ref?: string
  path?: string
  view?: ViewMode
  gist?: boolean
}): string {
  const params = new URLSearchParams()
  if (target.gist) {
    if (target.path) params.set('file', target.path)
    if (target.view && target.view !== 'tree') params.set('view', target.view)
    const query = params.toString()
    return `/gist/${encodeURIComponent(target.repo)}${query ? `?${query}` : ''}`
  }
  if (target.ref) params.set('ref', target.ref)
  if (target.path) params.set('path', target.path)
  if (target.view && target.view !== 'tree') params.set('view', target.view)
  const query = params.toString()
  return `/r/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}${query ? `?${query}` : ''}`
}

export function githubWebUrl(target: {
  owner: string
  repo: string
  ref?: string
  path?: string
  view?: ViewMode
  gist?: boolean
}): string {
  if (target.gist) {
    const base = `https://gist.github.com/${target.owner}/${target.repo}`
    return target.path ? `${base}#file-${target.path.replace(/\./g, '-')}` : base
  }
  const ref = target.ref ?? 'HEAD'
  if (!target.path) {
    return `https://github.com/${target.owner}/${target.repo}/tree/${ref}`
  }
  const kind = target.view === 'tree' ? 'tree' : 'blob'
  return `https://github.com/${target.owner}/${target.repo}/${kind}/${ref}/${target.path}`
}

export function parentPath(path: string): string {
  if (!path) return ''
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index === -1 ? '' : trimmed.slice(0, index)
}

export function fileName(path: string): string {
  if (!path) return ''
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index === -1 ? trimmed : trimmed.slice(index + 1)
}

export function splitRefAndPath(rest: string, branchNames: string[]): { ref: string; path: string } {
  const names = [...branchNames].sort((a, b) => b.length - a.length)
  const match = names.find((name) => rest === name || rest.startsWith(`${name}/`))
  if (!match) {
    const slash = rest.indexOf('/')
    return slash === -1 ? { ref: rest, path: '' } : { ref: rest.slice(0, slash), path: rest.slice(slash + 1) }
  }
  const path = rest.slice(match.length).replace(/^\//, '')
  return { ref: match, path }
}

export function applyBranchNames(target: GithubTarget, branchNames: string[]): GithubTarget {
  if (target.gist || !target.ref) return target
  const rest = target.path ? `${target.ref}/${target.path}` : target.ref
  const { ref, path } = splitRefAndPath(rest, branchNames)
  let view: ViewMode = target.view
  if (!path) view = 'tree'
  else if (target.view === 'tree') view = 'tree'
  else view = isHtmlPath(path) ? 'preview' : 'blob'
  return { ...target, ref, path: path || undefined, view }
}
