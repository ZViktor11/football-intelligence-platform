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

@Controller('seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
  )
  create(@Body() createSeasonDto: CreateSeasonDto) {
    return this.seasonsService.create(createSeasonDto);
  }

  @Get()
  findAll() {
    return this.seasonsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.seasonsService.findOne(id);
  }
}