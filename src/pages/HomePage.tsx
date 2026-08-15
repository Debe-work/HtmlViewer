import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader.tsx'
import { ErrorMessage, StatusMessage } from '../components/Status.tsx'
import { listUserRepos, searchRepos, type GithubRepo } from '../lib/github.ts'
import { parseGithubUrl, repoHref } from '../lib/parseGithubUrl.ts'
import { getRecents } from '../lib/recents.ts'
import { getToken } from '../lib/token.ts'
import { useAsync } from '../lib/useAsync.ts'

export function HomePage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [parseError, setParseError] = useState('')
  const recents = useMemo(() => getRecents(), [])
  const hasToken = Boolean(getToken())
  const query = input.trim()
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const looksLikeTarget = Boolean(parseGithubUrl(debouncedQuery))

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 400)
    return () => window.clearTimeout(timer)
  }, [query])

  const myRepos = useAsync(
    hasToken ? 'my-repos' : 'my-repos-skip',
    async (signal) => (hasToken ? listUserRepos(signal) : []),
  )

  const search = useAsync(
    looksLikeTarget || debouncedQuery.length < 2 ? `search-skip:${debouncedQuery}` : `search:${debouncedQuery}`,
    async (signal) => {
      if (looksLikeTarget || debouncedQuery.length < 2) return [] as GithubRepo[]
      return searchRepos(debouncedQuery, signal)
    },
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const target = parseGithubUrl(input)
    if (!target) {
      setParseError('GitHub の URL か owner/repo を入力してください。どの公開リポジトリでも開けます。')
      return
    }
    setParseError('')
    navigate(repoHref(target))
  }

  return (
    <div className="page">
      <AppHeader title="HTML Viewer" />
      <main className="page-body">
        <p className="lede">
          GitHub 上の任意の HTML を、ダウンロードやサーバホストなしでプレビューします。このアプリのリポジトリに限らず、public
          な owner/repo ならそのまま開けます。
        </p>
        <form className="open-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="github-target">
            GitHub URL または owner/repo
          </label>
          <input
            id="github-target"
            className="text-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setParseError('')
            }}
            placeholder="https://github.com/twbs/bootstrap または owner/repo"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="primary-button" type="submit">
            開く
          </button>
        </form>
        {parseError ? <ErrorMessage>{parseError}</ErrorMessage> : null}

        {search.status === 'ok' && search.data.length > 0 ? (
          <section>
            <h2 className="section-title">検索結果</h2>
            <RepoList repos={search.data} />
          </section>
        ) : null}
        {search.status === 'loading' && debouncedQuery.length >= 2 && !looksLikeTarget ? (
          <StatusMessage>検索中...</StatusMessage>
        ) : null}

        {recents.length > 0 ? (
          <section>
            <h2 className="section-title">最近開いたリポジトリ</h2>
            <ul className="repo-list">
              {recents.map((item) => (
                <li key={`${item.owner}/${item.repo}`}>
                  <Link className="repo-row" to={repoHref(item)}>
                    <span className="repo-name">
                      {item.owner}/{item.repo}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasToken ? (
          <section>
            <h2 className="section-title">自分のリポジトリ</h2>
            {myRepos.status === 'loading' ? <StatusMessage>読み込み中...</StatusMessage> : null}
            {myRepos.status === 'error' ? <ErrorMessage>{myRepos.error.message}</ErrorMessage> : null}
            {myRepos.status === 'ok' ? <RepoList repos={myRepos.data} /> : null}
          </section>
        ) : (
          <p className="hint">
            private リポジトリや API 制限を緩和するには、<Link to="/settings">設定</Link> で GitHub PAT を保存してください。
          </p>
        )}
      </main>
    </div>
  )
}

function RepoList({ repos }: { repos: GithubRepo[] }) {
  return (
    <ul className="repo-list">
      {repos.map((repo) => (
        <li key={repo.full_name}>
          <Link className="repo-row" to={repoHref({ owner: repo.owner.login, repo: repo.name })}>
            <span className="repo-name">{repo.full_name}</span>
            {repo.private ? <span className="badge">private</span> : null}
            {repo.description ? <span className="repo-desc">{repo.description}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
