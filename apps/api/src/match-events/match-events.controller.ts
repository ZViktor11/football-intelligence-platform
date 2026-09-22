import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '../../generated/prisma/client';

import { MatchEventsService } from './match-events.service';
import { CreateMatchEventDto } from './dto/create-match-event.dto';
import { UpdateMatchEventDto } from './dto/update-match-event.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MatchAccessGuard } from '../auth/match-access.guard';
import { MatchAccess } from '../auth/match-access.decorator';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email?: string;
  };
};

@Controller('match-events')
export class MatchEventsController {
  constructor(
    private readonly matchEventsService: MatchEventsService,
  ) {}

  @Post()
  @UseGuards(
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
  )
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  @MatchAccess('bodyMatchId')
  create(
    @Body()
    createMatchEventDto: CreateMatchEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchEventsService.create(
      createMatchEventDto,
      request.user.sub,
    );
  }

  @Get('match/:matchId')
  findByMatch(
    @Param('matchId', ParseIntPipe)
    matchId: number,
  ) {
    return this.matchEventsService.findByMatch(
      matchId,
    );
  }

  @Patch(':id')
  @UseGuards(
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
  )
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  @MatchAccess('eventIdParam')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateMatchEventDto: UpdateMatchEventDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchEventsService.update(
      id,
      updateMatchEventDto,
      request.user.sub,
    );
  }

  @Delete(':id')
  @UseGuards(
    AuthGuard,
    RolesGuard,
    MatchAccessGuard,
  )
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  @MatchAccess('eventIdParam')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchEventsService.remove(
      id,
      request.user.sub,
    );
  }
}