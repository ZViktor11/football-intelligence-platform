
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { Role } from '../../generated/prisma/client';
import { AuthService } from './auth.service';

@Injectable()
export class CompetitionAccessGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: {
          sub?: number;
        };
      }
    >();

    const userId = request.user?.sub;

    if (!Number.isInteger(userId) || !userId || userId <= 0) {
      throw new ForbiddenException(
        'Authenticated user is required',
      );
    }

    const competitionId = Number(request.params.id);

    if (
      !Number.isInteger(competitionId) ||
      competitionId <= 0
    ) {
      throw new BadRequestException(
        'Invalid competition ID',
      );
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

    const canManageCompetition = assignments.some(
      (assignment) =>
        assignment.role === Role.COMPETITION_ADMIN &&
        assignment.competitionId === competitionId,
    );

    if (!canManageCompetition) {
      throw new ForbiddenException(
        'You do not have permission to manage this competition',
      );
    }

    return true;
  }
}
