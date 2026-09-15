import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchSquadPlayerDto } from './dto/create-match-squad-player.dto';

@Injectable()
export class MatchSquadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createMatchSquadPlayerDto: CreateMatchSquadPlayerDto,
  ) {
    const {
      matchId,
      teamId,
      playerId,
      role,
    } = createMatchSquadPlayerDto;

    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!match) {
      throw new NotFoundException(
        `Match with ID ${matchId} not found`,
      );
    }

    const teamBelongsToMatch =
      teamId === match.homeTeamId ||
      teamId === match.awayTeamId;

    if (!teamBelongsToMatch) {
      throw new BadRequestException(
        'Team does not belong to this match',
      );
    }

    const player = await this.prisma.player.findUnique({
      where: {
        id: playerId,
      },
    });

    if (!player) {
      throw new NotFoundException(
        `Player with ID ${playerId} not found`,
      );
    }

    if (player.teamId !== teamId) {
      throw new BadRequestException(
        'Player does not belong to the selected team',
      );
    }

    const existingEntry =
      await this.prisma.matchSquadPlayer.findUnique({
        where: {
          matchId_playerId: {
            matchId,
            playerId,
          },
        },
      });

    if (existingEntry) {
      throw new ConflictException(
        'Player is already selected for this match',
      );
    }

    return this.prisma.matchSquadPlayer.create({
      data: {
        matchId,
        teamId,
        playerId,
        role,
      },
      include: {
        team: true,
        player: true,
      },
    });
  }

  async findByMatch(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!match) {
      throw new NotFoundException(
        `Match with ID ${matchId} not found`,
      );
    }

    return this.prisma.matchSquadPlayer.findMany({
      where: {
        matchId,
      },
      include: {
        team: true,
        player: true,
      },
      orderBy: [
        {
          teamId: 'asc',
        },
        {
          role: 'asc',
        },
        {
          playerId: 'asc',
        },
      ],
    });
  }
}