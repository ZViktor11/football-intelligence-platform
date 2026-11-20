import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { favoriteKinds as kinds, favoriteTitle as title, useFavorites } from './favorites-context'
import type { FavoriteKind as Kind, FavoriteTarget as Target } from './favorites-context'

const API = 'http://localhost:3000'
export default function FavoritesPage() {
  const { token, favorites, ready, busy: updating, signIn, signOut, change } = useFavorites()
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [targets, setTargets] = useState<Target[]>([])
  const [kind, setKind] = useState<Kind>('team')
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
      signIn(data.accessToken)
      setPassword('')
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
      <button onClick={signOut} disabled={updating}>Sign out</button>
      <form onSubmit={e => { e.preventDefault(); void change(kind, Number(targetId), 'PUT') }}>
        <label>Favorite type<select value={kind} onChange={e => { setKind(e.target.value as Kind); setTargets([]); setTargetId('') }}>{kinds.map(k => <option key={k}>{k}</option>)}</select></label>
        <label>Search list<select required value={targetId} onChange={e => setTargetId(e.target.value)}><option value="">Select an item</option>{targets.map(t => <option key={t.id} value={t.id}>{title(t)}</option>)}</select></label>
        <button disabled={updating || !ready || !targetId}>Add favorite</button>
      </form>
      <ul>{favorites.map(f => {
        const type = kinds.find(k => f[k] !== null)
        const target = type && f[type]
        if (!type || !target) return null
        const path = type === 'competition' ? '/competitions' : '/' + (type === 'match' ? 'matches' : type + 's') + '/' + target.id
        return <li key={f.id}><Link to={path}>{title(target)}</Link> ({type}) <button disabled={updating || !ready} onClick={() => void change(type, target.id, 'DELETE')}>Remove</button></li>
      })}</ul>
      {!ready ? <p>Loading favorites...</p> : !favorites.length && <p>No favorites yet.</p>}
    </>}
  </section></main>
}
