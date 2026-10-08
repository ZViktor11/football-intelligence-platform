
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import {
  DEFAULT_STANDINGS_TIEBREAKERS,
  isValidStandingsTieBreakers,
  StandingsTieBreaker,
} from '../competitions/standings-tiebreaker';

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

type FinishedMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

type HeadToHeadEntry = {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type SupportedRule =
  | StandingsTieBreaker.POINTS
  | StandingsTieBreaker.GOAL_DIFFERENCE
  | StandingsTieBreaker.GOALS_FOR
  | StandingsTieBreaker.HEAD_TO_HEAD_POINTS
  | StandingsTieBreaker.HEAD_TO_HEAD_GOAL_DIFFERENCE
  | StandingsTieBreaker.HEAD_TO_HEAD_GOALS_FOR;

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

  private calculateHeadToHead(
    teams: StandingEntry[],
    matches: FinishedMatch[],
  ): Map<number, HeadToHeadEntry> {
    const teamIds = new Set(teams.map((team) => team.teamId));

    const table = new Map<number, HeadToHeadEntry>();

    for (const team of teams) {
      table.set(team.teamId, {
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      });
    }

    for (const match of matches) {
      if (
        !teamIds.has(match.homeTeamId) ||
        !teamIds.has(match.awayTeamId)
      ) {
        continue;
      }

      const home = table.get(match.homeTeamId)!;
      const away = table.get(match.awayTeamId)!;

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

    for (const entry of table.values()) {
      entry.goalDifference =
        entry.goalsFor - entry.goalsAgainst;
    }

    return table;
  }

  private getRuleValue(
    team: StandingEntry,
    rule: SupportedRule,
    headToHead: Map<number, HeadToHeadEntry> | null,
  ): number {
    switch (rule) {
      case StandingsTieBreaker.POINTS:
        return team.points;

      case StandingsTieBreaker.GOAL_DIFFERENCE:
        return team.goalDifference;

      case StandingsTieBreaker.GOALS_FOR:
        return team.goalsFor;

      case StandingsTieBreaker.HEAD_TO_HEAD_POINTS:
        return headToHead!.get(team.teamId)!.points;

      case StandingsTieBreaker.HEAD_TO_HEAD_GOAL_DIFFERENCE:
        return headToHead!.get(team.teamId)!.goalDifference;

      case StandingsTieBreaker.HEAD_TO_HEAD_GOALS_FOR:
        return headToHead!.get(team.teamId)!.goalsFor;
    }
  }

  private sortByRules(
  teams: StandingEntry[],
  matches: FinishedMatch[],
  rules: StandingsTieBreaker[],
  ruleIndex = 0,
): StandingEntry[] {
  if (teams.length <= 1) {
    return teams;
  }

  // Teams without finished matches are ordered alphabetically.
  if (teams.every((team) => team.played === 0)) {
    return [...teams].sort(
      (a, b) =>
        a.teamName.localeCompare(b.teamName) ||
        a.teamId - b.teamId,
    );
  }

  if (ruleIndex >= rules.length) {
    return [...teams].sort(
      (a, b) =>
        a.teamName.localeCompare(b.teamName) ||
        a.teamId - b.teamId,
    );
  }

  const rule = rules[ruleIndex];



    if (
      rule === StandingsTieBreaker.FAIR_PLAY ||
      rule === StandingsTieBreaker.DRAWING_OF_LOTS
    ) {
      throw new UnprocessableEntityException(
        `Standings tie cannot be resolved: ${rule} is not implemented`,
      );
    }

    const isHeadToHead =
      rule === StandingsTieBreaker.HEAD_TO_HEAD_POINTS ||
      rule ===
        StandingsTieBreaker.HEAD_TO_HEAD_GOAL_DIFFERENCE ||
      rule === StandingsTieBreaker.HEAD_TO_HEAD_GOALS_FOR;

    const headToHead = isHeadToHead
      ? this.calculateHeadToHead(teams, matches)
      : null;

    const scored = teams.map((team) => ({
      team,
      value: this.getRuleValue(team, rule, headToHead),
    }));

    scored.sort((a, b) => b.value - a.value);

    const result: StandingEntry[] = [];

    let index = 0;

    while (index < scored.length) {
      const value = scored[index].value;
      const tiedTeams: StandingEntry[] = [];

      while (
        index < scored.length &&
        scored[index].value === value
      ) {
        tiedTeams.push(scored[index].team);
        index += 1;
      }

      result.push(
        ...this.sortByRules(
          tiedTeams,
          matches,
          rules,
          ruleIndex + 1,
        ),
      );
    }

    return result;
  }

  async getStandings(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        competition: true,
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

    const configuredRules: unknown =
      season.competition?.standingsTieBreakers;

    const rules =
      configuredRules === undefined
        ? DEFAULT_STANDINGS_TIEBREAKERS
        : configuredRules;

    if (!isValidStandingsTieBreakers(rules)) {
      throw new UnprocessableEntityException(
        'Invalid standings tie-breaker configuration',
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

    const sortedStandings = this.sortByRules(
      standings,
      season.matches,
      rules,
    );

    return sortedStandings.map((entry, position) => ({
      position: position + 1,
      ...entry,
    }));
  }
}
