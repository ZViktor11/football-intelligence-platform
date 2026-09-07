import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    const season = await this.prisma.season.findUnique({
      where: {
        id: createTeamDto.seasonId,
      },
    });

    if (!season) {
      throw new NotFoundException(
        `Season with ID ${createTeamDto.seasonId} not found`,
      );
    }

    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        city: createTeamDto.city,
        seasonId: createTeamDto.seasonId,
      },
    });
  }
  findAll() {
  return this.prisma.team.findMany({
    include: {
      season: {
        include: {
          competition: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
}