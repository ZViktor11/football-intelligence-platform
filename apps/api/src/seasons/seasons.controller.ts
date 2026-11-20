import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';

import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CompetitionCreateAccess, CompetitionCreateAccessGuard } from '../auth/competition-create-access.guard';

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard, CompetitionCreateAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN)
  @CompetitionCreateAccess('competitionId')
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(':id/standings')
  getStandings(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.getStandings(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.findOne(id);
  }
}
