import { Test, TestingModule } from '@nestjs/testing';
import { MatchStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;

  const prismaMock = {};

  beforeEach(async () => {
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
});