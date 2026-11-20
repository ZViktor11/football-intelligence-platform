import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { authenticatedFetch, SessionExpiredError } from './apiClient';
import { API_URL } from './config';

type Kind = 'team' | 'player' | 'competition' | 'match';
type Target = { id: number; name?: string; firstName?: string; lastName?: string; homeTeam?: { name: string }; awayTeam?: { name: string } };
type Favorite = { id: number } & Record<Kind, Target | null>;
const kinds: Kind[] = ['team', 'player', 'competition', 'match'];
const title = (t: Target) => t.name ?? (t.homeTeam && t.awayTeam ? t.homeTeam.name + ' vs ' + t.awayTeam.name : t.firstName + ' ' + t.lastName);

export function FavoritesPanel({ token, onSessionExpired, onMatch }: { token: string; onSessionExpired: () => void; onMatch: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [kind, setKind] = useState<Kind>('team');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (open) authenticatedFetch(API_URL + '/favorites', token)
      .then(async response => {
        if (!response.ok) throw new Error('Could not load favorites');
        const data = await response.json();
        if (active) setFavorites(data);
      }).catch(err => { if (active) { if (err instanceof SessionExpiredError) onSessionExpired(); else setError(String(err)); } });
    return () => { active = false; };
  }, [open, token, onSessionExpired]);

  useEffect(() => {
    let active = true;
    if (open) fetch(API_URL + '/' + (kind === 'match' ? 'matches' : kind + 's'))
      .then(async response => {
        if (!response.ok) throw new Error('Could not load items');
        const data = await response.json();
        if (active) setTargets(data);
      }).catch(err => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [kind, open]);

  async function change(type: Kind, id: number, method: 'PUT' | 'DELETE') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await authenticatedFetch(API_URL + '/favorites/' + type + '/' + id, token, { method });
      if (!response.ok) throw new Error('Could not update favorite');
      const list = await authenticatedFetch(API_URL + '/favorites', token);
      if (!list.ok) throw new Error('Could not load favorites');
      setFavorites(await list.json());
    } catch (err) {
      if (err instanceof SessionExpiredError) onSessionExpired();
      else Alert.alert('Favorites', String(err));
    } finally { setBusy(false); }
  }

  const button = (label: string, action: () => void, key = label) => <Pressable key={key} disabled={busy} onPress={action} style={{ padding: 10, backgroundColor: '#334155', borderRadius: 8 }} accessibilityRole="button"><Text style={{ color: '#f8fafc' }}>{label}</Text></Pressable>;
  return <View style={{ gap: 8, paddingVertical: 12 }}>
    {button(open ? 'Hide favorites' : 'My favorites', () => setOpen(!open))}
    {open && <>
      {error ? <Text style={{ color: '#fca5a5' }}>{error}</Text> : null}
      {favorites.map(f => {
        const type = kinds.find(k => f[k] !== null);
        const target = type && f[type];
        if (!type || !target) return null;
        return <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: '#f8fafc' }} onPress={type === 'match' ? () => onMatch(target.id) : undefined}>{title(target)} ({type})</Text>
          {button('Remove', () => void change(type, target.id, 'DELETE'))}
        </View>;
      })}
      {!favorites.length && <Text style={{ color: '#cbd5e1' }}>No favorites yet.</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{kinds.map(k => button(k === kind ? '✓ ' + k : k, () => { setKind(k); setTargets([]); setQuery(''); }, k))}</View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search items" placeholderTextColor="#94a3b8" style={{ color: '#fff', padding: 10, backgroundColor: '#1e293b', borderRadius: 8 }} />
      {targets.filter(t => title(t).toLowerCase().includes(query.toLowerCase())).slice(0, 15).map(t => button('+ ' + title(t), () => void change(kind, t.id, 'PUT'), String(t.id)))}
    </>}
  </View>;
}
