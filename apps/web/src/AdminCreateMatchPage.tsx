import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Competition = {
  id: number
  name: string
}

type Season = {
  id: number
  name: string
  competitionId: number
  competition?: Competition
}

type Team = {
  id: number
  name: string
  city: string | null
  seasonId: number
}

type CreatedMatch = {
  id: number
}

const API_URL = 'http://localhost:3000'

export default function AdminCreateMatchPage() {
  const navigate = useNavigate()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const [seasonId, setSeasonId] = useState('')
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [date, setDate] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const [seasonsResponse, teamsResponse] = await Promise.all([
          fetch(`${API_URL}/seasons`),
          fetch(`${API_URL}/teams`),
        ])

        if (!seasonsResponse.ok) {
          throw new Error(
            `Could not load seasons: ${seasonsResponse.status}`,
          )
        }

        if (!teamsResponse.ok) {
          throw new Error(
            `Could not load teams: ${teamsResponse.status}`,
          )
        }

        const seasonsData: Season[] = await seasonsResponse.json()
        const teamsData: Team[] = await teamsResponse.json()

        setSeasons(seasonsData)
        setTeams(teamsData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load match creation data',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const selectedSeasonId = seasonId ? Number(seasonId) : null

  const availableTeams = useMemo(() => {
    if (selectedSeasonId === null) {
      return []
    }

    return teams.filter(
      (team) => team.seasonId === selectedSeasonId,
    )
  }, [teams, selectedSeasonId])

  function handleSeasonChange(value: string) {
    setSeasonId(value)
    setHomeTeamId('')
    setAwayTeamId('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError(null)

    if (!seasonId || !homeTeamId || !awayTeamId || !date) {
      setError('Please complete all fields.')
      return
    }

    if (homeTeamId === awayTeamId) {
      setError('Home team and away team must be different.')
      return
    }

    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/admin/login')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: new Date(date).toISOString(),
          homeTeamId: Number(homeTeamId),
          awayTeamId: Number(awayTeamId),
          seasonId: Number(seasonId),
        }),
      })

      if (!response.ok) {
        const responseBody = await response
          .json()
          .catch(() => null)

        const message =
          responseBody &&
          typeof responseBody.message === 'string'
            ? responseBody.message
            : `Could not create match: ${response.status}`

        throw new Error(message)
      }

      const createdMatch: CreatedMatch = await response.json()

      navigate(`/admin/matches/${createdMatch.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create match',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="main">
      <Link className="back-link" to="/">
        Back to matches
      </Link>

      <section className="matches-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Match administration</p>
            <h1>Create match</h1>
          </div>

          <span className="status-badge">SYSTEM ADMIN</span>
        </div>

        {loading && (
          <div className="empty-state">
            <h3>Loading...</h3>
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="empty-state">
                <h3>Could not create match</h3>
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="season">Season</label>

              <select
                id="season"
                value={seasonId}
                onChange={(event) =>
                  handleSeasonChange(event.target.value)
                }
              >
                <option value="">Select season</option>

                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.competition
                      ? `${season.competition.name} - ${season.name}`
                      : season.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="home-team">Home team</label>

              <select
                id="home-team"
                value={homeTeamId}
                disabled={!seasonId}
                onChange={(event) =>
                  setHomeTeamId(event.target.value)
                }
              >
                <option value="">Select home team</option>

                {availableTeams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    disabled={String(team.id) === awayTeamId}
                  >
                    {team.name}
                    {team.city ? ` - ${team.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="away-team">Away team</label>

              <select
                id="away-team"
                value={awayTeamId}
                disabled={!seasonId}
                onChange={(event) =>
                  setAwayTeamId(event.target.value)
                }
              >
                <option value="">Select away team</option>

                {availableTeams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    disabled={String(team.id) === homeTeamId}
                  >
                    {team.name}
                    {team.city ? ` - ${team.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="match-date">Match date and time</label>

              <input
                id="match-date"
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating match...' : 'Create match'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}