import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPlayerDto: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        firstName: createPlayerDto.firstName,
        lastName: createPlayerDto.lastName,
        birthDate: createPlayerDto.birthDate
          ? new Date(createPlayerDto.birthDate)
          : undefined,
        position: createPlayerDto.position,
        teamId: createPlayerDto.teamId,
      },
    });
  }

  findAll() {
    return this.prisma.player.findMany({
      include: {
        team: true,
      },
    });
  }

  async findOne(id: number) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        team: true,
        matchSquadEntries: {
          where: {
            match: {
              status: 'FINISHED',
            },
          },
          select: {
            matchId: true,
          },
        },
        matchEvents: {
          where: {
            match: {
              status: 'FINISHED',
            },
          },
          select: {
            type: true,
            isOwnGoal: true,
          },
        },
        assistEvents: {
          where: {
            type: 'GOAL',
            match: {
              status: 'FINISHED',
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    const appearances = new Set(
      player.matchSquadEntries.map((entry) => entry.matchId),
    ).size;

    const goals = player.matchEvents.filter(
      (event) => event.type === 'GOAL' && !event.isOwnGoal,
    ).length;

    const ownGoals = player.matchEvents.filter(
      (event) => event.type === 'GOAL' && event.isOwnGoal,
    ).length;

    const yellowCards = player.matchEvents.filter(
      (event) => event.type === 'YELLOW_CARD',
    ).length;

    const redCards = player.matchEvents.filter(
      (event) => event.type === 'RED_CARD',
    ).length;

    const assists = player.assistEvents.length;

    const { matchSquadEntries, matchEvents, assistEvents, ...playerData } =
      player;

    return {
      ...playerData,
      statistics: {
        appearances,
        goals,
        assists,
        ownGoals,
        yellowCards,
        redCards,
      },
    };
  }

  async getMatchHistory(id: number) {
  const player = await this.prisma.player.findUnique({
    where: { id },
    select: {
      id: true,
    },
  });

  if (!player) {
    throw new NotFoundException(`Player with ID ${id} not found`);
  }

  const appearances =
    await this.prisma.matchSquadPlayer.findMany({
      where: {
        playerId: id,
        match: {
          status: 'FINISHED',
        },
      },
      include: {
        team: true,
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            season: {
              include: {
                competition: true,
              },
            },
            events: {
              where: {
                OR: [
                  { playerId: id },
                  { assistPlayerId: id },
                  { playerOutId: id },
                  { playerInId: id },
                ],
              },
              orderBy: {
                minute: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        match: {
          date: 'desc',
        },
      },
    });

  return appearances.map((appearance) => {
    const match = appearance.match;

    const goals = match.events.filter(
      (event) =>
        event.type === 'GOAL' &&
        event.playerId === id &&
        !event.isOwnGoal,
    ).length;

    const ownGoals = match.events.filter(
      (event) =>
        event.type === 'GOAL' &&
        event.playerId === id &&
        event.isOwnGoal,
    ).length;

    const assists = match.events.filter(
      (event) =>
        event.type === 'GOAL' &&
        event.assistPlayerId === id,
    ).length;

    const yellowCards = match.events.filter(
      (event) =>
        event.type === 'YELLOW_CARD' &&
        event.playerId === id,
    ).length;

    const redCards = match.events.filter(
      (event) =>
        event.type === 'RED_CARD' &&
        event.playerId === id,
    ).length;

    const isHomeTeam =
      match.homeTeamId === appearance.teamId;

    const opponent = isHomeTeam
      ? match.awayTeam
      : match.homeTeam;

    return {
      matchId: match.id,
      date: match.date,
      team: appearance.team,
      opponent,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      competition: match.season.competition,
      season: {
        id: match.season.id,
        name: match.season.name,
      },
      role: appearance.role,
      statistics: {
        goals,
        assists,
        ownGoals,
        yellowCards,
        redCards,
      },
    };
  });
}
}
