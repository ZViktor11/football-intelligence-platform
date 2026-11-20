import {
  Match,
  MatchStatus,
  PossessionSide,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { statisticsView, possessionTotals } from './match-statistics';

const start = new Date('2026-11-20T12:00:00Z');
const now = new Date('2026-11-20T12:01:00Z');
const match = (changes: Partial<Match> = {}): Match =>
  ({
    id: 1,
    status: MatchStatus.LIVE,
    actualStartedAt: start,
    firstHalfEndedAt: null,
    secondHalfStartedAt: null,
    actualEndedAt: null,
    shotsOnTargetEnabled: true,
    possessionEnabled: true,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homePossessionMs: 0,
    awayPossessionMs: 0,
    possessionSide: null,
    possessionStartedAt: null,
    statisticsVersion: 0,
    updatedAt: start,
    ...changes,
  }) as Match;

describe('match statistics', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const service = new MatchesService({
    match: { findUnique, update },
  } as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    findUnique.mockResolvedValue(match());
    update.mockResolvedValue(match());
  });
  afterEach(() => jest.useRealTimers());

  it('calculates possession using elapsed server time', () => {
    const state = match({
      possessionSide: PossessionSide.HOME,
      possessionStartedAt: start,
      awayPossessionMs: 40_000,
    });
    expect(statisticsView(state, now)).toMatchObject({
      homePossessionPercent: 60,
      awayPossessionPercent: 40,
    });
  });
  it('reports no percentage before measurement starts', () => {
    expect(statisticsView(match(), now)).toMatchObject({
      homePossessionPercent: null,
      awayPossessionPercent: null,
    });
  });
  it('does not count half-time as possession', () => {
    expect(
      possessionTotals(
        match({
          status: MatchStatus.HALF_TIME,
          possessionSide: PossessionSide.AWAY,
          possessionStartedAt: start,
          awayPossessionMs: 10,
        }),
        now,
      ),
    ).toEqual({ homePossessionMs: 0, awayPossessionMs: 10 });
  });
  it('locks settings after kickoff', async () => {
    await expect(
      service.configureStatistics(1, {
        shotsOnTargetEnabled: false,
        possessionEnabled: false,
      }),
    ).rejects.toThrow('locked');
    expect(update).not.toHaveBeenCalled();
  });
  it('independently configures the two features before kickoff', async () => {
    findUnique.mockResolvedValue(match({ status: MatchStatus.PRE_MATCH }));
    await service.configureStatistics(1, {
      shotsOnTargetEnabled: true,
      possessionEnabled: false,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          shotsOnTargetEnabled: true,
          possessionEnabled: false,
          statisticsVersion: { increment: 1 },
        },
      }),
    );
  });
  it('rejects negative shot counts', async () => {
    await expect(
      service.recordShot(1, { side: PossessionSide.HOME, delta: -1 }),
    ).rejects.toThrow('negative');
    expect(update).not.toHaveBeenCalled();
  });
  it('increments the appropriate team count', async () => {
    await service.recordShot(1, { side: PossessionSide.AWAY, delta: 1 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          awayShotsOnTarget: { increment: 1 },
          statisticsVersion: { increment: 1 },
        },
      }),
    );
  });
  it('rejects shot recording when disabled', async () => {
    findUnique.mockResolvedValue(match({ shotsOnTargetEnabled: false }));
    await expect(
      service.recordShot(1, { side: PossessionSide.HOME, delta: 1 }),
    ).rejects.toThrow('not editable');
  });
  it('stores elapsed time when changing team', async () => {
    findUnique.mockResolvedValue(
      match({
        possessionSide: PossessionSide.HOME,
        possessionStartedAt: start,
      }),
    );
    await service.recordPossession(1, PossessionSide.AWAY);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          homePossessionMs: 60_000,
          awayPossessionMs: 0,
          possessionSide: PossessionSide.AWAY,
          possessionStartedAt: now,
          statisticsVersion: { increment: 1 },
        },
      }),
    );
  });
  it('stops the measurement at half-time', async () => {
    findUnique.mockResolvedValue(
      match({
        possessionSide: PossessionSide.HOME,
        possessionStartedAt: start,
      }),
    );
    await service.updateStatus(1, MatchStatus.HALF_TIME);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          homePossessionMs: 60_000,
          possessionSide: null,
          possessionStartedAt: null,
        }) as unknown,
      }),
    );
  });
  it('stops the measurement at full-time', async () => {
    findUnique.mockResolvedValue(
      match({
        secondHalfStartedAt: start,
        possessionSide: PossessionSide.AWAY,
        possessionStartedAt: start,
      }),
    );
    await service.updateStatus(1, MatchStatus.FINISHED);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          awayPossessionMs: 60_000,
          possessionSide: null,
          possessionStartedAt: null,
        }) as unknown,
      }),
    );
  });
  it('rejects possession changes at half-time', async () => {
    findUnique.mockResolvedValue(match({ status: MatchStatus.HALF_TIME }));
    await expect(
      service.recordPossession(1, PossessionSide.HOME),
    ).rejects.toThrow('not editable');
  });
  it('rejects stale simultaneous updates with a conflict', async () => {
    update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('stale', {
        code: 'P2025',
        clientVersion: '7.8.0',
      }),
    );
    await expect(
      service.recordShot(1, { side: PossessionSide.HOME, delta: 1 }),
    ).rejects.toThrow('Match changed; refresh and retry');
  });
});
