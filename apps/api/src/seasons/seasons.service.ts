
import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';

type StandingEntry = {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type HeadToHeadEntry = {
  teamId: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type FinishedMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

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

  private compareOverallStandings(
    a: StandingEntry,
    b: StandingEntry,
  ): number {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }

    return b.goalsFor - a.goalsFor;
  }

  private calculateHeadToHead(
    tiedTeams: StandingEntry[],
    matches: FinishedMatch[],
  ): Map<number, HeadToHeadEntry> {
    const tiedTeamIds = new Set(
      tiedTeams.map((team) => team.teamId),
    );

    const miniTable = new Map<number, HeadToHeadEntry>();

    for (const team of tiedTeams) {
      miniTable.set(team.teamId, {
        teamId: team.teamId,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      });
    }

    for (const match of matches) {
      if (
        !tiedTeamIds.has(match.homeTeamId) ||
        !tiedTeamIds.has(match.awayTeamId)
      ) {
        continue;
      }

      const home = miniTable.get(match.homeTeamId)!;
      const away = miniTable.get(match.awayTeamId)!;

      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;

      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.points += 3;
      } else if (match.awayScore > match.homeScore) {
        away.points += 3;
      } else {
        home.points += 1;
        away.points += 1;
      }
    }

    for (const entry of miniTable.values()) {
      entry.goalDifference =
        entry.goalsFor - entry.goalsAgainst;
    }

    return miniTable;
  }

  private sortTiedTeams(
    tiedTeams: StandingEntry[],
    matches: FinishedMatch[],
  ): StandingEntry[] {
    if (tiedTeams.length <= 1) {
      return tiedTeams;
    }

    const miniTable = this.calculateHeadToHead(
      tiedTeams,
      matches,
    );

    return [...tiedTeams].sort((a, b) => {
      const aHeadToHead = miniTable.get(a.teamId)!;
      const bHeadToHead = miniTable.get(b.teamId)!;

      if (bHeadToHead.points !== aHeadToHead.points) {
        return bHeadToHead.points - aHeadToHead.points;
      }

      if (
        bHeadToHead.goalDifference !==
        aHeadToHead.goalDifference
      ) {
        return (
          bHeadToHead.goalDifference -
          aHeadToHead.goalDifference
        );
      }

      if (bHeadToHead.goalsFor !== aHeadToHead.goalsFor) {
        return bHeadToHead.goalsFor - aHeadToHead.goalsFor;
      }

      return (
        a.teamName.localeCompare(b.teamName) ||
        a.teamId - b.teamId
      );
    });
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
      throw new NotFoundException(
        `Season with ID ${id} not found`,
      );
    }

    const standings: StandingEntry[] = season.teams.map(
      (team) => ({
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
      }),
    );

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
      entry.goalDifference =
        entry.goalsFor - entry.goalsAgainst;
    }

    standings.sort((a, b) =>
      this.compareOverallStandings(a, b),
    );

    const sortedStandings: StandingEntry[] = [];

    let index = 0;

    while (index < standings.length) {
      const current = standings[index];
      const tiedTeams: StandingEntry[] = [current];

      let nextIndex = index + 1;

      while (
        nextIndex < standings.length &&
        this.compareOverallStandings(
          current,
          standings[nextIndex],
        ) === 0
      ) {
        tiedTeams.push(standings[nextIndex]);
        nextIndex += 1;
      }

      sortedStandings.push(
        ...this.sortTiedTeams(tiedTeams, season.matches),
      );

      index = nextIndex;
    }

    return sortedStandings.map((entry, position) => ({
      position: position + 1,
      ...entry,
    }));
  }
}
