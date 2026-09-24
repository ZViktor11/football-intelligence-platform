import { useEffect, useState } from 'react'
import './App.css'

type Team = {
  id: number
  name: string
  city: string | null
}

type Competition = {
  id: number
  name: string
}

type Season = {
  id: number
  name: string
  competition: Competition
}

type Match = {
  id: number
  date: string
  status: 'SCHEDULED' | 'PRE_MATCH' | 'LIVE' | 'HALF_TIME' | 'FINISHED'
  homeScore: number
  awayScore: number
  homeTeam: Team
  awayTeam: Team
  season: Season
}

function App() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMatches() {
      try {
        const response = await fetch('http://localhost:3000/matches')

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }

        const data: Match[] = await response.json()
        setMatches(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load matches',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadMatches()
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">FI</span>
          <span>Football Intelligence</span>
        </div>

        <nav className="navigation">
          <a href="#matches">Matches</a>
          <a href="#competitions">Competitions</a>
          <a href="#teams">Teams</a>
          <a href="#players">Players</a>
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <p className="eyebrow">Football Intelligence Platform</p>

          <h1>Follow football. Match by match.</h1>

          <p className="hero-description">
            Live matches, results, competitions, teams and player statistics
            in one place.
          </p>
        </section>

        <section className="matches-section" id="matches">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Matches</p>
              <h2>Latest matches</h2>
            </div>

            {!loading && !error && (
              <span className="status-badge">
                {matches.length} matches loaded
              </span>
            )}
          </div>

          {loading && (
            <div className="empty-state">
              <h3>Loading matches...</h3>
            </div>
          )}

          {error && (
            <div className="empty-state">
              <h3>Could not load matches</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && matches.length === 0 && (
            <div className="empty-state">
              <h3>No matches available</h3>
            </div>
          )}

          {!loading && !error && matches.length > 0 && (
            <div className="match-list">
              {matches.map((match) => (
                <article className="match-card" key={match.id}>
                  <div className="match-meta">
                    <div>
                      <strong>{match.season.competition.name}</strong>
                      <span>{match.season.name}</span>
                    </div>

                    <span
                      className={`match-status match-status-${match.status.toLowerCase()}`}
                    >
                      {match.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="match-content">
                    <div className="team team-home">
                      <strong>{match.homeTeam.name}</strong>
                      {match.homeTeam.city && (
                        <span>{match.homeTeam.city}</span>
                      )}
                    </div>

                    <div className="score">
                      <strong>
                        {match.homeScore} : {match.awayScore}
                      </strong>

                      <span>
                        {new Date(match.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="team team-away">
                      <strong>{match.awayTeam.name}</strong>
                      {match.awayTeam.city && (
                        <span>{match.awayTeam.city}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App