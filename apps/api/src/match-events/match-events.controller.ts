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
import { MatchEventsService } from './match-events.service';
import { CreateMatchEventDto } from './dto/create-match-event.dto';
import { UpdateMatchEventDto } from './dto/update-match-event.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('match-events')
@UseGuards(AuthGuard, RolesGuard)
export class MatchEventsController {
  constructor(private readonly matchEventsService: MatchEventsService) {}

  @Post()
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  create(@Body() createMatchEventDto: CreateMatchEventDto) {
    return this.matchEventsService.create(createMatchEventDto);
  }

  @Get('match/:matchId')
  findByMatch(
    @Param('matchId', ParseIntPipe) matchId: number,
  ) {
    return this.matchEventsService.findByMatch(matchId);
  }

  @Patch(':id')
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMatchEventDto: UpdateMatchEventDto,
  ) {
    return this.matchEventsService.update(id, updateMatchEventDto);
  }

  @Delete(':id')
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
    Role.MATCH_ADMIN,
  )
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.matchEventsService.remove(id);
  }
}