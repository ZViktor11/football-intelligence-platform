import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type MatchStatus =
  | 'SCHEDULED'
  | 'PRE_MATCH'
  | 'LIVE'
  | 'HALF_TIME'
  | 'FINISHED'

type Team = {
  id: number
  name: string
  city: string | null
}

type Match = {
  id: number
  date: string
  status: MatchStatus
  homeScore: number
  awayScore: number
  homeTeam: Team
  awayTeam: Team
  clockDisplay?: string | null
}

function AdminMatchPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState<Match | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMatch = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/matches/${id}`,
      )

      if (!response.ok) {
        throw new Error(
          `Match request failed: ${response.status}`,
        )
      }

      const data: Match = await response.json()

      setMatch(data)
      setError(null)

      return data
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load match',
      )

      return null
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMatch()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadMatch])

  useEffect(() => {
    if (match?.status !== 'LIVE') {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadMatch()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [match?.status, loadMatch])

  async function changeStatus(status: MatchStatus) {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/admin/login')
      return
    }

    try {
      setChangingStatus(true)
      setError(null)

      const response = await fetch(
        `http://localhost:3000/matches/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
          }),
        },
      )

      if (response.status === 401) {
        localStorage.removeItem('accessToken')
        navigate('/admin/login')
        return
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to administer this match.',
        )
      }

      if (!response.ok) {
        let message = `Status update failed: ${response.status}`

        try {
          const errorData: unknown = await response.json()

          if (
            typeof errorData === 'object' &&
            errorData !== null &&
            'message' in errorData &&
            typeof errorData.message === 'string'
          ) {
            message = errorData.message
          }
        } catch {
          // Keep fallback message.
        }

        throw new Error(message)
      }

      // Fetch the complete match again so status, timestamps,
      // score and calculated clockDisplay are immediately current.
      await loadMatch()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update match status',
      )
    } finally {
      setChangingStatus(false)
    }
  }

  function renderStatusControls() {
    if (!match) {
      return null
    }

    switch (match.status) {
      case 'SCHEDULED':
        return (
          <button
            type="button"
            disabled={changingStatus}
            onClick={() => void changeStatus('PRE_MATCH')}
          >
            {changingStatus
              ? 'Updating...'
              : 'Open pre-match'}
          </button>
        )

      case 'PRE_MATCH':
        return (
          <button
            type="button"
            disabled={changingStatus}
            onClick={() => void changeStatus('LIVE')}
          >
            {changingStatus
              ? 'Updating...'
              : 'Start match'}
          </button>
        )

      case 'LIVE':
        return (
          <div>
            <button
              type="button"
              disabled={changingStatus}
              onClick={() => void changeStatus('HALF_TIME')}
            >
              {changingStatus
                ? 'Updating...'
                : 'Half time'}
            </button>

            <button
              type="button"
              disabled={changingStatus}
              onClick={() => void changeStatus('FINISHED')}
            >
              {changingStatus
                ? 'Updating...'
                : 'Finish match'}
            </button>
          </div>
        )

      case 'HALF_TIME':
        return (
          <button
            type="button"
            disabled={changingStatus}
            onClick={() => void changeStatus('LIVE')}
          >
            {changingStatus
              ? 'Updating...'
              : 'Start second half'}
          </button>
        )

      case 'FINISHED':
        return (
          <p>
            This match is finished. Match status can no longer
            be changed through the normal match flow.
          </p>
        )

      default:
        return null
    }
  }

  if (!match && !error) {
    return (
      <main className="main">
        <div className="empty-state">
          <h3>Loading match...</h3>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <Link className="back-link" to="/">
        Back to matches
      </Link>

      {error && (
        <div className="empty-state">
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      )}

      {match && (
        <section className="matches-section match-detail">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Match administration
              </p>

              <h1>
                {match.homeTeam.name} vs{' '}
                {match.awayTeam.name}
              </h1>
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

              {match.clockDisplay && (
                <span className="match-clock">
                  {match.clockDisplay}
                </span>
              )}
            </div>

            <div className="team team-away">
              <strong>{match.awayTeam.name}</strong>

              {match.awayTeam.city && (
                <span>{match.awayTeam.city}</span>
              )}
            </div>
          </div>

          <div>
            <h2>Match controls</h2>

            {renderStatusControls()}
          </div>
        </section>
      )}
    </main>
  )
}

export default AdminMatchPage