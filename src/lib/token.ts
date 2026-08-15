const TOKEN_KEY = 'htmlviewer.githubToken'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY)?.trim() ?? ''
}

export function setToken(token: string) {
  const next = token.trim()
  if (!next) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, next)
}
