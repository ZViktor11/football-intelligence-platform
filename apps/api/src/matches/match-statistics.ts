import {
  Match,
  MatchStatus,
  PossessionSide,
} from '../../generated/prisma/client';

export function possessionTotals(match: Match, now: Date) {
  const elapsed =
    match.possessionEnabled &&
    match.status === MatchStatus.LIVE &&
    match.possessionStartedAt &&
    match.possessionSide
      ? Math.max(0, now.getTime() - match.possessionStartedAt.getTime())
      : 0;
  return {
    homePossessionMs:
      match.homePossessionMs +
      (match.possessionSide === PossessionSide.HOME ? elapsed : 0),
    awayPossessionMs:
      match.awayPossessionMs +
      (match.possessionSide === PossessionSide.AWAY ? elapsed : 0),
  };
}

export function statisticsView(match: Match, now = new Date()) {
  const { homePossessionMs, awayPossessionMs } = possessionTotals(match, now);
  const total = homePossessionMs + awayPossessionMs;
  const home = total > 0 ? Math.round((homePossessionMs * 100) / total) : null;
  return {
    shotsOnTargetEnabled: match.shotsOnTargetEnabled,
    possessionEnabled: match.possessionEnabled,
    homeShotsOnTarget: match.homeShotsOnTarget,
    awayShotsOnTarget: match.awayShotsOnTarget,
    homePossessionPercent: home,
    awayPossessionPercent: home === null ? null : 100 - home,
    possessionSide: match.possessionSide,
  };
}
