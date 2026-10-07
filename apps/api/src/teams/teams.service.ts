import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto) {
    const season = await this.prisma.season.findUnique({
      where: {
        id: createTeamDto.seasonId,
      },
    });

    if (!season) {
      throw new NotFoundException(
        `Season with ID ${createTeamDto.seasonId} not found`,
      );
    }

    return this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        city: createTeamDto.city,
        seasonId: createTeamDto.seasonId,
      },
    });
  }

  findAll() {
    return this.prisma.team.findMany({
      include: {
        season: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
  const team = await this.prisma.team.findUnique({
    where: { id },
    include: {
      season: {
        include: {
          competition: true,
        },
      },
      players: true,
      homeMatches: {
        where: {
          status: 'FINISHED',
        },
        select: {
          homeScore: true,
          awayScore: true,
        },
      },
      awayMatches: {
        where: {
          status: 'FINISHED',
        },
        select: {
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });

  if (!team) {
    throw new NotFoundException(`Team with ID ${id} not found`);
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of team.homeMatches) {
    goalsFor += match.homeScore;
    goalsAgainst += match.awayScore;

    if (match.homeScore > match.awayScore) {
      wins++;
    } else if (match.homeScore === match.awayScore) {
      draws++;
    } else {
      losses++;
    }
  }

  for (const match of team.awayMatches) {
    goalsFor += match.awayScore;
    goalsAgainst += match.homeScore;

    if (match.awayScore > match.homeScore) {
      wins++;
    } else if (match.awayScore === match.homeScore) {
      draws++;
    } else {
      losses++;
    }
  }

  const played = wins + draws + losses;
  const goalDifference = goalsFor - goalsAgainst;
  const points = wins * 3 + draws;

  const { homeMatches, awayMatches, ...teamData } = team;

  return {
    ...teamData,
    statistics: {
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference,
      points,
    },
  };
}
async getMatchHistory(id: number) {
  const team = await this.prisma.team.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!team) {
    throw new NotFoundException(`Team with ID ${id} not found`);
  }

  const matches = await this.prisma.match.findMany({
    where: {
      status: 'FINISHED',
      OR: [
        { homeTeamId: id },
        { awayTeamId: id },
      ],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      season: {
        include: {
          competition: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  return matches.map((match) => {
    const isHomeTeam = match.homeTeamId === id;

    const goalsFor = isHomeTeam
      ? match.homeScore
      : match.awayScore;

    const goalsAgainst = isHomeTeam
      ? match.awayScore
      : match.homeScore;

    let result: 'WIN' | 'DRAW' | 'LOSS';

    if (goalsFor > goalsAgainst) {
      result = 'WIN';
    } else if (goalsFor === goalsAgainst) {
      result = 'DRAW';
    } else {
      result = 'LOSS';
    }

    return {
      matchId: match.id,
      date: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      opponent: isHomeTeam
        ? match.awayTeam
        : match.homeTeam,
      competition: match.season.competition,
      season: {
        id: match.season.id,
        name: match.season.name,
      },
      venue: isHomeTeam ? 'HOME' : 'AWAY',
      result,
    };
  });
}
}
