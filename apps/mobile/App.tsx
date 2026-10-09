import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_URL } from './src/config';

type MatchStatus =
  | 'SCHEDULED'
  | 'PRE_MATCH'
  | 'LIVE'
  | 'HALF_TIME'
  | 'FINISHED';

type Player = {
  id: number;
  firstName: string;
  lastName: string;
};

type MatchEvent = {
  id: number;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
  minute: number | null;
  teamId: number | null;
  player: Player | null;
  playerOutId: number | null;
  playerInId: number | null;
  isOwnGoal: boolean;
};

type Match = {
  id: number;
  events?: MatchEvent[];
  date: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  season?: {
    name: string;
    competition?: { name: string };
  };
};

function statusLabel(status: MatchStatus): string {
  switch (status) {
    case 'LIVE':
      return 'LIVE';
    case 'HALF_TIME':
      return 'HALF-TIME';
    case 'FINISHED':
      return 'FULL-TIME';
    case 'PRE_MATCH':
      return 'PRE-MATCH';
    default:
      return 'UPCOMING';
  }
}

function MatchCard({ match }: { match: Match }) {
  const active = match.status === 'LIVE' || match.status === 'HALF_TIME';

  const showScore = active || match.status === 'FINISHED';

  const competition = match.season?.competition?.name ?? 'Football';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.competition}>{competition}</Text>
        <Text style={[styles.status, active && styles.liveStatus]}>
          {statusLabel(match.status)}
        </Text>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.teams}>
          <Text style={styles.teamName}>{match.homeTeam.name}</Text>
          <Text style={styles.teamName}>{match.awayTeam.name}</Text>
        </View>

        <View style={styles.scores}>
          <Text style={styles.score}>
            {showScore ? match.homeScore : '–'}
          </Text>
          <Text style={styles.score}>
            {showScore ? match.awayScore : '–'}
          </Text>
        </View>
      </View>

      <Text style={styles.date}>
        {new Date(match.date).toLocaleString()}
      </Text>
    </View>
  );
}

function MatchDetail({
  matchId,
  onBack,
}: {
  matchId: number;
  onBack: () => void;
}) {
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMatch = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/matches/${matchId}`);

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data: Match = await response.json();
      setMatch(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load match',
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadMatch();

    const interval = setInterval(() => {
      void loadMatch();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadMatch]);

  useEffect(() => {
    let active = true;

    async function loadPlayers() {
      try {
        const response = await fetch(`${API_URL}/players`);
        if (!response.ok) return;

        const data: unknown = await response.json();
        if (!active) return;

        if (Array.isArray(data)) {
          setPlayers(data as Player[]);
        } else if (
          data !== null &&
          typeof data === 'object' &&
          'value' in data &&
          Array.isArray(data.value)
        ) {
          setPlayers(data.value as Player[]);
        }
      } catch {
        // Match details remain usable without player lookup.
      }
    }

    void loadPlayers();

    return () => {
      active = false;
    };
  }, []);

  function eventLabel(event: MatchEvent): string {
    const playerName = event.player
      ? `${event.player.firstName} ${event.player.lastName}`
      : 'Unknown player';

    switch (event.type) {
      case 'GOAL':
        return `${event.isOwnGoal ? 'Own goal' : 'Goal'} - ${playerName}`;
      case 'YELLOW_CARD':
        return `Yellow card - ${playerName}`;
      case 'RED_CARD':
        return `Red card - ${playerName}`;
      case 'SUBSTITUTION': {
        const playerOut = players.find(
          (player) => player.id === event.playerOutId,
        );
        const playerIn = players.find(
          (player) => player.id === event.playerInId,
        );

        const outName = playerOut
          ? `${playerOut.firstName} ${playerOut.lastName}`
          : `Player ${event.playerOutId ?? '?'}`;

        const inName = playerIn
          ? `${playerIn.firstName} ${playerIn.lastName}`
          : `Player ${event.playerInId ?? '?'}`;

        return `Substitution - ${outName} → ${inName}`;
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backButton}>← Back to matches</Text>
        </Pressable>
        <Text style={styles.title}>Match details</Text>
      </View>

      {loading && !match ? (
        <View style={styles.center}>
          <ActivityIndicator color="#38bdf8" size="large" />
        </View>
      ) : (
        <FlatList
          data={[...(match?.events ?? [])].sort(
            (a, b) => (a.minute ?? 0) - (b.minute ?? 0),
          )}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={() => void loadMatch()}
          ListHeaderComponent={
            <>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {match && (
                <View style={styles.card}>
                  <Text style={styles.competition}>
                    {match.season?.competition?.name ?? 'Football'}
                  </Text>
                  <Text style={styles.detailTeams}>
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </Text>
                  <Text style={styles.detailScore}>
                    {match.homeScore} – {match.awayScore}
                  </Text>
                  <Text style={styles.status}>
                    {statusLabel(match.status)}
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Match events</Text>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.eventRow}>
              <Text style={styles.eventMinute}>
                {item.minute ?? '–'}′
              </Text>
              <Text style={styles.eventText}>
                {eventLabel(item)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.helper}>
              No events recorded.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await fetch(`${API_URL}/matches`);

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data: Match[] = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Unexpected matches response');
      }

      setMatches(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load matches',
      );
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    const interval = setInterval(() => {
      void loadMatches();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadMatches]);

  if (selectedMatchId !== null) {
    return (
      <MatchDetail
        matchId={selectedMatchId}
        onBack={() => setSelectedMatchId(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>FOOTBALL INTELLIGENCE</Text>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.subtitle}>Live scores and fixtures</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.helper}>Loading matches...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedMatchId(item.id)}>
              <MatchCard match={item} />
            </Pressable>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadMatches(true)}
              tintColor="#38bdf8"
            />
          }
          ListEmptyComponent={
            <Text style={styles.helper}>No matches available.</Text>
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    color: '#38bdf8',
    fontSize: 15,
    marginBottom: 16,
  },
  detailTeams: {
    color: '#f8fafc',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  detailScore: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  eventRow: {
    flexDirection: 'row',
    backgroundColor: '#17243a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventMinute: {
    color: '#38bdf8',
    fontWeight: '700',
    width: 48,
  },
  eventText: {
    color: '#f8fafc',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#111c30',
  },
  eyebrow: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#17243a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#263650',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  competition: {
    color: '#94a3b8',
    fontSize: 12,
    flexShrink: 1,
  },
  status: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  liveStatus: {
    color: '#4ade80',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teams: {
    flex: 1,
    gap: 12,
  },
  teamName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
  },
  scores: {
    alignItems: 'flex-end',
    gap: 12,
    paddingLeft: 16,
  },
  score: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  date: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helper: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
  errorBox: {
    backgroundColor: '#452029',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecaca',
  },
});
