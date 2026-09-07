import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPlayerDto: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
        birthDate: createPlayerDto.birthDate
          ? new Date(createPlayerDto.birthDate)
          : undefined,
        position: createPlayerDto.position,
        teamId: createPlayerDto.teamId,
      },
    });
  }

  findAll() {
  return this.prisma.player.findMany({
    include: {
      team: true,
    },
  });
}

async findOne(id: number) {
  const player = await this.prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
    },
  });

  if (!player) {
    throw new NotFoundException(`Player with ID ${id} not found`);
  }

  return player;
}
}