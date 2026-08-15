import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { ErrorMessage, StatusMessage } from '../components/Status.tsx'
import { refineGithubTarget } from '../lib/github.ts'
import { parseGithubUrl, repoHref } from '../lib/parseGithubUrl.ts'
import { useAsync } from '../lib/useAsync.ts'

export function OpenPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const url = params.get('url') ?? ''
  const parsed = parseGithubUrl(url)
  const resolved = useAsync(`open:${url}`, async (signal) => {
    if (!parsed) return null
    return refineGithubTarget(parsed, signal)
  })

  useEffect(() => {
    if (resolved.status === 'ok' && resolved.data) {
      navigate(repoHref(resolved.data), { replace: true })
    }
  }, [resolved, navigate])

  if (!parsed) {
    return (
      <div className="page">
        <AppHeader title="開けません" backTo="/" />
        <main className="page-body">
          <ErrorMessage>GitHub の URL として解釈できませんでした。owner/repo または github.com のファイル URL を指定してください。</ErrorMessage>
        </main>
      </div>
    )
  }

  if (resolved.status === 'error') {
    return <Navigate to={repoHref(parsed)} replace />
  }

  return (
    <div className="page">
      <AppHeader title="開いています" backTo="/" />
      <StatusMessage>GitHub の参照先を解決しています...</StatusMessage>
    </div>
  )
}
