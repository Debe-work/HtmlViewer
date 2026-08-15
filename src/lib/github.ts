import { getToken } from './token.ts'
import { applyBranchNames, isHtmlPath, type GithubTarget } from './parseGithubUrl.ts'

const API = 'https://api.github.com'

export class GithubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubError'
    this.status = status
  }
}

export type GithubUser = {
  login: string
  name: string | null
  avatar_url: string
}

export type GithubRepo = {
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
  owner: { login: string }
  html_url: string
  updated_at: string
}

export type GithubContent = {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  download_url: string | null
  html_url: string
}

export type GithubBranch = {
  name: string
}

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function githubFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  })
  if (response.ok) return response
  throw await toGithubError(response)
}

async function toGithubError(response: Response): Promise<GithubError> {
  let detail = ''
  try {
    const body = (await response.json()) as { message?: string }
    detail = body.message ?? ''
  } catch {
    detail = ''
  }

  if (response.status === 401) {
    return new GithubError('GitHub トークンが無効です。設定から PAT を確認してください。', 401)
  }
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    return new GithubError(
      'GitHub API のレート制限に達しました。設定で Personal Access Token を入れると上限が上がります。',
      403,
    )
  }
  if (response.status === 403) {
    return new GithubError(detail || 'このリポジトリを読む権限がありません。', 403)
  }
  if (response.status === 404) {
    return new GithubError('見つかりませんでした。private なら PAT が必要です。', 404)
  }
  return new GithubError(detail || `GitHub API エラー (${response.status})`, response.status)
}

export async function getAuthenticatedUser(signal?: AbortSignal): Promise<GithubUser> {
  const response = await githubFetch(`${API}/user`, { signal })
  return (await response.json()) as GithubUser
}

export async function getRepo(owner: string, repo: string, signal?: AbortSignal): Promise<GithubRepo> {
  const response = await githubFetch(`${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    signal,
  })
  return (await response.json()) as GithubRepo
}

export async function listUserRepos(signal?: AbortSignal): Promise<GithubRepo[]> {
  const response = await githubFetch(`${API}/user/repos?per_page=50&sort=updated`, { signal })
  return (await response.json()) as GithubRepo[]
}

export async function searchRepos(query: string, signal?: AbortSignal): Promise<GithubRepo[]> {
  const q = query.trim()
  if (!q) return []
  const response = await githubFetch(
    `${API}/search/repositories?q=${encodeURIComponent(q)}&per_page=10`,
    { signal },
  )
  const body = (await response.json()) as { items: GithubRepo[] }
  return body.items
}

export async function listBranches(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<GithubBranch[]> {
  const response = await githubFetch(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
    { signal },
  )
  return (await response.json()) as GithubBranch[]
}

export async function listContents(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  signal?: AbortSignal,
): Promise<GithubContent[] | GithubContent> {
  const suffix = path ? `/${path.split('/').map(encodeURIComponent).join('/')}` : ''
  const url = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${suffix}?ref=${encodeURIComponent(ref)}`
  const response = await githubFetch(url, { signal })
  return (await response.json()) as GithubContent[] | GithubContent
}

export function rawFileUrl(owner: string, repo: string, ref: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

export async function fetchFileBlob(
  owner: string, repo: string, ref: string, path: string, signal?: AbortSignal,
): Promise<Blob> {
  const token = getToken()
  if (token) {
    const suffix = path.split('/').map(encodeURIComponent).join('/')
    const url = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${suffix}?ref=${encodeURIComponent(ref)}`
    const response = await fetch(url, {
      signal,
      headers: authHeaders({ Accept: 'application/vnd.github.raw' }),
    })
    if (!response.ok) throw await toGithubError(response)
    return await response.blob()
  }

  const response = await fetch(rawFileUrl(owner, repo, ref, path), { signal })
  if (!response.ok) {
    throw new GithubError(`ファイルの取得に失敗しました (${response.status})`, response.status)
  }
  return await response.blob()
}

export async function fetchFileText(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  signal?: AbortSignal,
): Promise<string> {
  const token = getToken()
  if (token) {
    const suffix = path.split('/').map(encodeURIComponent).join('/')
    const url = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${suffix}?ref=${encodeURIComponent(ref)}`
    const response = await fetch(url, {
      signal,
      headers: authHeaders({ Accept: 'application/vnd.github.raw' }),
    })
    if (!response.ok) throw await toGithubError(response)
    return await response.text()
  }

  const response = await fetch(rawFileUrl(owner, repo, ref, path), { signal })
  if (!response.ok) {
    throw new GithubError(
      response.status === 404
        ? 'ファイルが見つかりません。private なら PAT が必要です。'
        : `ファイルの取得に失敗しました (${response.status})`,
      response.status,
    )
  }
  return await response.text()
}

export type GistFile = {
  filename: string
  content: string
  raw_url: string
  size: number
}

export type GithubGist = {
  id: string
  owner: { login: string } | null
  files: Record<string, GistFile>
  html_url: string
}

export async function getGist(id: string, signal?: AbortSignal): Promise<GithubGist> {
  const response = await githubFetch(`${API}/gists/${encodeURIComponent(id)}`, { signal })
  return (await response.json()) as GithubGist
}

export async function refineGithubTarget(
  target: GithubTarget,
  signal?: AbortSignal,
): Promise<GithubTarget> {
  if (target.gist || !target.ref) return target
  try {
    const branches = await listBranches(target.owner, target.repo, signal)
    return applyBranchNames(
      target,
      branches.map((branch) => branch.name),
    )
  } catch {
    return target
  }
}

export function defaultViewForPath(path: string, type: GithubContent['type']): 'tree' | 'blob' | 'preview' {
  if (type === 'dir') return 'tree'
  return isHtmlPath(path) ? 'preview' : 'blob'
}
