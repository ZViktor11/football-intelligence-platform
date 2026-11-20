import { API_URL } from './config'
import { useState } from 'react'

export type Statistics = {
  shotsOnTargetEnabled: boolean
  possessionEnabled: boolean
  homeShotsOnTarget: number
  awayShotsOnTarget: number
  homePossessionPercent: number | null
  awayPossessionPercent: number | null
  possessionSide: 'HOME' | 'AWAY' | null
}
type Props = {
  match: { id: number; status: string; homeTeam: { name: string }; awayTeam: { name: string }; statistics?: Statistics }
  onChanged?: () => void | Promise<unknown>
  token?: string | null
  onSessionExpired?: () => void
}

export default function MatchStatistics({ match, token, onChanged, onSessionExpired }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const stats = match.statistics
  if (!stats || (!token && !stats.shotsOnTargetEnabled && !stats.possessionEnabled)) return null
  const settingsEditable = match.status === 'SCHEDULED' || match.status === 'PRE_MATCH'
  const live = match.status === 'LIVE'
  async function change(action: string, data: object) {
    if (!token || busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(API_URL + '/matches/' + match.id + '/statistics/' + action, {
        method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      })
      if (response.status === 401) { onSessionExpired?.(); return }
      if (!response.ok) throw new Error(await response.text())
      await onChanged?.()
    } catch (err) { setError(String(err)) } finally { setBusy(false) }
  }
  return <section className="matches-section">
    <h2>Match statistics</h2>
    {error && <p role="alert">{error}</p>}
    {token && settingsEditable && <>
      <label><input type="checkbox" checked={stats.shotsOnTargetEnabled} disabled={busy} onChange={e => void change('settings', { shotsOnTargetEnabled: e.target.checked, possessionEnabled: stats.possessionEnabled })} /> Track shots on target</label>
      <label><input type="checkbox" checked={stats.possessionEnabled} disabled={busy} onChange={e => void change('settings', { shotsOnTargetEnabled: stats.shotsOnTargetEnabled, possessionEnabled: e.target.checked })} /> Track possession</label>
    </>}
    {stats.shotsOnTargetEnabled && <div>
      <h3>Shots on target</h3>
      {(['HOME', 'AWAY'] as const).map(side => {
        const count = side === 'HOME' ? stats.homeShotsOnTarget : stats.awayShotsOnTarget
        return <div key={side}>{side === 'HOME' ? match.homeTeam.name : match.awayTeam.name}: <strong>{count}</strong>
          {token && (live || match.status === 'HALF_TIME') && <> <button disabled={busy || count === 0} onClick={() => void change('shots', { side, delta: -1 })}>−</button> <button disabled={busy} onClick={() => void change('shots', { side, delta: 1 })}>+</button></>}
        </div>
      })}
    </div>}
    {stats.possessionEnabled && <div>
      <h3>Possession</h3>
      <p>{match.homeTeam.name}: {stats.homePossessionPercent === null ? '—' : stats.homePossessionPercent + '%'} · {match.awayTeam.name}: {stats.awayPossessionPercent === null ? '—' : stats.awayPossessionPercent + '%'}</p>
      {token && live && <div>{(['HOME', 'AWAY', null] as const).map(side => <button key={side ?? 'pause'} disabled={busy || stats.possessionSide === side} onClick={() => void change('possession', { side })}>{side === 'HOME' ? match.homeTeam.name : side === 'AWAY' ? match.awayTeam.name : 'Pause'}</button>)}</div>}
    </div>}
  </section>
}
