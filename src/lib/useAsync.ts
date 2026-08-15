import { useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: Error }

export function useAsync<T>(key: string, fn: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const ac = new AbortController()
    setState({ status: 'loading' })
    fnRef.current(ac.signal).then(
      (data) => {
        if (!ac.signal.aborted) setState({ status: 'ok', data })
      },
      (error: unknown) => {
        if (!ac.signal.aborted) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      },
    )
    return () => ac.abort()
  }, [key])

  return state
}
