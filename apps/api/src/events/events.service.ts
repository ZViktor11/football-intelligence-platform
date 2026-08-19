import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
  return this.prisma.$transaction(async (prisma) => {
    const event = await prisma.event.create({
      data: createEventDto,
    });

    if (createEventDto.type === 'GOAL') {
      if (!createEventDto.playerId || !createEventDto.teamId) {
        throw new Error('A goal event requires both playerId and teamId.');
      }

      const match = await prisma.match.findUnique({
        where: {
          id: createEventDto.matchId,
        },
      });

      if (!match) {
        throw new Error('Match not found.');
      }

      await prisma.player.update({
        where: {
          id: createEventDto.playerId,
        },
        data: {
          goals: {
            increment: 1,
          },
        },
      });

      if (match.homeTeamId === createEventDto.teamId) {
        await prisma.match.update({
          where: {
            id: createEventDto.matchId,
          },
          data: {
            homeScore: {
              increment: 1,
            },
          },
        });
      } else if (match.awayTeamId === createEventDto.teamId) {
        await prisma.match.update({
          where: {
            id: createEventDto.matchId,
          },
          data: {
            awayScore: {
              increment: 1,
            },
          },
        });
      } else {
        throw new Error('The selected team does not participate in this match.');
      }
    }

    return event;
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