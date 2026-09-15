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

import { StaffMembersService } from './staff-members.service';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('staff-members')
export class StaffMembersController {
  constructor(
    private readonly staffMembersService: StaffMembersService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(
    Role.SYSTEM_ADMIN,
    Role.COMPETITION_ADMIN,
  )
  create(
    @Body() createStaffMemberDto: CreateStaffMemberDto,
  ) {
    return this.staffMembersService.create(
      createStaffMemberDto,
    );
  }

  @Get()
  findAll() {
    return this.staffMembersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.staffMembersService.findOne(id);
  }
}