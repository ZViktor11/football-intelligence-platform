import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Match = {
  id: number
  status: string
  homeScore: number
  awayScore: number
  homeTeam?: { name: string }
  awayTeam?: { name: string }
}

export default function AdminMatchesPage() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      navigate('/admin/login', { replace: true })
      return
    }

    let active = true

    async function loadMatches() {
      try {
        const response = await fetch('http://localhost:3000/matches')

        if (!response.ok) {
          throw new Error('Failed to load matches')
        }

        const data: Match[] = await response.json()

        if (active) {
          setMatches(data)
          setError(null)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Failed to load matches'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadMatches()
    const interval = window.setInterval(() => void loadMatches(), 15000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [navigate])

  return (
    <main className="container">
      <h1>Match administration</h1>

      <p>
        <Link to="/admin/matches/new">Create new match</Link>
      </p>

      {loading && <p>Loading matches...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && matches.length === 0 && !error && (
        <p>No matches found.</p>
      )}

      {matches.map((match) => (
        <div
          key={match.id}
          style={{
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
          }}
        >
          <strong>
            {match.homeTeam?.name ?? 'Home team'} vs{' '}
            {match.awayTeam?.name ?? 'Away team'}
          </strong>

          <p>
            {match.homeScore} – {match.awayScore} | {match.status}
          </p>

          <Link to={`/admin/matches/${match.id}`}>
            Manage match
          </Link>
        </div>
      ))}
    </main>
  )
}