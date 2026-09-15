import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type EventType =
  | 'GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION';

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

    if (
      teamId !== homeTeamId &&
      teamId !== awayTeamId
    ) {
      throw new BadRequestException(
        'Team does not belong to this match',
      );
    }
  }

  private async getPlayer(playerId: number) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  private async getStaffMember(staffMemberId: number) {
    const staffMember =
      await this.prisma.staffMember.findUnique({
        where: { id: staffMemberId },
      });

    if (!staffMember) {
      throw new NotFoundException(
        'Staff member not found',
      );
    }

    return staffMember;
  }

  private async validateGoal(
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
  ) {
    if (teamId === undefined) {
      throw new BadRequestException(
        'A goal must have a team',
      );
    }

    if (staffMemberId !== undefined) {
      throw new BadRequestException(
        'A goal cannot have a staff member as recipient',
      );
    }

    if (playerId !== undefined) {
      const player = await this.getPlayer(playerId);

      if (player.teamId !== teamId) {
        throw new BadRequestException(
          'Goal scorer does not belong to the selected team',
        );
      }
    }
  }

  private async validateCard(
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
  ) {
    if (teamId === undefined) {
      throw new BadRequestException(
        'A card must have a team',
      );
    }

    const hasPlayer = playerId !== undefined;
    const hasStaff = staffMemberId !== undefined;

    if (!hasPlayer && !hasStaff) {
      throw new BadRequestException(
        'A card must have a player or staff member recipient',
      );
    }

    if (hasPlayer && hasStaff) {
      throw new BadRequestException(
        'A card cannot have both a player and staff member recipient',
      );
    }

    if (playerId !== undefined) {
      const player = await this.getPlayer(playerId);

      if (player.teamId !== teamId) {
        throw new BadRequestException(
          'Carded player does not belong to the selected team',
        );
      }
    }

    if (staffMemberId !== undefined) {
      const staffMember =
        await this.getStaffMember(staffMemberId);

      if (staffMember.teamId !== teamId) {
        throw new BadRequestException(
          'Carded staff member does not belong to the selected team',
        );
      }
    }
  }

  private async validateSubstitution(
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
    playerOutId: number | undefined,
    playerInId: number | undefined,
  ) {
    if (teamId === undefined) {
      throw new BadRequestException(
        'A substitution must have a team',
      );
    }

    if (playerId !== undefined) {
      throw new BadRequestException(
        'playerId cannot be used for substitutions',
      );
    }

    if (staffMemberId !== undefined) {
      throw new BadRequestException(
        'staffMemberId cannot be used for substitutions',
      );
    }

    if (playerOutId === undefined) {
      throw new BadRequestException(
        'A substitution must have a player leaving the field',
      );
    }

    if (playerInId === undefined) {
      throw new BadRequestException(
        'A substitution must have a player entering the field',
      );
    }

    if (playerOutId === playerInId) {
      throw new BadRequestException(
        'Substitution players must be different',
      );
    }

    const playerOut =
      await this.getPlayer(playerOutId);
    const playerIn =
      await this.getPlayer(playerInId);

    if (playerOut.teamId !== teamId) {
      throw new BadRequestException(
        'Player leaving the field does not belong to the selected team',
      );
    }

    if (playerIn.teamId !== teamId) {
      throw new BadRequestException(
        'Player entering the field does not belong to the selected team',
      );
    }
  }

  private async validateEvent(
    type: EventType,
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
    playerOutId: number | undefined,
    playerInId: number | undefined,
  ) {
    if (type === 'GOAL') {
      if (
        playerOutId !== undefined ||
        playerInId !== undefined
      ) {
        throw new BadRequestException(
          'Substitution players can only be used for substitutions',
        );
      }

      await this.validateGoal(
        teamId,
        playerId,
        staffMemberId,
      );

      return;
    }

    if (
      type === 'YELLOW_CARD' ||
      type === 'RED_CARD'
    ) {
      if (
        playerOutId !== undefined ||
        playerInId !== undefined
      ) {
        throw new BadRequestException(
          'Substitution players can only be used for substitutions',
        );
      }

      await this.validateCard(
        teamId,
        playerId,
        staffMemberId,
      );

      return;
    }

    await this.validateSubstitution(
      teamId,
      playerId,
      staffMemberId,
      playerOutId,
      playerInId,
    );
  }

  private async recalculateScore(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const goalEvents =
      await this.prisma.matchEvent.findMany({
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
      } else if (
        goal.teamId === match.awayTeamId
      ) {
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
      orderBy: [
        { minute: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        team: true,
        player: true,
        staffMember: true,
        playerOut: true,
        playerIn: true,
      },
    });
  }

  async create(data: {
    type: EventType;
    minute?: number;
    matchId: number;
    teamId?: number;
    playerId?: number;
    staffMemberId?: number;
    playerOutId?: number;
    playerInId?: number;
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

    await this.validateEvent(
      data.type,
      data.teamId,
      data.playerId,
      data.staffMemberId,
      data.playerOutId,
      data.playerInId,
    );

    const event =
      await this.prisma.matchEvent.create({
        data: {
          type: data.type,
          minute: data.minute,
          matchId: data.matchId,
          teamId: data.teamId,
          playerId: data.playerId,
          staffMemberId: data.staffMemberId,
          playerOutId: data.playerOutId,
          playerInId: data.playerInId,
        },
      });

    await this.recalculateScore(data.matchId);

    return event;
  }

  async update(
    id: number,
    data: {
      type?: EventType;
      minute?: number;
      teamId?: number;
      playerId?: number;
      staffMemberId?: number;
      playerOutId?: number;
      playerInId?: number;
    },
  ) {
    const event =
      await this.prisma.matchEvent.findUnique({
        where: { id },
        include: {
          match: true,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Match event not found',
      );
    }

    this.ensureMatchIsEditable(
      event.match.status,
    );

    this.validateMinute(data.minute);

    const finalType =
      data.type ?? event.type;
    const finalTeamId =
      data.teamId ?? event.teamId ?? undefined;
    const finalPlayerId =
      data.playerId ?? event.playerId ?? undefined;
    const finalStaffMemberId =
      data.staffMemberId ??
      event.staffMemberId ??
      undefined;
    const finalPlayerOutId =
      data.playerOutId ??
      event.playerOutId ??
      undefined;
    const finalPlayerInId =
      data.playerInId ??
      event.playerInId ??
      undefined;

    this.validateTeamBelongsToMatch(
      finalTeamId,
      event.match.homeTeamId,
      event.match.awayTeamId,
    );

    await this.validateEvent(
      finalType,
      finalTeamId,
      finalPlayerId,
      finalStaffMemberId,
      finalPlayerOutId,
      finalPlayerInId,
    );

    const updatedEvent =
      await this.prisma.matchEvent.update({
        where: { id },
        data,
      });

    await this.recalculateScore(
      event.matchId,
    );

    return updatedEvent;
  }

  async remove(id: number) {
    const event =
      await this.prisma.matchEvent.findUnique({
        where: { id },
        include: {
          match: true,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Match event not found',
      );
    }

    this.ensureMatchIsEditable(
      event.match.status,
    );

    const deletedEvent =
      await this.prisma.matchEvent.delete({
        where: { id },
      });

    await this.recalculateScore(
      event.matchId,
    );

    return deletedEvent;
  }
}