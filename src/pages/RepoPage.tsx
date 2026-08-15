import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { FileList } from '../components/FileList.tsx'
import { ErrorMessage, StatusMessage } from '../components/Status.tsx'
import {
  fetchFileBlob,
  fetchFileText,
  getRepo,
  listBranches,
  listContents,
  rawFileUrl,
  type GithubContent,
} from '../lib/github.ts'
import {
  fileName,
  githubWebUrl,
  isHtmlPath,
  isImagePath,
  parentPath,
  repoHref,
  type ViewMode,
} from '../lib/parseGithubUrl.ts'
import { addRecent } from '../lib/recents.ts'
import { rewriteHtml } from '../lib/rewriteHtml.ts'
import { getToken } from '../lib/token.ts'
import { useAsync } from '../lib/useAsync.ts'

export function RepoPage() {
  const { owner = '', repo = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const path = params.get('path') ?? ''
  const requestedRef = params.get('ref') ?? ''
  const view = (params.get('view') as ViewMode | null) ?? 'tree'

  const repoState = useAsync(`${owner}/${repo}`, (signal) => getRepo(owner, repo, signal))

  useEffect(() => {
    if (owner && repo) addRecent(owner, repo)
  }, [owner, repo])

  useEffect(() => {
    if (repoState.status !== 'ok') return
    if (requestedRef) return
    navigate(
      repoHref({
        owner,
        repo,
        ref: repoState.data.default_branch,
        path,
        view,
      }),
      { replace: true },
    )
  }, [repoState, requestedRef, navigate, owner, repo, path, view])

  const refName = requestedRef || (repoState.status === 'ok' ? repoState.data.default_branch : '')

  if (repoState.status === 'loading') {
    return (
      <div className="page">
        <AppHeader title={`${owner}/${repo}`} backTo="/" />
        <StatusMessage>リポジトリを読み込み中...</StatusMessage>
      </div>
    )
  }

  if (repoState.status === 'error') {
    return (
      <div className="page">
        <AppHeader title={`${owner}/${repo}`} backTo="/" />
        <main className="page-body">
          <ErrorMessage>{repoState.error.message}</ErrorMessage>
        </main>
      </div>
    )
  }

  if (!refName) return null

  if (view === 'preview') {
    return <PreviewPane owner={owner} repo={repo} refName={refName} path={path} />
  }
  if (view === 'blob') {
    return <BlobPane owner={owner} repo={repo} refName={refName} path={path} />
  }
  return <TreePane owner={owner} repo={repo} refName={refName} path={path} defaultBranch={repoState.data.default_branch} />
}

function TreePane({
  owner,
  repo,
  refName,
  path,
  defaultBranch,
}: {
  owner: string
  repo: string
  refName: string
  path: string
  defaultBranch: string
}) {
  const navigate = useNavigate()
  const contents = useAsync(`${owner}/${repo}/${refName}/${path}`, (signal) =>
    listContents(owner, repo, path, refName, signal),
  )
  const branches = useAsync(`${owner}/${repo}/branches`, (signal) => listBranches(owner, repo, signal))

  useEffect(() => {
    if (contents.status !== 'ok') return
    if (Array.isArray(contents.data)) return
    const file = contents.data
    navigate(
      repoHref({
        owner,
        repo,
        ref: refName,
        path: file.path,
        view: isHtmlPath(file.path) ? 'preview' : 'blob',
      }),
      { replace: true },
    )
  }, [contents, navigate, owner, repo, refName])

  const items: GithubContent[] = contents.status === 'ok' && Array.isArray(contents.data) ? contents.data : []
  const crumbs = breadcrumb(path)

  return (
    <div className="page">
      <AppHeader
        title={`${owner}/${repo}`}
        backTo={path ? repoHref({ owner, repo, ref: refName, path: parentPath(path), view: 'tree' }) : '/'}
        extra={
          <a
            className="text-link"
            href={githubWebUrl({ owner, repo, ref: refName, path, view: 'tree' })}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        }
      />
      <main className="page-body">
        <div className="toolbar">
          <label className="sr-only" htmlFor="branch">
            ブランチ
          </label>
          <select
            id="branch"
            className="select-input"
            value={refName}
            onChange={(event) =>
              navigate(repoHref({ owner, repo, ref: event.target.value, path, view: 'tree' }))
            }
          >
            {!(branches.status === 'ok' && branches.data.some((b) => b.name === refName)) ? (
              <option value={refName}>{refName}</option>
            ) : null}
            {(branches.status === 'ok' ? branches.data : [{ name: defaultBranch }]).map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <nav className="crumbs" aria-label="パンくず">
          <Link to={repoHref({ owner, repo, ref: refName, view: 'tree' })}>{repo}</Link>
          {crumbs.map((crumb) => (
            <span key={crumb.path}>
              <span className="crumb-sep">/</span>
              <Link to={repoHref({ owner, repo, ref: refName, path: crumb.path, view: 'tree' })}>
                {crumb.name}
              </Link>
            </span>
          ))}
        </nav>
        {contents.status === 'loading' ? <StatusMessage>ファイル一覧を読み込み中...</StatusMessage> : null}
        {contents.status === 'error' ? <ErrorMessage>{contents.error.message}</ErrorMessage> : null}
        {contents.status === 'ok' && Array.isArray(contents.data) ? (
          items.length === 0 ? (
            <StatusMessage>空のディレクトリです。</StatusMessage>
          ) : (
            <FileList owner={owner} repo={repo} refName={refName} items={items} />
          )
        ) : null}
      </main>
    </div>
  )
}

function PreviewPane({
  owner,
  repo,
  refName,
  path,
}: {
  owner: string
  repo: string
  refName: string
  path: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const blobUrls = useRef<string[]>([])
  const token = getToken()
  const preview = useAsync(`preview:${owner}/${repo}/${refName}/${path}`, async (signal) => {
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url))
    blobUrls.current = []
    const html = await fetchFileText(owner, repo, refName, path, signal)
    return rewriteHtml(html, {
      filePath: path,
      fetchText: (repoPath) => fetchFileText(owner, repo, refName, repoPath, signal),
      resolveMediaUrl: async (repoPath) => {
        if (!token) return rawFileUrl(owner, repo, refName, repoPath)
        const blob = await fetchFileBlob(owner, repo, refName, repoPath, signal)
        const url = URL.createObjectURL(blob)
        blobUrls.current.push(url)
        return url
      },
      rewriteHtmlHref: (repoPath) => {
        const hash = repoHref({
          owner,
          repo,
          ref: refName,
          path: repoPath,
          view: isHtmlPath(repoPath) ? 'preview' : 'blob',
        })
        return `${window.location.origin}${window.location.pathname}#${hash}`
      },
    })
  })

  useEffect(() => {
    if (preview.status !== 'ok' || !iframeRef.current) return
    iframeRef.current.srcdoc = preview.data
  }, [preview])

  useEffect(() => {
    const urls = blobUrls
    return () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div className="page page-preview">
      <AppHeader
        title={fileName(path) || 'preview'}
        backTo={repoHref({ owner, repo, ref: refName, path: parentPath(path), view: 'tree' })}
        extra={
          <div className="header-actions">
            <Link
              className="text-link"
              to={repoHref({ owner, repo, ref: refName, path, view: 'blob' })}
            >
              ソース
            </Link>
            <a
              className="text-link"
              href={githubWebUrl({ owner, repo, ref: refName, path, view: 'preview' })}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        }
      />
      {preview.status === 'loading' ? <StatusMessage>HTML を組み立てています...</StatusMessage> : null}
      {preview.status === 'error' ? (
        <main className="page-body">
          <ErrorMessage>{preview.error.message}</ErrorMessage>
        </main>
      ) : null}
      {preview.status === 'ok' ? (
        <iframe
          ref={iframeRef}
          className="preview-frame"
          title="HTML preview"
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  )
}

function BlobPane({
  owner,
  repo,
  refName,
  path,
}: {
  owner: string
  repo: string
  refName: string
  path: string
}) {
  const token = getToken()
  const text = useAsync(
    isImagePath(path) ? `blob-skip:${path}` : `blob:${owner}/${repo}/${refName}/${path}`,
    async (signal) => (isImagePath(path) ? '' : fetchFileText(owner, repo, refName, path, signal)),
  )
  const image = useAsync(
    isImagePath(path) && token ? `img:${owner}/${repo}/${refName}/${path}` : `img-skip:${path}`,
    async (signal) => {
      if (!isImagePath(path) || !token) return ''
      const blob = await fetchFileBlob(owner, repo, refName, path, signal)
      return URL.createObjectURL(blob)
    },
  )
  const imageSrc = token && image.status === 'ok' && image.data ? image.data : rawFileUrl(owner, repo, refName, path)

  return (
    <div className="page">
      <AppHeader
        title={fileName(path) || 'file'}
        backTo={repoHref({ owner, repo, ref: refName, path: parentPath(path), view: 'tree' })}
        extra={
          <div className="header-actions">
            {isHtmlPath(path) ? (
              <Link
                className="text-link"
                to={repoHref({ owner, repo, ref: refName, path, view: 'preview' })}
              >
                プレビュー
              </Link>
            ) : null}
            <a
              className="text-link"
              href={githubWebUrl({ owner, repo, ref: refName, path, view: 'blob' })}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        }
      />
      <main className="page-body">
        {isImagePath(path) ? (
          <img className="blob-image" src={imageSrc} alt={fileName(path)} />
        ) : text.status === 'loading' ? (
          <StatusMessage>ファイルを読み込み中...</StatusMessage>
        ) : text.status === 'error' ? (
          <ErrorMessage>{text.error.message}</ErrorMessage>
        ) : (
          <pre className="source-view">
            <code>{text.data}</code>
          </pre>
        )}
      </main>
    </div>
  )
}

function breadcrumb(path: string): { name: string; path: string }[] {
  if (!path) return []
  const parts = path.split('/').filter(Boolean)
  return parts.map((name, index) => ({
    name,
    path: parts.slice(0, index + 1).join('/'),
  }))
}
