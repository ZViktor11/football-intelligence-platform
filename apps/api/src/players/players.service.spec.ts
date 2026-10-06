import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from './players.service';

describe('PlayersService', () => {
  let service: PlayersService;

  const prismaMock = {
  player: {
    findUnique: jest.fn(),
  },
  matchSquadPlayer: {
    findMany: jest.fn(),
  },
};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should calculate player statistics from finished matches', async () => {
      prismaMock.player.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Peter',
        lastName: 'Kovacs',
        birthDate: new Date('2002-05-14'),
        position: 'MIDFIELDER',
        isActive: true,
        teamId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),

        team: {
          id: 1,
          name: 'Szeged FC',
          city: 'Szeged',
          seasonId: 1,
        },

        matchSquadEntries: [
          { matchId: 1 },
          { matchId: 2 },
          { matchId: 2 },
        ],

        matchEvents: [
          {
            type: 'GOAL',
            isOwnGoal: false,
          },
          {
            type: 'GOAL',
            isOwnGoal: false,
          },
          {
            type: 'GOAL',
            isOwnGoal: true,
          },
          {
            type: 'YELLOW_CARD',
            isOwnGoal: false,
          },
          {
            type: 'YELLOW_CARD',
            isOwnGoal: false,
          },
          {
            type: 'RED_CARD',
            isOwnGoal: false,
          },
        ],

        assistEvents: [{ id: 10 }, { id: 11 }],
      });

      const result = await service.findOne(1);

      expect(result.statistics).toEqual({
        appearances: 2,
        goals: 2,
        assists: 2,
        ownGoals: 1,
        yellowCards: 2,
        redCards: 1,
      });
    });

    it('should return zero statistics when the player has no match data', async () => {
      prismaMock.player.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Peter',
        lastName: 'Kovacs',
        birthDate: null,
        position: 'MIDFIELDER',
        isActive: true,
        teamId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),

        team: {
          id: 1,
          name: 'Szeged FC',
          city: 'Szeged',
          seasonId: 1,
        },

        matchSquadEntries: [],
        matchEvents: [],
        assistEvents: [],
      });

      const result = await service.findOne(1);

      expect(result.statistics).toEqual({
        appearances: 0,
        goals: 0,
        assists: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
      });
    });

    it('should only request statistics from finished matches', async () => {
      prismaMock.player.findUnique.mockResolvedValue({
        id: 1,
        firstName: 'Peter',
        lastName: 'Kovacs',
        birthDate: null,
        position: 'MIDFIELDER',
        isActive: true,
        teamId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: null,
        matchSquadEntries: [],
        matchEvents: [],
        assistEvents: [],
      });

      await service.findOne(1);

      expect(prismaMock.player.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          team: true,
          matchSquadEntries: {
            where: {
              match: {
                status: 'FINISHED',
              },
            },
            select: {
              matchId: true,
            },
          },
          matchEvents: {
            where: {
              match: {
                status: 'FINISHED',
              },
            },
            select: {
              type: true,
              isOwnGoal: true,
            },
          },
          assistEvents: {
            where: {
              type: 'GOAL',
              match: {
                status: 'FINISHED',
              },
            },
            select: {
              id: true,
            },
          },
        },
      });
    });

    it('should throw when the player does not exist', async () => {
      prismaMock.player.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException(
          'Player with ID 999 not found',
        ),
      );
    });
  });
  describe('getMatchHistory', () => {
  it('should return finished match history with player statistics', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 1,
    });

    prismaMock.matchSquadPlayer.findMany.mockResolvedValue([
      {
        matchId: 12,
        teamId: 1,
        role: 'STARTER',

        team: {
          id: 1,
          name: 'Szeged FC',
        },

        match: {
          id: 12,
          date: new Date('2026-10-07T06:25:00.000Z'),
          homeTeamId: 1,
          awayTeamId: 2,
          homeScore: 2,
          awayScore: 1,

          homeTeam: {
            id: 1,
            name: 'Szeged FC',
          },

          awayTeam: {
            id: 2,
            name: 'Budapest FC',
          },

          season: {
            id: 1,
            name: '2026/27',
            competition: {
              id: 1,
              name: 'Szeged Amateur League',
            },
          },

          events: [
            {
              type: 'GOAL',
              playerId: 1,
              assistPlayerId: null,
              isOwnGoal: false,
            },
            {
              type: 'GOAL',
              playerId: null,
              assistPlayerId: 1,
              isOwnGoal: false,
            },
            {
              type: 'YELLOW_CARD',
              playerId: 1,
              assistPlayerId: null,
              isOwnGoal: false,
            },
          ],
        },
      },
    ]);

    const result = await service.getMatchHistory(1);

    expect(result).toHaveLength(1);

    expect(result[0]).toMatchObject({
      matchId: 12,
      homeScore: 2,
      awayScore: 1,
      role: 'STARTER',

      opponent: {
        id: 2,
        name: 'Budapest FC',
      },

      statistics: {
        goals: 1,
        assists: 1,
        ownGoals: 0,
        yellowCards: 1,
        redCards: 0,
      },
    });
  });

  it('should request only finished match appearances', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 1,
    });

    prismaMock.matchSquadPlayer.findMany.mockResolvedValue([]);

    await service.getMatchHistory(1);

    expect(
      prismaMock.matchSquadPlayer.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          playerId: 1,
          match: {
            status: 'FINISHED',
          },
        },
      }),
    );
  });

  it('should return an empty history when the player has no finished appearances', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 1,
    });

    prismaMock.matchSquadPlayer.findMany.mockResolvedValue([]);

    const result = await service.getMatchHistory(1);

    expect(result).toEqual([]);
  });

  it('should throw when the player does not exist', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    await expect(
      service.getMatchHistory(999),
    ).rejects.toThrow(
      new NotFoundException(
        'Player with ID 999 not found',
      ),
    );

    expect(
      prismaMock.matchSquadPlayer.findMany,
    ).not.toHaveBeenCalled();
  });
});
});