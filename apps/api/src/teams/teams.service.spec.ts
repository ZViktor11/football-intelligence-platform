import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  let service: TeamsService;

  const prismaMock = {
    team: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should calculate team statistics from finished home and away matches', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
        name: 'Szeged FC',
        city: 'Szeged',
        seasonId: 1,
        season: {
          id: 1,
          name: '2026/27',
          competition: {
            id: 1,
            name: 'Szeged Amateur League',
          },
        },
        players: [],
        homeMatches: [
          {
            homeScore: 3,
            awayScore: 1,
          },
          {
            homeScore: 1,
            awayScore: 1,
          },
        ],
        awayMatches: [
          {
            homeScore: 2,
            awayScore: 0,
          },
          {
            homeScore: 1,
            awayScore: 2,
          },
        ],
      });

      const result = await service.findOne(1);

      expect(result.statistics).toEqual({
        played: 4,
        wins: 2,
        draws: 1,
        losses: 1,
        goalsFor: 6,
        goalsAgainst: 5,
        goalDifference: 1,
        points: 7,
      });
    });

    it('should return zero statistics when the team has no finished matches', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
        name: 'Szeged FC',
        city: 'Szeged',
        seasonId: 1,
        season: {
          id: 1,
          name: '2026/27',
          competition: {
            id: 1,
            name: 'Szeged Amateur League',
          },
        },
        players: [],
        homeMatches: [],
        awayMatches: [],
      });

      const result = await service.findOne(1);

      expect(result.statistics).toEqual({
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });

    it('should only request finished matches', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
        name: 'Szeged FC',
        city: 'Szeged',
        seasonId: 1,
        season: {},
        players: [],
        homeMatches: [],
        awayMatches: [],
      });

      await service.findOne(1);

      expect(prismaMock.team.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            homeMatches: {
              where: {
                status: 'FINISHED',
              },
              select: {
                homeScore: true,
                awayScore: true,
              },
            },
            awayMatches: {
              where: {
                status: 'FINISHED',
              },
              select: {
                homeScore: true,
                awayScore: true,
              },
            },
          }),
        }),
      );
    });

    it('should throw NotFoundException when the team does not exist', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Team with ID 999 not found'),
      );
    });
  });

  describe('getMatchHistory', () => {
    it('should return match history with home win, away win and draw results', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
      });

      prismaMock.match.findMany.mockResolvedValue([
        {
          id: 10,
          date: new Date('2026-10-10T16:00:00.000Z'),
          homeTeamId: 1,
          awayTeamId: 2,
          homeScore: 3,
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
        },
        {
          id: 11,
          date: new Date('2026-10-05T16:00:00.000Z'),
          homeTeamId: 2,
          awayTeamId: 1,
          homeScore: 0,
          awayScore: 2,
          homeTeam: {
            id: 2,
            name: 'Budapest FC',
          },
          awayTeam: {
            id: 1,
            name: 'Szeged FC',
          },
          season: {
            id: 1,
            name: '2026/27',
            competition: {
              id: 1,
              name: 'Szeged Amateur League',
            },
          },
        },
        {
          id: 12,
          date: new Date('2026-10-01T16:00:00.000Z'),
          homeTeamId: 2,
          awayTeamId: 1,
          homeScore: 1,
          awayScore: 1,
          homeTeam: {
            id: 2,
            name: 'Budapest FC',
          },
          awayTeam: {
            id: 1,
            name: 'Szeged FC',
          },
          season: {
            id: 1,
            name: '2026/27',
            competition: {
              id: 1,
              name: 'Szeged Amateur League',
            },
          },
        },
      ]);

      const result = await service.getMatchHistory(1);

      expect(result).toHaveLength(3);

      expect(result[0]).toEqual(
        expect.objectContaining({
          matchId: 10,
          venue: 'HOME',
          result: 'WIN',
          opponent: {
            id: 2,
            name: 'Budapest FC',
          },
        }),
      );

      expect(result[1]).toEqual(
        expect.objectContaining({
          matchId: 11,
          venue: 'AWAY',
          result: 'WIN',
          opponent: {
            id: 2,
            name: 'Budapest FC',
          },
        }),
      );

      expect(result[2]).toEqual(
        expect.objectContaining({
          matchId: 12,
          venue: 'AWAY',
          result: 'DRAW',
        }),
      );
    });

    it('should calculate a loss correctly', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
      });

      prismaMock.match.findMany.mockResolvedValue([
        {
          id: 13,
          date: new Date('2026-09-20T16:00:00.000Z'),
          homeTeamId: 2,
          awayTeamId: 1,
          homeScore: 2,
          awayScore: 0,
          homeTeam: {
            id: 2,
            name: 'Budapest FC',
          },
          awayTeam: {
            id: 1,
            name: 'Szeged FC',
          },
          season: {
            id: 1,
            name: '2026/27',
            competition: {
              id: 1,
              name: 'Szeged Amateur League',
            },
          },
        },
      ]);

      const result = await service.getMatchHistory(1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          venue: 'AWAY',
          result: 'LOSS',
          homeScore: 2,
          awayScore: 0,
        }),
      );
    });

    it('should request only finished matches for the team ordered by newest first', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
      });

      prismaMock.match.findMany.mockResolvedValue([]);

      await service.getMatchHistory(1);

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'FINISHED',
            OR: [{ homeTeamId: 1 }, { awayTeamId: 1 }],
          },
          orderBy: {
            date: 'desc',
          },
        }),
      );
    });

    it('should return an empty array when the team has no finished matches', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        id: 1,
      });

      prismaMock.match.findMany.mockResolvedValue([]);

      const result = await service.getMatchHistory(1);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when the team does not exist', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      await expect(service.getMatchHistory(999)).rejects.toThrow(
        new NotFoundException('Team with ID 999 not found'),
      );

      expect(prismaMock.match.findMany).not.toHaveBeenCalled();
    });
  });
});