import { useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import AdminLoginPage from './AdminLoginPage'
import AdminMatchPage from './AdminMatchPage'
import AdminCreateMatchPage from './AdminCreateMatchPage'
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

type CompetitionWithSeasons = {
  id: number
  name: string
  description: string | null
  seasons: {
    id: number
    name: string
  }[]
}

type Standing = {
  position: number
  teamId: number
  teamName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
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
  matchMinute?: number | null
  clockDisplay?: string | null
}

type EventPlayer = {
  id: number
  firstName: string
  lastName: string
}

type MatchEvent = {
  id: number
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION'
  minute: number | null
  matchId: number
  teamId: number | null
  playerId: number | null
  assistPlayerId: number | null
  staffMemberId: number | null
  playerOutId: number | null
  playerInId: number | null
  isOwnGoal: boolean
  player: EventPlayer | null
  assistPlayer: EventPlayer | null
  staffMember: {
    id: number
    firstName: string
    lastName: string
  } | null
  playerOut: EventPlayer | null
  playerIn: EventPlayer | null
}

type MatchSquadPlayer = {
  id: number
  matchId: number
  teamId: number
  playerId: number
  role: 'STARTER' | 'SUBSTITUTE'
  team: Team
  player: {
    id: number
    firstName: string
    lastName: string
    position: string | null
  }
}

type TeamPlayer = {
  id: number
  firstName: string
  lastName: string
  birthDate: string | null
  position: string | null
  isActive: boolean
  teamId: number | null
}

type TeamDetail = {
  id: number
  name: string
  city: string | null
  seasonId: number
  season: {
    id: number
    name: string
    competition: {
      id: number
      name: string
    }
  }
  players: TeamPlayer[]
}

type TeamListItem = {
  id: number
  name: string
  city: string | null
  seasonId: number
  season: {
    id: number
    name: string
    competition: {
      id: number
      name: string
    }
  }
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
        <Link to="/competitions">Competitions</Link>
        <Link to="/teams">Teams</Link>
        <a href="#players">Players</a>
      </nav>
    </header>
  )
}

function MatchCards({ matches }: { matches: Match[] }) {
  return (
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
  )
}

function MatchListPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const liveMatches = matches.filter(
  (match) =>
    match.status === 'LIVE' ||
    match.status === 'HALF_TIME',
)

const upcomingMatches = matches
  .filter(
    (match) =>
      match.status === 'SCHEDULED' ||
      match.status === 'PRE_MATCH',
  )
  .sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

const finishedMatches = matches
  .filter((match) => match.status === 'FINISHED')
  .sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

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
      <h2>Match centre</h2>
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
    <>
      {liveMatches.length > 0 && (
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Now</p>
              <h2>Live matches</h2>
            </div>
          </div>

          <MatchCards matches={liveMatches} />
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2>Upcoming matches</h2>
            </div>
          </div>

          <MatchCards matches={upcomingMatches} />
        </div>
      )}

      {finishedMatches.length > 0 && (
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Completed</p>
              <h2>Results</h2>
            </div>
          </div>

          <MatchCards matches={finishedMatches} />
        </div>
      )}
    </>
  )}
</section>
    </main>
  )
}

function MatchDetailPage() {
  const { id } = useParams()

  const [match, setMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [squad, setSquad] = useState<MatchSquadPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | undefined

    async function loadInitialData() {
      try {
        setLoading(true)
        setError(null)

        const [matchResponse, eventsResponse, squadResponse] =
          await Promise.all([
            fetch(`http://localhost:3000/matches/${id}`),
            fetch(`http://localhost:3000/match-events/match/${id}`),
            fetch(`http://localhost:3000/match-squads/match/${id}`),
          ])

        if (!matchResponse.ok) {
          throw new Error(
            `Match request failed: ${matchResponse.status}`,
          )
        }

        if (!eventsResponse.ok) {
          throw new Error(
            `Events request failed: ${eventsResponse.status}`,
          )
        }

        if (!squadResponse.ok) {
          throw new Error(
            `Squad request failed: ${squadResponse.status}`,
          )
        }

        const matchData: Match = await matchResponse.json()
        const eventsData: MatchEvent[] = await eventsResponse.json()
        const squadData: MatchSquadPlayer[] =
          await squadResponse.json()

        if (cancelled) {
          return
        }

        setMatch(matchData)
        setEvents(eventsData)
        setSquad(squadData)

        if (matchData.status === 'LIVE') {
          intervalId = setInterval(() => {
            void refreshLiveData()
          }, 15000)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load match',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    async function refreshLiveData() {
      try {
        const [matchResponse, eventsResponse] = await Promise.all([
          fetch(`http://localhost:3000/matches/${id}`),
          fetch(`http://localhost:3000/match-events/match/${id}`),
        ])

        if (!matchResponse.ok || !eventsResponse.ok) {
          return
        }

        const matchData: Match = await matchResponse.json()
        const eventsData: MatchEvent[] = await eventsResponse.json()

        if (cancelled) {
          return
        }

        setMatch(matchData)
        setEvents(eventsData)

        if (matchData.status !== 'LIVE' && intervalId) {
          clearInterval(intervalId)
          intervalId = undefined
        }
      } catch {
        // Keep the last successfully loaded data on screen.
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true

      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [id])

  function getEventTitle(event: MatchEvent) {
    switch (event.type) {
      case 'GOAL':
        return event.isOwnGoal ? 'Own goal' : 'Goal'

      case 'YELLOW_CARD':
        return 'Yellow card'

      case 'RED_CARD':
        return 'Red card'

      case 'SUBSTITUTION':
        return 'Substitution'

      default:
        return event.type
    }
  }

  function getEventDescription(event: MatchEvent) {
    if (event.type === 'SUBSTITUTION') {
      const playerOut = event.playerOut
        ? `${event.playerOut.firstName} ${event.playerOut.lastName}`
        : 'Unknown player'

      const playerIn = event.playerIn
        ? `${event.playerIn.firstName} ${event.playerIn.lastName}`
        : 'Unknown player'

      return `${playerOut} -> ${playerIn}`
    }

    if (event.staffMember) {
      return `${event.staffMember.firstName} ${event.staffMember.lastName}`
    }

    if (event.player) {
      const playerName =
        `${event.player.firstName} ${event.player.lastName}`

      if (event.type === 'GOAL' && event.assistPlayer) {
        return `${playerName} - Assist: ${event.assistPlayer.firstName} ${event.assistPlayer.lastName}`
      }

      return playerName
    }

    return 'No player information'
  }

  const homeStarters = match
    ? squad.filter(
        (entry) =>
          entry.teamId === match.homeTeam.id &&
          entry.role === 'STARTER',
      )
    : []

  const homeSubstitutes = match
    ? squad.filter(
        (entry) =>
          entry.teamId === match.homeTeam.id &&
          entry.role === 'SUBSTITUTE',
      )
    : []

  const awayStarters = match
    ? squad.filter(
        (entry) =>
          entry.teamId === match.awayTeam.id &&
          entry.role === 'STARTER',
      )
    : []

  const awaySubstitutes = match
    ? squad.filter(
        (entry) =>
          entry.teamId === match.awayTeam.id &&
          entry.role === 'SUBSTITUTE',
      )
    : []

  return (
    <main className="main">
      <Link className="back-link" to="/">
        Back to matches
      </Link>

      {loading && (
        <div className="empty-state">
          <h3>Loading match...</h3>
        </div>
      )}

      {error && (
        <div className="empty-state">
          <h3>Could not load match</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && match && (
        <>
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

                {(match.status === 'LIVE' ||
                  match.status === 'HALF_TIME' ||
                  match.status === 'FINISHED') &&
                  match.clockDisplay && (
                    <span className="match-clock">
                      {match.clockDisplay}
                    </span>
                  )}

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

          <section className="matches-section timeline-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Match timeline</p>
                <h2>Events</h2>
              </div>

              <span className="status-badge">
                {events.length} events
              </span>
            </div>

            {events.length === 0 ? (
              <div className="empty-state">
                <h3>No match events</h3>
              </div>
            ) : (
              <div className="timeline">
                {events.map((event) => (
                  <div className="timeline-event" key={event.id}>
                    <div className="timeline-minute">
                      {event.minute !== null
                        ? `${event.minute}'`
                        : '-'}
                    </div>

                    <div className="timeline-marker" />

                    <div className="timeline-content">
                      <strong
                        className={`event-title event-${event.type.toLowerCase()}`}
                      >
                        <span className="event-icon">
                          {event.type === 'GOAL' && 'G'}
                          {event.type === 'YELLOW_CARD' && 'Y'}
                          {event.type === 'RED_CARD' && 'R'}
                          {event.type === 'SUBSTITUTION' && 'S'}
                        </span>

                        {getEventTitle(event)}
                      </strong>

                      <span>{getEventDescription(event)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="matches-section lineup-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Match squad</p>
                <h2>Lineups</h2>
              </div>

              <span className="status-badge">
                {squad.length} players
              </span>
            </div>

            {squad.length === 0 ? (
              <div className="empty-state">
                <h3>No lineup available</h3>
              </div>
            ) : (
              <div className="lineups">
                <div className="lineup-team">
                  <h3>{match.homeTeam.name}</h3>

                  <h4>Starting lineup</h4>

                  <div className="player-list">
                    {homeStarters.length === 0 && (
                      <p className="lineup-empty">
                        No starters available
                      </p>
                    )}

                    {homeStarters.map((entry) => (
                      <div
                        className="lineup-player"
                        key={entry.id}
                      >
                        <strong>
                          {entry.player.firstName}{' '}
                          {entry.player.lastName}
                        </strong>

                        <span>
                          {entry.player.position ??
                            'Unknown position'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4>Substitutes</h4>

                  <div className="player-list">
                    {homeSubstitutes.length === 0 && (
                      <p className="lineup-empty">
                        No substitutes available
                      </p>
                    )}

                    {homeSubstitutes.map((entry) => (
                      <div
                        className="lineup-player"
                        key={entry.id}
                      >
                        <strong>
                          {entry.player.firstName}{' '}
                          {entry.player.lastName}
                        </strong>

                        <span>
                          {entry.player.position ??
                            'Unknown position'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lineup-team">
                  <h3>{match.awayTeam.name}</h3>

                  <h4>Starting lineup</h4>

                  <div className="player-list">
                    {awayStarters.length === 0 && (
                      <p className="lineup-empty">
                        No starters available
                      </p>
                    )}

                    {awayStarters.map((entry) => (
                      <div
                        className="lineup-player"
                        key={entry.id}
                      >
                        <strong>
                          {entry.player.firstName}{' '}
                          {entry.player.lastName}
                        </strong>

                        <span>
                          {entry.player.position ??
                            'Unknown position'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4>Substitutes</h4>

                  <div className="player-list">
                    {awaySubstitutes.length === 0 && (
                      <p className="lineup-empty">
                        No substitutes available
                      </p>
                    )}

                    {awaySubstitutes.map((entry) => (
                      <div
                        className="lineup-player"
                        key={entry.id}
                      >
                        <strong>
                          {entry.player.firstName}{' '}
                          {entry.player.lastName}
                        </strong>

                        <span>
                          {entry.player.position ??
                            'Unknown position'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<
    CompetitionWithSeasons[]
  >([])
  const [selectedSeasonId, setSelectedSeasonId] =
    useState<number | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [standingsLoading, setStandingsLoading] =
    useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCompetitions() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          'http://localhost:3000/competitions',
        )

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status}`,
          )
        }

        const data: CompetitionWithSeasons[] =
          await response.json()

        setCompetitions(data)

        const firstSeason = data
          .flatMap((competition) => competition.seasons)
          .at(0)

        if (firstSeason) {
          setSelectedSeasonId(firstSeason.id)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load competitions',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCompetitions()
  }, [])

  useEffect(() => {
  if (selectedSeasonId === null) {
    return
  }

  async function loadStandings() {
      try {
        setStandingsLoading(true)
        setError(null)

        const response = await fetch(
          `http://localhost:3000/seasons/${selectedSeasonId}/standings`,
        )

        if (!response.ok) {
          throw new Error(
            `Standings request failed: ${response.status}`,
          )
        }

        const data: Standing[] = await response.json()
        setStandings(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load standings',
        )
      } finally {
        setStandingsLoading(false)
      }
    }

    void loadStandings()
  }, [selectedSeasonId])

  return (
    <main className="main">
      <section className="hero">
        <p className="eyebrow">Competitions</p>
        <h1>Competitions & standings</h1>

        <p className="hero-description">
          Follow league tables, seasons and competition
          results.
        </p>
      </section>

      {loading && (
        <section className="matches-section">
          <div className="empty-state">
            <h3>Loading competitions...</h3>
          </div>
        </section>
      )}

      {error && (
        <section className="matches-section">
          <div className="empty-state">
            <h3>Could not load competition data</h3>
            <p>{error}</p>
          </div>
        </section>
      )}

      {!loading &&
        competitions.map((competition) => (
          <section
            className="matches-section"
            key={competition.id}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Competition</p>
                <h2>{competition.name}</h2>

                {competition.description && (
                  <p>{competition.description}</p>
                )}
              </div>
            </div>

            {competition.seasons.length > 0 && (
              <div>
                <label htmlFor={`season-${competition.id}`}>
                  Season
                </label>

                <select
                  id={`season-${competition.id}`}
                  value={selectedSeasonId ?? ''}
                  onChange={(event) =>
                    setSelectedSeasonId(
                      Number(event.target.value),
                    )
                  }
                >
                  {competition.seasons.map((season) => (
                    <option
                      key={season.id}
                      value={season.id}
                    >
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="section-heading">
              <div>
                <p className="eyebrow">Season table</p>
                <h2>Standings</h2>
              </div>
            </div>

            {standingsLoading ? (
              <div className="empty-state">
                <h3>Loading standings...</h3>
              </div>
            ) : (
              <div className="standings-wrapper">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>

                  <tbody>
                    {standings.map((entry) => (
                      <tr key={entry.teamId}>
                        <td>{entry.position}</td>
                        <td>
  <Link to={`/teams/${entry.teamId}`}>
    <strong>{entry.teamName}</strong>
  </Link>
</td>
                        <td>{entry.played}</td>
                        <td>{entry.won}</td>
                        <td>{entry.drawn}</td>
                        <td>{entry.lost}</td>
                        <td>{entry.goalsFor}</td>
                        <td>{entry.goalsAgainst}</td>
                        <td>{entry.goalDifference}</td>
                        <td>
                          <strong>{entry.points}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
    </main>
  )
}

function TeamsPage() {
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          'http://localhost:3000/teams',
        )

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status}`,
          )
        }

        const data: TeamListItem[] = await response.json()
setTeams(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load teams',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadTeams()
  }, [])

  return (
    <main className="main">
      <section className="hero">
        <p className="eyebrow">Teams</p>

        <h1>Football teams</h1>

        <p className="hero-description">
          Browse teams, squads and match history.
        </p>
      </section>

      <section className="matches-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Directory</p>
            <h2>Teams</h2>
          </div>

          {!loading && !error && (
            <span className="status-badge">
              {teams.length} teams
            </span>
          )}
        </div>

        {loading && (
          <div className="empty-state">
            <h3>Loading teams...</h3>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <h3>Could not load teams</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && teams.length === 0 && (
          <div className="empty-state">
            <h3>No teams available</h3>
          </div>
        )}

        {!loading && !error && teams.length > 0 && (
          <div className="team-directory">
            {teams.map((team) => (
              <Link
                className="team-directory-card"
                key={team.id}
                to={`/teams/${team.id}`}
              >
                <div>
                  <p className="eyebrow">
                    {team.season.competition.name}
                  </p>

                  <h3>{team.name}</h3>

                  <p>
                    {team.city ?? 'Unknown city'}
                  </p>
                </div>

                <span>{team.season.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function TeamDetailPage() {
  const { id } = useParams()

  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeam() {
      try {
        setLoading(true)
        setError(null)

        const [teamResponse, matchesResponse] =
          await Promise.all([
            fetch(`http://localhost:3000/teams/${id}`),
            fetch(`http://localhost:3000/matches?teamId=${id}`),
          ])

        if (!teamResponse.ok) {
          throw new Error(
            `Team request failed: ${teamResponse.status}`,
          )
        }

        if (!matchesResponse.ok) {
          throw new Error(
            `Matches request failed: ${matchesResponse.status}`,
          )
        }

        const teamData: TeamDetail =
          await teamResponse.json()

        const matchesData: Match[] =
          await matchesResponse.json()

        setTeam(teamData)
        setMatches(matchesData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load team',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadTeam()
  }, [id])

  if (loading) {
    return (
      <main className="main">
        <div className="empty-state">
          <h3>Loading team...</h3>
        </div>
      </main>
    )
  }

  if (error || !team) {
    return (
      <main className="main">
        <div className="empty-state">
          <h3>Could not load team</h3>
          <p>{error}</p>
        </div>
      </main>
    )
  }

  const upcomingMatches = matches
    .filter(
      (match) =>
        match.status === 'SCHEDULED' ||
        match.status === 'PRE_MATCH',
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime(),
    )

  const recentMatches = matches
    .filter((match) => match.status === 'FINISHED')
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    )

  return (
    <main className="main">
      <section className="hero">
        <p className="eyebrow">
          {team.season.competition.name}
        </p>

        <h1>{team.name}</h1>

        <p className="hero-description">
          {team.city && `${team.city} · `}
          {team.season.name}
        </p>
      </section>

      <section className="matches-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Squad</p>
            <h2>Players</h2>
          </div>

          <span className="status-badge">
            {team.players.length} players
          </span>
        </div>

        <div className="player-list">
          {team.players.map((player) => (
            <div
              className="lineup-player"
              key={player.id}
            >
              <strong>
                {player.firstName} {player.lastName}
              </strong>

              <span>
                {player.position ?? 'Unknown position'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {upcomingMatches.length > 0 && (
        <section className="matches-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2>Upcoming matches</h2>
            </div>
          </div>

          <MatchCards matches={upcomingMatches} />
        </section>
      )}

      {recentMatches.length > 0 && (
        <section className="matches-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Completed</p>
              <h2>Recent results</h2>
            </div>
          </div>

          <MatchCards matches={recentMatches} />
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
        <Route
          path="/"
          element={<MatchListPage />}
        />

        <Route
  path="/competitions"
  element={<CompetitionsPage />}
/>

<Route
  path="/teams"
  element={<TeamsPage />}
/>

<Route
  path="/teams/:id"
  element={<TeamDetailPage />}
/>

<Route
  path="/matches/:id"
  element={<MatchDetailPage />}
/>

        <Route
          path="/admin/login"
          element={<AdminLoginPage />}
        />

        <Route
          path="/admin/matches/new"
          element={<AdminCreateMatchPage />}
        />

        <Route
          path="/admin/matches/:id"
          element={<AdminMatchPage />}
        />
      </Routes>
      
    </div>
  )
}

export default App