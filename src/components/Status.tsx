import type { ReactNode } from 'react'

type StatusProps = {
  children: ReactNode
}

export function StatusMessage({ children }: StatusProps) {
  return <p className="status-message">{children}</p>
}

export function ErrorMessage({ children }: StatusProps) {
  return <p className="error-message">{children}</p>
}
