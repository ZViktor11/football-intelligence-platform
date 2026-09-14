import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import {
  MATCH_ACCESS_KEY,
  MatchAccessSource,
} from './match-access.decorator';
import { Role } from '../../generated/prisma/client';

type AuthenticatedRequest = Request & {
  user?: {
    sub?: number;
  };
  body: {
    matchId?: number;
  };
};

@Injectable()
export class MatchAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source =
      this.reflector.getAllAndOverride<MatchAccessSource>(
        MATCH_ACCESS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!source) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException();
    }

    const assignments =
      await this.authService.getUserRoles(userId);

    const isSystemAdmin = assignments.some(
      (assignment) =>
        assignment.role === Role.SYSTEM_ADMIN,
    );

    if (isSystemAdmin) {
      return true;
    }

    const matchId = await this.resolveMatchId(
      request,
      source,
    );

    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
      select: {
        id: true,
        season: {
          select: {
            competitionId: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const competitionAdminHasAccess = assignments.some(
      (assignment) =>
        assignment.role === Role.COMPETITION_ADMIN &&
        assignment.competitionId ===
          match.season.competitionId,
    );

    if (competitionAdminHasAccess) {
      return true;
    }

    const isMatchAdmin = assignments.some(
      (assignment) =>
        assignment.role === Role.MATCH_ADMIN,
    );

    if (isMatchAdmin) {
      const matchAssignment =
        await this.prisma.matchAdminAssignment.findUnique({
          where: {
            userId_matchId: {
              userId,
              matchId,
            },
          },
        });

      if (matchAssignment) {
        return true;
      }
    }

    throw new ForbiddenException(
      'You do not have access to administer this match',
    );
  }

  private async resolveMatchId(
    request: AuthenticatedRequest,
    source: MatchAccessSource,
  ): Promise<number> {
    if (source === 'matchIdParam') {
      const matchId = Number(request.params.id);

      if (!Number.isInteger(matchId)) {
        throw new NotFoundException('Match not found');
      }

      return matchId;
    }

    if (source === 'bodyMatchId') {
      const matchId = Number(request.body.matchId);

      if (!Number.isInteger(matchId)) {
        throw new NotFoundException('Match not found');
      }

      return matchId;
    }

    const eventId = Number(request.params.id);

    if (!Number.isInteger(eventId)) {
      throw new NotFoundException(
        'Match event not found',
      );
    }

    const event =
      await this.prisma.matchEvent.findUnique({
        where: {
          id: eventId,
        },
        select: {
          matchId: true,
        },
      });

    if (!event) {
      throw new NotFoundException(
        'Match event not found',
      );
    }

    return event.matchId;
  }
}