import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchReportStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchReportDto } from './dto/create-match-report.dto';

@Injectable()
export class MatchReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    data: CreateMatchReportDto,
    authorId: number,
  ) {
    const match =
      await this.prisma.match.findUnique({
        where: {
          id: data.matchId,
        },
      });

    if (!match) {
      throw new NotFoundException(
        'Match not found',
      );
    }

    if (match.status !== 'FINISHED') {
      throw new BadRequestException(
        'Match reports can only be created after the match is finished',
      );
    }

    return this.prisma.matchReport.create({
      data: {
        matchId: data.matchId,
        authorId,
        message: data.message.trim(),
      },
    });
  }

  async findAll() {
    return this.prisma.matchReport.findMany({
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByMatch(matchId: number) {
    const match =
      await this.prisma.match.findUnique({
        where: {
          id: matchId,
        },
        select: {
          id: true,
        },
      });

    if (!match) {
      throw new NotFoundException(
        'Match not found',
      );
    }

    return this.prisma.matchReport.findMany({
      where: {
        matchId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(
    id: number,
    status: MatchReportStatus,
    reviewedById: number,
  ) {
    const report =
      await this.prisma.matchReport.findUnique({
        where: {
          id,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Match report not found',
      );
    }

    if (status === MatchReportStatus.OPEN) {
      throw new BadRequestException(
        'A reviewed match report cannot be changed back to OPEN',
      );
    }

    return this.prisma.matchReport.update({
      where: {
        id,
      },
      data: {
        status,
        reviewedById,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}