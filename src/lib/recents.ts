const RECENTS_KEY = 'htmlviewer.recents'
const MAX_RECENTS = 20

export type RecentRepo = {
  owner: string
  repo: string
  openedAt: number
}

export function getRecents(): RecentRepo[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentRepo[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.owner === 'string' && typeof item.repo === 'string')
  } catch {
    return []
  }
}

export function addRecent(owner: string, repo: string) {
  const next = [
    { owner, repo, openedAt: Date.now() },
    ...getRecents().filter((item) => !(item.owner === owner && item.repo === repo)),
  ].slice(0, MAX_RECENTS)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
}
