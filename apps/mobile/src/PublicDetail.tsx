import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FavoriteStar } from './FavoritesPanel';
import { useSession } from './sessionContext';
import { API_URL } from './config';

export type DetailKind = 'player' | 'team' | 'competition';
type Named = { id: number; name: string };
type Player = { id: number; firstName: string; lastName: string; position?: string | null };
type History = { matchId?: number; id?: number; homeTeam: Named; awayTeam: Named; homeScore: number; awayScore: number; date: string; status?: string };
type Season = Named & { matches: History[] };
type Detail = {
  id: number; name?: string; firstName?: string; lastName?: string; city?: string;
  description?: string; position?: string; birthDate?: string; team?: Named | null;
  season?: Named & { competition: Named }; players?: Player[]; seasons?: Season[];
  statistics?: Record<string, number>;
};
type Standing = { teamId: number; teamName: string; position: number; played: number; points: number };
const title = (data: Detail) => data.name ?? `${data.firstName} ${data.lastName}`;
const playerName = (p: Player) => `${p.firstName} ${p.lastName}`;
const open = (kind: DetailKind, id: number) => router.push({ pathname: '/details/[kind]/[id]', params: { kind, id } });
const openMatch = (id: number) => router.push({ pathname: '/matches/[id]', params: { id } });
const labels: Record<string, string> = { appearances: 'Appearances', goals: 'Goals', assists: 'Assists', ownGoals: 'Own goals', yellowCards: 'Yellow cards', redCards: 'Red cards', played: 'Played', wins: 'Wins', draws: 'Draws', losses: 'Losses', goalsFor: 'Goals for', goalsAgainst: 'Goals against', goalDifference: 'Goal difference', points: 'Points' };

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(API_URL + path, { signal });
  if (!response.ok) throw new Error(`Could not load data (HTTP ${response.status})`);
  return response.json();
}

function MatchHistory({ matches }: { matches: History[] }) {
  return <View style={styles.card}>
    <Text style={styles.heading}>Matches</Text>
    {matches.length === 0 && <Text style={styles.muted}>No matches available.</Text>}
    {matches.map(match => {
      const id = match.matchId ?? match.id;
      return <View key={id} style={styles.row}>
        <Text style={styles.link} accessibilityRole="link" onPress={() => id != null && openMatch(id)}>
          {match.homeTeam.name} {match.status === 'SCHEDULED' || match.status === 'PRE_MATCH' ? 'vs' : `${match.homeScore} – ${match.awayScore}`} {match.awayTeam.name}
        </Text>
        <Text style={styles.muted}>{new Date(match.date).toLocaleDateString()}</Text>
      </View>;
    })}
  </View>;
}

function CompetitionSeason({ season }: { season: Season }) {
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    get<Standing[]>(`/seasons/${season.id}/standings`, controller.signal).then(setStandings).catch(err => {
      if (!controller.signal.aborted) setError(String(err));
    });
    return () => controller.abort();
  }, [season.id]);
  return <>
    <View style={styles.card}>
      <Text style={styles.heading}>{season.name} · Standings</Text>
      {error ? <Text style={styles.muted}>{error}</Text> : standings === null ? <ActivityIndicator color="#38bdf8" /> :
        standings.length === 0 ? <Text style={styles.muted}>No standings available.</Text> :
          standings.map(row => <View key={row.teamId} style={styles.row}>
            <Text style={styles.link} accessibilityRole="link" onPress={() => open('team', row.teamId)}>{row.position}. {row.teamName}</Text>
            <Text style={styles.muted}>{row.points} pts · {row.played} played</Text>
          </View>)}
    </View>
    <MatchHistory matches={season.matches ?? []} />
  </>;
}

export function PublicDetail({ kind, id, onBack }: { kind: DetailKind | null; id: number; onBack: () => void }) {
  const { session, favorites } = useSession();
  const [data, setData] = useState<Detail | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const valid = kind !== null && Number.isSafeInteger(id) && id > 0;
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    const base = `/${kind}s/${id}`;
    Promise.all([
      get<Detail>(base, controller.signal),
      kind === 'competition' ? Promise.resolve([]) : get<History[]>(base + '/matches', controller.signal),
      kind === 'team' ? get<History[]>(`/matches?teamId=${id}`, controller.signal) : Promise.resolve([]),
    ]).then(([detail, matches, fixtures]) => {
      if (controller.signal.aborted) return;
      setData(detail);
      setHistory([...fixtures.filter(m => m.status !== 'FINISHED'), ...matches]);
      setError('');
    }).catch(err => { if (!controller.signal.aborted) setError(String(err)); });
    return () => controller.abort();
  }, [kind, id, valid, retry]);
  const selectedSeason = data?.seasons?.find(s => s.id === seasonId) ?? data?.seasons?.[0];
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.link} accessibilityRole="button" onPress={onBack}>← Back</Text>
      {!valid ? <Text style={styles.muted}>Invalid detail page.</Text> : error ?
        <View style={styles.card}><Text style={styles.muted}>{error}</Text><Text style={styles.link} accessibilityRole="button" onPress={() => { setError(''); setRetry(n => n + 1); }}>Retry</Text></View> :
        !data ? <ActivityIndicator color="#38bdf8" size="large" /> : <>
          <View style={styles.card}>
            <Text style={styles.muted}>{kind?.toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.title, { flex: 1 }]}>{title(data)}</Text>
              {session && kind && <FavoriteStar state={favorites} kind={kind} id={id} />}
            </View>
            {data.city && <Text style={styles.muted}>{data.city}</Text>}
            {data.position && <Text style={styles.muted}>{data.position}</Text>}
            {data.birthDate && <Text style={styles.muted}>Birth date: {new Date(data.birthDate).toLocaleDateString()}</Text>}
            {data.description && <Text style={styles.muted}>{data.description}</Text>}
            {data.team && <Text accessibilityRole="link" style={styles.link} onPress={() => open('team', data.team!.id)}>{data.team.name}</Text>}
            {data.season && <Text accessibilityRole="link" style={styles.link} onPress={() => open('competition', data.season!.competition.id)}>{data.season.competition.name} · {data.season.name}</Text>}
          </View>
          {data.statistics && <View style={styles.card}>
            <Text style={styles.heading}>Statistics</Text>
            {Object.entries(data.statistics).map(([key, value]) => <View key={key} style={styles.row}>
              <Text style={styles.muted}>{labels[key] ?? key}</Text><Text style={styles.heading}>{value}</Text>
            </View>)}
          </View>}
          {data.players && <View style={styles.card}>
            <Text style={styles.heading}>Squad</Text>
            {data.players.map(p => <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.link, { flex: 1 }]} accessibilityRole="link" onPress={() => open('player', p.id)}>{playerName(p)}{p.position ? ' · ' + p.position : ''}</Text>
              {session && <FavoriteStar state={favorites} kind="player" id={p.id} />}
            </View>)}
          </View>}
          {kind !== 'competition' && <MatchHistory matches={history} />}
          {kind === 'competition' && <View style={styles.card}>
            <Text style={styles.heading}>Seasons</Text>
            {data.seasons?.map(s => <Text key={s.id} style={styles.link} accessibilityRole="button" accessibilityState={{ selected: s.id === selectedSeason?.id }} onPress={() => setSeasonId(s.id)}>{s.id === selectedSeason?.id ? '✓ ' : ''}{s.name}</Text>)}
            {!data.seasons?.length && <Text style={styles.muted}>No seasons available.</Text>}
          </View>}
          {selectedSeason && <CompetitionSeason key={selectedSeason.id} season={selectedSeason} />}
        </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  heading: { fontSize: 17, fontWeight: '700', color: '#f8fafc' },
  muted: { color: '#cbd5e1' },
  link: { color: '#7dd3fc', textDecorationLine: 'underline', paddingVertical: 6, fontSize: 16 },
  row: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingVertical: 6, gap: 4 },
});
