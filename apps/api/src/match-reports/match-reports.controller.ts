import {
  Body,
  Controller,
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

import { MatchReportsService } from './match-reports.service';
import { CreateMatchReportDto } from './dto/create-match-report.dto';
import { UpdateMatchReportStatusDto } from './dto/update-match-report-status.dto';

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

@Controller('match-reports')
export class MatchReportsController {
  constructor(
    private readonly matchReportsService: MatchReportsService,
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
    createMatchReportDto: CreateMatchReportDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchReportsService.create(
      createMatchReportDto,
      request.user.sub,
    );
  }

  @Get()
  @UseGuards(
    AuthGuard,
    RolesGuard,
  )
  @Roles(Role.SYSTEM_ADMIN)
  findAll() {
    return this.matchReportsService.findAll();
  }

  @Get('match/:matchId')
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
  @MatchAccess('matchIdParam')
  findByMatch(
    @Param('matchId', ParseIntPipe)
    matchId: number,
  ) {
    return this.matchReportsService.findByMatch(
      matchId,
    );
  }

  @Patch(':id/status')
  @UseGuards(
    AuthGuard,
    RolesGuard,
  )
  @Roles(Role.SYSTEM_ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateMatchReportStatusDto: UpdateMatchReportStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.matchReportsService.updateStatus(
      id,
      updateMatchReportStatusDto.status,
      request.user.sub,
    );
  }
}