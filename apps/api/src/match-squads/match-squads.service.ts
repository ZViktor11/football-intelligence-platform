import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { isTransactionWriteConflict } from '../prisma/transaction-conflict';
import { Prisma } from '../../generated/prisma/client';
import { CreateMatchSquadPlayerDto } from './dto/create-match-squad-player.dto';
import { UpdateMatchSquadPlayerDto } from './dto/update-match-squad-player.dto';

@Injectable()
export class MatchSquadsService {
  constructor(private readonly prisma: PrismaService) {}

  private async atomic<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('Player is already selected for this match');
        }
        if (!isTransactionWriteConflict(error)) throw error;
        if (attempt >= 2) throw new ConflictException('Concurrent squad update; please reload and retry');
      }
    }
  }

  private async ensureStarterCapacity(tx: Prisma.TransactionClient, matchId: number, teamId: number) {
    const count = await tx.matchSquadPlayer.count({ where: { matchId, teamId, role: 'STARTER' } });
    if (count >= 11) throw new BadRequestException('A team can have at most 11 starting players');
  }

  private ensureSquadIsEditable(status: string) {
    const editableStatuses = ['SCHEDULED', 'PRE_MATCH'];

    if (!editableStatuses.includes(status)) {
      throw new BadRequestException(
        'Match squad cannot be edited after the match has started',
      );
    }
  }

  async create(createMatchSquadPlayerDto: CreateMatchSquadPlayerDto) {
    return this.atomic(tx => this.createAtomic(tx, createMatchSquadPlayerDto));
  }

  private async createAtomic(tx: Prisma.TransactionClient, createMatchSquadPlayerDto: CreateMatchSquadPlayerDto) {
    const { matchId, teamId, playerId, role } = createMatchSquadPlayerDto;

    const match = await tx.match.findUnique({
      where: {
        id: matchId,
      },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    this.ensureSquadIsEditable(match.status);

    const teamBelongsToMatch =
      teamId === match.homeTeamId || teamId === match.awayTeamId;

    if (!teamBelongsToMatch) {
      throw new BadRequestException('Team does not belong to this match');
    }

    const player = await tx.player.findUnique({
      where: {
        id: playerId,
      },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    if (player.teamId !== teamId) {
      throw new BadRequestException(
        'Player does not belong to the selected team',
      );
    }

    const existingEntry = await tx.matchSquadPlayer.findUnique({
      where: {
        matchId_playerId: {
          matchId,
          playerId,
        },
      },
    });

    if (existingEntry) {
      throw new ConflictException('Player is already selected for this match');
    }

    if (role === 'STARTER') await this.ensureStarterCapacity(tx, matchId, teamId);

    return tx.matchSquadPlayer.create({
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
      throw new NotFoundException(`Match with ID ${matchId} not found`);
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

  async update(
    id: number,
    updateMatchSquadPlayerDto: UpdateMatchSquadPlayerDto,
  ) {
    return this.atomic(tx => this.updateAtomic(tx, id, updateMatchSquadPlayerDto));
  }

  private async updateAtomic(tx: Prisma.TransactionClient, id: number, updateMatchSquadPlayerDto: UpdateMatchSquadPlayerDto) {
    const squadEntry = await tx.matchSquadPlayer.findUnique({
      where: {
        id,
      },
      include: {
        match: true,
      },
    });

    if (!squadEntry) {
      throw new NotFoundException(`Match squad player with ID ${id} not found`);
    }

    this.ensureSquadIsEditable(squadEntry.match.status);

    if (updateMatchSquadPlayerDto.role === 'STARTER' && squadEntry.role !== 'STARTER') {
      await this.ensureStarterCapacity(tx, squadEntry.matchId, squadEntry.teamId);
    }

    return tx.matchSquadPlayer.update({
      where: {
        id,
      },
      data: {
        role: updateMatchSquadPlayerDto.role ?? undefined,
      },
      include: {
        team: true,
        player: true,
      },
    });
  }

  async remove(id: number) {
    return this.atomic(tx => this.removeAtomic(tx, id));
  }

  private async removeAtomic(tx: Prisma.TransactionClient, id: number) {
    const squadEntry = await tx.matchSquadPlayer.findUnique({
      where: {
        id,
      },
      include: {
        match: true,
      },
    });

    if (!squadEntry) {
      throw new NotFoundException(`Match squad player with ID ${id} not found`);
    }

    this.ensureSquadIsEditable(squadEntry.match.status);

    return tx.matchSquadPlayer.delete({
      where: {
        id,
      },
      include: {
        team: true,
        player: true,
      },
    });
  }
}
