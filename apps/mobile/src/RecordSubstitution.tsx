import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_URL } from './config';
import { createMatchEvent } from './matchEvents';

type Team = {
  id: number;
  name: string;
};

type Player = {
  id: number;
  firstName: string;
  lastName: string;
};

type SquadEntry = {
  id: number;
  teamId: number;
  playerId: number;
  role: 'STARTER' | 'SUBSTITUTE';
  player: Player;
};

type SubstitutionEvent = {
  id: number;
  type: string;
  teamId?: number | null;
  playerOutId?: number | null;
  playerInId?: number | null;
  minute?: number | null;
};

type Props = {
  matchId: number;
  homeTeam: Team;
  awayTeam: Team;
  events: SubstitutionEvent[];
  token: string;
  onSaved: () => Promise<void>;
};

export function RecordSubstitution({
  matchId,
  homeTeam,
  awayTeam,
  events,
  token,
  onSaved,
}: Props) {
  const [squad, setSquad] = useState<SquadEntry[]>([]);
  const [teamId, setTeamId] = useState(homeTeam.id);
  const [playerOutId, setPlayerOutId] = useState<number | null>(null);
  const [playerInId, setPlayerInId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSquad() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/match-squads/match/${matchId}`,
        );

        if (!response.ok) {
          throw new Error('Could not load match squad.');
        }

        const data: SquadEntry[] = await response.json();

        if (active) {
          setSquad(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load match squad.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSquad();

    return () => {
      active = false;
    };
  }, [matchId]);

  const { onPitch, available } = useMemo(() => {
    const teamSquad = squad.filter(
      (entry) => entry.teamId === teamId,
    );

    const onPitchIds = new Set(
      teamSquad
        .filter((entry) => entry.role === 'STARTER')
        .map((entry) => entry.playerId),
    );

    const substitutions = events
      .filter(
        (event) =>
          event.type === 'SUBSTITUTION' &&
          event.teamId === teamId,
      )
      .sort(
        (a, b) =>
          (a.minute ?? 0) - (b.minute ?? 0) ||
          a.id - b.id,
      );

    for (const event of substitutions) {
      if (event.playerOutId != null) {
        onPitchIds.delete(event.playerOutId);
      }

      if (event.playerInId != null) {
        onPitchIds.add(event.playerInId);
      }
    }

    return {
      onPitch: teamSquad.filter((entry) =>
        onPitchIds.has(entry.playerId),
      ),
      available: teamSquad.filter(
        (entry) => !onPitchIds.has(entry.playerId),
      ),
    };
  }, [squad, events, teamId]);

  function selectTeam(id: number) {
    setTeamId(id);
    setPlayerOutId(null);
    setPlayerInId(null);
    setError(null);
    setSuccess(null);
  }

  async function handleSave() {
    if (saving) return;

    if (playerOutId === null || playerInId === null) {
      setError('Select both players.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await createMatchEvent(token, {
        type: 'SUBSTITUTION',
        matchId,
        teamId,
        playerOutId,
        playerInId,
      });

      setPlayerOutId(null);
      setPlayerInId(null);

      setSuccess('Substitution recorded successfully.');
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not record substitution.',
      );
    } finally {
      setSaving(false);
    }
  }

  function renderPlayers(
    entries: SquadEntry[],
    selectedId: number | null,
    onSelect: (id: number) => void,
  ) {
    if (entries.length === 0) {
      return (
        <Text style={styles.helper}>
          No eligible players available.
        </Text>
      );
    }

    return entries.map((entry) => (
      <Pressable
        key={entry.id}
        disabled={saving}
        onPress={() => {
          onSelect(entry.playerId);
          setError(null);
          setSuccess(null);
        }}
        style={[
          styles.option,
          selectedId === entry.playerId && styles.selected,
        ]}
      >
        <Text style={styles.optionText}>
          {entry.player.firstName} {entry.player.lastName}
        </Text>
      </Pressable>
    ));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record substitution</Text>

      <Text style={styles.label}>Team</Text>
      <View style={styles.row}>
        {[homeTeam, awayTeam].map((team) => (
          <Pressable
            key={team.id}
            disabled={saving}
            onPress={() => selectTeam(team.id)}
            style={[
              styles.option,
              teamId === team.id && styles.selected,
            ]}
          >
            <Text style={styles.optionText}>{team.name}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.label}>Player leaving</Text>
          <View style={styles.row}>
            {renderPlayers(
              onPitch,
              playerOutId,
              setPlayerOutId,
            )}
          </View>

          <Text style={styles.label}>Player entering</Text>
          <View style={styles.row}>
            {renderPlayers(
              available,
              playerInId,
              setPlayerInId,
            )}
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? (
        <Text style={styles.success}>{success}</Text>
      ) : null}

      <Pressable
        disabled={
          loading ||
          saving ||
          playerOutId === null ||
          playerInId === null
        }
        onPress={() => void handleSave()}
        style={[
          styles.saveButton,
          (loading ||
            saving ||
            playerOutId === null ||
            playerInId === null) &&
            styles.disabled,
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#0b1220" />
        ) : (
          <Text style={styles.saveText}>
            Record substitution
          </Text>
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
  helper: {
    color: '#94a3b8',
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
    opacity: 0.5,
  },
  error: {
    color: '#fca5a5',
  },
  success: {
    color: '#86efac',
  },
});