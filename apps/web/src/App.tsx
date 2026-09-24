import { useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
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

function Header() {
  return (
    <header className="header">
      <Link className="brand" to="/">
        <span className="brand-mark">FI</span>
        <span>Football Intelligence</span>
      </Link>

      <nav className="navigation">
        <Link to="/">Matches</Link>
        <a href="#competitions">Competitions</a>
        <a href="#teams">Teams</a>
        <a href="#players">Players</a>
      </nav>
    </header>
  )
}

function MatchListPage() {
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
              <Link
                className="match-card-link"
                key={match.id}
                to={`/matches/${match.id}`}
              >
                <article className="match-card">
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function MatchDetailPage() {
  const { id } = useParams()
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMatch() {
      try {
        const response = await fetch(`http://localhost:3000/matches/${id}`)

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`)
        }

        const data: Match = await response.json()
        setMatch(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load match',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadMatch()
  }, [id])

  return (
    <main className="main">
      <Link className="back-link" to="/">
        ← Back to matches
      </Link>

      {loading && (
        <section className="matches-section">
          <div className="empty-state">
            <h3>Loading match...</h3>
          </div>
        </section>
      )}

      {error && (
        <section className="matches-section">
          <div className="empty-state">
            <h3>Could not load match</h3>
            <p>{error}</p>
          </div>
        </section>
      )}

      {!loading && !error && match && (
        <section className="matches-section match-detail">
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

          <div className="match-content match-detail-score">
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
                {new Date(match.date).toLocaleString()}
              </span>
            </div>

            <div className="team team-away">
              <strong>{match.awayTeam.name}</strong>

              {match.awayTeam.city && (
                <span>{match.awayTeam.city}</span>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function App() {
  return (
    <div className="app">
      <Header />

      <Routes>
        <Route path="/" element={<MatchListPage />} />
        <Route path="/matches/:id" element={<MatchDetailPage />} />
      </Routes>
    </div>
  )
}

export default App