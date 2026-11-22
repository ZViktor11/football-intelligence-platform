import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { AuthService } from '../auth/auth.service';
import { Prisma, Role } from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('MatchEventsService', () => {
  let service: MatchEventsService;

  const prismaMock = {
    $transaction: jest.fn(),
    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    matchEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    player: {
      findUnique: jest.fn(),
    },
    staffMember: {
      findUnique: jest.fn(),
    },
    matchSquadPlayer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const matchesServiceMock = {
    calculateMatchClock: jest.fn(),
  };

  const authServiceMock = {
    getUserRoles: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchEventsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: MatchesService,
          useValue: matchesServiceMock,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
  provide: AuditLogsService,
  useValue: {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findByMatch: jest.fn().mockResolvedValue([]),
  },
},
      ],
    }).compile();

    service = module.get<MatchEventsService>(MatchEventsService);

    prismaMock.match.findUnique.mockResolvedValue({
      id: 1,
      status: 'LIVE',
      homeTeamId: 1,
      awayTeamId: 2,
      actualStartedAt: new Date('2026-09-22T10:00:00Z'),
      secondHalfStartedAt: null,
      season: {
        competition: {
          halfDurationMinutes: 45,
        },
      },
    });

    prismaMock.matchEvent.findMany.mockResolvedValue([]);
    prismaMock.matchSquadPlayer.findMany.mockResolvedValue([]);

    prismaMock.match.update.mockResolvedValue({
      id: 1,
      homeScore: 0,
      awayScore: 0,
    });

    authServiceMock.getUserRoles.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('retries a serialization conflict using a new transaction', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Serialization failure', { code: 'P2034', clientVersion: '7.10.1' }),
    );
    matchesServiceMock.calculateMatchClock.mockReturnValue({ matchMinute: 23 });
    prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await expect(service.create({ type: 'GOAL', matchId: 1, teamId: 1 }, 2)).resolves.toBeDefined();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(prismaMock.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('returns a conflict after bounded retries', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('Serialization failure', { code: 'P2034', clientVersion: '7.10.1' });
    prismaMock.$transaction.mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict);
    await expect(service.create({ type: 'GOAL', matchId: 1, teamId: 1 }, 2)).rejects.toThrow('Concurrent match update');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3);
  });

  describe('sent-off players', () => {
    const red = { id: 10, type: 'RED_CARD', minute: 30, playerId: 1, playerOutId: null, playerInId: null };
    beforeEach(() => {
      prismaMock.player.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, teamId: 1 }));
      prismaMock.matchSquadPlayer.findUnique.mockImplementation(async ({ where }) => ({
        matchId: 1, teamId: 1, playerId: where.matchId_playerId?.playerId ?? 1, role: 'STARTER',
      }));
      prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
        { playerId: 1, role: 'STARTER' }, { playerId: 2, role: 'STARTER' }, { playerId: 4, role: 'SUBSTITUTE' },
      ]);
      prismaMock.matchEvent.findMany.mockImplementation(async ({ where }) =>
        where.OR || (where.type?.in && (where.minute?.lte ?? 120) >= 30) ? [red] : []);
      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({ id: 11, ...data }));
    });
    it.each([
      { type: 'GOAL' as const, playerId: 1 },
      { type: 'GOAL' as const, assistPlayerId: 1 },
      { type: 'YELLOW_CARD' as const, playerId: 1 },
      { type: 'RED_CARD' as const, playerId: 1 },
      { type: 'SUBSTITUTION' as const, playerOutId: 1, playerInId: 4 },
      { type: 'SUBSTITUTION' as const, playerOutId: 2, playerInId: 1 },
    ])('rejects an event involving the dismissed player: %j', async event => {
      await expect(service.create({ ...event, matchId: 1, teamId: 1, minute: 31 }, 2)).rejects.toThrow(BadRequestException);
    });
    it('allows a goal before the red card', async () => {
      await expect(service.create({ type: 'GOAL', playerId: 1, matchId: 1, teamId: 1, minute: 29 }, 2)).resolves.toBeDefined();
    });
    it('rejects a goal at the same minute after the recorded red card', async () => {
      await expect(service.create({ type: 'GOAL', playerId: 1, matchId: 1, teamId: 1, minute: 30 }, 2)).rejects.toThrow('Goal scorer is not on the pitch');
    });
    it('rejects retroactive dismissal when a later player event exists', async () => {
      prismaMock.matchEvent.findMany.mockResolvedValue([{ id: 12, type: 'GOAL', playerId: 1, minute: 40 }]);
      await expect(service.create({ type: 'RED_CARD', playerId: 1, matchId: 1, teamId: 1, minute: 30 }, 2)).rejects.toThrow('Remove or correct later events');
    });
  });

  describe('event minute', () => {
    it('should use the current match minute when minute is omitted', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 23,
        clockDisplay: "23'",
      });

      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
        id: 1,
        ...data,
      }));

      const event = await service.create(
        {
          type: 'GOAL',
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(matchesServiceMock.calculateMatchClock).toHaveBeenCalled();

      expect(prismaMock.matchEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 23,
        }),
      });

      expect(event.minute).toBe(23);
    });

    it('should keep an explicitly supplied minute for late event entry', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 27,
        clockDisplay: "27'",
      });

      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
        id: 2,
        ...data,
      }));

      const event = await service.create(
        {
          type: 'GOAL',
          minute: 24,
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(prismaMock.matchEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 24,
        }),
      });

      expect(event.minute).toBe(24);
    });

    it('should use the half-duration minute at half-time when minute is omitted', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'HALF_TIME',
        homeTeamId: 1,
        awayTeamId: 2,
        actualStartedAt: new Date('2026-09-22T10:00:00Z'),
        secondHalfStartedAt: null,
        season: {
          competition: {
            halfDurationMinutes: 45,
          },
        },
      });

      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 45,
        clockDisplay: 'HT',
      });

      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
        id: 3,
        ...data,
      }));

      const event = await service.create(
        {
          type: 'GOAL',
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(prismaMock.matchEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 45,
        }),
      });

      expect(event.minute).toBe(45);
    });
  });

  describe('finished match editing', () => {
    it('should allow event creation during a live match without requiring system admin', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 30,
        clockDisplay: "30'",
      });

      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
        id: 4,
        ...data,
      }));

      await expect(
        service.create(
          {
            type: 'GOAL',
            matchId: 1,
            teamId: 1,
          },
          2,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          minute: 30,
        }),
      );

      expect(authServiceMock.getUserRoles).not.toHaveBeenCalled();
    });

    it('should block a non-system-admin from creating an event after the match is finished', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'FINISHED',
        homeTeamId: 1,
        awayTeamId: 2,
        actualStartedAt: new Date('2026-09-22T10:00:00Z'),
        secondHalfStartedAt: new Date('2026-09-22T11:00:00Z'),
        season: {
          competition: {
            halfDurationMinutes: 45,
          },
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.MATCH_ADMIN,
          competitionId: null,
        },
      ]);

      await expect(
        service.create(
          {
            type: 'GOAL',
            minute: 90,
            matchId: 1,
            teamId: 1,
          },
          2,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
    });

    it('should allow a system admin to create an event after the match is finished', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'FINISHED',
        homeTeamId: 1,
        awayTeamId: 2,
        actualStartedAt: new Date('2026-09-22T10:00:00Z'),
        secondHalfStartedAt: new Date('2026-09-22T11:00:00Z'),
        season: {
          competition: {
            halfDurationMinutes: 45,
          },
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.SYSTEM_ADMIN,
          competitionId: null,
        },
      ]);

      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 90,
        clockDisplay: 'FT',
      });

      prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
        id: 5,
        ...data,
      }));

      const event = await service.create(
        {
          type: 'GOAL',
          minute: 90,
          matchId: 1,
          teamId: 1,
        },
        1,
      );

      expect(event).toEqual(
        expect.objectContaining({
          type: 'GOAL',
          minute: 90,
          matchId: 1,
          teamId: 1,
        }),
      );

      expect(authServiceMock.getUserRoles).toHaveBeenCalledWith(1, prismaMock);

      expect(prismaMock.matchEvent.create).toHaveBeenCalled();
    });

    it('should block a non-system-admin from updating an event after the match is finished', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 10,
        type: 'GOAL',
        minute: 50,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: null,
        playerInId: null,
        isOwnGoal: false,
        match: {
          id: 1,
          status: 'FINISHED',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.MATCH_ADMIN,
          competitionId: null,
        },
      ]);

      await expect(
        service.update(
          10,
          {
            minute: 51,
          },
          2,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.matchEvent.update).not.toHaveBeenCalled();
    });

    it('should allow a system admin to update an event after the match is finished', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 10,
        type: 'GOAL',
        minute: 50,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: null,
        playerInId: null,
        isOwnGoal: false,
        match: {
          id: 1,
          status: 'FINISHED',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.SYSTEM_ADMIN,
          competitionId: null,
        },
      ]);

      prismaMock.matchEvent.update.mockResolvedValue({
        id: 10,
        type: 'GOAL',
        minute: 51,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: null,
        playerInId: null,
        isOwnGoal: false,
      });

      await expect(
        service.update(
          10,
          {
            minute: 51,
          },
          1,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 10,
          minute: 51,
        }),
      );

      expect(prismaMock.matchEvent.update).toHaveBeenCalled();
    });

    it('should block a non-system-admin from deleting an event after the match is finished', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 10,
        matchId: 1,
        match: {
          id: 1,
          status: 'FINISHED',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.MATCH_ADMIN,
          competitionId: null,
        },
      ]);

      await expect(service.remove(10, 2)).rejects.toThrow(BadRequestException);

      expect(prismaMock.matchEvent.delete).not.toHaveBeenCalled();
    });

    it('should allow a system admin to delete an event after the match is finished', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 10,
        matchId: 1,
        match: {
          id: 1,
          status: 'FINISHED',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      authServiceMock.getUserRoles.mockResolvedValue([
        {
          role: Role.SYSTEM_ADMIN,
          competitionId: null,
        },
      ]);

      prismaMock.matchEvent.delete.mockResolvedValue({
        id: 10,
        matchId: 1,
      });

      await expect(service.remove(10, 1)).resolves.toEqual(
        expect.objectContaining({
          id: 10,
        }),
      );

      expect(prismaMock.matchEvent.delete).toHaveBeenCalled();
    });

    describe('goal assists', () => {
      it('should allow a valid assist from a teammate who is on the pitch', async () => {
        prismaMock.player.findUnique
          .mockResolvedValueOnce({ id: 1, teamId: 1 })
          .mockResolvedValueOnce({ id: 4, teamId: 1 });

        prismaMock.matchSquadPlayer.findUnique
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 1,
            role: 'STARTER',
          })
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 4,
            role: 'STARTER',
          });

        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'STARTER' },
        ]);

        prismaMock.matchEvent.findMany.mockResolvedValue([]);
        prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
          id: 20,
          ...data,
        }));

        const event = await service.create(
          {
            type: 'GOAL',
            minute: 30,
            matchId: 1,
            teamId: 1,
            playerId: 1,
            assistPlayerId: 4,
          },
          2,
        );

        expect(event).toEqual(
          expect.objectContaining({
            playerId: 1,
            assistPlayerId: 4,
          }),
        );
      });

      it('should reject the scorer as their own assist player', async () => {
        await expect(
          service.create(
            {
              type: 'GOAL',
              minute: 30,
              matchId: 1,
              teamId: 1,
              playerId: 1,
              assistPlayerId: 1,
            },
            2,
          ),
        ).rejects.toThrow('Goal scorer and assist player must be different');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });

      it('should reject an assist player from the other team', async () => {
        prismaMock.player.findUnique.mockResolvedValue({ id: 4, teamId: 2 });

        await expect(
          service.create(
            {
              type: 'GOAL',
              minute: 30,
              matchId: 1,
              teamId: 1,
              assistPlayerId: 4,
            },
            2,
          ),
        ).rejects.toThrow('Assist player does not belong to the selected team');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });

      it('should reject an assist player who is not on the pitch', async () => {
        prismaMock.player.findUnique.mockResolvedValue({ id: 4, teamId: 1 });
        prismaMock.matchSquadPlayer.findUnique.mockResolvedValue({
          matchId: 1,
          teamId: 1,
          playerId: 4,
          role: 'SUBSTITUTE',
        });
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);

        await expect(
          service.create(
            {
              type: 'GOAL',
              minute: 30,
              matchId: 1,
              teamId: 1,
              assistPlayerId: 4,
            },
            2,
          ),
        ).rejects.toThrow('Assist player is not on the pitch at this minute');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });

      it('should reject an assist on an own goal', async () => {
        await expect(
          service.create(
            {
              type: 'GOAL',
              minute: 30,
              matchId: 1,
              teamId: 1,
              playerId: 1,
              assistPlayerId: 4,
              isOwnGoal: true,
            },
            2,
          ),
        ).rejects.toThrow('An own goal cannot have an assist');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });
    });

    describe('card pitch state', () => {
      it('should allow a card for a player who is on the pitch', async () => {
        prismaMock.player.findUnique.mockResolvedValue({ id: 1, teamId: 1 });
        prismaMock.matchSquadPlayer.findUnique.mockResolvedValue({
          matchId: 1,
          teamId: 1,
          playerId: 1,
          role: 'STARTER',
        });
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);
        prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
          id: 30,
          ...data,
        }));

        await expect(
          service.create(
            {
              type: 'YELLOW_CARD',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerId: 1,
            },
            2,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            type: 'YELLOW_CARD',
            minute: 20,
            playerId: 1,
          }),
        );
      });

      it('should allow a card for a substitute who has not entered the pitch', async () => {
        prismaMock.player.findUnique.mockResolvedValue({
          id: 4,
          teamId: 1,
        });

        prismaMock.matchSquadPlayer.findUnique.mockResolvedValue({
          matchId: 1,
          teamId: 1,
          playerId: 4,
          role: 'SUBSTITUTE',
        });

        prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
          id: 31,
          ...data,
        }));

        await expect(
          service.create(
            {
              type: 'YELLOW_CARD',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerId: 4,
            },
            2,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            type: 'YELLOW_CARD',
            minute: 20,
            playerId: 4,
          }),
        );
      });

      it('should allow a card for a player after they were substituted off', async () => {
        prismaMock.player.findUnique.mockResolvedValue({
          id: 1,
          teamId: 1,
        });

        prismaMock.matchSquadPlayer.findUnique.mockResolvedValue({
          matchId: 1,
          teamId: 1,
          playerId: 1,
          role: 'STARTER',
        });

        prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
          id: 32,
          ...data,
        }));

        await expect(
          service.create(
            {
              type: 'RED_CARD',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerId: 1,
            },
            2,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            type: 'RED_CARD',
            minute: 20,
            playerId: 1,
          }),
        );
      });
    });

    describe('substitution pitch state', () => {
      it('should allow a valid substitution from a starter to a substitute', async () => {
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);
        prismaMock.matchEvent.create.mockImplementation(async ({ data }) => ({
          id: 40,
          ...data,
        }));

        await expect(
          service.create(
            {
              type: 'SUBSTITUTION',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerOutId: 1,
              playerInId: 4,
            },
            2,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            type: 'SUBSTITUTION',
            minute: 20,
            playerOutId: 1,
            playerInId: 4,
          }),
        );
      });

      it('should reject a substitution when the player out is not on the pitch', async () => {
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);

        await expect(
          service.create(
            {
              type: 'SUBSTITUTION',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerOutId: 4,
              playerInId: 1,
            },
            2,
          ),
        ).rejects.toThrow(
          'Player leaving the field is not currently on the pitch',
        );

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });

      it('should reject a substitution when the player in is already on the pitch', async () => {
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 3, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);

        await expect(
          service.create(
            {
              type: 'SUBSTITUTION',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerOutId: 1,
              playerInId: 3,
            },
            2,
          ),
        ).rejects.toThrow('Player entering the field is already on the pitch');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });

      it('should reject a substitution when player out and player in are the same player', async () => {
        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);

        await expect(
          service.create(
            {
              type: 'SUBSTITUTION',
              minute: 20,
              matchId: 1,
              teamId: 1,
              playerOutId: 1,
              playerInId: 1,
            },
            2,
          ),
        ).rejects.toThrow('Substitution players must be different');

        expect(prismaMock.matchEvent.create).not.toHaveBeenCalled();
      });
    });

    describe('substitution editing', () => {
      const existingSubstitution = {
        id: 50,
        type: 'SUBSTITUTION',
        minute: 20,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: 1,
        playerInId: 4,
        isOwnGoal: false,
        match: {
          id: 1,
          status: 'LIVE',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      };

      const mockSelectedPlayers = () => {
        prismaMock.player.findUnique
          .mockResolvedValueOnce({ id: 1, teamId: 1 })
          .mockResolvedValueOnce({ id: 4, teamId: 1 });

        prismaMock.matchSquadPlayer.findUnique
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 1,
            role: 'STARTER',
          })
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 4,
            role: 'SUBSTITUTE',
          });

        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
      };

      it('should allow changing the minute of an existing valid substitution', async () => {
        prismaMock.matchEvent.findUnique.mockResolvedValue(
          existingSubstitution,
        );
        prismaMock.player.findUnique
          .mockResolvedValueOnce({ id: 1, teamId: 1 })
          .mockResolvedValueOnce({ id: 4, teamId: 1 });

        prismaMock.matchSquadPlayer.findUnique
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 1,
            role: 'STARTER',
          })
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 4,
            role: 'SUBSTITUTE',
          });

        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);
        prismaMock.matchEvent.update.mockResolvedValue({
          ...existingSubstitution,
          minute: 25,
        });

        await expect(
          service.update(
            50,
            {
              minute: 25,
            },
            2,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            id: 50,
            type: 'SUBSTITUTION',
            minute: 25,
            playerOutId: 1,
            playerInId: 4,
          }),
        );

        expect(prismaMock.matchEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              matchId: 1,
              teamId: 1,
                type: { in: ['SUBSTITUTION', 'RED_CARD', 'YELLOW_CARD'] },
              id: {
                not: 50,
              },
            }),
          }),
        );

        expect(prismaMock.matchEvent.update).toHaveBeenCalledWith({
          where: {
            id: 50,
          },
          data: {
            minute: 25,
          },
        });
      });

      it('should reject changing a substitution to use the same player in and out', async () => {
        prismaMock.matchEvent.findUnique.mockResolvedValue(
          existingSubstitution,
        );

        await expect(
          service.update(
            50,
            {
              playerInId: 1,
            },
            2,
          ),
        ).rejects.toThrow('Substitution players must be different');

        expect(prismaMock.matchEvent.update).not.toHaveBeenCalled();
      });

      it('should reject changing the incoming player to one already on the pitch', async () => {
        prismaMock.matchEvent.findUnique.mockResolvedValue(
          existingSubstitution,
        );

        prismaMock.player.findUnique
          .mockResolvedValueOnce({ id: 1, teamId: 1 })
          .mockResolvedValueOnce({ id: 3, teamId: 1 });

        prismaMock.matchSquadPlayer.findUnique
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 1,
            role: 'STARTER',
          })
          .mockResolvedValueOnce({
            matchId: 1,
            teamId: 1,
            playerId: 3,
            role: 'STARTER',
          });

        prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
          { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 3, role: 'STARTER' },
          { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        ]);
        prismaMock.matchEvent.findMany.mockResolvedValue([]);

        await expect(
          service.update(
            50,
            {
              playerInId: 3,
            },
            2,
          ),
        ).rejects.toThrow('Player entering the field is already on the pitch');

        expect(prismaMock.matchEvent.update).not.toHaveBeenCalled();
      });
    });

    it('should reject moving a substitution after a later substitution that depends on its incoming player', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 50,
        type: 'SUBSTITUTION',
        minute: 20,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: 1,
        playerInId: 4,
        isOwnGoal: false,
        createdAt: new Date('2026-09-22T10:20:00Z'),
        match: {
          id: 1,
          status: 'LIVE',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      prismaMock.player.findUnique
        .mockResolvedValueOnce({ id: 1, teamId: 1 })
        .mockResolvedValueOnce({ id: 4, teamId: 1 });

      prismaMock.matchSquadPlayer.findUnique
        .mockResolvedValueOnce({
          matchId: 1,
          teamId: 1,
          playerId: 1,
          role: 'STARTER',
        })
        .mockResolvedValueOnce({
          matchId: 1,
          teamId: 1,
          playerId: 4,
          role: 'SUBSTITUTE',
        });

      prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
        { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
        { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        { matchId: 1, teamId: 1, playerId: 5, role: 'SUBSTITUTE' },
      ]);

      prismaMock.matchEvent.findMany.mockResolvedValue([
        {
          id: 51,
          matchId: 1,
          teamId: 1,
          type: 'SUBSTITUTION',
          minute: 60,
          playerOutId: 4,
          playerInId: 5,
          createdAt: new Date('2026-09-22T11:00:00Z'),
        },
      ]);

      await expect(
        service.update(
          50,
          {
            minute: 70,
          },
          2,
        ),
      ).rejects.toThrow(
        'Invalid substitution chronology: player leaving the field is not on the pitch',
      );

      expect(prismaMock.matchEvent.update).not.toHaveBeenCalled();
    });

    it('should allow moving a substitution earlier when the resulting substitution chronology is valid', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        id: 50,
        type: 'SUBSTITUTION',
        minute: 30,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: 1,
        playerInId: 4,
        isOwnGoal: false,
        createdAt: new Date('2026-09-22T10:30:00Z'),
        match: {
          id: 1,
          status: 'LIVE',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      prismaMock.player.findUnique
        .mockResolvedValueOnce({ id: 1, teamId: 1 })
        .mockResolvedValueOnce({ id: 4, teamId: 1 });

      prismaMock.matchSquadPlayer.findUnique
        .mockResolvedValueOnce({
          matchId: 1,
          teamId: 1,
          playerId: 1,
          role: 'STARTER',
        })
        .mockResolvedValueOnce({
          matchId: 1,
          teamId: 1,
          playerId: 4,
          role: 'SUBSTITUTE',
        });

      prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
        { matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' },
        { matchId: 1, teamId: 1, playerId: 4, role: 'SUBSTITUTE' },
        { matchId: 1, teamId: 1, playerId: 5, role: 'SUBSTITUTE' },
      ]);

      prismaMock.matchEvent.findMany.mockResolvedValue([]);

      prismaMock.matchEvent.update.mockResolvedValue({
        id: 50,
        type: 'SUBSTITUTION',
        minute: 15,
        matchId: 1,
        teamId: 1,
        playerId: null,
        assistPlayerId: null,
        staffMemberId: null,
        playerOutId: 1,
        playerInId: 4,
        isOwnGoal: false,
      });

      await expect(
        service.update(
          50,
          {
            minute: 15,
          },
          2,
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 50,
          minute: 15,
          playerOutId: 1,
          playerInId: 4,
        }),
      );
    });
  });
  describe('audit logging', () => {
    const existingEvent = {
      id: 100,
      type: 'GOAL' as const,
      minute: 30,
      matchId: 1,
      teamId: 1,
      playerId: null,
      assistPlayerId: null,
      staffMemberId: null,
      playerOutId: null,
      playerInId: null,
      isOwnGoal: false,
    };

    const auditCreate = () =>
      (service as any).auditLogsService.create as jest.Mock;

    it('should audit event creation with user and match IDs', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 30,
        clockDisplay: "30'",
      });

      prismaMock.matchEvent.create.mockResolvedValue(existingEvent);

      await service.create(
        { type: 'GOAL', minute: 30, matchId: 1, teamId: 1 },
        2,
      );

      expect(auditCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'MATCH_EVENT',
          entityId: 100,
          userId: 2,
          matchId: 1,
          after: expect.objectContaining({
            id: 100,
            minute: 30,
          }),
        }),
        prismaMock,
      );
    });

    it('should audit event updates with before and after values', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        ...existingEvent,
        match: {
          id: 1,
          status: 'LIVE',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      prismaMock.matchEvent.update.mockResolvedValue({
        ...existingEvent,
        minute: 35,
      });

      await service.update(100, { minute: 35 }, 2);

      expect(auditCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entityId: 100,
          userId: 2,
          matchId: 1,
          before: expect.objectContaining({ minute: 30 }),
          after: expect.objectContaining({ minute: 35 }),
        }),
        prismaMock,
      );
    });

    it('should preserve deleted event data in the audit log', async () => {
      prismaMock.matchEvent.findUnique.mockResolvedValue({
        ...existingEvent,
        match: {
          id: 1,
          status: 'LIVE',
          homeTeamId: 1,
          awayTeamId: 2,
        },
      });

      prismaMock.matchEvent.delete.mockResolvedValue(existingEvent);

      await service.remove(100, 2);

      expect(auditCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entityId: 100,
          userId: 2,
          matchId: 1,
          before: expect.objectContaining({
            id: 100,
            minute: 30,
          }),
        }),
        prismaMock,
      );
    });

    it('should reject creation when audit logging fails', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 30,
        clockDisplay: "30'",
      });

      prismaMock.matchEvent.create.mockResolvedValue(existingEvent);

      auditCreate().mockRejectedValueOnce(
        new Error('Audit log write failed'),
      );

      await expect(
        service.create(
          { type: 'GOAL', minute: 30, matchId: 1, teamId: 1 },
          2,
        ),
      ).rejects.toThrow('Audit log write failed');

      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });
});
