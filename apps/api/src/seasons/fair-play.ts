type CardEvent = {
  id: number;
  type: string;
  teamId: number | null;
  playerId: number | null;
  staffMemberId: number | null;
};

// Platform scoring convention, applied once per recipient per finished match.
// First yellow: 1; second-yellow dismissal: 3 total; direct red: 4;
// yellow followed by direct red: 5. Legacy duplicate red after two yellows
// does not count as another dismissal.
export function fairPlayPenalties(events: CardEvent[]): Map<number, number> {
  const recipients = new Map<string, { teamId: number; yellows: number; red: boolean }>();
  for (const event of events) {
    if (event.teamId == null || !['YELLOW_CARD', 'RED_CARD'].includes(event.type)) continue;
    const recipient = event.playerId != null ? 'player:' + event.playerId
      : event.staffMemberId != null ? 'staff:' + event.staffMemberId : 'event:' + event.id;
    const key = event.teamId + ':' + recipient;
    const entry = recipients.get(key) ?? { teamId: event.teamId, yellows: 0, red: false };
    if (event.type === 'YELLOW_CARD') entry.yellows++;
    else entry.red = true;
    recipients.set(key, entry);
  }
  const totals = new Map<number, number>();
  for (const entry of recipients.values()) {
    const penalty = entry.yellows >= 2 ? 3 : entry.red ? 4 + entry.yellows : entry.yellows;
    totals.set(entry.teamId, (totals.get(entry.teamId) ?? 0) + penalty);
  }
  return totals;
}
