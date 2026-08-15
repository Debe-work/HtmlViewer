import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader.tsx'
import { ErrorMessage, StatusMessage } from '../components/Status.tsx'
import { getAuthenticatedUser } from '../lib/github.ts'
import { getToken, setToken } from '../lib/token.ts'

export function SettingsPage() {
  const [token, setTokenValue] = useState(getToken())
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const onSave = async (event: FormEvent) => {
    event.preventDefault()
    setToken(token)
    if (!token.trim()) {
      setStatus('ok')
      setMessage('トークンを削除しました。public リポジトリのみ開けます。')
      return
    }
    setStatus('saving')
    try {
      const user = await getAuthenticatedUser()
      setStatus('ok')
      setMessage(`接続できました: ${user.login}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '検証に失敗しました')
    }
  }

  return (
    <div className="page">
      <AppHeader title="設定" backTo="/" />
      <main className="page-body">
        <p className="lede">
          トークンはブラウザの localStorage にだけ保存し、この静的アプリ以外には送りません。GitHub API
          の呼び出しにだけ使います。
        </p>
        <form className="open-form" onSubmit={onSave}>
          <label htmlFor="pat">GitHub Personal Access Token</label>
          <input
            id="pat"
            className="text-input"
            type="password"
            value={token}
            onChange={(event) => setTokenValue(event.target.value)}
            placeholder="github_pat_... または ghp_..."
            autoComplete="off"
          />
          <button className="primary-button" type="submit" disabled={status === 'saving'}>
            保存して検証
          </button>
        </form>
        {status === 'saving' ? <StatusMessage>検証中...</StatusMessage> : null}
        {status === 'ok' ? <StatusMessage>{message}</StatusMessage> : null}
        {status === 'error' ? <ErrorMessage>{message}</ErrorMessage> : null}
        <section className="notes">
          <h2 className="section-title">スコープ</h2>
          <ul>
            <li>public のみ: トークンなし、または fine-grained で Contents: Read</li>
            <li>private も含む: classic なら <code>repo</code>、fine-grained なら対象リポジトリの Contents: Read</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
