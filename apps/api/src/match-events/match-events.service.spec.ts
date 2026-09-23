import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MatchEventsService } from './match-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '../../generated/prisma/client';

describe('MatchEventsService', () => {
  let service: MatchEventsService;

  const prismaMock = {
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

    const module: TestingModule =
      await Test.createTestingModule({
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
        ],
      }).compile();

    service =
      module.get<MatchEventsService>(
        MatchEventsService,
      );

    prismaMock.match.findUnique.mockResolvedValue({
      id: 1,
      status: 'LIVE',
      homeTeamId: 1,
      awayTeamId: 2,
      actualStartedAt: new Date(
        '2026-09-22T10:00:00Z',
      ),
      secondHalfStartedAt: null,
      season: {
        competition: {
          halfDurationMinutes: 45,
        },
      },
    });

    prismaMock.matchEvent.findMany.mockResolvedValue(
      [],
    );

    prismaMock.match.update.mockResolvedValue({
      id: 1,
      homeScore: 0,
      awayScore: 0,
    });

    authServiceMock.getUserRoles.mockResolvedValue(
      [],
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('event minute', () => {
    it('should use the current match minute when minute is omitted', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue(
        {
          matchMinute: 23,
          clockDisplay: "23'",
        },
      );

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 1,
          ...data,
        }),
      );

      const event = await service.create(
        {
          type: 'GOAL',
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(
        matchesServiceMock.calculateMatchClock,
      ).toHaveBeenCalled();

      expect(
        prismaMock.matchEvent.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 23,
        }),
      });

      expect(event.minute).toBe(23);
    });

    it('should keep an explicitly supplied minute for late event entry', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue(
        {
          matchMinute: 27,
          clockDisplay: "27'",
        },
      );

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 2,
          ...data,
        }),
      );

      const event = await service.create(
        {
          type: 'GOAL',
          minute: 24,
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(
        prismaMock.matchEvent.create,
      ).toHaveBeenCalledWith({
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
        actualStartedAt: new Date(
          '2026-09-22T10:00:00Z',
        ),
        secondHalfStartedAt: null,
        season: {
          competition: {
            halfDurationMinutes: 45,
          },
        },
      });

      matchesServiceMock.calculateMatchClock.mockReturnValue(
        {
          matchMinute: 45,
          clockDisplay: 'HT',
        },
      );

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 3,
          ...data,
        }),
      );

      const event = await service.create(
        {
          type: 'GOAL',
          matchId: 1,
          teamId: 1,
        },
        2,
      );

      expect(
        prismaMock.matchEvent.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 45,
        }),
      });

      expect(event.minute).toBe(45);
    });
  });

  describe('finished match editing', () => {
    it('should allow event creation during a live match without requiring system admin', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue(
        {
          matchMinute: 30,
          clockDisplay: "30'",
        },
      );

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 4,
          ...data,
        }),
      );

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

      expect(
        authServiceMock.getUserRoles,
      ).not.toHaveBeenCalled();
    });

    it('should block a non-system-admin from creating an event after the match is finished', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'FINISHED',
        homeTeamId: 1,
        awayTeamId: 2,
        actualStartedAt: new Date(
          '2026-09-22T10:00:00Z',
        ),
        secondHalfStartedAt: new Date(
          '2026-09-22T11:00:00Z',
        ),
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

      expect(
        prismaMock.matchEvent.create,
      ).not.toHaveBeenCalled();
    });

    it('should allow a system admin to create an event after the match is finished', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'FINISHED',
        homeTeamId: 1,
        awayTeamId: 2,
        actualStartedAt: new Date(
          '2026-09-22T10:00:00Z',
        ),
        secondHalfStartedAt: new Date(
          '2026-09-22T11:00:00Z',
        ),
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

      matchesServiceMock.calculateMatchClock.mockReturnValue(
        {
          matchMinute: 90,
          clockDisplay: 'FT',
        },
      );

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 5,
          ...data,
        }),
      );

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

      expect(
        authServiceMock.getUserRoles,
      ).toHaveBeenCalledWith(1);

      expect(
        prismaMock.matchEvent.create,
      ).toHaveBeenCalled();
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

  expect(
    prismaMock.matchEvent.update,
  ).not.toHaveBeenCalled();
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

  expect(
    prismaMock.matchEvent.update,
  ).toHaveBeenCalled();
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

  await expect(
    service.remove(10, 2),
  ).rejects.toThrow(BadRequestException);

  expect(
    prismaMock.matchEvent.delete,
  ).not.toHaveBeenCalled();
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

  await expect(
    service.remove(10, 1),
  ).resolves.toEqual(
    expect.objectContaining({
      id: 10,
    }),
  );

  expect(
    prismaMock.matchEvent.delete,
  ).toHaveBeenCalled();
});

  describe('goal assists', () => {
    it('should allow a valid assist from a teammate who is on the pitch', async () => {
      prismaMock.player.findUnique
        .mockResolvedValueOnce({ id: 1, teamId: 1 })
        .mockResolvedValueOnce({ id: 4, teamId: 1 });

      prismaMock.matchSquadPlayer.findUnique
        .mockResolvedValueOnce({ matchId: 1, teamId: 1, playerId: 1, role: 'STARTER' })
        .mockResolvedValueOnce({ matchId: 1, teamId: 1, playerId: 4, role: 'STARTER' });

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

  });
});
