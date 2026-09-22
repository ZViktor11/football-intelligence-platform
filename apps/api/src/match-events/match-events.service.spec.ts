import { Test, TestingModule } from '@nestjs/testing';
import { MatchEventsService } from './match-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';

describe('MatchEventsService', () => {
  let service: MatchEventsService;

  const prismaMock = {
    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    matchEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

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

    prismaMock.match.update.mockResolvedValue({
      id: 1,
      homeScore: 0,
      awayScore: 0,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('event minute', () => {
    it('should use the current match minute when minute is omitted', async () => {
      matchesServiceMock.calculateMatchClock.mockReturnValue({
        matchMinute: 23,
        clockDisplay: "23'",
      });

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 1,
          ...data,
        }),
      );

      const event = await service.create({
        type: 'GOAL',
        matchId: 1,
        teamId: 1,
      });

      expect(
        matchesServiceMock.calculateMatchClock,
      ).toHaveBeenCalled();

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

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 2,
          ...data,
        }),
      );

      const event = await service.create({
        type: 'GOAL',
        minute: 24,
        matchId: 1,
        teamId: 1,
      });

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

      prismaMock.matchEvent.create.mockImplementation(
        async ({ data }) => ({
          id: 3,
          ...data,
        }),
      );

      const event = await service.create({
        type: 'GOAL',
        matchId: 1,
        teamId: 1,
      });

      expect(prismaMock.matchEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          minute: 45,
        }),
      });

      expect(event.minute).toBe(45);
    });
  });
});