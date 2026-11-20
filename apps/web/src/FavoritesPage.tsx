import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:3000'
type Kind = 'team' | 'player' | 'competition' | 'match'
type Target = { id: number; name?: string; firstName?: string; lastName?: string; homeTeam?: { name: string }; awayTeam?: { name: string } }
type Favorite = { id: number } & Record<Kind, Target | null>
const kinds: Kind[] = ['team', 'player', 'competition', 'match']
function title(target: Target) {
  return target.name ?? (target.homeTeam && target.awayTeam ? target.homeTeam.name + ' vs ' + target.awayTeam.name : target.firstName + ' ' + target.lastName)
}

export default function FavoritesPage() {
  const [token, setToken] = useState(() => localStorage.getItem('viewerToken'))
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [kind, setKind] = useState<Kind>('team')
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function signOut() {
    localStorage.removeItem('viewerToken')
    setToken(null)
    setFavorites([])
  }

  useEffect(() => {
    if (!token) return
    let active = true
    fetch(API + '/favorites', { headers: { Authorization: 'Bearer ' + token } })
      .then(async response => {
        if (response.status === 401) { if (active) { localStorage.removeItem('viewerToken'); setToken(null); setFavorites([]) } return }
        if (!response.ok) throw new Error('Could not load favorites')
        const data = await response.json() as Favorite[]
        if (active) setFavorites(data)
      }).catch(err => { if (active) setError(String(err)) })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true
    fetch(API + '/' + (kind === 'match' ? 'matches' : kind + 's'))
      .then(async response => {
        if (!response.ok) throw new Error('Could not load available items')
        const data = await response.json() as Target[]
        if (active) setTargets(data)
      }).catch(err => { if (active) setError(String(err)) })
    return () => { active = false }
  }, [kind, token])

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (register) {
        const result = await fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
        if (!result.ok) throw new Error(result.status === 409 ? 'Email already registered' : 'Registration failed')
      }
      const result = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (!result.ok) throw new Error('Sign in failed')
      const data = await result.json() as { accessToken: string }
      localStorage.setItem('viewerToken', data.accessToken)
      setToken(data.accessToken)
      setPassword('')
    } catch (err) { setError(String(err)) } finally { setBusy(false) }
  }

  async function change(type: Kind, id: number, method: 'PUT' | 'DELETE') {
    if (!token || busy) return
    setBusy(true); setError('')
    try {
      const headers = { Authorization: 'Bearer ' + token }
      const response = await fetch(API + '/favorites/' + type + '/' + id, { method, headers })
      if (response.status === 401) { signOut(); return }
      if (!response.ok) throw new Error('Could not update favorites')
      const list = await fetch(API + '/favorites', { headers })
      if (!list.ok) throw new Error('Could not reload favorites')
      setFavorites(await list.json())
    } catch (err) { setError(String(err)) } finally { setBusy(false) }
  }

  return <main className="main"><section className="matches-section">
    <h1>{token ? 'My favorites' : register ? 'Create viewer account' : 'Viewer sign in'}</h1>
    {error && <p role="alert">{error}</p>}
    {!token ? <form onSubmit={authenticate}>
      <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" required minLength={register ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">{register ? 'Register' : 'Sign in'}</button>
      <button type="button" disabled={busy} onClick={() => { setRegister(!register); setError('') }}>{register ? 'Already have an account?' : 'Create account'}</button>
    </form> : <>
      <button onClick={signOut} disabled={busy}>Sign out</button>
      <form onSubmit={e => { e.preventDefault(); void change(kind, Number(targetId), 'PUT') }}>
        <label>Favorite type<select value={kind} onChange={e => { setKind(e.target.value as Kind); setTargets([]); setTargetId('') }}>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
        <label>Search list<select required value={targetId} onChange={e => setTargetId(e.target.value)}><option value="">Select an item</option>{targets.map(t => <option key={t.id} value={t.id}>{title(t)}</option>)}</select></label>
        <button disabled={busy || !targetId}>Add favorite</button>
      </form>
      <ul>{favorites.map(f => {
        const type = kinds.find(k => f[k] !== null)
        const target = type && f[type]
        if (!type || !target) return null
        const path = type === 'competition' ? '/competitions' : '/' + (type === 'match' ? 'matches' : type + 's') + '/' + target.id
        return <li key={f.id}><Link to={path}>{title(target)}</Link> ({type}) <button disabled={busy} onClick={() => void change(type, target.id, 'DELETE')}>Remove</button></li>
      })}</ul>
      {!favorites.length && <p>No favorites yet.</p>}
    </>}
  </section></main>
}
