
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SeasonsService } from './seasons.service';

describe('SeasonsService', () => {
  let service: SeasonsService;

  const prismaMock = {
    season: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          SeasonsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service = module.get<SeasonsService>(SeasonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('standings', () => {
    it('should calculate standings from finished matches', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Szeged FC' },
          { id: 2, name: 'Budapest FC' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 2,
            homeScore: 2,
            awayScore: 1,
          },
          {
            homeTeamId: 2,
            awayTeamId: 1,
            homeScore: 0,
            awayScore: 0,
          },
        ],
      });

      const result = await service.getStandings(1);

      expect(result).toEqual([
        {
          position: 1,
          teamId: 1,
          teamName: 'Szeged FC',
          played: 2,
          won: 1,
          drawn: 1,
          lost: 0,
          goalsFor: 2,
          goalsAgainst: 1,
          goalDifference: 1,
          points: 4,
        },
        {
          position: 2,
          teamId: 2,
          teamName: 'Budapest FC',
          played: 2,
          won: 0,
          drawn: 1,
          lost: 1,
          goalsFor: 1,
          goalsAgainst: 2,
          goalDifference: -1,
          points: 1,
        },
      ]);
    });

    it('should sort teams by goal difference when points are equal', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Team A' },
          { id: 2, name: 'Team B' },
          { id: 3, name: 'Team C' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 3,
            homeScore: 3,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 3,
            homeScore: 1,
            awayScore: 0,
          },
        ],
      });

      const result = await service.getStandings(1);

      expect(result[0].teamName).toBe('Team A');
      expect(result[0].points).toBe(3);
      expect(result[0].goalDifference).toBe(3);

      expect(result[1].teamName).toBe('Team B');
      expect(result[1].points).toBe(3);
      expect(result[1].goalDifference).toBe(1);
    });

    it('should include teams that have not played a match', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Szeged FC' },
          { id: 2, name: 'Budapest FC' },
        ],
        matches: [],
      });

      const result = await service.getStandings(1);

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual(
        expect.objectContaining({
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        }),
      );

      expect(result[1]).toEqual(
        expect.objectContaining({
          played: 0,
          points: 0,
        }),
      );
    });

    it('should throw when the season does not exist', async () => {
      prismaMock.season.findUnique.mockResolvedValue(null);

      await expect(
        service.getStandings(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('should rank the head-to-head winner first when overall statistics are tied', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Zeta FC' },
          { id: 2, name: 'Alpha FC' },
          { id: 3, name: 'Gamma FC' },
          { id: 4, name: 'Delta FC' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 2,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 3,
            awayTeamId: 1,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 4,
            homeScore: 1,
            awayScore: 0,
          },
        ],
      });

      const result = await service.getStandings(1);

      const zeta = result.find(
        (team) => team.teamId === 1,
      )!;
      const alpha = result.find(
        (team) => team.teamId === 2,
      )!;

      expect(zeta.points).toBe(3);
      expect(alpha.points).toBe(3);

      expect(zeta.goalDifference).toBe(0);
      expect(alpha.goalDifference).toBe(0);

      expect(zeta.goalsFor).toBe(1);
      expect(alpha.goalsFor).toBe(1);

      expect(zeta.position).toBeLessThan(
        alpha.position,
      );
    });

    it('should rank three tied teams using a head-to-head mini-table', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Zeta FC' },
          { id: 2, name: 'Alpha FC' },
          { id: 3, name: 'Beta FC' },
          { id: 4, name: 'Outsider FC' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 2,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 1,
            awayTeamId: 3,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 3,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 4,
            awayTeamId: 1,
            homeScore: 2,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 4,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 4,
            awayTeamId: 2,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 3,
            awayTeamId: 4,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 3,
            awayTeamId: 4,
            homeScore: 1,
            awayScore: 0,
          },
        ],
      });

      const result = await service.getStandings(1);

      const zeta = result.find(
        (team) => team.teamId === 1,
      )!;
      const alpha = result.find(
        (team) => team.teamId === 2,
      )!;
      const beta = result.find(
        (team) => team.teamId === 3,
      )!;

      expect(zeta.points).toBe(6);
      expect(alpha.points).toBe(6);
      expect(beta.points).toBe(6);

      expect(zeta.goalDifference).toBe(0);
      expect(alpha.goalDifference).toBe(0);
      expect(beta.goalDifference).toBe(0);

      expect(zeta.goalsFor).toBe(2);
      expect(alpha.goalsFor).toBe(2);
      expect(beta.goalsFor).toBe(2);

      expect(zeta.position).toBeLessThan(
        alpha.position,
      );
      expect(alpha.position).toBeLessThan(
        beta.position,
      );
    });

    it('should use head-to-head goal difference after head-to-head points', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        teams: [
          { id: 1, name: 'Zeta FC' },
          { id: 2, name: 'Alpha FC' },
          { id: 3, name: 'Gamma FC' },
          { id: 4, name: 'Delta FC' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 2,
            homeScore: 2,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 1,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 3,
            awayTeamId: 1,
            homeScore: 1,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 4,
            homeScore: 1,
            awayScore: 0,
          },
        ],
      });

      const result = await service.getStandings(1);

      expect(result).toHaveLength(4);
      expect(result[0].position).toBe(1);
      expect(result[3].position).toBe(4);
    });

    it('should prioritize goal difference when configured before goals scored', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        competition: {
          standingsTieBreakers: [
            'POINTS',
            'GOAL_DIFFERENCE',
            'GOALS_FOR',
          ],
        },
        teams: [
          { id: 1, name: 'Team A' },
          { id: 2, name: 'Team B' },
          { id: 3, name: 'Team C' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 3,
            homeScore: 3,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 3,
            homeScore: 4,
            awayScore: 2,
          },
        ],
      });

      const result = await service.getStandings(1);

      expect(result.map((team) => team.teamName)).toEqual([
        'Team A',
        'Team B',
        'Team C',
      ]);
    });

    it('should prioritize goals scored when configured before goal difference', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        competition: {
          standingsTieBreakers: [
            'POINTS',
            'GOALS_FOR',
            'GOAL_DIFFERENCE',
          ],
        },
        teams: [
          { id: 1, name: 'Team A' },
          { id: 2, name: 'Team B' },
          { id: 3, name: 'Team C' },
        ],
        matches: [
          {
            homeTeamId: 1,
            awayTeamId: 3,
            homeScore: 3,
            awayScore: 0,
          },
          {
            homeTeamId: 2,
            awayTeamId: 3,
            homeScore: 4,
            awayScore: 2,
          },
        ],
      });

      const result = await service.getStandings(1);

      expect(result.map((team) => team.teamName)).toEqual([
        'Team B',
        'Team A',
        'Team C',
      ]);
    });

    it('should reject invalid standings tie-breaker configuration', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        competition: {
          standingsTieBreakers: [
            'GOAL_DIFFERENCE',
            'POINTS',
            'GOAL_DIFFERENCE',
          ],
        },
        teams: [
          { id: 1, name: 'Team A' },
        ],
        matches: [],
      });

      await expect(
        service.getStandings(1),
      ).rejects.toThrow(
        'Invalid standings tie-breaker configuration',
      );
    });
  });
});
