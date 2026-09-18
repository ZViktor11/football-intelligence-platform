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

  private async ensurePlayerIsSelectedForMatch(
    matchId: number,
    teamId: number,
    playerId: number,
  ) {
    const squadEntry =
      await this.prisma.matchSquadPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId,
          },
        },
      });

    if (
      !squadEntry ||
      squadEntry.teamId !== teamId
    ) {
      throw new BadRequestException(
        'Player is not selected for this match',
      );
    }
  }

  private async getPlayersOnPitchAtMinute(
    matchId: number,
    teamId: number,
    minute: number,
    excludedEventId?: number,
  ) {
    const squad =
      await this.prisma.matchSquadPlayer.findMany({
        where: {
          matchId,
          teamId,
        },
      });

    const onPitch = new Set<number>();

    for (const squadPlayer of squad) {
      if (squadPlayer.role === 'STARTER') {
        onPitch.add(squadPlayer.playerId);
      }
    }

    const substitutions =
      await this.prisma.matchEvent.findMany({
        where: {
          matchId,
          teamId,
          type: 'SUBSTITUTION',
          minute: {
            lte: minute,
          },
          ...(excludedEventId !== undefined
            ? {
                id: {
                  not: excludedEventId,
                },
              }
            : {}),
        },
        orderBy: [
          {
            minute: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      });

    for (const substitution of substitutions) {
      if (substitution.playerOutId !== null) {
        onPitch.delete(
          substitution.playerOutId,
        );
      }

      if (substitution.playerInId !== null) {
        onPitch.add(
          substitution.playerInId,
        );
      }
    }

    return onPitch;
  }

  private async validateGoal(
    matchId: number,
    minute: number | undefined,
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
    excludedEventId?: number,
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
      if (minute === undefined) {
        throw new BadRequestException(
          'A goal with a scorer must have a minute',
        );
      }

      const player = await this.getPlayer(playerId);

      if (player.teamId !== teamId) {
        throw new BadRequestException(
          'Goal scorer does not belong to the selected team',
        );
      }

      await this.ensurePlayerIsSelectedForMatch(
        matchId,
        teamId,
        playerId,
      );

      const playersOnPitch =
        await this.getPlayersOnPitchAtMinute(
          matchId,
          teamId,
          minute,
          excludedEventId,
        );

      if (!playersOnPitch.has(playerId)) {
        throw new BadRequestException(
          'Goal scorer is not on the pitch at this minute',
        );
      }
    }
  }

  private async validateCard(
    matchId: number,
    minute: number | undefined,
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
  ) {
    if (minute === undefined) {
      throw new BadRequestException(
        'A card must have a minute',
      );
    }

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

      await this.ensurePlayerIsSelectedForMatch(
        matchId,
        teamId,
        playerId,
      );
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
    matchId: number,
    minute: number | undefined,
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
    playerOutId: number | undefined,
    playerInId: number | undefined,
    excludedEventId?: number,
  ) {
    if (minute === undefined) {
      throw new BadRequestException(
        'A substitution must have a minute',
      );
    }

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

    const playerOutSquadEntry =
      await this.prisma.matchSquadPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId: playerOutId,
          },
        },
      });

    if (
      !playerOutSquadEntry ||
      playerOutSquadEntry.teamId !== teamId
    ) {
      throw new BadRequestException(
        'Player leaving the field is not selected for this match',
      );
    }

    const playerInSquadEntry =
      await this.prisma.matchSquadPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId: playerInId,
          },
        },
      });

    if (
      !playerInSquadEntry ||
      playerInSquadEntry.teamId !== teamId
    ) {
      throw new BadRequestException(
        'Player entering the field is not selected for this match',
      );
    }

    const playersOnPitch =
      await this.getPlayersOnPitchAtMinute(
        matchId,
        teamId,
        minute,
        excludedEventId,
      );

    if (!playersOnPitch.has(playerOutId)) {
      throw new BadRequestException(
        'Player leaving the field is not currently on the pitch',
      );
    }

    if (playersOnPitch.has(playerInId)) {
      throw new BadRequestException(
        'Player entering the field is already on the pitch',
      );
    }
  }

  private async validateEvent(
    matchId: number,
    type: EventType,
    minute: number | undefined,
    teamId: number | undefined,
    playerId: number | undefined,
    staffMemberId: number | undefined,
    playerOutId: number | undefined,
    playerInId: number | undefined,
    excludedEventId?: number,
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
        matchId,
        minute,
        teamId,
        playerId,
        staffMemberId,
        excludedEventId,
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
        matchId,
        minute,
        teamId,
        playerId,
        staffMemberId,
      );

      return;
    }

    await this.validateSubstitution(
      matchId,
      minute,
      teamId,
      playerId,
      staffMemberId,
      playerOutId,
      playerInId,
      excludedEventId,
    );
  }

  private async recalculateScore(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(
        'Match not found',
      );
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
    const match =
      await this.prisma.match.findUnique({
        where: { id: matchId },
      });

    if (!match) {
      throw new NotFoundException(
        'Match not found',
      );
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
    const match =
      await this.prisma.match.findUnique({
        where: { id: data.matchId },
      });

    if (!match) {
      throw new NotFoundException(
        'Match not found',
      );
    }

    this.ensureMatchIsEditable(
      match.status,
    );

    this.validateMinute(
      data.minute,
    );

    this.validateTeamBelongsToMatch(
      data.teamId,
      match.homeTeamId,
      match.awayTeamId,
    );

    await this.validateEvent(
      data.matchId,
      data.type,
      data.minute,
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
          staffMemberId:
            data.staffMemberId,
          playerOutId:
            data.playerOutId,
          playerInId:
            data.playerInId,
        },
      });

    await this.recalculateScore(
      data.matchId,
    );

    return event;
  }

  async update(
    id: number,
    data: {
      type?: EventType;
      minute?: number | null;
      teamId?: number | null;
      playerId?: number | null;
      staffMemberId?: number | null;
      playerOutId?: number | null;
      playerInId?: number | null;
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

    if (data.minute !== null) {
      this.validateMinute(data.minute);
    }

    const finalType =
      data.type ?? event.type;

    const finalMinute =
      data.minute === undefined
        ? event.minute ?? undefined
        : data.minute ?? undefined;

    const finalTeamId =
      data.teamId === undefined
        ? event.teamId ?? undefined
        : data.teamId ?? undefined;

    const finalPlayerId =
      data.playerId === undefined
        ? event.playerId ?? undefined
        : data.playerId ?? undefined;

    const finalStaffMemberId =
      data.staffMemberId === undefined
        ? event.staffMemberId ?? undefined
        : data.staffMemberId ?? undefined;

    const finalPlayerOutId =
      data.playerOutId === undefined
        ? event.playerOutId ?? undefined
        : data.playerOutId ?? undefined;

    const finalPlayerInId =
      data.playerInId === undefined
        ? event.playerInId ?? undefined
        : data.playerInId ?? undefined;

    this.validateTeamBelongsToMatch(
      finalTeamId,
      event.match.homeTeamId,
      event.match.awayTeamId,
    );

    await this.validateEvent(
      event.matchId,
      finalType,
      finalMinute,
      finalTeamId,
      finalPlayerId,
      finalStaffMemberId,
      finalPlayerOutId,
      finalPlayerInId,
      event.id,
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