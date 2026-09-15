import { Module } from '@nestjs/common';

import { StaffMembersService } from './staff-members.service';
import { StaffMembersController } from './staff-members.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [StaffMembersController],
  providers: [StaffMembersService],
})
export class StaffMembersModule {}