import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureMatchIsEditable(status: string) {
    const editableStatuses = ['LIVE', 'HALF_TIME'];

    if (!editableStatuses.includes(status)) {
      throw new BadRequestException(
        `Match events cannot be modified while match status is ${status}`,
      );
    }
  }

  async findByMatch(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: [
        { minute: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        player: true,
      },
    });
  }

  async create(data: {
    type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
    minute?: number;
    matchId: number;
    playerId?: number;
  }) {
    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    this.ensureMatchIsEditable(match.status);

    if (data.playerId) {
      const player = await this.prisma.player.findUnique({
        where: { id: data.playerId },
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const playerBelongsToMatch =
        player.teamId === match.homeTeamId ||
        player.teamId === match.awayTeamId;

      if (!playerBelongsToMatch) {
        throw new BadRequestException(
          'Player does not belong to either team in this match',
        );
      }
    }

    return this.prisma.matchEvent.create({
      data: {
        type: data.type,
        minute: data.minute,
        matchId: data.matchId,
        playerId: data.playerId,
      },
    });
  }

  async update(
    id: number,
    data: {
      type?: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
      minute?: number;
      playerId?: number;
    },
  ) {
    const event = await this.prisma.matchEvent.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Match event not found');
    }

    this.ensureMatchIsEditable(event.match.status);

    if (data.playerId) {
      const player = await this.prisma.player.findUnique({
        where: { id: data.playerId },
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const playerBelongsToMatch =
        player.teamId === event.match.homeTeamId ||
        player.teamId === event.match.awayTeamId;

      if (!playerBelongsToMatch) {
        throw new BadRequestException(
          'Player does not belong to either team in this match',
        );
      }
    }

    return this.prisma.matchEvent.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const event = await this.prisma.matchEvent.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Match event not found');
    }

    this.ensureMatchIsEditable(event.match.status);

    return this.prisma.matchEvent.delete({
      where: { id },
    });
  }
}