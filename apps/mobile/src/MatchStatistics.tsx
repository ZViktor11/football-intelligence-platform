import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { authenticatedFetch, SessionExpiredError } from './apiClient';
import { API_URL } from './config';

export type Statistics = {
  shotsOnTargetEnabled: boolean;
  possessionEnabled: boolean;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossessionPercent: number | null;
  awayPossessionPercent: number | null;
  possessionSide: 'HOME' | 'AWAY' | null;
};

export function MatchStatistics({ match, token, onChanged, onSessionExpired }: {
  match: { id: number; status: string; homeTeam: { name: string }; awayTeam: { name: string }; statistics?: Statistics };
  token: string | null;
  onChanged: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const stats = match.statistics;
  if (!stats || (!token && !stats.shotsOnTargetEnabled && !stats.possessionEnabled)) return null;
  async function change(action: string, data: object) {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await authenticatedFetch(API_URL + '/matches/' + match.id + '/statistics/' + action, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await onChanged();
    } catch (err) {
      if (err instanceof SessionExpiredError) onSessionExpired();
      else Alert.alert('Statistics', String(err));
    } finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false, key = label) => <Pressable key={key} disabled={busy || disabled} onPress={action} accessibilityRole="button" style={{ backgroundColor: '#334155', borderRadius: 8, padding: 10, opacity: busy || disabled ? 0.5 : 1 }}><Text style={{ color: '#fff' }}>{label}</Text></Pressable>;
  return <View style={{ backgroundColor: '#1e293b', padding: 14, borderRadius: 12, gap: 10, marginBottom: 12 }}>
    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Match statistics</Text>
    {token && ['SCHEDULED', 'PRE_MATCH'].includes(match.status) && <>
      {button((stats.shotsOnTargetEnabled ? '✓ ' : '') + 'Track shots on target', () => void change('settings', { shotsOnTargetEnabled: !stats.shotsOnTargetEnabled, possessionEnabled: stats.possessionEnabled }))}
      {button((stats.possessionEnabled ? '✓ ' : '') + 'Track possession', () => void change('settings', { shotsOnTargetEnabled: stats.shotsOnTargetEnabled, possessionEnabled: !stats.possessionEnabled }))}
    </>}
    {stats.shotsOnTargetEnabled && <>
      <Text style={{ color: '#fff', fontWeight: '700' }}>Shots on target</Text>
      {(['HOME', 'AWAY'] as const).map(side => {
        const count = side === 'HOME' ? stats.homeShotsOnTarget : stats.awayShotsOnTarget;
        return <View key={side} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: '#fff' }}>{side === 'HOME' ? match.homeTeam.name : match.awayTeam.name}: {count}</Text>
          {token && ['LIVE', 'HALF_TIME'].includes(match.status) && <>{button('−', () => void change('shots', { side, delta: -1 }), count === 0)}{button('+', () => void change('shots', { side, delta: 1 }))}</>}
        </View>;
      })}
    </>}
    {stats.possessionEnabled && <>
      <Text style={{ color: '#fff', fontWeight: '700' }}>Possession</Text>
      <Text style={{ color: '#fff' }}>{match.homeTeam.name}: {stats.homePossessionPercent === null ? '—' : stats.homePossessionPercent + '%'} · {match.awayTeam.name}: {stats.awayPossessionPercent === null ? '—' : stats.awayPossessionPercent + '%'}</Text>
      {token && match.status === 'LIVE' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['HOME', 'AWAY', null] as const).map(side => button(side === 'HOME' ? match.homeTeam.name : side === 'AWAY' ? match.awayTeam.name : 'Pause', () => void change('possession', { side }), stats.possessionSide === side, side ?? 'pause'))}</View>}
    </>}
  </View>;
}
