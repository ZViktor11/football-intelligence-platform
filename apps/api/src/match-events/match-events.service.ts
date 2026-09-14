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

  private async recalculateScore(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const goalEvents = await this.prisma.matchEvent.findMany({
      where: {
        matchId,
        type: 'GOAL',
      },
      include: {
        player: true,
      },
    });

    let homeScore = 0;
    let awayScore = 0;

    for (const goal of goalEvents) {
      if (!goal.player) {
        continue;
      }

      if (goal.player.teamId === match.homeTeamId) {
        homeScore++;
      } else if (goal.player.teamId === match.awayTeamId) {
        awayScore++;
      }
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
      },
    });
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
      orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
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

    if (
      data.minute !== undefined &&
      (data.minute < 0 || data.minute > 120)
    ) {
      throw new BadRequestException(
        'Match event minute must be between 0 and 120',
      );
    }

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

    const event = await this.prisma.matchEvent.create({
      data: {
        type: data.type,
        minute: data.minute,
        matchId: data.matchId,
        playerId: data.playerId,
      },
    });

    await this.recalculateScore(data.matchId);

    return event;
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

    if (
      data.minute !== undefined &&
      (data.minute < 0 || data.minute > 120)
    ) {
      throw new BadRequestException(
        'Match event minute must be between 0 and 120',
      );
    }

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

    const updatedEvent = await this.prisma.matchEvent.update({
      where: { id },
      data,
    });

    await this.recalculateScore(event.matchId);

    return updatedEvent;
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

    const deletedEvent = await this.prisma.matchEvent.delete({
      where: { id },
    });

    await this.recalculateScore(event.matchId);

    return deletedEvent;
  }
}