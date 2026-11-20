import { createContext, useContext } from 'react'

export type FavoriteKind = 'team' | 'player' | 'competition' | 'match'
export type FavoriteTarget = {
  id: number
  name?: string
  firstName?: string
  lastName?: string
  homeTeam?: { name: string }
  awayTeam?: { name: string }
}
export type Favorite = { id: number } & Record<FavoriteKind, FavoriteTarget | null>
export const favoriteKinds: FavoriteKind[] = ['team', 'player', 'competition', 'match']

export function favoriteTitle(target: FavoriteTarget) {
  return target.name ?? (target.homeTeam && target.awayTeam
    ? target.homeTeam.name + ' vs ' + target.awayTeam.name
    : target.firstName + ' ' + target.lastName)
}

type FavoritesState = {
  token: string | null
  favorites: Favorite[]
  ready: boolean
  busy: boolean
  error: string
  signIn: (token: string) => void
  signOut: () => void
  reload: () => void
  change: (kind: FavoriteKind, id: number, method: 'PUT' | 'DELETE') => Promise<void>
}

export const FavoritesContext = createContext<FavoritesState | null>(null)

export function useFavorites() {
  const value = useContext(FavoritesContext)
  if (!value) throw new Error('FavoritesProvider is missing')
  return value
}
