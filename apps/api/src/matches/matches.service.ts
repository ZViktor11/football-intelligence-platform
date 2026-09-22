import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

interface MatchFilters {
  seasonId?: number;
  teamId?: number;
  status?: MatchStatus;
}

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMatchDto: CreateMatchDto) {
    const { date, homeTeamId, awayTeamId, seasonId } = createMatchDto;

    if (homeTeamId === awayTeamId) {
      throw new BadRequestException(
        'Home team and away team must be different',
      );
    }

    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      throw new NotFoundException(
        `Season with ID ${seasonId} not found`,
      );
    }

    const teams = await this.prisma.team.findMany({
      where: {
        id: {
          in: [homeTeamId, awayTeamId],
        },
      },
    });

    if (teams.length !== 2) {
      throw new NotFoundException('One or both teams were not found');
    }

    const invalidTeam = teams.find(
      (team) => team.seasonId !== seasonId,
    );

    if (invalidTeam) {
      throw new BadRequestException(
        'Both teams must belong to the selected season',
      );
    }

    return this.prisma.match.create({
      data: {
        date: new Date(date),
        homeTeamId,
        awayTeamId,
        seasonId,
      },
    });
  }

  async findAll(filters: MatchFilters = {}) {
    const { seasonId, teamId, status } = filters;

    return this.prisma.match.findMany({
      where: {
        ...(seasonId !== undefined && {
          seasonId,
        }),

        ...(status !== undefined && {
          status,
        }),

        ...(teamId !== undefined && {
          OR: [
            {
              homeTeamId: teamId,
            },
            {
              awayTeamId: teamId,
            },
          ],
        }),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        season: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const match = await this.prisma.match.findUnique({
      where: { id },
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

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    const clock = this.calculateMatchClock(
      match.status,
      match.actualStartedAt,
      match.secondHalfStartedAt,
      match.season.competition.halfDurationMinutes,
    );

    return {
      ...match,
      ...clock,
    };
  }

  async updateStatus(id: number, status: MatchStatus) {
    const match = await this.prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const allowedTransitions: Record<MatchStatus, MatchStatus[]> = {
      SCHEDULED: [MatchStatus.PRE_MATCH],
      PRE_MATCH: [MatchStatus.LIVE],
      LIVE: [MatchStatus.HALF_TIME, MatchStatus.FINISHED],
      HALF_TIME: [MatchStatus.LIVE],
      FINISHED: [],
    };

    const allowedNextStatuses = allowedTransitions[match.status];

    if (!allowedNextStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid match status transition: ${match.status} -> ${status}`,
      );
    }

    const now = new Date();

    const isFirstKickoff =
      match.status === MatchStatus.PRE_MATCH &&
      status === MatchStatus.LIVE &&
      match.actualStartedAt === null;

    const isHalfTime =
      match.status === MatchStatus.LIVE &&
      status === MatchStatus.HALF_TIME &&
      match.firstHalfEndedAt === null;

    const isSecondHalfKickoff =
      match.status === MatchStatus.HALF_TIME &&
      status === MatchStatus.LIVE &&
      match.secondHalfStartedAt === null;

    const isFullTime =
      match.status === MatchStatus.LIVE &&
      status === MatchStatus.FINISHED &&
      match.actualEndedAt === null;

    return this.prisma.match.update({
      where: { id },
      data: {
        status,

        ...(isFirstKickoff && {
          actualStartedAt: now,
        }),

        ...(isHalfTime && {
          firstHalfEndedAt: now,
        }),

        ...(isSecondHalfKickoff && {
          secondHalfStartedAt: now,
        }),

        ...(isFullTime && {
          actualEndedAt: now,
        }),
      },
    });
  }

  calculateMatchClock(
    status: MatchStatus,
    actualStartedAt: Date | null,
    secondHalfStartedAt: Date | null,
    halfDurationMinutes: number,
  ) {
    if (
      status === MatchStatus.SCHEDULED ||
      status === MatchStatus.PRE_MATCH
    ) {
      return {
        matchMinute: null,
        clockDisplay: null,
      };
    }

    if (status === MatchStatus.HALF_TIME) {
      return {
        matchMinute: halfDurationMinutes,
        clockDisplay: 'HT',
      };
    }

    if (status === MatchStatus.FINISHED) {
      return {
        matchMinute: halfDurationMinutes * 2,
        clockDisplay: 'FT',
      };
    }

    if (
      status === MatchStatus.LIVE &&
      secondHalfStartedAt
    ) {
      const elapsedMinutes = this.getElapsedMinutes(
        secondHalfStartedAt,
      );

      const matchMinute =
        halfDurationMinutes + elapsedMinutes + 1;

      return {
        matchMinute,
        clockDisplay: this.formatMatchMinute(
          matchMinute,
          halfDurationMinutes * 2,
        ),
      };
    }

    if (
      status === MatchStatus.LIVE &&
      actualStartedAt
    ) {
      const elapsedMinutes = this.getElapsedMinutes(
        actualStartedAt,
      );

      const matchMinute = elapsedMinutes + 1;

      return {
        matchMinute,
        clockDisplay: this.formatMatchMinute(
          matchMinute,
          halfDurationMinutes,
        ),
      };
    }

    return {
      matchMinute: null,
      clockDisplay: null,
    };
  }

  private formatMatchMinute(
    matchMinute: number,
    regulationEndMinute: number,
  ) {
    if (matchMinute <= regulationEndMinute) {
      return `${matchMinute}'`;
    }

    const stoppageTime =
      matchMinute - regulationEndMinute;

    return `${regulationEndMinute}+${stoppageTime}'`;
  }

  private getElapsedMinutes(startedAt: Date) {
    const elapsedMilliseconds =
      Date.now() - startedAt.getTime();

    return Math.max(
      0,
      Math.floor(elapsedMilliseconds / 60000),
    );
  }
}