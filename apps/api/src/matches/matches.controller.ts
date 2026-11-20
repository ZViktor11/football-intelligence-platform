import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { MatchFiltersDto } from './dto/match-filters.dto';

import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import {
  MatchStatisticsSettingsDto,
  PossessionDto,
  ShotDeltaDto,
} from './dto/update-match-statistics.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MatchAccessGuard } from '../auth/match-access.guard';
import { MatchAccess } from '../auth/match-access.decorator';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SYSTEM_ADMIN)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  @Get()
  findAll(@Query() filters: MatchFiltersDto) {
    return this.matchesService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard, MatchAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN, Role.MATCH_ADMIN)
  @MatchAccess('matchIdParam')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateMatchStatusDto: UpdateMatchStatusDto,
  ) {
    return this.matchesService.updateStatus(id, updateMatchStatusDto.status);
  }

  @Patch(':id/statistics/settings')
  @UseGuards(AuthGuard, RolesGuard, MatchAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN, Role.MATCH_ADMIN)
  @MatchAccess('matchIdParam')
  configureStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: MatchStatisticsSettingsDto,
  ) {
    return this.matchesService.configureStatistics(id, data);
  }

  @Patch(':id/statistics/shots')
  @UseGuards(AuthGuard, RolesGuard, MatchAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN, Role.MATCH_ADMIN)
  @MatchAccess('matchIdParam')
  recordShot(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ShotDeltaDto,
  ) {
    return this.matchesService.recordShot(id, data);
  }

  @Patch(':id/statistics/possession')
  @UseGuards(AuthGuard, RolesGuard, MatchAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN, Role.MATCH_ADMIN)
  @MatchAccess('matchIdParam')
  recordPossession(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: PossessionDto,
  ) {
    return this.matchesService.recordPossession(id, data.side ?? null);
  }
}
