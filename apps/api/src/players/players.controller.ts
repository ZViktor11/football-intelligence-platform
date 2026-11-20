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

import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CompetitionCreateAccess, CompetitionCreateAccessGuard } from '../auth/competition-create-access.guard';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard, CompetitionCreateAccessGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.COMPETITION_ADMIN)
  @CompetitionCreateAccess('teamId')
  create(@Body() createPlayerDto: CreatePlayerDto) {
    return this.playersService.create(createPlayerDto);
  }

  @Get()
  findAll() {
    return this.playersService.findAll();
  }

  @Get(':id/matches')
getMatchHistory(@Param('id', ParseIntPipe) id: number) {
  return this.playersService.getMatchHistory(id);
}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.findOne(id);
  }
}
