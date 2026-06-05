import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
  return this.prisma.player.findMany({
    include: {
      team: true,
    },
  });
}

  findOne(id: number) {
  return this.prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
    },
  });
}

  create(data: { name: string; goals: number; teamId?: number }) {
  return this.prisma.player.create({
    data,
  });
}

  update(id: number, data: { name?: string; goals?: number }) {
    return this.prisma.player.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.player.delete({
      where: { id },
    });
  }
}