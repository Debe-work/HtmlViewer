import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { GithubContent } from '../lib/github.ts'
import { defaultViewForPath } from '../lib/github.ts'
import { repoHref } from '../lib/parseGithubUrl.ts'

type FileListProps = {
  owner: string
  repo: string
  refName: string
  items: GithubContent[]
}

export function FileList({ owner, repo, refName, items }: FileListProps) {
  const sorted = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <ul className="file-list">
      {sorted.map((item) => {
        const view = defaultViewForPath(item.path, item.type)
        const kind = item.type === 'dir' ? 'dir' : view
        return (
          <li key={item.path}>
            <Link
              className="file-row"
              to={repoHref({ owner, repo, ref: refName, path: item.path, view })}
            >
              <span className={`file-icon file-icon-${kind}`}>{iconFor(kind)}</span>
              <span className="file-name">{item.name}</span>
              {item.type === 'file' ? <span className="file-size">{formatSize(item.size)}</span> : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function iconFor(kind: string): ReactNode {
  if (kind === 'dir') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    )
  }
  if (kind === 'preview') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8 4 12l4 4M16 8l4 4-4 4M13 6l-2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
