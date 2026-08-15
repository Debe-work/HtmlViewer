import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AppHeaderProps = {
  title: string
  backTo?: string
  extra?: ReactNode
}

export function AppHeader({ title, backTo, extra }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        {backTo ? (
          <Link className="icon-button" to={backTo} aria-label="戻る">
            <BackIcon />
          </Link>
        ) : (
          <span className="brand-mark" aria-hidden="true">
            {'</>'}
          </span>
        )}
        <h1 className="app-title">{title}</h1>
      </div>
      <div className="app-header-right">
        {extra}
        <Link className="icon-button" to="/settings" aria-label="設定">
          <GearIcon />
        </Link>
      </div>
    </header>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.5-2-3.5-2.4.5a8 8 0 0 0-1.7-1L15 3h-4l-.4 2.5a8 8 0 0 0-1.7 1L6.5 6 4.5 9.5 6.5 11a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-.5a8 8 0 0 0 1.7 1L11 21h4l.4-2.5a8 8 0 0 0 1.7-1l2.4.5 2-3.5-2-1.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
