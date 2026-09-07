import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SeasonsController } from './seasons.controller';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}