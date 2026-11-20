import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

export type CompetitionCreateSource = 'competitionId' | 'seasonId' | 'teamId';
export const COMPETITION_CREATE_SOURCE = 'competitionCreateSource';
export const CompetitionCreateAccess = (source: CompetitionCreateSource) =>
  SetMetadata(COMPETITION_CREATE_SOURCE, source);

@Injectable()
export class CompetitionCreateAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source = this.reflector.getAllAndOverride<CompetitionCreateSource>(
      COMPETITION_CREATE_SOURCE,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<{
      user?: { sub?: number };
      body?: Record<string, unknown>;
    }>();
    const userId = request.user?.sub;
    if (!source || !userId || !Number.isSafeInteger(userId) || userId <= 0) {
      throw new ForbiddenException();
    }
    const roles = await this.authService.getUserRoles(userId);
    // System admins can also create unassigned players; the DTO still validates the request.
    if (roles.some((role) => role.role === Role.SYSTEM_ADMIN)) return true;
    const allowed = new Set(
      roles
        .filter((role) => role.role === Role.COMPETITION_ADMIN)
        .map((role) => role.competitionId)
        .filter((id) => id !== null),
    );
    if (!allowed.size) throw new ForbiddenException();

    const targetId = request.body?.[source];
    if (targetId === undefined || targetId === null) {
      throw new ForbiddenException(
        'A competition-scoped assignment is required',
      );
    }
    if (
      typeof targetId !== 'number' ||
      !Number.isSafeInteger(targetId) ||
      targetId <= 0
    ) {
      throw new BadRequestException('Invalid target ID');
    }

    let competitionId: number;
    if (source === 'competitionId') {
      competitionId = targetId;
    } else if (source === 'seasonId') {
      const season = await this.prisma.season.findUnique({
        where: { id: targetId },
        select: { competitionId: true },
      });
      if (!season) throw new NotFoundException('Season not found');
      competitionId = season.competitionId;
    } else {
      const team = await this.prisma.team.findUnique({
        where: { id: targetId },
        select: { season: { select: { competitionId: true } } },
      });
      if (!team) throw new NotFoundException('Team not found');
      competitionId = team.season.competitionId;
    }
    if (!allowed.has(competitionId)) {
      throw new ForbiddenException(
        'You do not have permission to manage this competition',
      );
    }
    return true;
  }
}
