import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSeasonDto: CreateSeasonDto) {
    const competition = await this.prisma.competition.findUnique({
      where: {
        id: createSeasonDto.competitionId,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${createSeasonDto.competitionId} not found`,
      );
    }

    return this.prisma.season.create({
      data: {
        name: createSeasonDto.name,
        competitionId: createSeasonDto.competitionId,
        startsAt: createSeasonDto.startsAt
          ? new Date(createSeasonDto.startsAt)
          : undefined,
        endsAt: createSeasonDto.endsAt
          ? new Date(createSeasonDto.endsAt)
          : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.season.findMany({
      include: {
        competition: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        competition: true,
        teams: true,
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(
        `Season with ID ${id} not found`,
      );
    }

    return season;
  }
}