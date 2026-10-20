import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { createMatchEvent } from './matchEvents';

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  teamId?: number | null;
};

type Team = {
  id: number;
  name: string;
};

type RecordGoalProps = {
  matchId: number;
  homeTeam: Team;
  awayTeam: Team;
  players: Player[];
  token: string;
  onSaved: () => Promise<void>;
};

export function RecordGoal({
  matchId,
  homeTeam,
  awayTeam,
  players,
  token,
  onSaved,
}: RecordGoalProps) {
  const [teamId, setTeamId] = useState<number>(homeTeam.id);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const teamPlayers = players.filter(
    (player) => player.teamId === teamId,
  );

  function selectTeam(id: number) {
    setTeamId(id);
    setPlayerId(null);
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createMatchEvent(token, {
        type: 'GOAL',
        matchId,
        teamId,
        ...(playerId !== null ? { playerId } : {}),
      });

      setPlayerId(null);
      await onSaved();
      setSuccess('Goal recorded successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not record goal.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record goal</Text>

      <Text style={styles.label}>Scoring team</Text>

      <View style={styles.row}>
        {[homeTeam, awayTeam].map((team) => (
          <Pressable
            key={team.id}
            onPress={() => selectTeam(team.id)}
            disabled={saving}
            style={[
              styles.option,
              teamId === team.id && styles.selected,
            ]}
          >
            <Text style={styles.optionText}>{team.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Goalscorer (optional)</Text>

      <Pressable
        onPress={() => setPlayerId(null)}
        disabled={saving}
        style={[
          styles.option,
          playerId === null && styles.selected,
        ]}
      >
        <Text style={styles.optionText}>Unknown / no player</Text>
      </Pressable>

      {teamPlayers.map((player) => (
        <Pressable
          key={player.id}
          onPress={() => setPlayerId(player.id)}
          disabled={saving}
          style={[
            styles.option,
            playerId === player.id && styles.selected,
          ]}
        >
          <Text style={styles.optionText}>
            {player.firstName} {player.lastName}
          </Text>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={[styles.saveButton, saving && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color="#0b1220" />
        ) : (
          <Text style={styles.saveText}>Record goal</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#172338',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
  },
  selected: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
    borderWidth: 1,
  },
  optionText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: {
    color: '#0b1220',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#fca5a5',
  },
  success: {
    color: '#86efac',
  },
});