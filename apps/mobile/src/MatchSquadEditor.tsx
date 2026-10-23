
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_URL } from './config';

type SquadRole = 'STARTER' | 'SUBSTITUTE';

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  teamId: number;
};

type SquadEntry = {
  id: number;
  matchId: number;
  teamId: number;
  playerId: number;
  role: SquadRole;
};

type Props = {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  token: string;
  onChanged?: () => void;
};

async function apiRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`;

    try {
      const data: { message?: string | string[] } =
        await response.json();

      if (typeof data.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        message = data.message.join(', ');
      }
    } catch {
      // Keep the HTTP error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export default function MatchSquadEditor({
  matchId,
  homeTeamId,
  awayTeamId,
  token,
  onChanged,
}: Props) {
  const [teamId, setTeamId] = useState(homeTeamId);
  const [players, setPlayers] = useState<Player[]>([]);
  const [squad, setSquad] = useState<SquadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [allPlayers, entries] = await Promise.all([
        apiRequest<Player[]>('/players', token),
        apiRequest<SquadEntry[]>(
          `/match-squads/match/${matchId}`,
          token,
        ),
      ]);

      setPlayers(allPlayers);
      setSquad(entries);
    } catch (error) {
      Alert.alert(
        'Loading failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setLoading(false);
    }
  }, [matchId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRole(playerId: number, role: SquadRole) {
    if (busy) return;

    const existing = squad.find(
      (entry) => entry.playerId === playerId,
    );

    try {
      setBusy(true);

      if (existing) {
        if (existing.role === role) {
          await apiRequest<void>(
            `/match-squads/${existing.id}`,
            token,
            'DELETE',
          );
        } else {
          await apiRequest(
            `/match-squads/${existing.id}`,
            token,
            'PATCH',
            { role },
          );
        }
      } else {
        await apiRequest('/match-squads', token, 'POST', {
          matchId,
          teamId,
          playerId,
          role,
        });
      }

      await load();
      onChanged?.();
    } catch (error) {
      Alert.alert(
        'Could not save squad',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  }

  const teamPlayers = players.filter(
    (player) => player.teamId === teamId,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match squad</Text>
      <Text style={styles.help}>
        Select starters and substitutes before kickoff.
        Tap the selected role again to remove a player.
      </Text>

      <View style={styles.teamRow}>
        <Pressable
          style={[
            styles.teamButton,
            teamId === homeTeamId && styles.selectedTeam,
          ]}
          onPress={() => setTeamId(homeTeamId)}
        >
          <Text>Home team</Text>
        </Pressable>

        <Pressable
          style={[
            styles.teamButton,
            teamId === awayTeamId && styles.selectedTeam,
          ]}
          onPress={() => setTeamId(awayTeamId)}
        >
          <Text>Away team</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <ScrollView nestedScrollEnabled>
          {teamPlayers.length === 0 && (
            <Text>No players found for this team.</Text>
          )}

          {teamPlayers.map((player) => {
            const entry = squad.find(
              (item) => item.playerId === player.id,
            );

            return (
              <View key={player.id} style={styles.playerRow}>
                <Text style={styles.playerName}>
                  {player.firstName} {player.lastName}
                </Text>

                <View style={styles.actions}>
                  {(['STARTER', 'SUBSTITUTE'] as const).map(
                    (role) => (
                      <Pressable
                        key={role}
                        disabled={busy}
                        style={[
                          styles.roleButton,
                          entry?.role === role &&
                            styles.selectedRole,
                        ]}
                        onPress={() =>
                          void saveRole(player.id, role)
                        }
                      >
                        <Text>
                          {role === 'STARTER'
                            ? 'Starter'
                            : 'Substitute'}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  help: {
    color: '#555555',
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  teamButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#eeeeee',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTeam: {
    backgroundColor: '#a7d8ff',
  },
  playerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
  },
  playerName: {
    fontSize: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eeeeee',
  },
  selectedRole: {
    backgroundColor: '#8dd8a0',
  },
});
