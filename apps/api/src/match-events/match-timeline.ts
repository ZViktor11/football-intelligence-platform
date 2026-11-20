import { BadRequestException } from '@nestjs/common';

type TimelineEvent = {
  id: number;
  type: string;
  minute?: number | null;
  playerId?: number | null;
  assistPlayerId?: number | null;
  playerOutId?: number | null;
  playerInId?: number | null;
};

export function dismissedByCard(event: TimelineEvent, yellows: Map<number, number>) {
  if (event.playerId == null) return false;
  if (event.type === 'RED_CARD') return true;
  if (event.type !== 'YELLOW_CARD') return false;
  const count = (yellows.get(event.playerId) ?? 0) + 1;
  yellows.set(event.playerId, count);
  return count >= 2;
}

// Replay the persisted history after every mutation, including corrections.
export function validateTimeline(
  squad: { playerId: number; role: string }[],
  events: TimelineEvent[],
) {
  const selected = new Set(squad.map(p => p.playerId));
  const onPitch = new Set(squad.filter(p => p.role === 'STARTER').map(p => p.playerId));
  const sentOff = new Set<number>();
  const yellows = new Map<number, number>();
  const invalid = (event: TimelineEvent) => {
    throw new BadRequestException(
      `Invalid event history at minute ${event.minute ?? '?'} (event ${event.id}); correct dependent events first`,
    );
  };
  for (const event of [...events].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || a.id - b.id)) {
    if (event.type === 'GOAL') {
      for (const id of [event.playerId, event.assistPlayerId]) {
        if (id != null && !onPitch.has(id)) invalid(event);
      }
    } else if (event.type === 'SUBSTITUTION') {
      const out = event.playerOutId;
      const incoming = event.playerInId;
      if (out == null || incoming == null || !onPitch.has(out) || !selected.has(incoming) ||
        onPitch.has(incoming) || sentOff.has(incoming)) invalid(event);
      onPitch.delete(out!);
      onPitch.add(incoming!);
    } else if (event.type === 'YELLOW_CARD' || event.type === 'RED_CARD') {
      const player = event.playerId;
      if (player == null) continue;
      if (!selected.has(player) || sentOff.has(player)) invalid(event);
      if (dismissedByCard(event, yellows)) {
        sentOff.add(player);
        onPitch.delete(player);
      }
    }
  }
}
