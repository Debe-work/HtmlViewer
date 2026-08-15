import { Navigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { ErrorMessage } from '../components/Status.tsx'
import { parseGithubUrl, repoHref } from '../lib/parseGithubUrl.ts'

export function OpenPage() {
  const [params] = useSearchParams()
  const url = params.get('url') ?? ''
  const target = parseGithubUrl(url)

  if (target) {
    return <Navigate to={repoHref(target)} replace />
  }

  return (
    <div className="page">
      <AppHeader title="開けません" backTo="/" />
      <main className="page-body">
        <ErrorMessage>GitHub の URL として解釈できませんでした。owner/repo または github.com のファイル URL を指定してください。</ErrorMessage>
      </main>
    </div>
  )
}
