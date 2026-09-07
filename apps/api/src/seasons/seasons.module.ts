import { Module } from '@nestjs/common';

import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}