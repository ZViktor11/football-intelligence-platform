import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import {
  CompetitionCreateAccessGuard,
  COMPETITION_CREATE_SOURCE,
  type CompetitionCreateSource,
} from './competition-create-access.guard';
import { SeasonsController } from '../seasons/seasons.controller';
import { TeamsController } from '../teams/teams.controller';
import { PlayersController } from '../players/players.controller';
import { StaffMembersController } from '../staff-members/staff-members.controller';

describe('CompetitionCreateAccessGuard', () => {
  const auth = { getUserRoles: jest.fn() };
  const prisma = {
    season: { findUnique: jest.fn() },
    team: { findUnique: jest.fn() },
  };
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new CompetitionCreateAccessGuard(
    reflector as unknown as Reflector,
    auth as unknown as AuthService,
    prisma as unknown as PrismaService,
  );
  const context = (
    source: CompetitionCreateSource,
    body: Record<string, unknown>,
    sub: number | undefined = 1,
  ) => {
    reflector.getAllAndOverride.mockReturnValue(source);
    return {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user: { sub }, body }) }),
    } as unknown as ExecutionContext;
  };
  beforeEach(() => {
    jest.resetAllMocks();
    auth.getUserRoles.mockResolvedValue([
      { role: Role.COMPETITION_ADMIN, competitionId: 5 },
    ]);
    prisma.season.findUnique.mockResolvedValue({ competitionId: 5 });
    prisma.team.findUnique.mockResolvedValue({ season: { competitionId: 5 } });
  });
  it.each(['competitionId', 'seasonId', 'teamId'] as const)(
    'allows creation in the assigned competition via %s',
    async (source) => {
      await expect(
        guard.canActivate(
          context(source, { [source]: source === 'competitionId' ? 5 : 10 }),
        ),
      ).resolves.toBe(true);
    },
  );
  it.each(['competitionId', 'seasonId', 'teamId'] as const)(
    'rejects creation in another competition via %s',
    async (source) => {
      prisma.season.findUnique.mockResolvedValue({ competitionId: 8 });
      prisma.team.findUnique.mockResolvedValue({
        season: { competitionId: 8 },
      });
      await expect(
        guard.canActivate(context(source, { [source]: 8 })),
      ).rejects.toThrow(ForbiddenException);
    },
  );
  it('preserves system admin access, including creation of unassigned players', async () => {
    auth.getUserRoles.mockResolvedValue([
      { role: Role.SYSTEM_ADMIN, competitionId: null },
    ]);
    await expect(guard.canActivate(context('teamId', {}))).resolves.toBe(true);
    expect(prisma.team.findUnique).not.toHaveBeenCalled();
  });
  it.each([
    { roles: [] },
    { roles: [{ role: Role.MATCH_ADMIN, competitionId: null }] },
    { roles: [{ role: Role.COMPETITION_ADMIN, competitionId: null }] },
  ])(
    'rejects users with no applicable competition role: %j',
    async ({ roles }) => {
      auth.getUserRoles.mockResolvedValue(roles);
      await expect(
        guard.canActivate(context('competitionId', { competitionId: 5 })),
      ).rejects.toThrow(ForbiddenException);
    },
  );
  it('rejects an unassigned player created by a competition admin', async () => {
    await expect(guard.canActivate(context('teamId', {}))).rejects.toThrow(
      ForbiddenException,
    );
  });
  it.each([0, -1, 1.5, '5', {}, []].map((id) => ({ id })))(
    'rejects malformed target IDs: %j',
    async ({ id }) => {
      await expect(
        guard.canActivate(context('teamId', { teamId: id })),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.team.findUnique).not.toHaveBeenCalled();
    },
  );
  it('rejects nonexistent team and season targets', async () => {
    prisma.team.findUnique.mockResolvedValue(null);
    prisma.season.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(context('teamId', { teamId: 10 })),
    ).rejects.toThrow(NotFoundException);
    await expect(
      guard.canActivate(context('seasonId', { seasonId: 10 })),
    ).rejects.toThrow(NotFoundException);
  });
  it.each([
    [SeasonsController, 'competitionId'],
    [TeamsController, 'seasonId'],
    [PlayersController, 'teamId'],
    [StaffMembersController, 'teamId'],
  ])('is wired to the creation endpoint of %s', (controller, source) => {
    const handler = controller.prototype.create;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      CompetitionCreateAccessGuard,
    );
    expect(Reflect.getMetadata(COMPETITION_CREATE_SOURCE, handler)).toEqual(
      source,
    );
  });
});
