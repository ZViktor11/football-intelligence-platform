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

  private validateMinute(minute?: number) {
    if (
      minute !== undefined &&
      (minute < 0 || minute > 120)
    ) {
      throw new BadRequestException(
        'Match event minute must be between 0 and 120',
      );
    }
  }

  private validateTeamBelongsToMatch(
    teamId: number | undefined,
    homeTeamId: number,
    awayTeamId: number,
  ) {
    if (teamId === undefined) {
      return;
    }

    const teamBelongsToMatch =
      teamId === homeTeamId ||
      teamId === awayTeamId;

    if (!teamBelongsToMatch) {
      throw new BadRequestException(
        'Team does not belong to this match',
      );
    }
  }

  private async validatePlayer(
    playerId: number | undefined,
    teamId: number | undefined,
    homeTeamId: number,
    awayTeamId: number,
  ) {
    if (playerId === undefined) {
      return;
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const playerBelongsToMatch =
      player.teamId === homeTeamId ||
      player.teamId === awayTeamId;

    if (!playerBelongsToMatch) {
      throw new BadRequestException(
        'Player does not belong to either team in this match',
      );
    }

    if (
      teamId !== undefined &&
      player.teamId !== teamId
    ) {
      throw new BadRequestException(
        'Player does not belong to the selected team',
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
    });

    let homeScore = 0;
    let awayScore = 0;

    for (const goal of goalEvents) {
      if (goal.teamId === match.homeTeamId) {
        homeScore++;
      } else if (goal.teamId === match.awayTeamId) {
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
        team: true,
        player: true,
      },
    });
  }

  async create(data: {
    type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
    minute?: number;
    matchId: number;
    teamId?: number;
    playerId?: number;
  }) {
    const match = await this.prisma.match.findUnique({
      where: { id: data.matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    this.ensureMatchIsEditable(match.status);

    this.validateMinute(data.minute);

    this.validateTeamBelongsToMatch(
      data.teamId,
      match.homeTeamId,
      match.awayTeamId,
    );

    if (
      data.type === 'GOAL' &&
      data.teamId === undefined
    ) {
      throw new BadRequestException(
        'A goal must have a team',
      );
    }

    await this.validatePlayer(
      data.playerId,
      data.teamId,
      match.homeTeamId,
      match.awayTeamId,
    );

    const event = await this.prisma.matchEvent.create({
      data: {
        type: data.type,
        minute: data.minute,
        matchId: data.matchId,
        teamId: data.teamId,
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
      teamId?: number;
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

    this.validateMinute(data.minute);

    const finalType = data.type ?? event.type;
    const finalTeamId =
      data.teamId ?? event.teamId ?? undefined;
    const finalPlayerId =
      data.playerId ?? event.playerId ?? undefined;

    this.validateTeamBelongsToMatch(
      finalTeamId,
      event.match.homeTeamId,
      event.match.awayTeamId,
    );

    if (
      finalType === 'GOAL' &&
      finalTeamId === undefined
    ) {
      throw new BadRequestException(
        'A goal must have a team',
      );
    }

    await this.validatePlayer(
      finalPlayerId,
      finalTeamId,
      event.match.homeTeamId,
      event.match.awayTeamId,
    );

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