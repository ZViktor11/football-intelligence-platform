import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { FavoritesContext } from './favorites-context'
import type { Favorite, FavoriteKind } from './favorites-context'

const API = 'http://localhost:3000'
const TOKEN_KEY = 'viewerToken'

export default function FavoritesProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const currentToken = useRef(token)
  const mutation = useRef(false)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  const setSession = useCallback((next: string | null) => {
    currentToken.current = next
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
    setToken(next)
    setFavorites([])
    setReady(false)
    setError('')
    mutation.current = false
    setBusy(false)
  }, [])

  const signOut = useCallback(() => setSession(null), [setSession])
  const signIn = useCallback((value: string) => setSession(value), [setSession])

  function expireSession() {
    signOut()
    setError('Your session expired. Please sign in again.')
  }

  useEffect(() => {
    if (!token) return
    let active = true
    const controller = new AbortController()
    fetch(API + '/favorites', {
      headers: { Authorization: 'Bearer ' + token },
      signal: controller.signal,
    }).then(async response => {
      if (!active || currentToken.current !== token) return
      if (response.status === 401) {
        signOut()
        setError('Your session expired. Please sign in again.')
        return
      }
      if (!response.ok) throw new Error('Could not load favorites')
      const data = await response.json() as Favorite[]
      if (active && currentToken.current === token) {
        setFavorites(data)
        setReady(true)
        setError('')
      }
    }).catch(err => {
      if (active && currentToken.current === token) setError(String(err))
    })
    return () => { active = false; controller.abort() }
  }, [token, revision, signOut])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if ((event.key === TOKEN_KEY || event.key === null) && currentToken.current !== localStorage.getItem(TOKEN_KEY)) {
        setSession(localStorage.getItem(TOKEN_KEY))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setSession])

  async function change(kind: FavoriteKind, id: number, method: 'PUT' | 'DELETE') {
    if (!token || !ready || mutation.current) return
    mutation.current = true
    setBusy(true)
    setError('')
    try {
      const headers = { Authorization: 'Bearer ' + token }
      const response = await fetch(API + '/favorites/' + kind + '/' + id, { method, headers })
      if (currentToken.current !== token) return
      if (response.status === 401) { expireSession(); return }
      if (!response.ok) throw new Error('Could not update favorite')
      setReady(false)
      const list = await fetch(API + '/favorites', { headers })
      if (currentToken.current !== token) return
      if (list.status === 401) { expireSession(); return }
      if (!list.ok) {
        setReady(false)
        throw new Error('Favorite saved, but the list could not be refreshed')
      }
      const data = await list.json() as Favorite[]
      if (currentToken.current === token) {
        setFavorites(data)
        setReady(true)
      }
    } catch (err) {
      if (currentToken.current === token) {
        setReady(false)
        setError(String(err))
      }
    } finally {
      if (currentToken.current === token) {
        mutation.current = false
        setBusy(false)
      }
    }
  }

  return <FavoritesContext.Provider value={{
    token, favorites, ready, busy, error, signIn, signOut,
    reload: () => { setReady(false); setError(''); setRevision(value => value + 1) },
    change,
  }}>{children}</FavoritesContext.Provider>
}
