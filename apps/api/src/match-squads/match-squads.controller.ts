import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Role } from '../../generated/prisma/client';

import { MatchSquadsService } from './match-squads.service';
import { CreateMatchSquadPlayerDto } from './dto/create-match-squad-player.dto';
import { UpdateMatchSquadPlayerDto } from './dto/update-match-squad-player.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MatchAccessGuard } from '../auth/match-access.guard';
import { MatchAccess } from '../auth/match-access.decorator';

@Controller('match-squads')
export class MatchSquadsController {
  constructor(
    private readonly matchSquadsService: MatchSquadsService,
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
    createMatchSquadPlayerDto: CreateMatchSquadPlayerDto,
  ) {
    return this.matchSquadsService.create(
      createMatchSquadPlayerDto,
    );
  }

  @Get('match/:matchId')
  findByMatch(
    @Param('matchId', ParseIntPipe)
    matchId: number,
  ) {
    return this.matchSquadsService.findByMatch(
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
  @MatchAccess('squadEntryId')
  update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    updateMatchSquadPlayerDto: UpdateMatchSquadPlayerDto,
  ) {
    return this.matchSquadsService.update(
      id,
      updateMatchSquadPlayerDto,
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
  @MatchAccess('squadEntryId')
  remove(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.matchSquadsService.remove(id);
  }
}