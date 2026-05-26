import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.player.findMany();
  }

  findOne(id: number) {
    return this.prisma.player.findUnique({
      where: { id },
    });
  }

  create(data: { name: string; goals: number }) {
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