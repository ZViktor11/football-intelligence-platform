export type PitchEvent = {
  id: number;
  type: string;
  minute?: number | null;
  playerId?: number | null;
  playerOutId?: number | null;
  playerInId?: number | null;
};

export function pitchState(
  squad: { playerId: number; role: string }[],
  events: PitchEvent[],
  minute: number,
) {
  const onPitch = new Set(squad.filter(p => p.role === 'STARTER').map(p => p.playerId));
  const sentOff = new Set<number>();
  for (const event of events.filter(e => (e.minute ?? 0) <= minute)
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || a.id - b.id)) {
    if (event.type === 'RED_CARD' && event.playerId != null) {
      sentOff.add(event.playerId);
      onPitch.delete(event.playerId);
    } else if (event.type === 'SUBSTITUTION') {
      if (event.playerOutId != null) onPitch.delete(event.playerOutId);
      if (event.playerInId != null && !sentOff.has(event.playerInId)) onPitch.add(event.playerInId);
    }
  }
  return { onPitch, sentOff };
}
