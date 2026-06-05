import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.event.create({
      data,
    });
  }

  findAll() {
    return this.prisma.event.findMany({
      include: {
        match: true,
        team: true,
        player: true,
      },
    });
  }
}