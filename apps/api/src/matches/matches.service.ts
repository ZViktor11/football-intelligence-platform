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

    return match;
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

    return this.prisma.match.update({
      where: { id },
      data: {
        status,
      },
    });
  }
}