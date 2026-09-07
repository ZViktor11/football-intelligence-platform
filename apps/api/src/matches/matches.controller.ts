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
import { MatchStatus, Role } from '../../generated/prisma/client';

import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  findAll(
    @Query('seasonId') seasonId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: MatchStatus,
  ) {
    return this.matchesService.findAll({
      seasonId: seasonId ? Number(seasonId) : undefined,
      teamId: teamId ? Number(teamId) : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchStatusDto: UpdateMatchStatusDto,
  ) {
    return this.matchesService.updateStatus(
      id,
      updateMatchStatusDto.status,
    );
  }
}