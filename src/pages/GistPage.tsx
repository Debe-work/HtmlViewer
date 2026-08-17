import { useEffect, useRef } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { ErrorMessage, StatusMessage } from '../components/Status.tsx'
import { getGist, type GistFile } from '../lib/github.ts'
import { fileName, githubWebUrl, isMarkdownPath, isPreviewablePath, repoHref, type ViewMode } from '../lib/parseGithubUrl.ts'
import { renderMarkdown } from '../lib/renderMarkdown.ts'
import { rewriteHtml } from '../lib/rewriteHtml.ts'
import { useAsync } from '../lib/useAsync.ts'

export function GistPage() {
  const { gistId = '' } = useParams()
  const [params] = useSearchParams()
  const file = params.get('file') ?? ''
  const view = (params.get('view') as ViewMode | null) ?? (file ? 'preview' : 'tree')
  const gist = useAsync(`gist:${gistId}`, (signal) => getGist(gistId, signal))

  if (gist.status === 'loading') {
    return (
      <div className="page">
        <AppHeader title="gist" backTo="/" />
        <StatusMessage>Gist を読み込み中...</StatusMessage>
      </div>
    )
  }

  if (gist.status === 'error') {
    return (
      <div className="page">
        <AppHeader title="gist" backTo="/" />
        <main className="page-body">
          <ErrorMessage>{gist.error.message}</ErrorMessage>
        </main>
      </div>
    )
  }

  const owner = gist.data.owner?.login ?? 'anonymous'
  const files = Object.values(gist.data.files)
  const selected = file ? gist.data.files[file] : undefined

  if (file && !selected) {
    return (
      <div className="page">
        <AppHeader title={gistId} backTo={repoHref({ owner, repo: gistId, gist: true })} />
        <main className="page-body">
          <ErrorMessage>指定したファイルが Gist にありません。</ErrorMessage>
        </main>
      </div>
    )
  }

  if (!file && files.length === 1 && isPreviewablePath(files[0].filename)) {
    return (
      <Navigate
        to={repoHref({
          owner,
          repo: gistId,
          path: files[0].filename,
          view: 'preview',
          gist: true,
        })}
        replace
      />
    )
  }

  if (selected && view === 'preview' && isPreviewablePath(selected.filename)) {
    return <GistPreview owner={owner} gistId={gistId} files={gist.data.files} selected={selected} />
  }

  if (selected) {
    return (
      <div className="page">
        <AppHeader
          title={selected.filename}
          backTo={repoHref({ owner, repo: gistId, gist: true })}
          extra={
            <HeaderExtras
              owner={owner}
              gistId={gistId}
              path={selected.filename}
              view="blob"
              previewable={isPreviewablePath(selected.filename)}
            />
          }
        />
        <main className="page-body">
          <pre className="source-view">
            <code>{selected.content}</code>
          </pre>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <AppHeader
        title={`gist/${gistId.slice(0, 8)}`}
        backTo="/"
        extra={
          <a className="text-link" href={gist.data.html_url} target="_blank" rel="noreferrer">
            GitHub
          </a>
        }
      />
      <main className="page-body">
        <ul className="file-list">
          {files.map((item) => (
            <li key={item.filename}>
              <Link
                className="file-row"
                to={repoHref({
                  owner,
                  repo: gistId,
                  path: item.filename,
                  view: isPreviewablePath(item.filename) ? 'preview' : 'blob',
                  gist: true,
                })}
              >
                <span className="file-name">{item.filename}</span>
                <span className="file-size">{item.size} B</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

function GistPreview({
  owner,
  gistId,
  files,
  selected,
}: {
  owner: string
  gistId: string
  files: Record<string, GistFile>
  selected: GistFile
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const preview = useAsync(`gist-preview:${gistId}/${selected.filename}`, async () => {
    const documentHtml = isMarkdownPath(selected.filename)
      ? renderMarkdown(selected.content)
      : selected.content
    return rewriteHtml(documentHtml, {
      filePath: selected.filename,
      fetchText: async (repoPath) => {
        const match = files[fileName(repoPath)] ?? files[repoPath]
        if (!match) throw new Error(`missing ${repoPath}`)
        return match.content
      },
      resolveMediaUrl: (repoPath) => {
        const match = files[fileName(repoPath)] ?? files[repoPath]
        return match?.raw_url ?? repoPath
      },
      rewriteHtmlHref: (repoPath) => {
        const hash = repoHref({
          owner,
          repo: gistId,
          path: fileName(repoPath),
          view: isPreviewablePath(repoPath) ? 'preview' : 'blob',
          gist: true,
        })
        return `${window.location.origin}${window.location.pathname}#${hash}`
      },
    })
  })

  useEffect(() => {
    if (preview.status !== 'ok' || !iframeRef.current) return
    iframeRef.current.srcdoc = preview.data
  }, [preview])

  return (
    <div className="page page-preview">
      <AppHeader
        title={selected.filename}
        backTo={repoHref({ owner, repo: gistId, gist: true })}
        extra={<HeaderExtras owner={owner} gistId={gistId} path={selected.filename} view="preview" previewable />}
      />
      {preview.status === 'loading' ? <StatusMessage>プレビューを組み立てています...</StatusMessage> : null}
      {preview.status === 'error' ? (
        <main className="page-body">
          <ErrorMessage>{preview.error.message}</ErrorMessage>
        </main>
      ) : null}
      {preview.status === 'ok' ? (
        <iframe
          ref={iframeRef}
          className="preview-frame"
          title="preview"
          sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </div>
  )
}

function HeaderExtras({
  owner,
  gistId,
  path,
  view,
  previewable,
}: {
  owner: string
  gistId: string
  path: string
  view: ViewMode
  previewable?: boolean
}) {
  return (
    <div className="header-actions">
      {previewable ? (
        <Link
          className="text-link"
          to={repoHref({
            owner,
            repo: gistId,
            path,
            view: view === 'preview' ? 'blob' : 'preview',
            gist: true,
          })}
        >
          {view === 'preview' ? 'ソース' : 'プレビュー'}
        </Link>
      ) : null}
      <a
        className="text-link"
        href={githubWebUrl({ owner, repo: gistId, path, view, gist: true })}
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </div>
  )
}
