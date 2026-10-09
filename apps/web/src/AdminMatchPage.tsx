import { useCallback, useEffect, useMemo, useState } from 'react'

import { Link, useNavigate, useParams } from 'react-router-dom'



type MatchStatus =

  | 'SCHEDULED'

  | 'PRE_MATCH'

  | 'LIVE'

  | 'HALF_TIME'

  | 'FINISHED'



type MatchEventType =

  | 'GOAL'

  | 'YELLOW_CARD'

  | 'RED_CARD'

  | 'SUBSTITUTION'



type Team = {

  id: number

  name: string

  city: string | null

}



type Player = {

  id: number

  firstName: string

  lastName: string

  position: string | null

  teamId: number | null

}



type Match = {
  id: number
  date: string
  status: MatchStatus
  homeScore: number
  awayScore: number
  homeTeam: Team
  awayTeam: Team
  secondHalfStartedAt: string | null
  clockDisplay?: string | null
  matchMinute?: number | null
}



type MatchSquadPlayer = {

  id: number

  matchId: number

  teamId: number

  playerId: number

  role: 'STARTER' | 'SUBSTITUTE'

  team: Team

  player: Player

}



type MatchEvent = {

  id: number

  type: MatchEventType

  minute: number | null

  matchId: number

  teamId: number | null

  playerId: number | null

  assistPlayerId: number | null

  playerOutId: number | null

  playerInId: number | null

  isOwnGoal: boolean

  player: Player | null

  assistPlayer: Player | null

  playerOut: Player | null

  playerIn: Player | null

}



function AdminMatchPage() {

  const { id } = useParams()

  const navigate = useNavigate()



  const [match, setMatch] = useState<Match | null>(null)

  const [squad, setSquad] = useState<MatchSquadPlayer[]>([])

  const [events, setEvents] = useState<MatchEvent[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [changingSquadPlayerId, setChangingSquadPlayerId] = useState<number | null>(null)
  const [squadMessage, setSquadMessage] = useState<string | null>(null)



  const [changingStatus, setChangingStatus] = useState(false)

  const [addingGoal, setAddingGoal] = useState(false)

  const [addingCard, setAddingCard] = useState(false)

  const [addingSubstitution, setAddingSubstitution] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [eventMessage, setEventMessage] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editEventMinute, setEditEventMinute] = useState('')
  const [editEventType, setEditEventType] = useState<MatchEventType>('GOAL')
  const [editEventTeamId, setEditEventTeamId] = useState('')
  const [editEventPlayerId, setEditEventPlayerId] = useState('')
  const [editEventAssistPlayerId, setEditEventAssistPlayerId] = useState('')
  const [editEventPlayerOutId, setEditEventPlayerOutId] = useState('')
  const [editEventPlayerInId, setEditEventPlayerInId] = useState('')
  const [editEventIsOwnGoal, setEditEventIsOwnGoal] = useState(false)
  const [savingEventId, setSavingEventId] = useState<number | null>(null)



  const [error, setError] = useState<string | null>(null)

  const [goalMessage, setGoalMessage] = useState<string | null>(null)

  const [cardMessage, setCardMessage] = useState<string | null>(null)

  const [substitutionMessage, setSubstitutionMessage] = useState<string | null>(null)



  const [goalTeamId, setGoalTeamId] = useState('')

  const [goalPlayerId, setGoalPlayerId] = useState('')

  const [assistPlayerId, setAssistPlayerId] = useState('')

  const [goalMinute, setGoalMinute] = useState('')

  const [isOwnGoal, setIsOwnGoal] = useState(false)



  const [cardTeamId, setCardTeamId] = useState('')

  const [cardPlayerId, setCardPlayerId] = useState('')

  const [cardMinute, setCardMinute] = useState('')

  const [cardType, setCardType] =

    useState<'YELLOW_CARD' | 'RED_CARD'>('YELLOW_CARD')



  const [substitutionTeamId, setSubstitutionTeamId] = useState('')

  const [playerOutId, setPlayerOutId] = useState('')

  const [playerInId, setPlayerInId] = useState('')

  const [substitutionMinute, setSubstitutionMinute] = useState('')



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



  const loadSquad = useCallback(async () => {

    try {

      const response = await fetch(

        `http://localhost:3000/match-squads/match/${id}`,

      )



      if (!response.ok) {

        throw new Error(

          `Squad request failed: ${response.status}`,

        )

      }



      const data: MatchSquadPlayer[] = await response.json()



      setSquad(data)

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Could not load match squad',

      )

    }

  }, [id])



  const loadPlayers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/players')

      if (!response.ok) {
        throw new Error(`Players request failed: ${response.status}`)
      }

      const data: Player[] = await response.json()
      setPlayers(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load players',
      )
    }
  }, [])

  const loadEvents = useCallback(async () => {

    try {

      const response = await fetch(

        `http://localhost:3000/match-events/match/${id}`,

      )



      if (!response.ok) {

        throw new Error(

          `Events request failed: ${response.status}`,

        )

      }



      const data: MatchEvent[] = await response.json()



      setEvents(data)

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Could not load match events',

      )

    }

  }, [id])



  useEffect(() => {

    const timeoutId = window.setTimeout(() => {

      void Promise.all([

        loadMatch(),

        loadSquad(),

        loadEvents(),
        loadPlayers(),

      ])

    }, 0)



    return () => {

      window.clearTimeout(timeoutId)

    }

  }, [loadMatch, loadSquad, loadEvents, loadPlayers])



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



  const getOnPitchPlayerIdsAtMinute = useCallback(
    (minute: number | null, excludedEventId: number | null = null) => {
      const ids = new Set<number>()

      squad.forEach((entry) => {
        if (entry.role === 'STARTER') {
          ids.add(entry.playerId)
        }
      })

      const substitutions = events
        .filter(
          (event) =>
            event.id !== excludedEventId &&
            event.type === 'SUBSTITUTION' &&
            event.playerOutId !== null &&
            event.playerInId !== null &&
            (minute === null ||
              event.minute === null ||
              event.minute <= minute),
        )
        .slice()
        .sort((a, b) => {
          const minuteA = a.minute ?? 0
          const minuteB = b.minute ?? 0

          if (minuteA !== minuteB) {
            return minuteA - minuteB
          }

          return a.id - b.id
        })

      substitutions.forEach((event) => {
        if (event.playerOutId !== null) {
          ids.delete(event.playerOutId)
        }

        if (event.playerInId !== null) {
          ids.add(event.playerInId)
        }
      })

      return ids
    },
    [squad, events],
  )

  const selectedGoalTeamId =
    goalTeamId === '' ? null : Number(goalTeamId)

  const goalEffectiveMinute =
    goalMinute === ''
      ? match?.matchMinute ?? null
      : Number(goalMinute)

  const goalOnPitchPlayerIds = useMemo(
    () => getOnPitchPlayerIdsAtMinute(goalEffectiveMinute),
    [getOnPitchPlayerIdsAtMinute, goalEffectiveMinute],
  )

  const scorerOptions = useMemo(() => {
    if (selectedGoalTeamId === null) {
      return []
    }

    return squad.filter(
      (entry) =>
        entry.teamId === selectedGoalTeamId &&
        goalOnPitchPlayerIds.has(entry.playerId),
    )
  }, [squad, selectedGoalTeamId, goalOnPitchPlayerIds])

  const assistOptions = useMemo(() => {
    return scorerOptions.filter(
      (entry) => String(entry.playerId) !== goalPlayerId,
    )
  }, [scorerOptions, goalPlayerId])

  const selectedCardTeamId =
    cardTeamId === '' ? null : Number(cardTeamId)

  

  const cardPlayerOptions = useMemo(() => {
  if (selectedCardTeamId === null) {
    return []
  }

  return squad.filter(
    (entry) => entry.teamId === selectedCardTeamId,
  )
}, [squad, selectedCardTeamId])

  const selectedSubstitutionTeamId =
    substitutionTeamId === ''
      ? null
      : Number(substitutionTeamId)

  const substitutionEffectiveMinute =
    substitutionMinute === ''
      ? match?.matchMinute ?? null
      : Number(substitutionMinute)

  const substitutionOnPitchPlayerIds = useMemo(
    () => getOnPitchPlayerIdsAtMinute(substitutionEffectiveMinute),
    [getOnPitchPlayerIdsAtMinute, substitutionEffectiveMinute],
  )

  const substitutionTeamPlayers = useMemo(() => {
    if (selectedSubstitutionTeamId === null) {
      return []
    }

    return squad.filter(
      (entry) => entry.teamId === selectedSubstitutionTeamId,
    )
  }, [squad, selectedSubstitutionTeamId])

  const playerOutOptions = useMemo(() => {
    return substitutionTeamPlayers.filter((entry) =>
      substitutionOnPitchPlayerIds.has(entry.playerId),
    )
  }, [substitutionTeamPlayers, substitutionOnPitchPlayerIds])

  const playerInOptions = useMemo(() => {
    return substitutionTeamPlayers.filter(
      (entry) => !substitutionOnPitchPlayerIds.has(entry.playerId),
    )
  }, [substitutionTeamPlayers, substitutionOnPitchPlayerIds])

  const editEffectiveMinute =
    editEventMinute === '' ? null : Number(editEventMinute)

  const editOnPitchPlayerIds = useMemo(
    () =>
      getOnPitchPlayerIdsAtMinute(
        editEffectiveMinute,
        editingEventId,
      ),
    [
      getOnPitchPlayerIdsAtMinute,
      editEffectiveMinute,
      editingEventId,
    ],
  )

  const editTeamPlayers = useMemo(() => {
    if (editEventTeamId === '') {
      return []
    }

    return squad.filter(
      (entry) => String(entry.teamId) === editEventTeamId,
    )
  }, [squad, editEventTeamId])

  const editPlayerOptions = useMemo(() => {
    return editTeamPlayers.filter((entry) =>
      editOnPitchPlayerIds.has(entry.playerId),
    )
  }, [editTeamPlayers, editOnPitchPlayerIds])

  const editAssistOptions = useMemo(() => {
    return editPlayerOptions.filter(
      (entry) => String(entry.playerId) !== editEventPlayerId,
    )
  }, [editPlayerOptions, editEventPlayerId])

  const editPlayerOutOptions = editPlayerOptions

  const editPlayerInOptions = useMemo(() => {
    return editTeamPlayers.filter(
      (entry) => !editOnPitchPlayerIds.has(entry.playerId),
    )
  }, [editTeamPlayers, editOnPitchPlayerIds])

  function getErrorMessage(

    errorData: unknown,

    fallback: string,

  ) {

    if (

      typeof errorData === 'object' &&

      errorData !== null &&

      'message' in errorData

    ) {

      const message = errorData.message



      if (typeof message === 'string') {

        return message

      }



      if (Array.isArray(message)) {

        return message.join(', ')

      }

    }



    return fallback

  }



  const squadEditable =
    match?.status === 'SCHEDULED' || match?.status === 'PRE_MATCH'

  const homePlayers = players.filter(
  (player) => player.teamId === match?.homeTeam.id,
)

const awayPlayers = players.filter(
  (player) => player.teamId === match?.awayTeam.id,
)

  function getSquadRole(playerId: number) {
    return squad.find((entry) => entry.playerId === playerId)?.role ?? ''
  }

  async function changeSquadRole(
    player: Player,
    role: '' | 'STARTER' | 'SUBSTITUTE',
  ) {
    if (!match) return
    const token = localStorage.getItem('accessToken')
    if (!token) { navigate('/admin/login'); return }
    const existingEntry = squad.find((entry) => entry.playerId === player.id)
    try {
      setChangingSquadPlayerId(player.id)
      setError(null)
      setSquadMessage(null)
      let response: Response
      if (role === '') {
        if (!existingEntry) return
        response = await fetch(`http://localhost:3000/match-squads/${existingEntry.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      } else if (existingEntry) {
        response = await fetch(`http://localhost:3000/match-squads/${existingEntry.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
      } else {
        if (player.teamId === null) throw new Error('Player does not belong to a team.')
        response = await fetch('http://localhost:3000/match-squads', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id, teamId: player.teamId, playerId: player.id, role }) })
      }
      if (response.status === 401) { localStorage.removeItem('accessToken'); navigate('/admin/login'); return }
      if (response.status === 403) throw new Error('You do not have permission to edit this match squad.')
      if (!response.ok) {
        let message = `Squad update failed: ${response.status}`
        try { const errorData: unknown = await response.json(); message = getErrorMessage(errorData, message) } catch { /* Keep fallback message. */ }
        throw new Error(message)
      }
      await loadSquad()
      setSquadMessage('Squad updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update match squad')
    } finally {
      setChangingSquadPlayerId(null)
    }
  }

  function renderSquadTeam(team: Team, teamPlayers: Player[]) {
    return (
      <div>
        <h3>{team.name}</h3>
        {teamPlayers.length === 0 ? (
          <p>No registered players for this team.</p>
        ) : (
          teamPlayers.map((player) => (
            <div key={player.id}>
              <span>{player.firstName} {player.lastName}{player.position ? ` - ${player.position}` : ''}</span>{' '}
              <select
                value={getSquadRole(player.id)}
                disabled={!squadEditable || changingSquadPlayerId === player.id}
                onChange={(event) => void changeSquadRole(player, event.target.value as '' | 'STARTER' | 'SUBSTITUTE')}
              >
                <option value="">Not selected</option>
                <option value="STARTER">Starter</option>
                <option value="SUBSTITUTE">Substitute</option>
              </select>
            </div>
          ))
        )}
      </div>
    )
  }

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

        let message =

          `Status update failed: ${response.status}`



        try {

          const errorData: unknown =

            await response.json()



          message = getErrorMessage(

            errorData,

            message,

          )

        } catch {

          // Keep fallback message.

        }



        throw new Error(message)

      }



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



  function startEditingEvent(event: MatchEvent) {
    setEditingEventId(event.id)
    setEditEventMinute(event.minute == null ? '' : String(event.minute))
    setEditEventType(event.type)
    setEditEventTeamId(event.teamId == null ? '' : String(event.teamId))
    setEditEventPlayerId(event.playerId == null ? '' : String(event.playerId))
    setEditEventAssistPlayerId(
      event.assistPlayerId == null ? '' : String(event.assistPlayerId),
    )
    setEditEventPlayerOutId(
      event.playerOutId == null ? '' : String(event.playerOutId),
    )
    setEditEventPlayerInId(
      event.playerInId == null ? '' : String(event.playerInId),
    )
    setEditEventIsOwnGoal(event.isOwnGoal)
    setEventMessage(null)
    setError(null)
  }

  function cancelEditingEvent() {
    setEditingEventId(null)
    setEditEventMinute('')
  }

  async function saveEvent(eventId: number) {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/admin/login')
      return
    }

    if (editEventMinute === '') {
      setError('Enter the event minute.')
      return
    }

    const minute = Number(editEventMinute)

    if (!Number.isInteger(minute) || minute < 0 || minute > 120) {
      setError('Event minute must be a whole number between 0 and 120.')
      return
    }

    if (editEventTeamId === '') {
      setError('Select the event team.')
      return
    }

    const body: Record<string, string | number | boolean | null> = {
      type: editEventType,
      minute,
      teamId: Number(editEventTeamId),
    }

    if (editEventType === 'GOAL') {
      body.playerId = editEventPlayerId === '' ? null : Number(editEventPlayerId)
      body.assistPlayerId =
        editEventAssistPlayerId === '' || editEventIsOwnGoal
          ? null
          : Number(editEventAssistPlayerId)
      body.isOwnGoal = editEventIsOwnGoal
      body.playerOutId = null
      body.playerInId = null
    } else if (
      editEventType === 'YELLOW_CARD' ||
      editEventType === 'RED_CARD'
    ) {
      if (editEventPlayerId === '') {
        setError('Select the player receiving the card.')
        return
      }
      body.playerId = Number(editEventPlayerId)
      body.assistPlayerId = null
      body.isOwnGoal = false
      body.playerOutId = null
      body.playerInId = null
    } else {
      if (editEventPlayerOutId === '' || editEventPlayerInId === '') {
        setError('Select both substitution players.')
        return
      }
      body.playerId = null
      body.assistPlayerId = null
      body.isOwnGoal = false
      body.playerOutId = Number(editEventPlayerOutId)
      body.playerInId = Number(editEventPlayerInId)
    }

    try {
      setSavingEventId(eventId)
      setEventMessage(null)
      setError(null)

      const response = await fetch(
        `http://localhost:3000/match-events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      )

      if (response.status === 401) {
        localStorage.removeItem('accessToken')
        navigate('/admin/login')
        return
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to edit events from this match.',
        )
      }

      if (!response.ok) {
        let message = `Event update failed: ${response.status}`
        try {
          const errorData: unknown = await response.json()
          message = getErrorMessage(errorData, message)
        } catch {
          // Keep fallback message.
        }
        throw new Error(message)
      }

      await Promise.all([loadEvents(), loadMatch()])
      setEditingEventId(null)
      setEditEventMinute('')
      setEventMessage('Event updated successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update match event',
      )
    } finally {
      setSavingEventId(null)
    }
  }

  async function deleteEvent(eventId: number) {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/admin/login')
      return
    }

    const confirmed = window.confirm('Delete this match event?')

    if (!confirmed) {
      return
    }

    try {
      setDeletingEventId(eventId)
      setEventMessage(null)
      setError(null)

      const response = await fetch(
        `http://localhost:3000/match-events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.status === 401) {
        localStorage.removeItem('accessToken')
        navigate('/admin/login')
        return
      }

      if (response.status === 403) {
        throw new Error(
          'You do not have permission to delete events from this match.',
        )
      }

      if (!response.ok) {
        let message = `Event delete failed: ${response.status}`

        try {
          const errorData: unknown = await response.json()
          message = getErrorMessage(errorData, message)
        } catch {
          // Keep fallback message.
        }

        throw new Error(message)
      }

      await Promise.all([loadEvents(), loadMatch()])
      setEventMessage('Event deleted successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete match event',
      )
    } finally {
      setDeletingEventId(null)
    }
  }

  async function addGoal() {

    if (!match) {

      return

    }



    const token = localStorage.getItem('accessToken')



    if (!token) {

      navigate('/admin/login')

      return

    }



    if (goalTeamId === '') {

      setError('Select the team that scored.')

      return

    }



    try {

      setAddingGoal(true)

      setError(null)

      setGoalMessage(null)



      const body: {

        type: 'GOAL'

        matchId: number

        teamId: number

        playerId?: number

        assistPlayerId?: number

        minute?: number

        isOwnGoal: boolean

      } = {

        type: 'GOAL',

        matchId: match.id,

        teamId: Number(goalTeamId),

        isOwnGoal,

      }



      if (goalPlayerId !== '') {

        body.playerId = Number(goalPlayerId)

      }



      if (

        assistPlayerId !== '' &&

        !isOwnGoal

      ) {

        body.assistPlayerId =

          Number(assistPlayerId)

      }



      if (goalMinute !== '') {

        body.minute = Number(goalMinute)

      }



      const response = await fetch(

        'http://localhost:3000/match-events',

        {

          method: 'POST',

          headers: {

            Authorization: `Bearer ${token}`,

            'Content-Type': 'application/json',

          },

          body: JSON.stringify(body),

        },

      )



      if (response.status === 401) {

        localStorage.removeItem('accessToken')

        navigate('/admin/login')

        return

      }



      if (response.status === 403) {

        throw new Error(

          'You do not have permission to add events to this match.',

        )

      }



      if (!response.ok) {

        let message =

          `Goal creation failed: ${response.status}`



        try {

          const errorData: unknown =

            await response.json()



          message = getErrorMessage(

            errorData,

            message,

          )

        } catch {

          // Keep fallback message.

        }



        throw new Error(message)

      }



      await Promise.all([

        loadMatch(),

        loadEvents(),

      ])



      setGoalMessage('Goal added successfully.')



      setGoalPlayerId('')

      setAssistPlayerId('')

      setGoalMinute('')

      setIsOwnGoal(false)

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Could not add goal',

      )

    } finally {

      setAddingGoal(false)

    }

  }



  async function addCard() {

    if (!match) {

      return

    }



    const token = localStorage.getItem('accessToken')



    if (!token) {

      navigate('/admin/login')

      return

    }



    if (cardTeamId === '') {

      setError('Select the team.')

      return

    }



    if (cardPlayerId === '') {

      setError('Select the player receiving the card.')

      return

    }



    try {

      setAddingCard(true)

      setError(null)

      setCardMessage(null)



      const body: {

        type: 'YELLOW_CARD' | 'RED_CARD'

        matchId: number

        teamId: number

        playerId: number

        minute?: number

      } = {

        type: cardType,

        matchId: match.id,

        teamId: Number(cardTeamId),

        playerId: Number(cardPlayerId),

      }



      if (cardMinute !== '') {

        body.minute = Number(cardMinute)

      }



      const response = await fetch(

        'http://localhost:3000/match-events',

        {

          method: 'POST',

          headers: {

            Authorization: `Bearer ${token}`,

            'Content-Type': 'application/json',

          },

          body: JSON.stringify(body),

        },

      )



      if (response.status === 401) {

        localStorage.removeItem('accessToken')

        navigate('/admin/login')

        return

      }



      if (response.status === 403) {

        throw new Error(

          'You do not have permission to add events to this match.',

        )

      }



      if (!response.ok) {

        let message =

          `Card creation failed: ${response.status}`



        try {

          const errorData: unknown =

            await response.json()



          message = getErrorMessage(

            errorData,

            message,

          )

        } catch {

          // Keep fallback message.

        }



        throw new Error(message)

      }



      await loadEvents()



      setCardMessage(

        cardType === 'YELLOW_CARD'

          ? 'Yellow card added successfully.'

          : 'Red card added successfully.',

      )



      setCardPlayerId('')

      setCardMinute('')

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Could not add card',

      )

    } finally {

      setAddingCard(false)

    }

  }



  async function addSubstitution() {

    if (!match) {

      return

    }



    const token = localStorage.getItem('accessToken')



    if (!token) {

      navigate('/admin/login')

      return

    }



    if (substitutionTeamId === '') {

      setError('Select the team.')

      return

    }



    if (playerOutId === '') {

      setError('Select the player going off.')

      return

    }



    if (playerInId === '') {

      setError('Select the player coming on.')

      return

    }



    if (substitutionMinute === '') {

      setError('Enter the substitution minute.')

      return

    }



    try {

      setAddingSubstitution(true)

      setError(null)

      setSubstitutionMessage(null)



      const response = await fetch(

        'http://localhost:3000/match-events',

        {

          method: 'POST',

          headers: {

            Authorization: `Bearer ${token}`,

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            type: 'SUBSTITUTION',

            matchId: match.id,

            teamId: Number(substitutionTeamId),

            playerOutId: Number(playerOutId),

            playerInId: Number(playerInId),

            minute: Number(substitutionMinute),

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

          'You do not have permission to add events to this match.',

        )

      }



      if (!response.ok) {

        let message =

          `Substitution creation failed: ${response.status}`



        try {

          const errorData: unknown = await response.json()

          message = getErrorMessage(errorData, message)

        } catch {

          // Keep fallback message.

        }



        throw new Error(message)

      }



      await loadEvents()



      setSubstitutionMessage('Substitution added successfully.')

      setPlayerOutId('')

      setPlayerInId('')

      setSubstitutionMinute('')

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : 'Could not add substitution',

      )

    } finally {

      setAddingSubstitution(false)

    }

  }



  function handleSubstitutionTeamChange(value: string) {

    setSubstitutionTeamId(value)

    setPlayerOutId('')

    setPlayerInId('')

  }



  function handleGoalTeamChange(value: string) {

    setGoalTeamId(value)

    setGoalPlayerId('')

    setAssistPlayerId('')

  }



  function handleOwnGoalChange(checked: boolean) {

    setIsOwnGoal(checked)



    if (checked) {

      setAssistPlayerId('')

    }

  }



  function handleCardTeamChange(value: string) {

    setCardTeamId(value)

    setCardPlayerId('')

  }



  function getEventTitle(event: MatchEvent) {

    switch (event.type) {

      case 'GOAL':

        return event.isOwnGoal

          ? 'Own goal'

          : 'Goal'



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
      {!match.secondHalfStartedAt && (
        <button
          type="button"
          disabled={changingStatus}
          onClick={() => void changeStatus('HALF_TIME')}
        >
          {changingStatus
            ? 'Updating...'
            : 'Half time'}
        </button>
      )}

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

      <Link className="back-link" to="/admin/matches">

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



          <section>
            <h2>Match squad</h2>
            {squadEditable ? (
              <p>Select each player's match role. Changes are saved immediately.</p>
            ) : (
              <p>The match squad is locked because the match has already started.</p>
            )}
            {squadMessage && <p>{squadMessage}</p>}
            <div>
              {renderSquadTeam(match.homeTeam, homePlayers)}
              {renderSquadTeam(match.awayTeam, awayPlayers)}
            </div>
          </section>

          {(match.status === 'LIVE' ||

            match.status === 'HALF_TIME') && (

            <>

              <section>

                <h2>Add goal</h2>



                <div>

                  <label htmlFor="goal-team">

                    Team

                  </label>



                  <select

                    id="goal-team"

                    value={goalTeamId}

                    onChange={(event) =>

                      handleGoalTeamChange(

                        event.target.value,

                      )

                    }

                  >

                    <option value="">

                      Select team

                    </option>



                    <option value={match.homeTeam.id}>

                      {match.homeTeam.name}

                    </option>



                    <option value={match.awayTeam.id}>

                      {match.awayTeam.name}

                    </option>

                  </select>

                </div>



                <div>

                  <label htmlFor="goal-player">

                    Scorer

                  </label>



                  <select

                    id="goal-player"

                    value={goalPlayerId}

                    disabled={goalTeamId === ''}

                    onChange={(event) => {

                      setGoalPlayerId(

                        event.target.value,

                      )

                      setAssistPlayerId('')

                    }}

                  >

                    <option value="">

                      No scorer / unknown

                    </option>



                    {scorerOptions.map((entry) => (

                      <option

                        key={entry.id}

                        value={entry.playerId}

                      >

                        {entry.player.firstName}{' '}

                        {entry.player.lastName}

                        {' (#'}

                        {entry.playerId}

                        {')'}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label htmlFor="goal-assist">

                    Assist

                  </label>



                  <select

                    id="goal-assist"

                    value={assistPlayerId}

                    disabled={

                      goalTeamId === '' ||

                      isOwnGoal

                    }

                    onChange={(event) =>

                      setAssistPlayerId(

                        event.target.value,

                      )

                    }

                  >

                    <option value="">

                      No assist

                    </option>



                    {assistOptions.map((entry) => (

                      <option

                        key={entry.id}

                        value={entry.playerId}

                      >

                        {entry.player.firstName}{' '}

                        {entry.player.lastName}

                        {' (#'}

                        {entry.playerId}

                        {')'}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label htmlFor="goal-minute">

                    Minute

                  </label>



                  <input

                    id="goal-minute"

                    type="number"

                    min="0"

                    max="120"

                    value={goalMinute}

                    placeholder={

                      match.matchMinute != null

                        ? `Current: ${match.matchMinute}`

                        : 'Current match minute'

                    }

                    onChange={(event) =>

                      setGoalMinute(

                        event.target.value,

                      )

                    }

                  />



                  <p>

                    Leave empty to use the current

                    match minute.

                  </p>

                </div>



                <div>

                  <label>

                    <input

                      type="checkbox"

                      checked={isOwnGoal}

                      onChange={(event) =>

                        handleOwnGoalChange(

                          event.target.checked,

                        )

                      }

                    />



                    Own goal

                  </label>

                </div>



                <button

                  type="button"

                  disabled={

                    addingGoal ||

                    goalTeamId === ''

                  }

                  onClick={() => void addGoal()}

                >

                  {addingGoal

                    ? 'Adding goal...'

                    : 'Add goal'}

                </button>



                {goalMessage && (

                  <p>{goalMessage}</p>

                )}

              </section>



              <section>

                <h2>Add card</h2>



                <div>

                  <label htmlFor="card-type">

                    Card

                  </label>



                  <select

                    id="card-type"

                    value={cardType}

                    onChange={(event) =>

                      setCardType(

                        event.target.value as

                          | 'YELLOW_CARD'

                          | 'RED_CARD',

                      )

                    }

                  >

                    <option value="YELLOW_CARD">

                      Yellow card

                    </option>



                    <option value="RED_CARD">

                      Red card

                    </option>

                  </select>

                </div>



                <div>

                  <label htmlFor="card-team">

                    Team

                  </label>



                  <select

                    id="card-team"

                    value={cardTeamId}

                    onChange={(event) =>

                      handleCardTeamChange(

                        event.target.value,

                      )

                    }

                  >

                    <option value="">

                      Select team

                    </option>



                    <option value={match.homeTeam.id}>

                      {match.homeTeam.name}

                    </option>



                    <option value={match.awayTeam.id}>

                      {match.awayTeam.name}

                    </option>

                  </select>

                </div>



                <div>

                  <label htmlFor="card-player">

                    Player

                  </label>



                  <select

                    id="card-player"

                    value={cardPlayerId}

                    disabled={cardTeamId === ''}

                    onChange={(event) =>

                      setCardPlayerId(

                        event.target.value,

                      )

                    }

                  >

                    <option value="">

                      Select player

                    </option>



                    {cardPlayerOptions.map((entry) => (

                      <option

                        key={entry.id}

                        value={entry.playerId}

                      >

                        {entry.player.firstName}{' '}

                        {entry.player.lastName}

                        {' (#'}

                        {entry.playerId}

                        {')'}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label htmlFor="card-minute">

                    Minute

                  </label>



                  <input

                    id="card-minute"

                    type="number"

                    min="0"

                    max="120"

                    value={cardMinute}

                    placeholder={

                      match.matchMinute != null

                        ? `Current: ${match.matchMinute}`

                        : 'Current match minute'

                    }

                    onChange={(event) =>

                      setCardMinute(

                        event.target.value,

                      )

                    }

                  />



                  <p>

                    Leave empty to use the current

                    match minute.

                  </p>

                </div>



                <button

                  type="button"

                  disabled={

                    addingCard ||

                    cardTeamId === '' ||

                    cardPlayerId === ''

                  }

                  onClick={() => void addCard()}

                >

                  {addingCard

                    ? 'Adding card...'

                    : 'Add card'}

                </button>



                {cardMessage && (

                  <p>{cardMessage}</p>

                )}

              </section>



              <section>

                <h2>Add substitution</h2>



                <div>

                  <label htmlFor="substitution-team">

                    Team

                  </label>



                  <select

                    id="substitution-team"

                    value={substitutionTeamId}

                    onChange={(event) =>

                      handleSubstitutionTeamChange(

                        event.target.value,

                      )

                    }

                  >

                    <option value="">Select team</option>

                    <option value={match.homeTeam.id}>

                      {match.homeTeam.name}

                    </option>

                    <option value={match.awayTeam.id}>

                      {match.awayTeam.name}

                    </option>

                  </select>

                </div>



                <div>

                  <label htmlFor="player-out">

                    Player out

                  </label>



                  <select

                    id="player-out"

                    value={playerOutId}

                    disabled={substitutionTeamId === ''}

                    onChange={(event) =>

                      setPlayerOutId(event.target.value)

                    }

                  >

                    <option value="">Select player</option>

                    {playerOutOptions.map((entry) => (

                      <option

                        key={entry.id}

                        value={entry.playerId}

                      >

                        {entry.player.firstName}{' '}

                        {entry.player.lastName}

                        {' (#'}

                        {entry.playerId}

                        {')'}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label htmlFor="player-in">

                    Player in

                  </label>



                  <select

                    id="player-in"

                    value={playerInId}

                    disabled={substitutionTeamId === ''}

                    onChange={(event) =>

                      setPlayerInId(event.target.value)

                    }

                  >

                    <option value="">Select player</option>

                    {playerInOptions.map((entry) => (

                      <option

                        key={entry.id}

                        value={entry.playerId}

                      >

                        {entry.player.firstName}{' '}

                        {entry.player.lastName}

                        {' (#'}

                        {entry.playerId}

                        {')'}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label htmlFor="substitution-minute">

                    Minute

                  </label>



                  <input

                    id="substitution-minute"

                    type="number"

                    min="0"

                    max="120"

                    value={substitutionMinute}

                    placeholder={

                      match.matchMinute != null

                        ? `Current: ${match.matchMinute}`

                        : 'Enter match minute'

                    }

                    onChange={(event) =>

                      setSubstitutionMinute(

                        event.target.value,

                      )

                    }

                  />



                  <p>

                    Enter the minute when the substitution happened.

                  </p>

                </div>



                <button

                  type="button"

                  disabled={

                    addingSubstitution ||

                    substitutionTeamId === '' ||

                    playerOutId === '' ||

                    playerInId === '' ||

                    substitutionMinute === ''

                  }

                  onClick={() => void addSubstitution()}

                >

                  {addingSubstitution

                    ? 'Adding substitution...'

                    : 'Add substitution'}

                </button>



                {substitutionMessage && (

                  <p>{substitutionMessage}</p>

                )}

              </section>

            </>

          )}



          <section>

            <h2>Events</h2>



            <p>{events.length} events</p>

            {eventMessage && <p>{eventMessage}</p>}



            {events.length === 0 ? (

              <p>No events yet.</p>

            ) : (

              <div>

                {events.map((event) => (

                  <div key={event.id}>

                    <strong>

                      {event.minute != null

                        ? `${event.minute}' `

                        : ''}



                      {getEventTitle(event)}

                    </strong>



                    {event.player && (

                      <span>

                        {' '}

                        - {event.player.firstName}{' '}

                        {event.player.lastName}

                      </span>

                    )}



                    {event.assistPlayer && (

                      <span>

                        {' '}

                        - Assist:{' '}

                        {event.assistPlayer.firstName}{' '}

                        {event.assistPlayer.lastName}

                      </span>

                    )}



                    {event.type === 'SUBSTITUTION' &&

                      event.playerOut &&

                      event.playerIn && (

                        <span>

                          {' '}

                          - {event.playerOut.firstName}{' '}

                          {event.playerOut.lastName}

                          {' → '}

                          {event.playerIn.firstName}{' '}

                          {event.playerIn.lastName}

                        </span>

                      )}

                    {(match?.status === 'LIVE' ||
                      match?.status === 'HALF_TIME') && (
                      <>
                        {editingEventId === event.id ? (
                          <div>
                            <div>
                              <label htmlFor={`edit-event-minute-${event.id}`}>Minute</label>{' '}
                              <input
                                id={`edit-event-minute-${event.id}`}
                                type="number"
                                min="0"
                                max="120"
                                value={editEventMinute}
                                disabled={savingEventId === event.id}
                                onChange={(changeEvent) =>
                                  setEditEventMinute(changeEvent.target.value)
                                }
                              />
                            </div>

                            <div>
                              <label htmlFor={`edit-event-team-${event.id}`}>Team</label>{' '}
                              <select
                                id={`edit-event-team-${event.id}`}
                                value={editEventTeamId}
                                disabled={savingEventId === event.id}
                                onChange={(changeEvent) => {
                                  setEditEventTeamId(changeEvent.target.value)
                                  setEditEventPlayerId('')
                                  setEditEventAssistPlayerId('')
                                  setEditEventPlayerOutId('')
                                  setEditEventPlayerInId('')
                                }}
                              >
                                <option value="">Select team</option>
                                <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                                <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
                              </select>
                            </div>

                            {(editEventType === 'GOAL' ||
                              editEventType === 'YELLOW_CARD' ||
                              editEventType === 'RED_CARD') && (
                              <div>
                                <label htmlFor={`edit-event-player-${event.id}`}>
                                  {editEventType === 'GOAL' ? 'Scorer' : 'Player'}
                                </label>{' '}
                                <select
                                  id={`edit-event-player-${event.id}`}
                                  value={editEventPlayerId}
                                  disabled={savingEventId === event.id || editEventTeamId === ''}
                                  onChange={(changeEvent) => {
                                    setEditEventPlayerId(changeEvent.target.value)
                                    if (changeEvent.target.value === editEventAssistPlayerId) {
                                      setEditEventAssistPlayerId('')
                                    }
                                  }}
                                >
                                  <option value="">
                                    {editEventType === 'GOAL' ? 'No scorer / unknown' : 'Select player'}
                                  </option>
                                  {editPlayerOptions.map((entry) => (
                                      <option key={entry.id} value={entry.playerId}>
                                        {entry.player.firstName} {entry.player.lastName} (#{entry.playerId})
                                      </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {editEventType === 'GOAL' && (
                              <>
                                <div>
                                  <label htmlFor={`edit-event-assist-${event.id}`}>Assist</label>{' '}
                                  <select
                                    id={`edit-event-assist-${event.id}`}
                                    value={editEventAssistPlayerId}
                                    disabled={
                                      savingEventId === event.id ||
                                      editEventTeamId === '' ||
                                      editEventIsOwnGoal
                                    }
                                    onChange={(changeEvent) =>
                                      setEditEventAssistPlayerId(changeEvent.target.value)
                                    }
                                  >
                                    <option value="">No assist</option>
                                    {editAssistOptions.map((entry) => (
                                        <option key={entry.id} value={entry.playerId}>
                                          {entry.player.firstName} {entry.player.lastName} (#{entry.playerId})
                                        </option>
                                    ))}
                                  </select>
                                </div>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={editEventIsOwnGoal}
                                    disabled={savingEventId === event.id}
                                    onChange={(changeEvent) => {
                                      setEditEventIsOwnGoal(changeEvent.target.checked)
                                      if (changeEvent.target.checked) {
                                        setEditEventAssistPlayerId('')
                                      }
                                    }}
                                  />{' '}
                                  Own goal
                                </label>
                              </>
                            )}

                            {(editEventType === 'YELLOW_CARD' ||
                              editEventType === 'RED_CARD') && (
                              <div>
                                <label htmlFor={`edit-event-card-type-${event.id}`}>Card</label>{' '}
                                <select
                                  id={`edit-event-card-type-${event.id}`}
                                  value={editEventType}
                                  disabled={savingEventId === event.id}
                                  onChange={(changeEvent) =>
                                    setEditEventType(
                                      changeEvent.target.value as 'YELLOW_CARD' | 'RED_CARD',
                                    )
                                  }
                                >
                                  <option value="YELLOW_CARD">Yellow card</option>
                                  <option value="RED_CARD">Red card</option>
                                </select>
                              </div>
                            )}

                            {editEventType === 'SUBSTITUTION' && (
                              <>
                                <div>
                                  <label htmlFor={`edit-event-out-${event.id}`}>Player out</label>{' '}
                                  <select
                                    id={`edit-event-out-${event.id}`}
                                    value={editEventPlayerOutId}
                                    disabled={savingEventId === event.id || editEventTeamId === ''}
                                    onChange={(changeEvent) =>
                                      setEditEventPlayerOutId(changeEvent.target.value)
                                    }
                                  >
                                    <option value="">Select player</option>
                                    {editPlayerOutOptions.map((entry) => (
                                        <option key={entry.id} value={entry.playerId}>
                                          {entry.player.firstName} {entry.player.lastName} (#{entry.playerId})
                                        </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label htmlFor={`edit-event-in-${event.id}`}>Player in</label>{' '}
                                  <select
                                    id={`edit-event-in-${event.id}`}
                                    value={editEventPlayerInId}
                                    disabled={savingEventId === event.id || editEventTeamId === ''}
                                    onChange={(changeEvent) =>
                                      setEditEventPlayerInId(changeEvent.target.value)
                                    }
                                  >
                                    <option value="">Select player</option>
                                    {editPlayerInOptions.map((entry) => (
                                        <option key={entry.id} value={entry.playerId}>
                                          {entry.player.firstName} {entry.player.lastName} (#{entry.playerId})
                                        </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            <button
                              type="button"
                              disabled={savingEventId === event.id}
                              onClick={() => void saveEvent(event.id)}
                            >
                              {savingEventId === event.id ? 'Saving...' : 'Save'}
                            </button>{' '}
                            <button
                              type="button"
                              disabled={savingEventId === event.id}
                              onClick={cancelEditingEvent}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={deletingEventId === event.id}
                            onClick={() => startEditingEvent(event)}
                          >
                            Edit
                          </button>
                        )}{' '}
                        <button
                          type="button"
                          disabled={
                            deletingEventId === event.id ||
                            savingEventId === event.id
                          }
                          onClick={() => void deleteEvent(event.id)}
                        >
                          {deletingEventId === event.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </>
                    )}

                  </div>

                ))}

              </div>

            )}

          </section>

        </section>

      )}

    </main>

  )

}



export default AdminMatchPage
