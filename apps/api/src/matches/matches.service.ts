import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Match,
  MatchStatus,
  PossessionSide,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import {
  MatchStatisticsSettingsDto,
  ShotDeltaDto,
} from './dto/update-match-statistics.dto';
import { possessionTotals, statisticsView } from './match-statistics';

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
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
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

    const invalidTeam = teams.find((team) => team.seasonId !== seasonId);

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
          orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
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
      statistics: statisticsView(match),
    };
  }

  private async statisticsMatch(id: number) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  private async updateWithStatisticsVersion(
    match: Match,
    data: Prisma.MatchUpdateInput,
  ) {
    try {
      const updated = await this.prisma.match.update({
        where: {
          id: match.id,
          statisticsVersion: match.statisticsVersion,
          status: match.status,
        },
        data: { ...data, statisticsVersion: { increment: 1 } },
      });
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Match changed; refresh and retry');
      }
      throw error;
    }
  }

  private async updateStatistics(match: Match, data: Prisma.MatchUpdateInput) {
    return statisticsView(await this.updateWithStatisticsVersion(match, data));
  }

  async configureStatistics(id: number, settings: MatchStatisticsSettingsDto) {
    const match = await this.statisticsMatch(id);
    if (
      match.status !== MatchStatus.SCHEDULED &&
      match.status !== MatchStatus.PRE_MATCH
    ) {
      throw new BadRequestException(
        'Statistics settings are locked after kickoff',
      );
    }
    return this.updateStatistics(match, settings);
  }

  async recordShot(id: number, { side, delta }: ShotDeltaDto) {
    const match = await this.statisticsMatch(id);
    if (
      !match.shotsOnTargetEnabled ||
      ![MatchStatus.LIVE, MatchStatus.HALF_TIME].some(
        (status) => status === match.status,
      )
    ) {
      throw new BadRequestException('Shots on target are not editable');
    }
    const field =
      side === PossessionSide.HOME ? 'homeShotsOnTarget' : 'awayShotsOnTarget';
    if (match[field] + delta < 0)
      throw new BadRequestException('Shot count cannot be negative');
    return this.updateStatistics(match, { [field]: { increment: delta } });
  }

  async recordPossession(id: number, side: PossessionSide | null) {
    const match = await this.statisticsMatch(id);
    if (!match.possessionEnabled || match.status !== MatchStatus.LIVE) {
      throw new BadRequestException('Possession is not editable');
    }
    const now = new Date();
    return this.updateStatistics(match, {
      ...possessionTotals(match, now),
      possessionSide: side,
      possessionStartedAt: side ? now : null,
    });
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

    if (
      match.status === MatchStatus.LIVE &&
      status === MatchStatus.FINISHED &&
      match.secondHalfStartedAt === null
    ) {
      throw new BadRequestException(
        'Cannot finish match before the second half has started',
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

    return this.updateWithStatisticsVersion(match, {
      status,
      ...(match.possessionEnabled &&
        status !== MatchStatus.LIVE && {
          ...possessionTotals(match, now),
          possessionSide: null,
          possessionStartedAt: null,
        }),

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
    });
  }

  calculateMatchClock(
    status: MatchStatus,
    actualStartedAt: Date | null,
    secondHalfStartedAt: Date | null,
    halfDurationMinutes: number,
  ) {
    if (status === MatchStatus.SCHEDULED || status === MatchStatus.PRE_MATCH) {
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

    if (status === MatchStatus.LIVE && secondHalfStartedAt) {
      const elapsedMinutes = this.getElapsedMinutes(secondHalfStartedAt);

      if (halfDurationMinutes + elapsedMinutes + 1 > 180) {
        return {
          matchMinute: null,
          clockDisplay: 'Clock unavailable',
        };
      }

      const matchMinute = halfDurationMinutes + elapsedMinutes + 1;

      return {
        matchMinute,
        clockDisplay: this.formatMatchMinute(
          matchMinute,
          halfDurationMinutes * 2,
        ),
      };
    }

    if (status === MatchStatus.LIVE && actualStartedAt) {
      const elapsedMinutes = this.getElapsedMinutes(actualStartedAt);

      if (elapsedMinutes + 1 > 180) {
        return {
          matchMinute: null,
          clockDisplay: 'Clock unavailable',
        };
      }

      const matchMinute = elapsedMinutes + 1;

      return {
        matchMinute,
        clockDisplay: this.formatMatchMinute(matchMinute, halfDurationMinutes),
      };
    }

    return {
      matchMinute: null,
      clockDisplay: null,
    };
  }

  private formatMatchMinute(matchMinute: number, regulationEndMinute: number) {
    if (matchMinute <= regulationEndMinute) {
      return `${matchMinute}'`;
    }

    const stoppageTime = matchMinute - regulationEndMinute;

    return `${regulationEndMinute}+${stoppageTime}'`;
  }

  private getElapsedMinutes(startedAt: Date) {
    const elapsedMilliseconds = Date.now() - startedAt.getTime();

    return Math.max(0, Math.floor(elapsedMilliseconds / 60000));
  }
}
