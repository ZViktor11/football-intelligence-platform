import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlayersModule } from './players/players.module';
import { PrismaService } from './prisma/prisma.service';
import { TeamsModule } from './teams/teams.module';
import { MatchesModule } from './matches/matches.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [PlayersModule, TeamsModule, MatchesModule, EventsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
