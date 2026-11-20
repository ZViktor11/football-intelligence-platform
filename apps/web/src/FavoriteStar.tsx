import { useFavorites } from './favorites-context'
import type { FavoriteKind } from './favorites-context'

export default function FavoriteStar({ kind, id, name }: { kind: FavoriteKind; id: number; name: string }) {
  const { token, favorites, ready, busy, change } = useFavorites()
  if (!token) return null
  const saved = favorites.some(favorite => favorite[kind]?.id === id)
  const label = (saved ? 'Remove from favorites: ' : 'Add to favorites: ') + name

  return <button
    className={'favorite-star' + (saved ? ' favorite-star-saved' : '')}
    type="button"
    disabled={!ready || busy}
    aria-label={label}
    aria-pressed={saved}
    title={label}
    onClick={() => void change(kind, id, saved ? 'DELETE' : 'PUT')}
  ><span aria-hidden="true">{saved ? '★' : '☆'}</span></button>
}
