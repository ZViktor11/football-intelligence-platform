import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSeasonDto: CreateSeasonDto) {
    const competition = await this.prisma.competition.findUnique({
      where: {
        id: createSeasonDto.competitionId,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${createSeasonDto.competitionId} not found`,
      );
    }

    return this.prisma.season.create({
      data: {
        name: createSeasonDto.name,
        competitionId: createSeasonDto.competitionId,
        startsAt: createSeasonDto.startsAt
          ? new Date(createSeasonDto.startsAt)
          : undefined,
        endsAt: createSeasonDto.endsAt
          ? new Date(createSeasonDto.endsAt)
          : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.season.findMany({
      include: {
        competition: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        competition: true,
        teams: true,
        matches: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    return season;
  }

  async getStandings(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        teams: true,
        matches: {
          where: {
            status: 'FINISHED',
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    const standings = season.teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    const standingsByTeamId = new Map(
      standings.map((entry) => [entry.teamId, entry]),
    );

    for (const match of season.matches) {
      const home = standingsByTeamId.get(match.homeTeamId);
      const away = standingsByTeamId.get(match.awayTeamId);

      if (!home || !away) {
        continue;
      }

      home.played += 1;
      away.played += 1;

      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;

      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (match.homeScore < match.awayScore) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;

        home.points += 1;
        away.points += 1;
      }
    }

    for (const entry of standings) {
      entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
    }

    standings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }

      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }

      return a.teamName.localeCompare(b.teamName);
    });

    return standings.map((entry, index) => ({
      position: index + 1,
      ...entry,
    }));
  }
}
