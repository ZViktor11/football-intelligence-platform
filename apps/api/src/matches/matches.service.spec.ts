import { Test, TestingModule } from '@nestjs/testing';
import { MatchStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;

  const prismaMock = {
  match: {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
},
  season: {
    findUnique: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
  },
};

  beforeEach(async () => {

    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('match clock', () => {
    it("should display 1' at first-half kickoff", () => {
      const now = new Date('2026-09-21T16:00:00.000Z');

      jest.useFakeTimers();
      jest.setSystemTime(now);

      const result = (service as any).calculateMatchClock(
        MatchStatus.LIVE,
        now,
        null,
        45,
      );

      expect(result).toEqual({
        matchMinute: 1,
        clockDisplay: "1'",
      });
    });

    it("should display 45+1' after 45 full minutes of the first half", () => {
      const startedAt = new Date('2026-09-21T16:00:00.000Z');

      jest.useFakeTimers();
      jest.setSystemTime(
        new Date('2026-09-21T16:45:00.000Z'),
      );

      const result = (service as any).calculateMatchClock(
        MatchStatus.LIVE,
        startedAt,
        null,
        45,
      );

      expect(result).toEqual({
        matchMinute: 46,
        clockDisplay: "45+1'",
      });
    });

    it('should display HT at half-time', () => {
      const result = (service as any).calculateMatchClock(
        MatchStatus.HALF_TIME,
        new Date('2026-09-21T16:00:00.000Z'),
        null,
        45,
      );

      expect(result).toEqual({
        matchMinute: 45,
        clockDisplay: 'HT',
      });
    });

    it("should display 46' at second-half kickoff", () => {
      const secondHalfStartedAt = new Date(
        '2026-09-21T17:00:00.000Z',
      );

      jest.useFakeTimers();
      jest.setSystemTime(secondHalfStartedAt);

      const result = (service as any).calculateMatchClock(
        MatchStatus.LIVE,
        new Date('2026-09-21T16:00:00.000Z'),
        secondHalfStartedAt,
        45,
      );

      expect(result).toEqual({
        matchMinute: 46,
        clockDisplay: "46'",
      });
    });

    it("should display 90+1' after 45 full minutes of the second half", () => {
      const secondHalfStartedAt = new Date(
        '2026-09-21T17:00:00.000Z',
      );

      jest.useFakeTimers();
      jest.setSystemTime(
        new Date('2026-09-21T17:45:00.000Z'),
      );

      const result = (service as any).calculateMatchClock(
        MatchStatus.LIVE,
        new Date('2026-09-21T16:00:00.000Z'),
        secondHalfStartedAt,
        45,
      );

      expect(result).toEqual({
        matchMinute: 91,
        clockDisplay: "90+1'",
      });
    });

    it('should display FT when the match is finished', () => {
      const result = (service as any).calculateMatchClock(
        MatchStatus.FINISHED,
        new Date('2026-09-21T16:00:00.000Z'),
        new Date('2026-09-21T17:00:00.000Z'),
        45,
      );

      expect(result).toEqual({
        matchMinute: 90,
        clockDisplay: 'FT',
      });
    });

    it('should respect a custom half duration', () => {
      const secondHalfStartedAt = new Date(
        '2026-09-21T17:00:00.000Z',
      );

      jest.useFakeTimers();
      jest.setSystemTime(secondHalfStartedAt);

      const result = (service as any).calculateMatchClock(
        MatchStatus.LIVE,
        new Date('2026-09-21T16:00:00.000Z'),
        secondHalfStartedAt,
        20,
      );

      expect(result).toEqual({
        matchMinute: 21,
        clockDisplay: "21'",
      });
    });
  });
  describe('match status lifecycle', () => {
  const matchBase = {
    id: 1,
    actualStartedAt: null,
    firstHalfEndedAt: null,
    secondHalfStartedAt: null,
    actualEndedAt: null,
  };

  it('should allow SCHEDULED -> PRE_MATCH', async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.SCHEDULED,
    });

    prismaMock.match.update.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.PRE_MATCH,
    });

    await service.updateStatus(1, MatchStatus.PRE_MATCH);

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: MatchStatus.PRE_MATCH,
      },
    });
  });

  it('should reject SCHEDULED -> LIVE', async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.SCHEDULED,
    });

    await expect(
      service.updateStatus(1, MatchStatus.LIVE),
    ).rejects.toThrow(
      'Invalid match status transition: SCHEDULED -> LIVE',
    );

    expect(prismaMock.match.update).not.toHaveBeenCalled();
  });

  it('should allow PRE_MATCH -> LIVE and set actualStartedAt', async () => {
    const now = new Date('2026-10-02T08:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.PRE_MATCH,
    });

    prismaMock.match.update.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.LIVE,
      actualStartedAt: now,
    });

    await service.updateStatus(1, MatchStatus.LIVE);

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: MatchStatus.LIVE,
        actualStartedAt: now,
      },
    });
  });

  it('should allow LIVE -> HALF_TIME and set firstHalfEndedAt', async () => {
    const now = new Date('2026-10-02T08:45:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.LIVE,
      actualStartedAt: new Date('2026-10-02T08:00:00.000Z'),
    });

    prismaMock.match.update.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.HALF_TIME,
      firstHalfEndedAt: now,
    });

    await service.updateStatus(1, MatchStatus.HALF_TIME);

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: MatchStatus.HALF_TIME,
        firstHalfEndedAt: now,
      },
    });
  });

  it('should allow HALF_TIME -> LIVE and set secondHalfStartedAt', async () => {
    const now = new Date('2026-10-02T09:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.HALF_TIME,
      actualStartedAt: new Date('2026-10-02T08:00:00.000Z'),
      firstHalfEndedAt: new Date('2026-10-02T08:45:00.000Z'),
    });

    prismaMock.match.update.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.LIVE,
      secondHalfStartedAt: now,
    });

    await service.updateStatus(1, MatchStatus.LIVE);

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: MatchStatus.LIVE,
        secondHalfStartedAt: now,
      },
    });
  });

  it('should allow LIVE -> FINISHED and set actualEndedAt', async () => {
    const now = new Date('2026-10-02T09:45:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.LIVE,
      actualStartedAt: new Date('2026-10-02T08:00:00.000Z'),
      firstHalfEndedAt: new Date('2026-10-02T08:45:00.000Z'),
      secondHalfStartedAt: new Date('2026-10-02T09:00:00.000Z'),
    });

    prismaMock.match.update.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.FINISHED,
      actualEndedAt: now,
    });

    await service.updateStatus(1, MatchStatus.FINISHED);

    expect(prismaMock.match.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: MatchStatus.FINISHED,
        actualEndedAt: now,
      },
    });
  });

  it('should reject FINISHED -> LIVE', async () => {
    prismaMock.match.findUnique.mockResolvedValue({
      ...matchBase,
      status: MatchStatus.FINISHED,
    });

    await expect(
      service.updateStatus(1, MatchStatus.LIVE),
    ).rejects.toThrow(
      'Invalid match status transition: FINISHED -> LIVE',
    );

    expect(prismaMock.match.update).not.toHaveBeenCalled();
  });

  it('should reject a status update when the match does not exist', async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus(999, MatchStatus.PRE_MATCH),
    ).rejects.toThrow('Match not found');

    expect(prismaMock.match.update).not.toHaveBeenCalled();
  });
});
  describe('match creation', () => {
    const createMatchDto = {
      date: '2026-11-01T16:00:00.000Z',
      homeTeamId: 1,
      awayTeamId: 2,
      seasonId: 1,
    };

    it('should create a valid match', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        name: '2026/27',
      });

      prismaMock.team.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Szeged FC',
          seasonId: 1,
        },
        {
          id: 2,
          name: 'Budapest FC',
          seasonId: 1,
        },
      ]);

      prismaMock.match.create.mockResolvedValue({
        id: 11,
        ...createMatchDto,
        date: new Date(createMatchDto.date),
        status: MatchStatus.SCHEDULED,
      });

      await service.create(createMatchDto);

      expect(prismaMock.match.create).toHaveBeenCalledWith({
        data: {
          date: new Date(createMatchDto.date),
          homeTeamId: 1,
          awayTeamId: 2,
          seasonId: 1,
        },
      });
    });

    it('should reject a match with the same home and away team', async () => {
      await expect(
        service.create({
          ...createMatchDto,
          awayTeamId: 1,
        }),
      ).rejects.toThrow(
        'Home team and away team must be different',
      );

      expect(
        prismaMock.season.findUnique,
      ).not.toHaveBeenCalled();

      expect(
        prismaMock.match.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a match when the season does not exist', async () => {
      prismaMock.season.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createMatchDto),
      ).rejects.toThrow(
        'Season with ID 1 not found',
      );

      expect(
        prismaMock.match.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a match when one or both teams do not exist', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        name: '2026/27',
      });

      prismaMock.team.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Szeged FC',
          seasonId: 1,
        },
      ]);

      await expect(
        service.create(createMatchDto),
      ).rejects.toThrow(
        'One or both teams were not found',
      );

      expect(
        prismaMock.match.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a match when a team belongs to another season', async () => {
      prismaMock.season.findUnique.mockResolvedValue({
        id: 1,
        name: '2026/27',
      });

      prismaMock.team.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Szeged FC',
          seasonId: 1,
        },
        {
          id: 2,
          name: 'Budapest FC',
          seasonId: 2,
        },
      ]);

      await expect(
        service.create(createMatchDto),
      ).rejects.toThrow(
        'Both teams must belong to the selected season',
      );

      expect(
        prismaMock.match.create,
      ).not.toHaveBeenCalled();
    });
  });
  describe('findOne', () => {
  it('should return a match with its calculated clock', async () => {
    const startedAt = new Date('2026-10-02T10:00:00.000Z');

    jest.useFakeTimers();
    jest.setSystemTime(
      new Date('2026-10-02T10:10:00.000Z'),
    );

    prismaMock.match.findUnique.mockResolvedValue({
      id: 1,
      date: new Date('2026-10-02T10:00:00.000Z'),
      status: MatchStatus.LIVE,
      actualStartedAt: startedAt,
      firstHalfEndedAt: null,
      secondHalfStartedAt: null,
      actualEndedAt: null,
      homeScore: 0,
      awayScore: 0,
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
        competition: {
          id: 1,
          halfDurationMinutes: 45,
        },
      },
      events: [],
    });

    const result = await service.findOne(1);

    expect(result.matchMinute).toBe(11);
    expect(result.clockDisplay).toBe("11'");

    expect(prismaMock.match.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: {
          include: {
            competition: true,
          },
        },
        events: {
          include: {
            player: true,
          },
          orderBy: [
            { minute: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });
  });

  it('should reject when the match does not exist', async () => {
    prismaMock.match.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne(999),
    ).rejects.toThrow(
      'Match with ID 999 not found',
    );
  });
});
});