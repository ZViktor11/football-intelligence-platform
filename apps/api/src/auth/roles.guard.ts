import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { ROLES_KEY } from './roles.decorator';
import { Role } from '../../generated/prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'];

    if (!user?.sub) {
      throw new ForbiddenException();
    }

    const assignments = await this.authService.getUserRoles(user.sub);

    const hasRole = assignments.some((assignment) =>
      requiredRoles.includes(assignment.role),
    );

    if (!hasRole) {
      throw new ForbiddenException();
    }

    return true;
  }
}